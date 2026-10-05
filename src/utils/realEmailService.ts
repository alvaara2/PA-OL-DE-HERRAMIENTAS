import { EmailSettings } from '../types/workshop';

export interface SendEmailOptions {
  to: string[] | string;
  subject: string;
  html: string;
  text?: string;
  settings?: EmailSettings;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  statusCode: number;
  data?: unknown;
}

const STORAGE_RESEND_KEY = 'panolpro_resend_api_key';
const STORAGE_RESEND_SENDER = 'panolpro_resend_sender';

export function getStoredResendApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_RESEND_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredResendApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_RESEND_KEY, key.trim());
  } catch {
    // ignore
  }
}

export function getStoredResendSender(): string {
  try {
    return localStorage.getItem(STORAGE_RESEND_SENDER) || 'Almacen Central <onboarding@resend.dev>';
  } catch {
    return 'Almacen Central <onboarding@resend.dev>';
  }
}

export function saveStoredResendSender(sender: string): void {
  try {
    localStorage.setItem(STORAGE_RESEND_SENDER, sender.trim());
  } catch {
    // ignore
  }
}

/**
 * Dispatches a real email request to the serverless /api/send-email route.
 * Waits for real server response and surfaces exact server errors if unsuccessful.
 */
export async function sendRealEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  const { to, subject, html, text, settings } = options;

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);

  if (recipients.length === 0) {
    throw new Error('Debe especificar al menos un destinatario.');
  }

  // Retrieve API key from settings or localStorage
  const apiKey =
    settings?.resendApiKey?.trim() ||
    getStoredResendApiKey() ||
    (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '');

  const fromSender =
    settings?.resendSender?.trim() ||
    getStoredResendSender() ||
    'Almacen Central <onboarding@resend.dev>';

  const smtpUser = settings?.remitente?.trim();
  const smtpPass = settings?.passwordApp?.trim();

  const payload = {
    apiKey,
    from: fromSender,
    to: recipients,
    subject,
    html,
    text,
    smtpUser,
    smtpPass,
  };

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let responseData: any = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const errorDetail =
      responseData?.error ||
      responseData?.message ||
      response.statusText ||
      `Error de red ${response.status}`;
    throw new Error(`Error ${response.status}: ${errorDetail}`);
  }

  return {
    success: true,
    statusCode: response.status,
    message:
      responseData?.message ||
      `Correo real enviado con éxito a ${recipients.length} destinatarios.`,
    data: responseData?.data,
  };
}
