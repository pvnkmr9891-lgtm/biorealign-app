// supabase/functions/medical-document-categorize/index.ts
// Deploy: supabase functions deploy medical-document-categorize
//
// Called right after a client uploads a medical document. Downloads the file
// (respecting the client's own storage RLS via their forwarded JWT — no
// service role needed), sends it to Claude for a lightweight classification
// into one of 4 fixed categories, and writes the result back onto the row.
//
// Requires secret: ANTHROPIC_API_KEY (server-side only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = ['blood_work', 'imaging', 'prescriptions', 'other'] as const;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function guessMediaType(fileType: string): string {
  const t = fileType.toLowerCase();
  if (t.includes('png')) return 'image/png';
  if (t.includes('heic')) return 'image/heic';
  if (t.includes('pdf')) return 'application/pdf';
  return 'image/jpeg';
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    // @ts-ignore — esm.sh npm shim, only resolved at runtime in Deno
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = await JSZip.loadAsync(bytes);
    const doc = zip.file('word/document.xml');
    if (!doc) return '';
    const xml = await doc.async('string');
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20000);
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: doc, error: docErr } = await supabase
      .from('medical_documents')
      .select('id, storage_path, file_type, original_filename, client_id')
      .eq('id', documentId)
      .single();
    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found or not accessible' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: fileBlob, error: dlErr } = await supabase.storage.from('medical-documents').download(doc.storage_path);
    if (dlErr || !fileBlob) {
      return new Response(JSON.stringify({ error: 'Could not download document' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isDocx = doc.file_type.toLowerCase().includes('word') || doc.original_filename.toLowerCase().endsWith('.docx');
    const isPdf = doc.file_type.toLowerCase().includes('pdf');

    let contentBlock: any;
    let extraHeaders: Record<string, string> = {};

    if (isDocx) {
      const text = await extractDocxText(bytes);
      contentBlock = { type: 'text', text: text || '(Could not extract text from this document.)' };
    } else if (isPdf) {
      const base64 = bytesToBase64(bytes);
      contentBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
      extraHeaders['anthropic-beta'] = 'pdfs-2024-09-25';
    } else {
      const base64 = bytesToBase64(bytes);
      contentBlock = { type: 'image', source: { type: 'base64', media_type: guessMediaType(doc.file_type), data: base64 } };
    }

    const callAnthropic = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        system: `You classify medical documents for a fitness-coaching app. You are not a diagnostician — you only sort documents into one of these exact categories based on what type of document it is: blood_work, imaging, prescriptions, other. Respond with ONLY a JSON object: {"category": "<one of the four>", "reason": "<one short sentence explaining why, describing the document type, not its medical content>"}`,
        messages: [{
          role: 'user',
          content: [contentBlock, { type: 'text', text: `Filename: ${doc.original_filename}. Classify this document.` }],
        }],
      }),
    });

    let anthropicRes = await callAnthropic();
    if (!anthropicRes.ok && anthropicRes.status >= 500) {
      anthropicRes = await callAnthropic();
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[medical-document-categorize] Anthropic error', anthropicRes.status);
      return new Response(JSON.stringify({ error: 'Classification failed', detail: errText.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result = await anthropicRes.json();
    const text = result.content?.[0]?.text ?? '{}';
    let parsed: { category?: string; reason?: string } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      parsed = {};
    }

    const category = CATEGORIES.includes(parsed.category as any) ? parsed.category! : 'other';
    const reason = parsed.reason ?? null;

    const { error: updateErr } = await supabase
      .from('medical_documents')
      .update({ category, category_reason: reason, category_is_manual: false })
      .eq('id', documentId);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ category, reason }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[medical-document-categorize] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong categorizing this document.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
