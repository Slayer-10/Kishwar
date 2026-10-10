export type NotificationChannel = 'email' | 'whatsapp';

export type NotificationEvent =
  | 'registration_submitted'
  | 'registration_approved'
  | 'registration_rejected'
  | 'invoice_generated'
  | 'payment_confirmed'
  | 'registration_verified';

export type NotificationPayload = {
  event: NotificationEvent;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  subject: string;
  message: string;
  actionUrl?: string;
  idempotencyKey?: string;
};

export type NotificationResult = {
  channel: NotificationChannel;
  success: boolean;
  skipped?: boolean;
  error?: string;
};

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<NotificationResult>;
}
