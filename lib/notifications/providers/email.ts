import type { NotificationPayload, NotificationProvider, NotificationResult } from '../types';

export class EmailNotificationProvider implements NotificationProvider {
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const recipientEmail = payload.recipientEmail?.trim();

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return {
        channel: 'email',
        success: false,
        skipped: true,
        error: 'Invalid or missing email recipient address.',
      };
    }

    const apiKey = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;

    if (!apiKey && !smtpHost) {
      // Clean fallback boundary when provider is unconfigured
      return {
        channel: 'email',
        success: false,
        skipped: true,
        error: 'Email provider credentials (BREVO_API_KEY / RESEND_API_KEY / SMTP_HOST) are not configured.',
      };
    }

    try {
      if (process.env.BREVO_API_KEY) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'Kishwar Portal',
              email: process.env.EMAIL_FROM || 'noreply@kishwar.org',
            },
            to: [{ email: recipientEmail, name: payload.recipientName }],
            subject: payload.subject,
            textContent: payload.message,
          }),
        });

        if (!response.ok) {
          const errData = await response.text();
          console.error('[email-provider] Brevo API Error:', response.status);
          return {
            channel: 'email',
            success: false,
            error: `Brevo email dispatch failed with status ${response.status}`,
          };
        }

        return { channel: 'email', success: true };
      }

      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Kishwar <onboarding@resend.dev>',
            to: [recipientEmail],
            subject: payload.subject,
            text: payload.message,
          }),
        });

        if (!response.ok) {
          console.error('[email-provider] Resend API Error:', response.status);
          return {
            channel: 'email',
            success: false,
            error: `Resend email dispatch failed with status ${response.status}`,
          };
        }

        return { channel: 'email', success: true };
      }

      return {
        channel: 'email',
        success: false,
        skipped: true,
        error: 'Unsupported email provider configuration.',
      };
    } catch (err: any) {
      console.error('[email-provider] Network or delivery failure');
      return {
        channel: 'email',
        success: false,
        error: err?.message || 'Email delivery failed.',
      };
    }
  }
}

export const emailProvider = new EmailNotificationProvider();
