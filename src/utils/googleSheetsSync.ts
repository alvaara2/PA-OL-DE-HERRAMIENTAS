import { KardexEntry, PhysicalAsset, Technician } from '../types/workshop';

export const GOOGLE_APPS_SCRIPT_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbyTk9GPiRK3XnEtzCrwqtAgDIB2vw_fkdb4rNe4Sa3LcfOePl4JIPKQrCd0ePBplVJq/exec';

export const GOOGLE_SHEETS_KARDEX_VIEW_URL =
  'https://docs.google.com/spreadsheets/d/1v1bnjUKBr4r3HrJ75VUCgCUqAKBTuPUiuqSNXbyAc2E/edit';

export type GoogleSheetTab = 'Kardex' | 'Herramientas' | 'Personal';

/**
 * Función principal y canónica de sincronización con Google Sheets
 * Utiliza 'text/plain;charset=utf-8' y 'no-cors' para evitar preflight OPTIONS de CORS en el navegador.
 */
export async function syncToGoogleSheets(hoja: GoogleSheetTab | string, filaArray: any[]): Promise<boolean> {
  try {
    await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', // Evita el bloqueo del navegador
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        hoja: hoja, // 'Kardex', 'Herramientas', o 'Personal'
        fila: filaArray,
      }),
    });
    console.log(`[Google Sheets] Fila enviada con éxito a la hoja: ${hoja}`);
    return true;
  } catch (error) {
    console.error('Error al sincronizar con Google Sheets:', error);
    return false;
  }
}

/**
 * Normaliza el tipo de evento de Kardex a texto legible en español
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
 * Sincroniza un movimiento individual de pañol con la hoja 'Kardex'
 */
export async function dispatchMovementToAppsScript(mov: {
  id: string;
  tipo: string;
  codigoHerramienta: string;
  nombreHerramienta: string;
  dniTecnico?: string;
  nombreTecnico?: string;
  encargadoTurno: string;
  observaciones?: string;
}): Promise<boolean> {
  const fila = [
    mov.id,
    new Date().toLocaleString('es-PE'),
    mov.tipo,
    mov.codigoHerramienta,
    mov.nombreHerramienta,
    mov.dniTecnico || '-',
    mov.nombreTecnico || '-',
    mov.encargadoTurno,
    mov.observaciones || '',
  ];

  return syncToGoogleSheets('Kardex', fila);
}

/**
 * Envia en lote registros de Kardex a Google Sheets
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

/**
 * Sincroniza una herramienta con la hoja 'Herramientas' de Google Sheets
 * Incluye Código Mnemotécnico + DNI Numérico
 */
export async function dispatchToolToAppsScript(asset: PhysicalAsset): Promise<boolean> {
  const dniNum = asset.dniNumerico || '-';
  const fila = [
    asset.id,
    asset.codigoActivoFisico, // Código Mnemotécnico
    dniNum,                  // DNI Numérico Aleatorio
    asset.descripcion,
    asset.categoria,
    asset.marca,
    asset.medida || '-',
    asset.encastre || '-',
    asset.ubicacion,
    asset.estado.toUpperCase(),
    asset.condicionFisica.toUpperCase(),
    asset.calibracion?.requiereCalibracion ? 'SI' : 'NO',
    asset.calibracion?.fechaVencimiento || '-',
    new Date().toLocaleString('es-PE'),
  ];

  return syncToGoogleSheets('Herramientas', fila);
}

/**
 * Sincroniza un trabajador con la hoja 'Personal' de Google Sheets
 */
export async function dispatchWorkerToAppsScript(tech: Technician): Promise<boolean> {
  const fila = [
    tech.id,
    tech.dni,
    tech.nombreCompleto,
    tech.cargo,
    tech.area,
    tech.correo || '-',
    tech.celular || '-',
    tech.activo ? 'ACTIVO' : 'INACTIVO',
    tech.fechaRegistro,
  ];

  return syncToGoogleSheets('Personal', fila);
}
