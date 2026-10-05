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

// In-memory store for real-time Kardex synchronization with Google Sheets
let cachedKardexEntries: any[] = [
  {
    fecha: new Date().toISOString(),
    tipoEvento: 'prestamo',
    codigoActivoFisico: 'DAD-IMP-1/2-17MM-001',
    descripcion: 'Dado de impacto 17mm encastre 1/2',
    tecnicoDni: '45892301',
    tecnicoNombre: 'Juan Carlos Pérez Huamán',
    ordenTrabajo: 'OT-4921 Mantenimiento Pala 3',
    almaceneroNombre: 'Álvaro Aragón (Pañolero Central)',
    valeId: 'VALE-8901',
    condicion: 'operativo',
    observaciones: 'Despacho conforme con firma biométrica digital',
  },
  {
    fecha: new Date(Date.now() - 3600000 * 2).toISOString(),
    tipoEvento: 'calibracion',
    codigoActivoFisico: 'TORQ-SNA-001',
    descripcion: 'Torquímetro Digital 1/2 Snap-on 20-250 FT-LB',
    tecnicoDni: '-',
    tecnicoNombre: '-',
    ordenTrabajo: 'CERT-2025-089',
    almaceneroNombre: 'Guido Pfari (Pañolero Turno B)',
    valeId: '-',
    condicion: 'operativo',
    observaciones: 'Calibración vigente INACAL / Tolerancia ± 2% Conforme',
  },
  {
    fecha: new Date(Date.now() - 86400000).toISOString(),
    tipoEvento: 'entrada_inicial',
    codigoActivoFisico: 'MED-VER-MIT-001',
    descripcion: 'Vernier Digital Mitutoyo 0-150mm (0.01mm)',
    tecnicoDni: '-',
    tecnicoNombre: '-',
    ordenTrabajo: '-',
    almaceneroNombre: 'Álvaro Aragón (Pañolero Central)',
    valeId: '-',
    condicion: 'operativo',
    observaciones: 'Incorporación a tablero de instrumentos calibrados',
  },
];

// Endpoint for frontend to sync current Kardex state to backend
app.post('/api/kardex/sync', (req, res) => {
  try {
    const { entries } = req.body;
    if (Array.isArray(entries) && entries.length > 0) {
      cachedKardexEntries = entries;
    }
    res.json({ success: true, count: cachedKardexEntries.length });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: 'Error al sincronizar Kardex' });
  }
});

// Dynamic CSV Endpoint for Google Sheets =IMPORTDATA(".../api/kardex/export-csv")
app.get('/api/kardex/export-csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Disposition', 'inline; filename="kardex_panolpro.csv"');

  const headers = [
    'FECHA_HORA',
    'TIPO_EVENTO',
    'CODIGO_ACTIVO',
    'DESCRIPCION',
    'TECNICO_DNI',
    'TECNICO_NOMBRE',
    'ORDEN_TRABAJO',
    'ENCARGADO_TURNO',
    'N_VALE',
    'CONDICION',
    'OBSERVACIONES',
  ];

  const rows = cachedKardexEntries.map((e) => {
    const clean = (val: unknown) => `"${String(val || '-').replace(/"/g, '""')}"`;
    return [
      clean(e.fecha),
      clean((e.tipoEvento || '').toUpperCase()),
      clean(e.codigoActivoFisico),
      clean(e.descripcion),
      clean(e.tecnicoDni),
      clean(e.tecnicoNombre),
      clean(e.ordenTrabajo),
      clean(e.almaceneroNombre),
      clean(e.valeId),
      clean(e.condicion || 'OPERATIVO'),
      clean(e.observaciones),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures special characters like tildes and ñ display cleanly in Google Sheets
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  res.send(csvContent);
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
