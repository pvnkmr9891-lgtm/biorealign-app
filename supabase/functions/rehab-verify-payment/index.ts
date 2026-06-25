// supabase/functions/rehab-verify-payment/index.ts
// Deploy: supabase functions deploy rehab-verify-payment
//
// Called right after Razorpay Checkout succeeds on-device, so the client
// gets an immediate "paid" state without waiting on webhook delivery.
// The webhook (rehab-payment-webhook) remains the canonical source of truth
// and will also flip payment_status — this is just for fast UX feedback,
// and re-verifies the signature independently rather than trusting the client.
//
// Requires secret: RAZORPAY_KEY_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
    const clientId = userRes.user.id;

    const { requestId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!requestId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: request, error: reqErr } = await supabase
      .from('rehab_requests')
      .select('id, razorpay_order_id, client_id')
      .eq('id', requestId)
      .eq('client_id', clientId)
      .single();
    if (reqErr || !request || request.razorpay_order_id !== razorpay_order_id) {
      return new Response(JSON.stringify({ error: 'Order mismatch' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return new Response(JSON.stringify({ error: 'Payments are not configured yet.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const expectedSignature = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: updateErr } = await supabase
      .from('rehab_requests')
      .update({ payment_status: 'paid', razorpay_payment_id })
      .eq('id', requestId);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[rehab-verify-payment] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong verifying payment.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
