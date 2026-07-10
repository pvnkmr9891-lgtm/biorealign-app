import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { RehabRequest } from '@/hooks/useRehab';

// Simple, self-contained receipt — not a formal tax invoice (no GST/business
// registration fields), just a shareable record of what was paid for a
// rehab session/package. Generated on-device via expo-print, then handed to
// the OS share sheet (expo-sharing) so the client can save or forward it.
export async function shareRehabReceipt(request: RehabRequest, clientName: string) {
  const paidOn = request.responded_at
    ? new Date(request.responded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(request.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #111;">
        <h1 style="font-size: 22px; margin-bottom: 4px;">BioRealign</h1>
        <p style="color: #666; margin-top: 0;">Recovery session receipt</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        <table style="width: 100%; font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #666; width: 140px;">Client</td><td>${escapeHtml(clientName)}</td></tr>
          <tr><td style="color: #666;">Package</td><td>${escapeHtml(request.package?.label ?? '—')}</td></tr>
          <tr><td style="color: #666;">Issue</td><td>${escapeHtml(request.issue_description)}</td></tr>
          <tr><td style="color: #666;">Payment method</td><td>${escapeHtml(request.payment_method ?? '—')}</td></tr>
          <tr><td style="color: #666;">Date</td><td>${paidOn}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        <p style="font-size: 13px; color: #666;">Amount paid</p>
        <p style="font-size: 28px; font-weight: 600; margin-top: 4px;">₹${request.quoted_price ?? 0}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'BioRealign receipt' });
  }
  return uri;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
