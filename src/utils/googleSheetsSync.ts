import { KardexEntry } from '../types/workshop';

export const GOOGLE_APPS_SCRIPT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbyTk9GPiRK3XnEtzCrwqtAgDIB2vw_fkdb4rNe4Sa3LcfOePl4JIPKQrCd0ePBplVJq/exec';

export const GOOGLE_SHEETS_KARDEX_VIEW_URL =
  'https://docs.google.com/spreadsheets/d/1v1bnjUKBr4r3HrJ75VUCgCUqAKBTuPUiuqSNXbyAc2E/edit';

export interface MovementPayload {
  id: string;
  tipo: string; // 'Salida', 'Devolución', 'Mantenimiento', etc.
  codigoHerramienta: string;
  nombreHerramienta: string;
  dniTecnico?: string;
  nombreTecnico?: string;
  encargadoTurno: string;
  observaciones?: string;
}

/**
 * Normalizes Kardex entry type into a clean Spanish description
 */
export function formatMovementTypeLabel(tipo: string): string {
  switch (tipo) {
    case 'prestamo':
      return 'Salida / Préstamo';
    case 'devolucion':
      return 'Devolución Conforme';
    case 'calibracion':
      return 'Calibración Metrológica';
    case 'mantenimiento':
      return 'Envío a Mantenimiento';
    case 'entrada_inicial':
      return 'Entrada Inicial';
    case 'baja':
      return 'Baja Definitiva';
    default:
      return tipo.toUpperCase();
  }
}

/**
 * Dispatches a real-time background fetch to the Google Apps Script Webhook
 * Sends { hoja: 'Kardex', fila: [...] } with mode: 'no-cors'
 */
export async function dispatchMovementToAppsScript(mov: MovementPayload): Promise<boolean> {
  const payload = {
    hoja: 'Kardex',
    fila: [
      mov.id,
      new Date().toLocaleString('es-PE'),
      mov.tipo,
      mov.codigoHerramienta,
      mov.nombreHerramienta,
      mov.dniTecnico || '-',
      mov.nombreTecnico || '-',
      mov.encargadoTurno,
      mov.observaciones || '',
    ],
  };

  try {
    await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.warn('Google Apps Script background sync failed (offline or network error):', err);
    return false;
  }
}

/**
 * Helper to dispatch multiple movements in background
 */
export async function dispatchKardexEntriesToAppsScript(
  entries: KardexEntry[],
  fallbackEncargado?: string
): Promise<void> {
  for (const entry of entries) {
    await dispatchMovementToAppsScript({
      id: entry.id,
      tipo: formatMovementTypeLabel(entry.tipoEvento),
      codigoHerramienta: entry.codigoActivoFisico,
      nombreHerramienta: entry.descripcion,
      dniTecnico: entry.tecnicoDni,
      nombreTecnico: entry.tecnicoNombre,
      encargadoTurno: entry.almaceneroNombre || fallbackEncargado || 'Almacenero de Turno',
      observaciones: entry.observaciones,
    });
  }
}
