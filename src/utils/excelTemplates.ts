import * as XLSX from 'xlsx';
import { KardexEntry } from '../types/workshop';

/**
 * Generates and downloads the standardized Excel template for tools and sockets
 */
export function downloadToolsTemplate() {
  const data = [
    {
      Descripcion: 'Dado de impacto 17mm encastre 1/2',
      Tipo: 'Dado de Impacto',
      Marca: 'DeWalt',
      Modelo: 'DW-IMP-17',
      Encastre: '1/2',
      Medida: '17MM',
      Serie: 'DW-17-001',
      Ubicacion: 'Tablero Sombra #1',
      RequiereCalibracion: 'NO',
      FrecuenciaMeses: '',
      Cantidad: 1,
    },
    {
      Descripcion: 'Torquímetro digital de precisión 1/2 (20-250 ft-lb)',
      Tipo: 'Torquímetro',
      Marca: 'Snap-on',
      Modelo: 'TECH3FR250',
      Encastre: '1/2',
      Medida: '20-250 FT-LB',
      Serie: 'SNA-TRQ-8902',
      Ubicacion: 'Estante Calibrados A-1',
      RequiereCalibracion: 'SI',
      FrecuenciaMeses: 12,
      Cantidad: 1,
    },
    {
      Descripcion: 'Taladro percutor inalámbrico Brushless 20V MAX',
      Tipo: 'Herramienta Eléctrica',
      Marca: 'DeWalt',
      Modelo: 'DCD996',
      Encastre: '1/2 Chuck',
      Medida: '20V',
      Serie: 'DW-PERC-4401',
      Ubicacion: 'Gabinete Eléctrico Bahía 1',
      RequiereCalibracion: 'NO',
      FrecuenciaMeses: '',
      Cantidad: 1,
    },
    {
      Descripcion: 'Extensión de impacto 1/2 x 10 pulgadas',
      Tipo: 'Extensión',
      Marca: 'Proto',
      Modelo: 'J7410P',
      Encastre: '1/2',
      Medida: '10IN',
      Serie: 'PRT-EXT-10',
      Ubicacion: 'Tablero Sombra #1',
      RequiereCalibracion: 'NO',
      FrecuenciaMeses: '',
      Cantidad: 1,
    },
    {
      Descripcion: 'Micrómetro de exteriores digital 0-25 mm',
      Tipo: 'Instrumento de Medición',
      Marca: 'Mitutoyo',
      Modelo: '293-240-30',
      Encastre: '',
      Medida: '0-25 MM',
      Serie: 'MIT-MIC-5521',
      Ubicacion: 'Estante Metrológico B-2',
      RequiereCalibracion: 'SI',
      FrecuenciaMeses: 6,
      Cantidad: 1,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 45 }, // Descripcion
    { wch: 22 }, // Tipo
    { wch: 15 }, // Marca
    { wch: 15 }, // Modelo
    { wch: 12 }, // Encastre
    { wch: 15 }, // Medida
    { wch: 16 }, // Serie
    { wch: 25 }, // Ubicacion
    { wch: 20 }, // RequiereCalibracion
    { wch: 18 }, // FrecuenciaMeses
    { wch: 10 }, // Cantidad
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
      Nombres: 'Juan Carlos',
      Apellidos: 'Pérez Huamán',
      DNI: '45892301',
      Cargo: 'Mecánico Diésel Senior',
      Area: 'Bahía 02 - Mantenimiento Mayor',
      Telefono: '+51 984 512 809',
      Correo: 'j.perez@tallerindustrial.pe',
    },
    {
      Nombres: 'Carlos Eduardo',
      Apellidos: 'Mendoza Silva',
      DNI: '72109482',
      Cargo: 'Técnico de Maquinaria Pesada',
      Area: 'Línea de Camiones Mineros 797F',
      Telefono: '+51 976 341 220',
      Correo: 'c.mendoza@tallerindustrial.pe',
    },
    {
      Nombres: 'Miguel Ángel',
      Apellidos: 'Quispe Mamani',
      DNI: '48902143',
      Cargo: 'Electricista Industrial e Instrumentista',
      Area: 'Taller Eléctrico Central',
      Telefono: '+51 951 890 124',
      Correo: 'm.quispe@tallerindustrial.pe',
    },
    {
      Nombres: 'Roberto',
      Apellidos: 'Flores Valdivia',
      DNI: '70451239',
      Cargo: 'Soldador Estructural 6G / Calderero',
      Area: 'Área de Recuperación de Componentes',
      Telefono: '+51 982 443 119',
      Correo: 'r.flores@tallerindustrial.pe',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 20 }, // Nombres
    { wch: 22 }, // Apellidos
    { wch: 14 }, // DNI
    { wch: 32 }, // Cargo
    { wch: 35 }, // Area
    { wch: 18 }, // Telefono
    { wch: 30 }, // Correo
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
