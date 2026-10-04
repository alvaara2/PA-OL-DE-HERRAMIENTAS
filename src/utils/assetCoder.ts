import { AssetCategory } from '../types/workshop';

// Brand abbreviations mapping
const BRAND_MAP: Record<string, string> = {
  dewalt: 'DEW',
  bosch: 'BOS',
  makita: 'MAK',
  milwaukee: 'MIL',
  snapon: 'SNA',
  'snap-on': 'SNA',
  stanley: 'STA',
  proto: 'PRO',
  'ingersoll rand': 'ING',
  ingersoll: 'ING',
  bahco: 'BAH',
  truper: 'TRU',
  fluke: 'FLU',
  urrea: 'URR',
  blackanddecker: 'BND',
  craftsman: 'CRA',
  gedore: 'GED',
  knipex: 'KNI',
  facom: 'FAC',
  channellock: 'CHA',
  hilti: 'HIL',
};

// Clean string for regex
function cleanText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Extracts drive/encastre from text (e.g. 1/2", 3/4, 3/8, 1/4, 1 pulgada)
 */
export function extractDrive(text: string): string | null {
  const upper = cleanText(text);
  if (/3\/4/.test(upper)) return '3/4';
  if (/1\/2/.test(upper)) return '1/2';
  if (/3\/8/.test(upper)) return '3/8';
  if (/1\/4/.test(upper)) return '1/4';
  if (/1\s*["”']|1\s*PULG|1\s*IN|ENCASTRE\s*1\b/.test(upper)) return '1';
  return null;
}

/**
 * Extracts size/medida from text (e.g. 17mm, 24 mm, 9/16", 10 in)
 */
export function extractMeasurement(text: string): string | null {
  const upper = cleanText(text);
  
  // Millimeters e.g. 17MM, 24 MM, 32MM
  const mmMatch = upper.match(/(\d{1,2}(?:\.\d)?)\s*(?:MM|MILIMETROS|MILIMETRO)\b/);
  if (mmMatch) {
    return `${mmMatch[1]}MM`;
  }

  // Common millimeters without explicit "mm" if preceded by "dado" or "llave"
  const plainNumMatch = upper.match(/(?:DADO|LLAVE|COPA)\s+(?:DE\s+)?(?:IMPACTO\s+)?(\d{1,2})\b/);
  if (plainNumMatch && parseInt(plainNumMatch[1], 10) >= 6 && parseInt(plainNumMatch[1], 10) <= 60) {
    return `${plainNumMatch[1]}MM`;
  }

  // Inches fractional e.g. 9/16, 11/16, 5/8, 3/4, 1-1/8
  const inchMatch = upper.match(/(\d+\/\d+|\d+-\d+\/\d+)\s*(?:IN|PULG|["”'])?/);
  if (inchMatch && inchMatch[1] !== '1/2' && inchMatch[1] !== '3/8' && inchMatch[1] !== '3/4' && inchMatch[1] !== '1/4') {
    return `${inchMatch[1].replace('/', '_')}IN`;
  }

  // Torx or Allen sizes e.g. T40, T50, E14, H8
  const torxMatch = upper.match(/\b(T\d{2}|E\d{2}|H\d{1,2})\b/);
  if (torxMatch) {
    return torxMatch[1];
  }

  // Extension length e.g. 10", 5", 3 pulg
  const extLength = upper.match(/(\d{1,2})\s*(?:IN|PULG|["”']|PULGADAS)\b/);
  if (extLength) {
    return `${extLength[1]}IN`;
  }

  return null;
}

/**
 * Normalizes brand to a standard 3-4 letter uppercase abbreviation
 */
export function getBrandAbbr(rawBrand: string): string {
  if (!rawBrand) return 'GEN';
  const clean = rawBrand.toLowerCase().trim();
  for (const [key, abbr] of Object.entries(BRAND_MAP)) {
    if (clean.includes(key)) return abbr;
  }
  // Fallback: first 3 alphanumeric characters
  const alphanumeric = clean.replace(/[^a-z0-9]/g, '');
  return (alphanumeric.slice(0, 3) || 'GEN').toUpperCase();
}

/**
 * Categorize tool by text description
 */
export function detectCategory(text: string): AssetCategory {
  const upper = cleanText(text);

  if (/DADO.*IMPACTO|IMPACTO.*DADO/.test(upper)) return 'dado_impacto';
  if (/DADO|BOCALLAVE|CUBO/.test(upper)) return 'dado_estandar';
  if (/EXTENSION|PROLONGADOR|BARRA\s+EXT/.test(upper)) return 'extension';
  if (/TORQUIMETRO|TORQUIMETRO|LLAVE\s+DINAMOMETRICA|TORQUE/.test(upper)) return 'torquimetro';
  if (/LLAVE\s+COMBINADA|LLAVE\s+CORONA|LLAVE\s+BOCA|LLAVE\s+MIXTA|LLAVE\s+FRANCESA|LLAVE\s+STILLSON/.test(upper)) return 'llave_combinada';
  if (/COPA|PUNTA\s+TORX|PUNTA\s+HEX|ADAPTADOR|JUNTA\s+CARDAN/.test(upper)) return 'copa_accesorio';
  if (/TALADRO|ROTO\s*MARTILLO|ATORNILLADOR/.test(upper)) return 'herramienta_electrica';
  if (/AMOLADORA|ESMERIL|PULIDORA/.test(upper)) return 'herramienta_electrica';
  if (/PISTOLA\s+IMPACTO|LLAVE\s+NEUMATICA|NEUMATICO|COMPRESOR/.test(upper)) return 'herramienta_neumatica';
  if (/SIERRA|CALADORA|TRONZADORA|INGLETADORA/.test(upper)) return 'herramienta_electrica';
  if (/ALICATE|DESTORNILLADOR|MARTILLO|COMBA|ARCO\s+SIERRA/.test(upper)) return 'herramienta_manual';
  
  return 'otro';
}

export interface AutoCodeParams {
  descripcion: string;
  marca?: string;
  medida?: string;
  encastre?: string;
  categoria?: AssetCategory;
  esImpacto?: boolean;
}

/**
 * Primary industrial coding generator complying with Workshop physical asset standards:
 * - Dados / Accesorios: [TIPO]-[ENCASTRE]-[MEDIDA]-[CORRELATIVO]
 * - Herramientas: [FAMILIA]-[MARCA]-[CORRELATIVO]
 */
export function generateBaseAssetCode(params: AutoCodeParams): string {
  const desc = params.descripcion || '';
  const upperDesc = cleanText(desc);
  const detectedCat = params.categoria || detectCategory(desc);
  const isImpact = params.esImpacto ?? /IMPACTO/.test(upperDesc);
  const brandAbbr = getBrandAbbr(params.marca || '');
  const encastre = params.encastre || extractDrive(desc) || '1/2';
  const medida = params.medida || extractMeasurement(desc) || 'EST';

  // Rule 1: DADOS
  if (detectedCat === 'dado_impacto' || (detectedCat === 'dado_estandar' && isImpact)) {
    return `DAD-IMP-${encastre.replace(/["'\s]/g, '')}-${medida}`;
  }
  if (detectedCat === 'dado_estandar') {
    return `DAD-${encastre.replace(/["'\s]/g, '')}-${medida}`;
  }

  // Rule 2: EXTENSIONES
  if (detectedCat === 'extension') {
    const extLen = extractMeasurement(desc) || '10IN';
    return `EXT-${encastre.replace(/["'\s]/g, '')}-${extLen}`;
  }

  // Rule 3: LLAVES COMBINADAS
  if (detectedCat === 'llave_combinada') {
    return `LLAV-COMB-${medida}`;
  }

  // Rule 4: COPAS Y ACCESORIOS (Torx, Cardan, etc.)
  if (detectedCat === 'copa_accesorio') {
    if (/CARDAN|UNIVERSAL/.test(upperDesc)) return `CARD-${encastre.replace(/["'\s]/g, '')}`;
    if (/RATCHET|TRINQUETE|CARRACA/.test(upperDesc)) return `RAC-${encastre.replace(/["'\s]/g, '')}`;
    return `COPA-${encastre.replace(/["'\s]/g, '')}-${medida}`;
  }

  // Rule 5: HERRAMIENTAS ELÉCTRICAS / NEUMÁTICAS / TORQUÍMETROS
  let family = 'HERR';
  if (/TORQUIMETRO|TORQUIMETRO|DINAMOMETRICA/.test(upperDesc) || detectedCat === 'torquimetro') {
    family = 'TORQ';
  } else if (/TALADRO|ROTO\s*MARTILLO/.test(upperDesc)) {
    family = 'TAL';
  } else if (/AMOLADORA|ESMERIL/.test(upperDesc)) {
    family = 'AMO';
  } else if (/PISTOLA|LLAVE\s+NEUMATICA/.test(upperDesc) || detectedCat === 'herramienta_neumatica') {
    family = 'PIST';
  } else if (/SIERRA|CALADORA/.test(upperDesc)) {
    family = 'SIER';
  } else if (/MULTIMETRO|TESTER|PINZA\s+AMPERIMETRICA/.test(upperDesc)) {
    family = 'MULT';
  } else if (/LIJADORA/.test(upperDesc)) {
    family = 'LIJ';
  } else if (/COMPRESOR/.test(upperDesc)) {
    family = 'COMP';
  } else if (/PRENSA|EXTRACTOR/.test(upperDesc)) {
    family = 'PRE';
  } else if (/MARTILLO|COMBA/.test(upperDesc)) {
    family = 'MAR';
  }

  return `${family}-${brandAbbr}`;
}

/**
 * Generates the complete unique physical asset code with sequential correlative suffix (e.g. -001, -002)
 * Ensures uniqueness against existing physical codes in the workshop inventory.
 */
export function generateUniquePhysicalCode(
  params: AutoCodeParams,
  existingCodes: string[]
): string {
  const base = generateBaseAssetCode(params);
  
  // Find highest existing correlative for this base pattern
  let maxNum = 0;
  const escapedBase = base.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`^${escapedBase}-(\\d{3,4})$`, 'i');

  existingCodes.forEach((code) => {
    const match = code.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  const formattedSuffix = nextNum.toString().padStart(3, '0');
  return `${base}-${formattedSuffix}`;
}

/**
 * Suggested shadow board / rack location based on tool type
 */
export function suggestLocation(category: AssetCategory, isImpact: boolean): string {
  switch (category) {
    case 'dado_impacto':
      return 'Tablero Sombra #1 - Bahía Pesada (Ganchos 01-12)';
    case 'dado_estandar':
      return 'Gaveta Métricas 02 - Pañol Central';
    case 'extension':
      return 'Panel Vertical #3 - Accesorios Encastre';
    case 'llave_combinada':
      return 'Tablero Sombra #2 - Llaves Milimétricas';
    case 'torquimetro':
      return 'Caja Acolchada de Calibración - Estante A-1';
    case 'herramienta_electrica':
      return 'Estante E-2 - Estación de Carga & Baterías';
    case 'herramienta_neumatica':
      return 'Bahía Neumática #4 - Mangueras y Lubricadores';
    case 'copa_accesorio':
      return 'Gaveta de Especiales - Organizador 05';
    default:
      return 'Estante General C-1';
  }
}
