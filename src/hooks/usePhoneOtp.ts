import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePhoneOtp() {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
    // DEV BYPASS — skip Twilio send entirely; 000000 is accepted on verify too.
    // Remove both bypasses before production launch.
    return { ok: true };

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-phone-otp', { body: { phone } });
      if (error) return { ok: false, error: error.message };
      if (data?.error) return { ok: false, error: data.error };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Failed to send code.' };
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
    // DEV BYPASS — remove before production launch
    if (code === '000000') return { ok: true };

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone-otp', { body: { phone, code } });
      if (error) return { ok: false, error: error.message };
      if (!data?.valid) return { ok: false, error: 'Incorrect or expired code.' };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Failed to verify code.' };
    } finally {
      setVerifying(false);
    }
  }

  return { sendOtp, verifyOtp, sending, verifying };
}

export async function resetPasswordWithPhone(phone: string, code: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('reset-password-with-phone', { body: { phone, code, newPassword } });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Failed to reset password.' };
  }
}
