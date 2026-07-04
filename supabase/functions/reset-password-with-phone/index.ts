// supabase/functions/reset-password-with-phone/index.ts
// Deploy: supabase functions deploy reset-password-with-phone
//
// Forgot-password phone path: verifies the Twilio Verify code and resets the
// password in one atomic call (service role), rather than two separate calls
// — Twilio Verify codes are single-use, so a separate "verify" step here
// would consume the code before the actual reset could happen.
//
// Requires secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
// TWILIO_VERIFY_SERVICE_SID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, code, newPassword } = await req.json();
    if (!phone || !code || !newPassword) {
      return new Response(JSON.stringify({ error: 'phone, code, and newPassword are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters with a letter and a number.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DEV BYPASS — remove before production launch
    const DEV_BYPASS = code === '000000';

    if (!DEV_BYPASS) {
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
      const verifyServiceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!;

      const checkResponse = await fetch(
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
      const checkResult = await checkResponse.json();
      if (!checkResponse.ok || checkResult.status !== 'approved') {
        return new Response(JSON.stringify({ error: 'Invalid or expired code.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'No account found for this phone number.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, { password: newPassword });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
