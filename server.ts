import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { processEmailDispatch, EmailPayload } from './src/server/emailSender';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Real Serverless / Backend Route for Sending Email
app.post('/api/send-email', async (req, res) => {
  try {
    const payload = req.body as EmailPayload;
    const result = await processEmailDispatch(payload);
    res.status(result.statusCode).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado en el servidor';
    res.status(500).json({
      statusCode: 500,
      success: false,
      error: `Error interno: ${message}`,
    });
  }
});

// Endpoint for Google Sheets =IMPORTDATA(".../api/kardex/export-csv")
app.get('/api/kardex/export-csv', (_req, res) => {
  const csvHeaders = 'FECHA_HORA,TIPO_EVENTO,CODIGO_ACTIVO,DESCRIPCION,TECNICO_DNI,TECNICO_NOMBRE,ORDEN_TRABAJO,ENCARGADO_TURNO,OBSERVACIONES\n';
  const sampleRows = [
    `"${new Date().toISOString()}","DESPACHO_SALIDA","DAD-IMP-1/2-17MM-001","Dado de Impacto 17mm 1/2","45892301","Juan Carlos Pérez Huamán","OT-4921 Mantenimiento Pala 3","Álvaro Aragón (Pañolero Central)","Despacho conforme con firma digital"`,
    `"${new Date(Date.now() - 3600000).toISOString()}","ENTRADA_INICIAL","TORQ-SNA-001","Torquímetro Digital 1/2 Snap-on 20-250 FT-LB","-","-","-","Guido Pfari (Pañolero Turno B)","Calibración vigente INACAL CERT-2025-089"`
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="kardex_panolpro.csv"');
  res.send(csvHeaders + sampleRows);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PanolPro Workshop Engine' });
});

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
