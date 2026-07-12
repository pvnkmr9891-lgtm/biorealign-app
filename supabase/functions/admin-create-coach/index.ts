// supabase/functions/admin-create-coach/index.ts
// Deploy: supabase functions deploy admin-create-coach
//
// Admin-only: creates a brand-new coach account without an admin ever
// setting or seeing a password. The account gets a random, never-disclosed
// password at creation; the coach activates it themselves via the existing
// Forgot Password -> Phone flow (verifies their phone via OTP, sets their
// own password), then signs in normally with email + that password.
//
// Requires secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userRes, error: userErr } = await callerClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userRes.user) return json(401, { error: 'Not authenticated' });

    const { data: callerProfile } = await callerClient.from('profiles').select('role').eq('id', userRes.user.id).single();
    if (callerProfile?.role !== 'admin') return json(403, { error: 'Admin access required' });

    const { fullName, email, phone } = await req.json();
    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return json(400, { error: 'fullName, email, and phone are required' });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: existingPhone } = await admin.from('profiles').select('id').eq('phone', phone.trim()).maybeSingle();
    if (existingPhone) return json(400, { error: 'That phone number is already registered.' });

    // Random, cryptographically strong, never disclosed to anyone — the
    // coach replaces it via phone-OTP verification before first login.
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });
    if (createErr || !created.user) {
      const friendly = createErr?.message?.includes('already been registered')
        ? 'That email is already registered.'
        : (createErr?.message ?? 'Could not create account');
      return json(400, { error: friendly });
    }

    // handle_new_user trigger already inserted a profiles row (role='client',
    // full_name from user_metadata) — promote it and fill in what the
    // trigger doesn't set. Admin has personally vetted this phone number,
    // so it's marked verified rather than making the coach re-prove it.
    const { error: updateErr } = await admin.from('profiles')
      .update({
        role: 'coach',
        full_name: fullName.trim(),
        phone: phone.trim(),
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq('id', created.user.id);
    if (updateErr) return json(500, { error: updateErr.message });

    return json(200, { success: true, coachId: created.user.id });
  } catch (err) {
    console.error('[admin-create-coach] error', (err as Error).message);
    return json(500, { error: (err as Error).message });
  }
});
