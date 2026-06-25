// supabase/functions/rehab-request-notify/index.ts
// Deploy: supabase functions deploy rehab-request-notify
//
// Notifies Eshwar (founder) when a client submits a new Recovery/rehab
// treatment request. Mirrors medical-document-send-expert's inline
// Twilio WhatsApp + Resend email pattern — there's no shared helper for
// either in this codebase, so this duplicates that pattern rather than
// importing one.
//
// Requires secrets: RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_WHATSAPP_FROM (same secrets already used by medical-document-send-expert).

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

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [{ data: request, error: reqErr }, { data: profile }] = await Promise.all([
      supabase.from('rehab_requests').select('*, package:rehab_packages(label)').eq('id', requestId).eq('client_id', clientId).single(),
      supabase.from('profiles').select('full_name, phone').eq('id', clientId).single(),
    ]);
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clientName = profile?.full_name ?? 'A client';
    const packageLabel = (request as any).package?.label ?? 'Unknown package';

    const emailHtml = `
      <p><strong>${clientName}</strong> has requested in-person Recovery treatment via the BioRealign app.</p>
      <p><strong>Issue:</strong> ${request.issue_description}</p>
      <p><strong>Duration of issue:</strong> ${request.duration_text ?? 'Not specified'}</p>
      <p><strong>Preferred package:</strong> ${packageLabel}</p>
      <p style="color:#888;font-size:12px;">Client phone on file: ${profile?.phone ?? 'not provided'}. Reference: ${requestId}</p>
      <p>Review and respond (set a price quote, accept or decline) from the admin app.</p>
    `;

    let emailOk = false;
    let emailErrDetail = '';
    if (!Deno.env.get('RESEND_API_KEY')) {
      emailErrDetail = 'RESEND_API_KEY secret is not set';
      console.error('[rehab-request-notify]', emailErrDetail);
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
          subject: `New Recovery request — ${clientName}`,
          html: emailHtml,
        }),
      });
      emailOk = resendRes.ok;
      if (!emailOk) {
        emailErrDetail = await resendRes.text();
        console.error('[rehab-request-notify] Resend error', emailErrDetail);
      }
    }

    let whatsappOk = false;
    let whatsappErrDetail = '';
    if (!Deno.env.get('TWILIO_ACCOUNT_SID') || !Deno.env.get('TWILIO_AUTH_TOKEN') || !Deno.env.get('TWILIO_WHATSAPP_FROM')) {
      whatsappErrDetail = 'Twilio secrets are not fully set';
      console.error('[rehab-request-notify]', whatsappErrDetail);
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
            Body: `*New Recovery request*\n\nClient: ${clientName}\nPackage: ${packageLabel}\nIssue: ${request.issue_description.slice(0, 200)}\n\nReview in the admin app. Reference: ${requestId}`,
          }),
        });
        whatsappOk = waRes.ok;
        if (!whatsappOk) {
          whatsappErrDetail = await waRes.text();
          console.error('[rehab-request-notify] Twilio error', whatsappErrDetail);
        }
      } catch (e) {
        whatsappErrDetail = (e as Error).message;
        console.error('[rehab-request-notify] Twilio threw', whatsappErrDetail);
      }
    }

    return new Response(JSON.stringify({ success: emailOk || whatsappOk, email: emailOk, whatsapp: whatsappOk }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[rehab-request-notify] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong notifying Eshwar.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
