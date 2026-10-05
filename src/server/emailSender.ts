import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export interface EmailPayload {
  apiKey?: string;
  from?: string;
  to: string[] | string;
  subject: string;
  html: string;
  text?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
}

export interface EmailResult {
  statusCode: number;
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export async function processEmailDispatch(payload: EmailPayload): Promise<EmailResult> {
  const {
    apiKey,
    from,
    to,
    subject,
    html,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPort,
  } = payload;

  const recipients = Array.isArray(to) ? to.map((r) => r.trim()).filter(Boolean) : [to.trim()].filter(Boolean);

  if (recipients.length === 0) {
    return {
      statusCode: 400,
      success: false,
      error: 'Debe especificar al menos un destinatario válido.',
    };
  }

  if (!subject || !html) {
    return {
      statusCode: 400,
      success: false,
      error: 'El asunto y el contenido HTML del correo son obligatorios.',
    };
  }

  const resendKey = apiKey?.trim() || process.env.RESEND_API_KEY?.trim();
  const gmailUser = smtpUser?.trim() || process.env.SMTP_USER?.trim();
  const gmailPass = smtpPass?.trim() || process.env.SMTP_PASS?.trim();

  // Option 1: Dispatch via Resend API
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const sender = from?.trim() || process.env.RESEND_FROM?.trim() || 'Almacen Central <onboarding@resend.dev>';

      const { data, error } = await resend.emails.send({
        from: sender,
        to: recipients,
        subject,
        html,
      });

      if (error) {
        return {
          statusCode: error.name === 'validation_error' ? 400 : 401,
          success: false,
          error: `Resend: ${error.message}`,
        };
      }

      return {
        statusCode: 200,
        success: true,
        message: `Correo real enviado exitosamente a ${recipients.length} destinatarios mediante Resend.`,
        data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        statusCode: 500,
        success: false,
        error: `Error al conectar con el servidor de Resend: ${msg}`,
      };
    }
  }

  // Option 2: Dispatch via Nodemailer (Gmail / SMTP real)
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: smtpHost ? undefined : 'gmail',
        host: smtpHost,
        port: smtpPort || (smtpHost ? 587 : undefined),
        secure: smtpPort === 465,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      // Verify connection configuration
      await transporter.verify();

      const info = await transporter.sendMail({
        from: `Almacén Pañol <${gmailUser}>`,
        to: recipients,
        subject,
        html,
      });

      return {
        statusCode: 200,
        success: true,
        message: `Correo real enviado exitosamente a ${recipients.length} destinatarios mediante SMTP/Gmail.`,
        data: { messageId: info.messageId },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        statusCode: 401,
        success: false,
        error: `Error de autenticación SMTP/Gmail: ${msg}`,
      };
    }
  }

  // No credentials configured
  return {
    statusCode: 400,
    success: false,
    error: 'Configuración requerida: Ingrese su API Key de Resend (o credenciales SMTP) en "Ajustes de Correo" para realizar envíos reales.',
  };
}
