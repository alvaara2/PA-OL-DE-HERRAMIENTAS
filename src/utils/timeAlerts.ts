import { TimeAlertInfo } from '../types/workshop';

export const HOURS_WARNING_THRESHOLD = 18;
export const HOURS_OVERDUE_THRESHOLD = 24;

/**
 * Calculates current time status of a tool in the field relative to 24h limit
 */
export function calculateLoanAlert(
  loanDateIso: string,
  now: Date = new Date()
): TimeAlertInfo {
  const loanTime = new Date(loanDateIso).getTime();
  const currentTime = now.getTime();
  const diffMs = Math.max(0, currentTime - loanTime);

  const totalHours = diffMs / (1000 * 60 * 60);
  const hoursInt = Math.floor(totalHours);
  const minutesInt = Math.floor((totalHours - hoursInt) * 60);

  let estadoSemaforo: 'normal' | 'por_vencer' | 'vencido' = 'normal';
  let horasSobretiempo = 0;
  let textoRetraso: string | undefined = undefined;

  if (totalHours >= HOURS_OVERDUE_THRESHOLD) {
    estadoSemaforo = 'vencido';
    horasSobretiempo = totalHours - HOURS_OVERDUE_THRESHOLD;
    const overHoursInt = Math.floor(horasSobretiempo);
    const overMinInt = Math.floor((horasSobretiempo - overHoursInt) * 60);
    textoRetraso = `+${overHoursInt}h ${overMinInt}m de retraso`;
  } else if (totalHours >= HOURS_WARNING_THRESHOLD) {
    estadoSemaforo = 'por_vencer';
    const remainingHours = HOURS_OVERDUE_THRESHOLD - totalHours;
    const remH = Math.floor(remainingHours);
    const remM = Math.floor((remainingHours - remH) * 60);
    textoRetraso = `Vence en ${remH}h ${remM}m`;
  }

  let textoTiempo = '';
  if (hoursInt >= 24) {
    const days = Math.floor(hoursInt / 24);
    const remH = hoursInt % 24;
    textoTiempo = `${days}d ${remH}h ${minutesInt}m en campo`;
  } else {
    textoTiempo = `${hoursInt}h ${minutesInt}m en campo`;
  }

  return {
    horasTranscurridas: Math.round(totalHours * 10) / 10,
    horasSobretiempo: Math.round(horasSobretiempo * 10) / 10,
    estadoSemaforo,
    textoTiempo,
    textoRetraso,
  };
}

/**
 * Format date for Latin American / Spanish standard displays
 */
export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}
