import * as XLSX from 'xlsx';
import { KardexEntry } from '../types/workshop';

/**
 * Generates and downloads the standardized Excel template for tools and sockets
 */
export function downloadToolsTemplate() {
  const data = [
    {
      Codigo_Fisico: 'DAD-IMP-1/2-17MM-001',
      Nombre_Herramienta: 'Dado de impacto 17mm encastre 1/2',
      Categoria: 'dado_impacto',
      Ubicacion: 'Tablero Sombra #1',
      Requiere_Calibracion: 'NO',
      Frecuencia_Meses: '',
    },
    {
      Codigo_Fisico: 'TORQ-SNA-1/2-001',
      Nombre_Herramienta: 'Torquímetro digital de precisión 1/2 (20-250 ft-lb)',
      Categoria: 'torquimetro',
      Ubicacion: 'Estante Calibrados A-1',
      Requiere_Calibracion: 'SI',
      Frecuencia_Meses: 12,
    },
    {
      Codigo_Fisico: 'VER-MIT-150-001',
      Nombre_Herramienta: 'Vernier digital Mitutoyo 150mm (0.01mm)',
      Categoria: 'instrumento_medicion',
      Ubicacion: 'Estante Metrológico B-2',
      Requiere_Calibracion: 'SI',
      Frecuencia_Meses: 6,
    },
    {
      Codigo_Fisico: 'TAL-DEW-20V-001',
      Nombre_Herramienta: 'Taladro percutor inalámbrico Brushless 20V MAX',
      Categoria: 'herramienta_electrica',
      Ubicacion: 'Gabinete Eléctrico Bahía 1',
      Requiere_Calibracion: 'NO',
      Frecuencia_Meses: '',
    },
    {
      Codigo_Fisico: 'EXT-PRO-1/2-10-001',
      Nombre_Herramienta: 'Extensión de impacto 1/2 x 10 pulgadas',
      Categoria: 'extension',
      Ubicacion: 'Tablero Sombra #1',
      Requiere_Calibracion: 'NO',
      Frecuencia_Meses: '',
    },
    {
      Codigo_Fisico: 'MAN-WIK-0-100-001',
      Nombre_Herramienta: 'Manómetro de presión hidráulica Wika 0-100 BAR',
      Categoria: 'instrumento_medicion',
      Ubicacion: 'Estante Metrológico B-1',
      Requiere_Calibracion: 'SI',
      Frecuencia_Meses: 12,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 24 }, // Codigo_Fisico
    { wch: 45 }, // Nombre_Herramienta
    { wch: 22 }, // Categoria
    { wch: 26 }, // Ubicacion
    { wch: 22 }, // Requiere_Calibracion
    { wch: 18 }, // Frecuencia_Meses
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Herramientas');
  XLSX.writeFile(wb, 'Plantilla_Oficial_Herramientas_PanolPro.xlsx');
}

/**
 * Generates and downloads the standardized Excel template for technicians and workers
 */
export function downloadWorkersTemplate() {
  const data = [
    {
      DNI: '45892301',
      'Nombres y Apellidos': 'Juan Carlos Pérez Huamán',
      Cargo: 'Mecánico Diésel Senior',
      Area: 'Bahía 02 - Mantenimiento Mayor',
      Correo: 'j.perez@tallerindustrial.pe',
      Celular: '+51 984 512 809',
    },
    {
      DNI: '72109482',
      'Nombres y Apellidos': 'Carlos Eduardo Mendoza Silva',
      Cargo: 'Técnico de Maquinaria Pesada',
      Area: 'Línea de Camiones Mineros 797F',
      Correo: 'c.mendoza@tallerindustrial.pe',
      Celular: '+51 976 341 220',
    },
    {
      DNI: '48902143',
      'Nombres y Apellidos': 'Miguel Ángel Quispe Mamani',
      Cargo: 'Electricista Industrial e Instrumentista',
      Area: 'Taller Eléctrico Central',
      Correo: 'm.quispe@tallerindustrial.pe',
      Celular: '+51 951 890 124',
    },
    {
      DNI: '70451239',
      'Nombres y Apellidos': 'Roberto Flores Valdivia',
      Cargo: 'Soldador Estructural 6G / Calderero',
      Area: 'Área de Recuperación de Componentes',
      Correo: 'r.flores@tallerindustrial.pe',
      Celular: '+51 982 443 119',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 }, // DNI
    { wch: 32 }, // Nombres y Apellidos
    { wch: 32 }, // Cargo
    { wch: 35 }, // Area
    { wch: 30 }, // Correo
    { wch: 18 }, // Celular
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Trabajadores');
  XLSX.writeFile(wb, 'Plantilla_Oficial_Trabajadores_PanolPro.xlsx');
}

/**
 * Exports full Kardex movement records to Excel
 */
export function exportKardexToExcel(kardexEntries: KardexEntry[]) {
  const formattedData = kardexEntries.map((entry, index) => {
    const d = new Date(entry.fecha);
    const fechaLegible = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const tiposLegibles: Record<string, string> = {
      entrada_inicial: 'Entrada Inicial',
      prestamo: 'Despacho / Préstamo',
      devolucion: 'Devolución Conforme',
      calibracion: 'Calibración Metrológica',
      mantenimiento: 'Envío a Mantenimiento',
      baja: 'Baja Definitiva',
    };

    return {
      '#': index + 1,
      'Fecha y Hora': fechaLegible,
      'Tipo de Movimiento': tiposLegibles[entry.tipoEvento] || entry.tipoEvento.toUpperCase(),
      'Código Activo Físico': entry.codigoActivoFisico,
      'Descripción del Activo': entry.descripcion,
      'Técnico Receptor': entry.tecnicoNombre ? `${entry.tecnicoNombre} (DNI: ${entry.tecnicoDni})` : '-',
      'Encargado de Almacén': entry.almaceneroNombre,
      'Orden de Trabajo (OT)': entry.ordenTrabajo || '-',
      'N° Vale': entry.valeId || '-',
      'Condición Física': entry.condicion ? entry.condicion.toUpperCase() : 'OPERATIVO',
      'Observaciones / Dictamen': entry.observaciones || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(formattedData);
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 20 }, // Fecha
    { wch: 24 }, // Tipo Movimiento
    { wch: 24 }, // Codigo
    { wch: 45 }, // Descripcion
    { wch: 35 }, // Tecnico
    { wch: 26 }, // Almacenero
    { wch: 20 }, // OT
    { wch: 18 }, // Vale
    { wch: 18 }, // Condicion
    { wch: 35 }, // Observaciones
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kardex_Movimientos');
  XLSX.writeFile(wb, `Kardex_Movimientos_Almacen_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Exports Kardex entries directly to clean UTF-8 CSV for Google Sheets
 */
export function exportKardexToCSV(kardexEntries: KardexEntry[]) {
  const headers = [
    'FECHA_HORA',
    'TIPO_EVENTO',
    'CODIGO_ACTIVO',
    'DESCRIPCION',
    'TECNICO_DNI',
    'TECNICO_NOMBRE',
    'ORDEN_TRABAJO',
    'ENCARGADO_ALMACEN',
    'N_VALE',
    'CONDICION',
    'OBSERVACIONES',
  ];

  const rows = kardexEntries.map((e) =>
    [
      `"${e.fecha}"`,
      `"${e.tipoEvento.toUpperCase()}"`,
      `"${e.codigoActivoFisico}"`,
      `"${(e.descripcion || '').replace(/"/g, '""')}"`,
      `"${e.tecnicoDni || '-'}"`,
      `"${(e.tecnicoNombre || '-').replace(/"/g, '""')}"`,
      `"${e.ordenTrabajo || '-'}"`,
      `"${(e.almaceneroNombre || '-').replace(/"/g, '""')}"`,
      `"${e.valeId || '-'}"`,
      `"${e.condicion || 'OPERATIVO'}"`,
      `"${(e.observaciones || '-').replace(/"/g, '""')}"`,
    ].join(',')
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kardex_Movimientos_GoogleSheets_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
