// supabase/functions/rehab-create-payment-order/index.ts
// Deploy: supabase functions deploy rehab-create-payment-order
//
// Creates a Razorpay order for an accepted Recovery request's quoted price.
// The client then opens Razorpay Checkout with the returned order id.
//
// Requires secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { data: request, error: reqErr } = await supabase
      .from('rehab_requests')
      .select('id, status, quoted_price, payment_status, client_id')
      .eq('id', requestId)
      .eq('client_id', clientId)
      .single();
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.status !== 'accepted' || !request.quoted_price) {
      return new Response(JSON.stringify({ error: 'This request has not been accepted with a price yet.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (request.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'This request has already been paid.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Payments are not configured yet — RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are not set.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const amountPaise = Math.round(Number(request.quoted_price) * 100);
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: requestId,
        notes: { rehab_request_id: requestId, client_id: clientId },
      }),
    });
    if (!orderRes.ok) {
      const detail = await orderRes.text();
      console.error('[rehab-create-payment-order] Razorpay error', detail);
      return new Response(JSON.stringify({ error: 'Could not start payment. Please try again.', debug: detail.slice(0, 300) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const order = await orderRes.json();

    await supabase.from('rehab_requests').update({ razorpay_order_id: order.id }).eq('id', requestId);

    return new Response(JSON.stringify({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[rehab-create-payment-order] error', (err as Error).message);
    return new Response(JSON.stringify({ error: 'Something went wrong starting payment.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
