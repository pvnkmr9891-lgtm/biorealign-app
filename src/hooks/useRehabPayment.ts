import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { rehabKeys } from '@/hooks/useRehab';

// Opens Razorpay Checkout for an accepted Recovery request's quoted price.
// payment_status is the source of truth for whether slot confirmation is
// allowed — this mutation flips it via rehab-verify-payment immediately on
// success, with the rehab-payment-webhook edge function as the authoritative
// fallback (covers the case where the app is killed before this resolves).
export function usePayForRehabRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, clientName }: { requestId: string; clientName?: string }) => {
      const { data: order, error: orderErr } = await supabase.functions.invoke('rehab-create-payment-order', { body: { requestId } });
      if (orderErr) {
        const body = await (orderErr as any)?.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? orderErr.message);
      }
      if (order?.error) throw new Error(order.error);

      // Lazy require, not a top-level import: react-native-razorpay touches a
      // native module at import time, which doesn't exist in Expo Go. A
      // static import crashes the entire app (Expo Router eagerly loads every
      // route file to build the route tree, including this hook's importer,
      // app/(client)/recovery.tsx). Deferring the require until the payment
      // button is actually pressed means Expo Go can still run everything
      // else; this flow itself still needs a native dev build to work.
      const RazorpayCheckout = require('react-native-razorpay').default;
      const checkoutResult = await RazorpayCheckout.open({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'BioRealign',
        description: 'In-person Recovery session',
        prefill: { name: clientName, email: user?.email ?? undefined },
        theme: { color: '#00C4B4' },
      });

      const { data: verify, error: verifyErr } = await supabase.functions.invoke('rehab-verify-payment', {
        body: {
          requestId,
          razorpay_order_id: checkoutResult.razorpay_order_id,
          razorpay_payment_id: checkoutResult.razorpay_payment_id,
          razorpay_signature: checkoutResult.razorpay_signature,
        },
      });
      if (verifyErr) {
        const body = await (verifyErr as any)?.context?.json?.().catch(() => null);
        throw new Error(body?.error ?? verifyErr.message);
      }
      if (verify?.error) throw new Error(verify.error);
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: rehabKeys.myRequests(user.id) });
    },
  });
}
