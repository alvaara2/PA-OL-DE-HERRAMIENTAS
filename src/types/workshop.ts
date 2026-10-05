export type AssetCategory =
  | 'dado_estandar'
  | 'dado_impacto'
  | 'llave_combinada'
  | 'extension'
  | 'torquimetro'
  | 'instrumento_medicion'
  | 'herramienta_electrica'
  | 'herramienta_neumatica'
  | 'herramienta_manual'
  | 'copa_accesorio'
  | 'otro';

export type AssetCondition = 'operativo' | 'desgaste' | 'fisurado' | 'perdido' | 'en_mantenimiento';

export type AssetStatus = 'disponible' | 'prestado' | 'mantenimiento' | 'baja';

export type MetrologicalStatus = 'vigente' | 'por_vencer' | 'vencido' | 'no_aplica';

export interface CalibrationData {
  requiereCalibracion: boolean;
  instrumentoTipo?: string;
  rangoMedicion?: string;
  fechaCalibracion?: string; // YYYY-MM-DD
  fechaVencimiento?: string; // YYYY-MM-DD
  entidadCertificadora?: string; // e.g. INACAL, SGS, Metrología del Sur
  numeroCertificado?: string; // e.g. CERT-CAL-2025-089
  certificadoPdfUrl?: string; // Data URL or URL to PDF
  toleranciaError?: string; // e.g. ± 2%
  observacionesMetrologicas?: string;
}

export interface PhysicalAsset {
  id: string;
  codigoActivoFisico: string; // e.g. DAD-IMP-1/2-17MM-001, TORQ-SNA-001
  descripcion: string;
  categoria: AssetCategory;
  familia: string; // e.g. DADOS, TORQUIMETROS, TALADROS
  marca: string;
  modelo?: string;
  medida?: string; // e.g. 17MM, 19MM, 9/16IN
  encastre?: string; // e.g. 1/4", 3/8", 1/2", 3/4", 1"
  esImpacto: boolean;
  numeroSerie?: string;
  ubicacion: string; // e.g. Tablero Sombra #1, Estante Calibrados A-1
  estado: AssetStatus;
  condicionFisica: AssetCondition;
  fotoUrl?: string;
  notas?: string;
  fechaAlta: string;
  prestamoActivoId?: string;
  
  // Metrological data
  calibracion?: CalibrationData;
  certificadoPdfUrl?: string; // Shortcut to official laboratory calibration certificate PDF Base64
}

export interface StorekeeperProfile {
  id: string;
  dni: string;
  nombreCompleto: string;
  cargo: string;
  firmaBase64?: string; // Stored default signature
  selloBase64?: string; // Stored default stamp
  activo: boolean;
  ultimoTurno?: string;
}

export interface Technician {
  id: string;
  dni: string;
  nombreCompleto: string;
  cargo: string; // e.g. Mecánico Diésel Senior, Electricista, Soldador 6G
  especialidad?: string;
  area: string;
  celular?: string;
  correo?: string;
  fotoUrl?: string;
  activo: boolean;
  fechaRegistro?: string;
}

export interface LoanItem {
  assetId: string;
  codigoActivoFisico: string;
  descripcion: string;
  ubicacion: string;
  condicionSalida: AssetCondition;
  condicionRetorno?: AssetCondition;
  retornado: boolean;
  fechaRetorno?: string;
  observacionesRetorno?: string;
  eraCalibrado?: boolean;
}

export interface LoanDispatch {
  id: string;
  codigoVale: string; // e.g. VALE-2026-0038
  tecnicoDni: string;
  tecnicoNombre: string;
  tecnicoCargo: string;
  tecnicoArea: string;
  ordenTrabajo: string; // e.g. OT-4921 Mantenimiento Pala 3
  items: LoanItem[];
  fechaPrestamo: string; // ISO String
  horaPrestamo: string;
  firmaTecnicoBase64: string;
  
  // Storekeeper (pre-configured)
  almaceneroId: string;
  nombreAlmacenero: string;
  almaceneroDni: string;
  firmaAlmaceneroBase64?: string; // Automatically stamped from storekeeper profile
  
  estado: 'abierto' | 'completado' | 'vencido' | 'parcial';
  observaciones?: string;
  
  // Return information
  devolucionTimestamp?: string;
  receptorDevolucionId?: string;
  nombreReceptorDevolucion?: string;
  firmaReceptorDevolucionBase64?: string;
}

export interface EmailSettings {
  remitente: string; // Mi Correo Electrónico
  passwordApp: string; // Mi Contraseña
  resendApiKey?: string; // API Key de Resend (re_...)
  resendSender?: string; // Remitente de Resend (e.g. Almacen Central <onboarding@resend.dev>)
  destinatario1?: string; // Correo 1 (Supervisor / Jefe de Taller)
  destinatario2?: string; // Correo 2 (Jefe de Almacén)
  destinatario3?: string; // Correo 3 (Seguridad / Calidad)
  destinatario4?: string; // Correo 4 (Copia Almacén / Archivo)
  destinatarios: string[]; // Destinatarios activos combinados
  servidor?: 'gmail' | 'outlook' | 'smtp_custom';
  host?: string;
  puerto?: number;
  seguridadTls?: boolean;
  alertarSobretiempo24h?: boolean;
  alertarCalibracion15dias?: boolean;
  ultimoEnvio?: string;
  ultimoEstado?: 'exito' | 'error' | 'pendiente';
  ultimoMensaje?: string;
}

export interface TimeAlertInfo {
  horasTranscurridas: number;
  horasSobretiempo: number;
  estadoSemaforo: 'normal' | 'por_vencer' | 'vencido';
  textoTiempo: string;
  textoRetraso?: string;
}

// Kardex Movimientos
export type KardexEventType = 
  | 'entrada_inicial' 
  | 'prestamo' 
  | 'devolucion' 
  | 'calibracion' 
  | 'mantenimiento' 
  | 'baja';

export interface KardexEntry {
  id: string;
  fecha: string; // ISO string
  tipoEvento: KardexEventType;
  assetId: string;
  codigoActivoFisico: string;
  descripcion: string;
  tecnicoDni?: string;
  tecnicoNombre?: string;
  almaceneroNombre: string;
  ordenTrabajo?: string;
  valeId?: string;
  condicion?: string;
  observaciones?: string;
}

// Checkpoints de Restauración
export interface SystemCheckpoint {
  id: string;
  nombre: string;
  descripcion?: string;
  timestamp: string;
  tipo: 'manual' | 'automatico';
  totalActivos: number;
  totalVales: number;
  totalTecnicos: number;
  data: {
    assets: PhysicalAsset[];
    technicians: Technician[];
    dispatches: LoanDispatch[];
    storekeepers: StorekeeperProfile[];
    kardex: KardexEntry[];
  };
}

// Papelera de reciclaje / Soft Delete
export interface RecycleBinItem {
  id: string;
  tipo: 'activo' | 'tecnico' | 'encargado';
  codigoOIdentificador: string;
  nombreODescripcion: string;
  fechaEliminacion: string;
  eliminadoPor: string;
  data: unknown;
}
