if (typeof window !== 'undefined') {
  throw new Error('lib/env.ts must only be imported on the server.');
}

export type EnvConfig = {
  DATABASE_URL: string;
  DIRECT_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  BREVO_API_KEY?: string;
  RESEND_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_NUMBER?: string;
  WHATSAPP_API_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  EMAIL_FROM?: string;
  isEmailConfigured: boolean;
  isWhatsAppConfigured: boolean;
};

function getEnvVar(key: string, required = false): string | undefined {
  const value = process.env[key]?.trim();
  if (required && !value) {
    throw new Error(
      `[env-validation] Critical configuration error: Mandatory environment variable '${key}' is missing or empty.`
    );
  }
  return value || undefined;
}

export function parseEnv(): EnvConfig {
  const databaseUrl = getEnvVar('DATABASE_URL', true)!;
  const directUrl = getEnvVar('DIRECT_URL');
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  const siteUrl = getEnvVar('NEXT_PUBLIC_SITE_URL');

  const brevoApiKey = getEnvVar('BREVO_API_KEY');
  const resendApiKey = getEnvVar('RESEND_API_KEY');

  const twilioSid = getEnvVar('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = getEnvVar('TWILIO_AUTH_TOKEN');
  const whatsappToken = getEnvVar('WHATSAPP_API_TOKEN');
  const whatsappPhoneId = getEnvVar('WHATSAPP_PHONE_NUMBER_ID');

  const isEmailConfigured = Boolean(brevoApiKey || resendApiKey);
  const isWhatsAppConfigured = Boolean((twilioSid && twilioAuthToken) || (whatsappToken && whatsappPhoneId));

  if (!isEmailConfigured) {
    console.warn(
      '[env-validation] Warning: Email notification provider credentials (BREVO_API_KEY / RESEND_API_KEY) are missing. Email notifications will be safely skipped.'
    );
  }

  if (!isWhatsAppConfigured) {
    console.warn(
      '[env-validation] Warning: WhatsApp notification provider credentials (TWILIO / Meta Cloud API) are missing. WhatsApp notifications will be safely skipped.'
    );
  }

  return {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    BREVO_API_KEY: brevoApiKey,
    RESEND_API_KEY: resendApiKey,
    TWILIO_ACCOUNT_SID: twilioSid,
    TWILIO_AUTH_TOKEN: twilioAuthToken,
    TWILIO_WHATSAPP_NUMBER: getEnvVar('TWILIO_WHATSAPP_NUMBER'),
    WHATSAPP_API_TOKEN: whatsappToken,
    WHATSAPP_PHONE_NUMBER_ID: whatsappPhoneId,
    EMAIL_FROM: getEnvVar('EMAIL_FROM'),
    isEmailConfigured,
    isWhatsAppConfigured,
  };
}

export const env = parseEnv();
