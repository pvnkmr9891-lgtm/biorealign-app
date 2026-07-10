// supabase/functions/medical-document-analyze/index.ts
// Deploy: supabase functions deploy medical-document-analyze
//
// "Perform Analysis" — sends one (or, if no documentId is given, all) of the
// client's uploaded documents to Claude for a plain-language, strictly
// non-diagnostic organizational summary. Runs with the client's own
// forwarded JWT (no service role) since it only ever reads/writes that same
// client's own rows.
//
// Body: {} for the old all-documents batch behavior (kept for backward
// compatibility), or { documentId } to analyze just that one document —
// the client now shows a per-document "Analyze My Reports" button, so this
// is the path actually used today.
//
// Requires secret: ANTHROPIC_API_KEY (server-side only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function guessMediaType(fileType: string): string {
  const t = fileType.toLowerCase();
  if (t.includes('png')) return 'image/png';
  if (t.includes('heic')) return 'image/heic';
  if (t.includes('pdf')) return 'application/pdf';
  return 'image/jpeg';
}

const bytesToBase64 = encodeBase64;

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

const SYSTEM_PROMPT = `You are a document-organization and plain-language summary assistant inside a fitness-coaching app. You are NOT a diagnostician and must never act like one.

Strict rules:
- For lab/blood work documents: extract test names, values, units, and the reference range PRINTED ON THE REPORT ITSELF. State whether each value is within or outside that printed range — this is a mechanical comparison against the lab's own stated range, not a clinical judgment about what's "normal" for this person. NEVER invent a reference range if one isn't printed.
- For imaging/X-ray documents: summarize ONLY what is explicitly stated in any accompanying radiologist's report text. If it's just an image with no report text, say plainly that this app cannot interpret medical images visually and recommend relying on the doctor's reading — do not describe or interpret anatomical findings yourself.
- For prescriptions: extract medication names, dosages, and frequency exactly as written. Do not comment on appropriateness, interactions, or efficacy.
- Never use diagnostic or prescriptive language ("you have," "this means," "you should take/stop"). Use observational, report-quoting language ("this report shows," "the value is listed as," "outside the range printed on this report").
- Always close with a brief plain-language overall summary paragraph aggregating across all documents, written for a non-clinical reader, ending with a reminder to discuss the full picture with a doctor or coach.

Respond with ONLY a JSON object of this exact shape:
{
  "documents": [
    {
      "filename": "string",
      "category": "blood_work" | "imaging" | "prescriptions" | "other",
      "labValues": [{ "test": "string", "value": "string", "unit": "string", "referenceRange": "string or null", "status": "in_range" | "out_of_range" | "unknown" }],
      "medications": [{ "name": "string", "dosage": "string", "frequency": "string" }],
      "notes": "string — imaging/other observational notes, or empty string"
    }
  ],
  "summary": "string — the final plain-language aggregate paragraph"
}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return new Response(JSON.stringify({ error: 'Server is missing its AI configuration. Please contact support.', debug: 'ANTHROPIC_API_KEY secret is not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
    const clientId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const documentId: string | undefined = body?.documentId;

    let docsQuery = supabase
      .from('medical_documents')
      .select('id, storage_path, file_type, original_filename, category')
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: true });
    if (documentId) docsQuery = docsQuery.eq('id', documentId);

    const { data: docs, error: docsErr } = await docsQuery;
    if (docsErr) throw docsErr;
    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ error: documentId ? 'Document not found' : 'No documents to analyze' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const contentBlocks: any[] = [];
    for (const doc of docs) {
      const { data: fileBlob, error: dlErr } = await supabase.storage.from('medical-documents').download(doc.storage_path);
      if (dlErr || !fileBlob) continue; // skip unreadable files rather than failing the whole batch

      const bytes = new Uint8Array(await fileBlob.arrayBuffer());
      const isDocx = doc.file_type.toLowerCase().includes('word') || doc.original_filename.toLowerCase().endsWith('.docx');
      const isPdf = doc.file_type.toLowerCase().includes('pdf');

      contentBlocks.push({ type: 'text', text: `--- Document: "${doc.original_filename}" (category: ${doc.category}) ---` });
      if (isDocx) {
        const text = await extractDocxText(bytes);
        contentBlocks.push({ type: 'text', text: text || '(Could not extract text from this document.)' });
      } else if (isPdf) {
        contentBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytesToBase64(bytes) } });
      } else {
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: guessMediaType(doc.file_type), data: bytesToBase64(bytes) } });
      }
    }

    if (contentBlocks.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not read any of the uploaded documents' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const hasPdf = docs.some((d) => d.file_type.toLowerCase().includes('pdf'));

    const callAnthropic = () => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        ...(hasPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [...contentBlocks, { type: 'text', text: docs.length === 1 ? 'Analyze and organize the document above per your instructions.' : 'Analyze and organize all of the documents above per your instructions.' }] }],
      }),
    });

    let anthropicRes = await callAnthropic();
    // Anthropic's edge occasionally returns a transient 5xx (Cloudflare 502) —
    // one quick retry clears the vast majority of these.
    if (!anthropicRes.ok && anthropicRes.status >= 500) {
      anthropicRes = await callAnthropic();
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[medical-document-analyze] Anthropic error', anthropicRes.status);
      return new Response(JSON.stringify({ error: 'Analysis failed', detail: errText.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResult = await anthropicRes.json();
    const text = aiResult.content?.[0]?.text ?? '{}';
    let parsed: { documents?: any[]; summary?: string } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse analysis result' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const summaryText = parsed.summary ?? 'No summary was generated.';

    const { data: inserted, error: insertErr } = await supabase
      .from('medical_analyses')
      .insert({
        client_id: clientId,
        document_ids: docs.map((d) => d.id),
        result: parsed,
        summary_text: summaryText,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    await supabase
      .from('medical_documents')
      .update({ analysis_id: inserted.id })
      .in('id', docs.map((d) => d.id));

    return new Response(JSON.stringify(inserted), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[medical-document-analyze] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong while analyzing your documents. Please try again.', debug: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
