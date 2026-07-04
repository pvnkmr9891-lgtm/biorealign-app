// supabase/functions/send-phone-otp/index.ts
// Deploy: supabase functions deploy send-phone-otp
//
// Starts a Twilio Verify SMS verification for a phone number. Generic and
// auth-free by design — reused by both the signup phone-verification step
// (Part 2) and the forgot-password phone path (Part 4), since in both cases
// all we're proving is "does this phone number belong to the requester."
//
// Requires secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_VERIFY_SERVICE_SID (a Verify Service, NOT the WhatsApp sender — see
// the project setup notes for where to create one in the Twilio console).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== 'string') {
      return new Response(JSON.stringify({ error: 'phone is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!;

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Twilio Verify error: ${errText}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
