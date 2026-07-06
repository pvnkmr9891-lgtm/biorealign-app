// supabase/functions/rehab-payment-webhook/index.ts
// Deploy: supabase functions deploy rehab-payment-webhook --no-verify-jwt
// Razorpay dashboard → Webhooks → URL: https://<project>.supabase.co/functions/v1/rehab-payment-webhook
// Subscribe to: payment.captured
//
// This is the canonical source of truth for payment_status — rehab-verify-payment
// gives the client immediate feedback, but this webhook is what Razorpay itself
// calls server-to-server, so it's authoritative even if the client never returns
// (app closed mid-payment, network drop, etc). No Supabase JWT is presented here
// (Razorpay calls this directly) — authentication is the HMAC signature check
// below, not auth.getUser().
//
// Requires secrets: RAZORPAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyRazorpaySignature } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('[rehab-payment-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
      return new Response('Webhook not configured', { status: 500 });
    }

    const validSignature = await verifyRazorpaySignature(webhookSecret, rawBody, signature);
    if (!validSignature) {
      console.error('[rehab-payment-webhook] signature mismatch');
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== 'payment.captured') {
      return new Response('ok', { status: 200 }); // ack other events, nothing to do
    }

    const payment = payload.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;
    if (!orderId) return new Response('ok', { status: 200 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('rehab_requests')
      .update({ payment_status: 'paid', razorpay_payment_id: paymentId })
      .eq('razorpay_order_id', orderId);
    if (error) console.error('[rehab-payment-webhook] update failed', error.message);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[rehab-payment-webhook] error', (err as Error).message);
    return new Response('Internal error', { status: 500 });
  }
});
