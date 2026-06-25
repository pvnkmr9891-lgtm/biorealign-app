// supabase/functions/rehab-slots-confirmed-notify/index.ts
// Deploy: supabase functions deploy rehab-slots-confirmed-notify
//
// Notifies Eshwar (founder) via WhatsApp + email when a client confirms their
// Recovery session slot(s) after acceptance. Mirrors rehab-request-notify /
// medical-document-send-expert's inline Twilio + Resend pattern.
//
// Requires secrets: RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_WHATSAPP_FROM (same secrets already used by the other rehab/medical functions).

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

    const [{ data: request, error: reqErr }, { data: profile }, { data: appointments }] = await Promise.all([
      supabase.from('rehab_requests').select('*, package:rehab_packages(label)').eq('id', requestId).eq('client_id', clientId).single(),
      supabase.from('profiles').select('full_name, phone').eq('id', clientId).single(),
      supabase.from('rehab_appointments').select('scheduled_at').eq('rehab_request_id', requestId).order('scheduled_at'),
    ]);
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clientName = profile?.full_name ?? 'A client';
    const packageLabel = (request as any).package?.label ?? 'Unknown package';
    const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const apptLines = (appointments ?? []).map((a: any) => fmt(a.scheduled_at));

    const emailHtml = `
      <p><strong>${clientName}</strong> confirmed session time(s) for their accepted Recovery request.</p>
      <p><strong>Package:</strong> ${packageLabel} · ₹${request.quoted_price}</p>
      <p><strong>Sessions:</strong></p>
      <ul>${apptLines.map((l: string) => `<li>${l}</li>`).join('')}</ul>
      <p style="color:#888;font-size:12px;">Client phone on file: ${profile?.phone ?? 'not provided'}. Reference: ${requestId}</p>
    `;

    let emailOk = false;
    if (Deno.env.get('RESEND_API_KEY')) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'BioRealign App <onboarding@resend.dev>',
          to: [SUPPORT_EMAIL],
          subject: `Recovery session confirmed — ${clientName}`,
          html: emailHtml,
        }),
      });
      emailOk = resendRes.ok;
      if (!emailOk) console.error('[rehab-slots-confirmed-notify] Resend error', await resendRes.text());
    } else {
      console.error('[rehab-slots-confirmed-notify] RESEND_API_KEY secret is not set');
    }

    let whatsappOk = false;
    if (Deno.env.get('TWILIO_ACCOUNT_SID') && Deno.env.get('TWILIO_AUTH_TOKEN') && Deno.env.get('TWILIO_WHATSAPP_FROM')) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
        const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM')!;
        const waRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            From: `whatsapp:${fromNumber}`,
            To: `whatsapp:${SUPPORT_WHATSAPP_NUMBER}`,
            Body: `*Recovery session confirmed*\n\nClient: ${clientName}\nPackage: ${packageLabel} (₹${request.quoted_price})\nSessions:\n${apptLines.join('\n')}\n\nReference: ${requestId}`,
          }),
        });
        whatsappOk = waRes.ok;
        if (!whatsappOk) console.error('[rehab-slots-confirmed-notify] Twilio error', await waRes.text());
      } catch (e) {
        console.error('[rehab-slots-confirmed-notify] Twilio threw', (e as Error).message);
      }
    } else {
      console.error('[rehab-slots-confirmed-notify] Twilio secrets are not fully set');
    }

    return new Response(JSON.stringify({ success: emailOk || whatsappOk, email: emailOk, whatsapp: whatsappOk }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[rehab-slots-confirmed-notify] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong notifying Eshwar.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
