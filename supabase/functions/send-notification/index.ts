// supabase/functions/send-notification/index.ts
// Deploy: supabase functions deploy send-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  segment: 'all' | 'active';
  // Optional: target a single user
  userId?: string;
  // Optional: send WhatsApp too
  sendWhatsApp?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: NotificationPayload = await req.json();
    const { title, body, segment, userId, sendWhatsApp } = payload;

    // Get push tokens from profiles
    let query = supabase.from('profiles').select('id, phone, push_token');

    if (userId) {
      query = query.eq('id', userId);
    } else if (segment === 'active') {
      // Only clients with active enrollments
      const { data: activeClients } = await supabase
        .from('enrollments')
        .select('client_id')
        .eq('status', 'active');

      const ids = activeClients?.map((e: any) => e.client_id) ?? [];
      query = query.in('id', ids);
    } else {
      query = query.eq('role', 'client');
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Filter users with push tokens
    const tokensToNotify = users?.filter((u: any) => u.push_token) ?? [];

    let pushResult = { sent: 0, failed: 0 };
    let whatsappResult = { sent: 0, failed: 0 };

    // Send Expo push notifications
    if (tokensToNotify.length > 0) {
      const messages = tokensToNotify.map((u: any) => ({
        to: u.push_token,
        sound: 'default',
        title,
        body,
        data: { screen: 'checkin' },
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      pushResult.sent   = tickets.filter((t: any) => t.status === 'ok').length;
      pushResult.failed = tickets.filter((t: any) => t.status !== 'ok').length;
    }

    // Send WhatsApp via Twilio (optional)
    if (sendWhatsApp) {
      const phoneNumbers = users?.filter((u: any) => u.phone) ?? [];
      const accountSid   = Deno.env.get('TWILIO_ACCOUNT_SID')!;
      const authToken    = Deno.env.get('TWILIO_AUTH_TOKEN')!;
      const fromNumber   = Deno.env.get('TWILIO_WHATSAPP_FROM')!;

      for (const user of phoneNumbers) {
        try {
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: `whatsapp:${fromNumber}`,
                To:   `whatsapp:${user.phone}`,
                Body: `*${title}*\n\n${body}`,
              }),
            }
          );
          if (response.ok) whatsappResult.sent++;
          else whatsappResult.failed++;
        } catch {
          whatsappResult.failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        push:     pushResult,
        whatsapp: whatsappResult,
        usersTargeted: users?.length ?? 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
