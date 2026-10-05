import { processEmailDispatch, EmailPayload } from '../../../src/server/emailSender';

/**
 * Next.js 14 App Router API Handler
 * Route: POST /app/api/send-email or mapped to /api/send-email
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as EmailPayload;
    const result = await processEmailDispatch(payload);

    return Response.json(result, {
      status: result.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno al procesar el correo';
    return Response.json(
      {
        success: false,
        error: `Error de servidor: ${message}`,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
