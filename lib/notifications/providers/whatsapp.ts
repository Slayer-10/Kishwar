import type { NotificationPayload, NotificationProvider, NotificationResult } from '../types';

export class WhatsAppNotificationProvider implements NotificationProvider {
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return '';
    // Default to Pakistan country code 92 if local 03xx number provided
    if (cleaned.startsWith('03') && cleaned.length === 11) {
      return '92' + cleaned.slice(1);
    }
    return cleaned;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const rawPhone = payload.recipientPhone?.trim();

    if (!rawPhone) {
      return {
        channel: 'whatsapp',
        success: false,
        skipped: true,
        error: 'No recipient phone number provided.',
      };
    }

    const formattedPhone = this.formatPhoneNumber(rawPhone);

    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        channel: 'whatsapp',
        success: false,
        skipped: true,
        error: 'Invalid recipient phone number format.',
      };
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

    const whatsappToken = process.env.WHATSAPP_API_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if ((!twilioSid || !twilioAuthToken) && (!whatsappToken || !whatsappPhoneId)) {
      return {
        channel: 'whatsapp',
        success: false,
        skipped: true,
        error: 'WhatsApp provider credentials (TWILIO / Meta Cloud API) are not configured.',
      };
    }

    try {
      if (twilioSid && twilioAuthToken && twilioFrom) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');

        const params = new URLSearchParams({
          From: twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`,
          To: `whatsapp:+${formattedPhone}`,
          Body: `${payload.subject}\n\n${payload.message}`,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          console.error('[whatsapp-provider] Twilio API Error status:', response.status);
          return {
            channel: 'whatsapp',
            success: false,
            error: `Twilio WhatsApp dispatch failed with status ${response.status}`,
          };
        }

        return { channel: 'whatsapp', success: true };
      }

      if (whatsappToken && whatsappPhoneId) {
        const url = `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: `${payload.subject}\n\n${payload.message}` },
          }),
        });

        if (!response.ok) {
          console.error('[whatsapp-provider] Meta Cloud API Error status:', response.status);
          return {
            channel: 'whatsapp',
            success: false,
            error: `Meta WhatsApp dispatch failed with status ${response.status}`,
          };
        }

        return { channel: 'whatsapp', success: true };
      }

      return {
        channel: 'whatsapp',
        success: false,
        skipped: true,
        error: 'Unsupported WhatsApp provider configuration.',
      };
    } catch (err: any) {
      console.error('[whatsapp-provider] Network or delivery failure');
      return {
        channel: 'whatsapp',
        success: false,
        error: err?.message || 'WhatsApp delivery failed.',
      };
    }
  }
}

export const whatsappProvider = new WhatsAppNotificationProvider();
