// supabase/functions/verify-phone-otp/index.ts
// Deploy: supabase functions deploy verify-phone-otp
//
// Checks a Twilio Verify code. Used ONLY by the signup phone-verification
// step (Part 2) — on success the client (already authenticated from
// supabase.auth.signUp) marks its own profile phone_verified=true directly,
// no extra DB write needed here. The forgot-password phone path does NOT
// use this function — see reset-password-with-phone, which verifies and
// resets the password atomically so the Twilio code (single-use) isn't
// consumed twice across two separate calls.
//
// Requires secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_VERIFY_SERVICE_SID.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: 'phone and code are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!;

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      }
    );

    const result = await response.json();
    const valid = response.ok && result.status === 'approved';

    return new Response(JSON.stringify({ valid }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
