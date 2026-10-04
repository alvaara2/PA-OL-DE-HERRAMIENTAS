import { CalibrationData, MetrologicalStatus, PhysicalAsset } from '../types/workshop';

export interface CalibrationEvaluation {
  estadoMetrologico: MetrologicalStatus;
  diasRestantes: number;
  estaBloqueadoPorCalibracion: boolean;
  motivoBloqueo?: string;
  badgeTexto: string;
  badgeClase: string;
}

/**
 * Calculates current calibration status and safety loan block
 */
export function evaluateCalibration(
  calibracion?: CalibrationData,
  referenceDate: Date = new Date()
): CalibrationEvaluation {
  if (!calibracion || !calibracion.requiereCalibracion || !calibracion.fechaVencimiento) {
    return {
      estadoMetrologico: 'no_aplica',
      diasRestantes: 9999,
      estaBloqueadoPorCalibracion: false,
      badgeTexto: 'No Aplica',
      badgeClase: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }

  const [year, month, day] = calibracion.fechaVencimiento.split('-').map(Number);
  const expiryDate = new Date(year, month - 1, day, 23, 59, 59);
  const diffMs = expiryDate.getTime() - referenceDate.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    const diasVencidos = Math.abs(diasRestantes);
    return {
      estadoMetrologico: 'vencido',
      diasRestantes,
      estaBloqueadoPorCalibracion: true,
      motivoBloqueo: `EQUIPO BLOQUEADO: Requiere calibración antes de salir a campo (Certificado venció hace ${diasVencidos} día${diasVencidos > 1 ? 's' : ''}).`,
      badgeTexto: `Vencido (${diasVencidos} d)`,
      badgeClase: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    };
  }

  if (diasRestantes <= 30) {
    return {
      estadoMetrologico: 'por_vencer',
      diasRestantes,
      estaBloqueadoPorCalibracion: false,
      badgeTexto: `Por vencer (${diasRestantes} d)`,
      badgeClase: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    };
  }

  return {
    estadoMetrologico: 'vigente',
    diasRestantes,
    estaBloqueadoPorCalibracion: false,
    badgeTexto: `Calibrado (${diasRestantes} d)`,
    badgeClase: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
  };
}

/**
 * Checks if a physical asset can be loaned or is blocked due to expired calibration
 */
export function checkAssetLoanable(asset: PhysicalAsset): { canLoan: boolean; reason?: string } {
  if (asset.estado !== 'disponible') {
    return { canLoan: false, reason: `El activo no está disponible (Estado actual: ${asset.estado.toUpperCase()}).` };
  }

  if (asset.condicionFisica === 'fisurado') {
    return { canLoan: false, reason: 'EQUIPO BLOQUEADO: La pieza se encuentra reportada como FISURADA/ROTA.' };
  }

  const evalCal = evaluateCalibration(asset.calibracion);
  if (evalCal.estaBloqueadoPorCalibracion) {
    return { canLoan: false, reason: evalCal.motivoBloqueo };
  }

  return { canLoan: true };
}
