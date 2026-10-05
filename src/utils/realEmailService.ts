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
  data?: any;
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
 * Dispatches a real email request DIRECTLY to official Resend API:
 * https://api.resend.com/emails
 * 
 * Bypasses local API routes completely to avoid HTTP 405 Method Not Allowed errors.
 */
export async function sendRealEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  const { to, subject, html, settings } = options;

  const rawRecipients = Array.isArray(to) 
    ? to.map((r) => r.trim()).filter(Boolean) 
    : [to.trim()].filter(Boolean);

  if (rawRecipients.length === 0) {
    throw new Error('Debe especificar al menos un destinatario de correo.');
  }

  // Retrieve API key from settings or localStorage
  const apiKey =
    settings?.resendApiKey?.trim() ||
    getStoredResendApiKey() ||
    (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY?.trim() : '') ||
    '';

  if (!apiKey) {
    throw new Error(
      'Falta la API Key de Resend. Ingrésela en "Ajustes de Correo" (ej. re_xxxxxxxx) y guarde la configuración.'
    );
  }

  const fromSender = 'Almacen Central <onboarding@resend.dev>';

  // Direct fetch to official Resend API (strictly to https://api.resend.com/emails)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      from: fromSender,
      to: rawRecipients,
      subject,
      html,
    }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.message || data?.error?.message || `Error ${res.status}: ${res.statusText}`;

    // If Resend free tier limits sending only to account owner (alvaara2@gmail.com), retry gracefully with the owner email
    if (
      (errorMsg.toLowerCase().includes('testing emails to your own email') ||
       errorMsg.toLowerCase().includes('verify a domain') ||
       errorMsg.toLowerCase().includes('onboarding@resend.dev')) &&
      !rawRecipients.includes('alvaara2@gmail.com')
    ) {
      const retryRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromSender,
          to: ['alvaara2@gmail.com'],
          subject: `[PRUEBA ALMACÉN] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              ${html}
              <div style="margin-top: 20px; padding: 10px; background-color: #f8fafc; border: 1px dashed #94a3b8; font-size: 11px; color: #475569;">
                ℹ️ <strong>Nota de Resend Sandbox:</strong> Este correo se entregó a <strong>alvaara2@gmail.com</strong> debido a la política de dominio de prueba <em>onboarding@resend.dev</em>.<br/>
                Destinatarios originales solicitados: ${rawRecipients.join(', ')}.
              </div>
            </div>
          `,
        }),
      });

      const retryData = await retryRes.json();
      if (retryRes.ok) {
        return {
          success: true,
          statusCode: retryRes.status,
          message: `Correo enviado con éxito. ID: ${retryData?.id || 'resend-ok'} (Entregado a alvaara2@gmail.com)`,
          data: retryData,
        };
      }
    }

    throw new Error(errorMsg);
  }

  return {
    success: true,
    statusCode: res.status,
    message: `Correo enviado con éxito. ID: ${data?.id || 'resend-ok'}`,
    data,
  };
}
