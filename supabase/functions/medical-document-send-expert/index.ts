// supabase/functions/medical-document-send-expert/index.ts
// Deploy: supabase functions deploy medical-document-send-expert
//
// "Need Expert Opinion?" — for clients with no assigned coach. Emails
// BioRealign's support address (via Resend) with the AI summary and signed,
// time-limited links to the original documents, and pings BioRealign's
// WhatsApp number (via the same Twilio approach as send-notification) with a
// short reference rather than trying to push file attachments through
// WhatsApp.
//
// Requires secrets: RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_WHATSAPP_FROM (the latter three already exist for send-notification).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORT_EMAIL = 'biorealign@gmail.com';
const SUPPORT_WHATSAPP_NUMBER = '+917672016556';

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
    const clientId = userRes.user.id;

    const { analysisId } = await req.json();
    if (!analysisId) {
      return new Response(JSON.stringify({ error: 'analysisId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [{ data: analysis, error: analysisErr }, { data: profile }] = await Promise.all([
      supabase.from('medical_analyses').select('*').eq('id', analysisId).eq('client_id', clientId).single(),
      supabase.from('profiles').select('full_name, phone').eq('id', clientId).single(),
    ]);
    if (analysisErr || !analysis) {
      return new Response(JSON.stringify({ error: 'Analysis not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: docs } = await supabase
      .from('medical_documents')
      .select('storage_path, original_filename')
      .in('id', analysis.document_ids);

    // Signed links instead of attachments — more reliable across file sizes
    // and avoids base64-inflating the email payload.
    const signedLinks: { name: string; url: string }[] = [];
    for (const doc of docs ?? []) {
      const { data: signed } = await supabase.storage.from('medical-documents').createSignedUrl(doc.storage_path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) signedLinks.push({ name: doc.original_filename, url: signed.signedUrl });
    }

    const clientName = profile?.full_name ?? 'A client';
    const linksHtml = signedLinks.map((l) => `<li><a href="${l.url}">${l.name}</a> (link expires in 7 days)</li>`).join('');

    const emailHtml = `
      <p><strong>${clientName}</strong> has requested an expert opinion on their uploaded medical documents via the BioRealign app.</p>
      <p><strong>AI-generated summary (organizational aid, not a diagnosis):</strong></p>
      <p>${(analysis.summary_text ?? '').replace(/\n/g, '<br/>')}</p>
      <p><strong>Documents:</strong></p>
      <ul>${linksHtml}</ul>
      <p style="color:#888;font-size:12px;">Client phone on file: ${profile?.phone ?? 'not provided'}. Reference: ${analysisId}</p>
    `;

    let emailOk = false;
    let emailErrDetail = '';
    if (!Deno.env.get('RESEND_API_KEY')) {
      emailErrDetail = 'RESEND_API_KEY secret is not set';
      console.error('[medical-document-send-expert]', emailErrDetail);
    } else {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BioRealign App <onboarding@resend.dev>',
          to: [SUPPORT_EMAIL],
          subject: `Expert opinion requested — ${clientName}`,
          html: emailHtml,
        }),
      });
      emailOk = resendRes.ok;
      if (!emailOk) {
        emailErrDetail = await resendRes.text();
        console.error('[medical-document-send-expert] Resend error', emailErrDetail);
      }
    }

    // WhatsApp — a short reference notification, not the documents themselves.
    let whatsappOk = false;
    let whatsappErrDetail = '';
    if (!Deno.env.get('TWILIO_ACCOUNT_SID') || !Deno.env.get('TWILIO_AUTH_TOKEN') || !Deno.env.get('TWILIO_WHATSAPP_FROM')) {
      whatsappErrDetail = 'Twilio secrets are not fully set';
      console.error('[medical-document-send-expert]', whatsappErrDetail);
    } else {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
        const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM')!;
        const waRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: `whatsapp:${fromNumber}`,
            To: `whatsapp:${SUPPORT_WHATSAPP_NUMBER}`,
            Body: `*New expert opinion request*\n\nClient: ${clientName}\nCheck email (${SUPPORT_EMAIL}) for the summary and document links.\nReference: ${analysisId}`,
          }),
        });
        whatsappOk = waRes.ok;
        if (!whatsappOk) {
          whatsappErrDetail = await waRes.text();
          console.error('[medical-document-send-expert] Twilio error', whatsappErrDetail);
        }
      } catch (e) {
        whatsappErrDetail = (e as Error).message;
        console.error('[medical-document-send-expert] Twilio threw', whatsappErrDetail);
      }
    }

    if (!emailOk && !whatsappOk) {
      return new Response(JSON.stringify({
        error: 'Could not reach BioRealign support — please try again shortly.',
        debug: `email: ${emailErrDetail.slice(0, 200)} | whatsapp: ${whatsappErrDetail.slice(0, 200)}`,
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('medical_analyses').update({ sent_to_expert_at: new Date().toISOString() }).eq('id', analysisId);

    return new Response(JSON.stringify({ success: true, email: emailOk, whatsapp: whatsappOk }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[medical-document-send-expert] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong sending your request.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
