import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Download, 
  Check, 
  Sparkles, 
  Plus, 
  RefreshCw,
  QrCode
} from 'lucide-react';
import { PhysicalAsset, AssetCategory } from '../types/workshop';
import { 
  generateUniquePhysicalCode, 
  detectCategory, 
  extractDrive, 
  extractMeasurement, 
  suggestLocation 
} from '../utils/assetCoder';
import { getAutoReferenceImage } from '../utils/imageCatalog';
import { ToolSpinLoader } from './ToolSpinLoader';
import { downloadToolsTemplate, downloadWorkersTemplate } from '../utils/excelTemplates';

interface ExcelProcessorViewProps {
  existingAssets: PhysicalAsset[];
  onImportAssets: (newAssets: PhysicalAsset[]) => void;
  onOpenLabelSheet: (assets: PhysicalAsset[]) => void;
  onBeforeImport?: () => void;
}

interface ParsedRow {
  id: string;
  descripcion: string;
  marca: string;
  medida: string;
  encastre: string;
  numeroSerie: string;
  ubicacion: string;
  cantidad: number;
  codigoGenerado: string;
  categoria: AssetCategory;
  esImpacto: boolean;
  seleccionado: boolean;
}

export const ExcelProcessorView: React.FC<ExcelProcessorViewProps> = ({
  existingAssets,
  onImportAssets,
  onOpenLabelSheet,
  onBeforeImport,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Helper to recompute codes with live sequence
  const recalculateCodes = (rows: ParsedRow[]): ParsedRow[] => {
    const existingCodes = existingAssets.map((a) => a.codigoActivoFisico);
    const usedCodes = [...existingCodes];

    return rows.map((row) => {
      const code = generateUniquePhysicalCode(
        {
          descripcion: row.descripcion,
          marca: row.marca,
          medida: row.medida,
          encastre: row.encastre,
          categoria: row.categoria,
          esImpacto: row.esImpacto,
        },
        usedCodes
      );
      usedCodes.push(code);
      return { ...row, codigoGenerado: code };
    });
  };

  // Handle file drop or selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

          if (rawData.length < 2) {
            alert('El archivo Excel no contiene filas de datos.');
            setIsProcessing(false);
            return;
          }

          // Header detection
          const rawHeaders = (rawData[0] || []) as unknown[];
          const headers = rawHeaders.map((h) => (h || '').toString().toLowerCase().trim());
          
          const descCol = headers.findIndex((h) => /desc|herramienta|item|pieza|nombre/.test(h));
          const marcaCol = headers.findIndex((h) => /marca|brand|fabricante/.test(h));
          const medidaCol = headers.findIndex((h) => /medida|tamaño|size|milimetros/.test(h));
          const encastreCol = headers.findIndex((h) => /encastre|mando|drive/.test(h));
          const serieCol = headers.findIndex((h) => /serie|s\/n|sn|serial/.test(h));
          const ubicacionCol = headers.findIndex((h) => /ubicaci|estante|tablero|lugar/.test(h));
          const cantCol = headers.findIndex((h) => /cant|cantidad|qty/.test(h));
          const codCol = headers.findIndex((h) => /codigo|código|placa|activo/.test(h));

          const dataRows = rawData.slice(1);
          const rows: ParsedRow[] = [];

          dataRows.forEach((r, idx) => {
            const rowArr = (r || []) as unknown[];
            const desc = String(rowArr[descCol !== -1 ? descCol : 0] || '').trim();
            if (!desc) return; // Skip empty rows

            const marca = String(marcaCol !== -1 ? rowArr[marcaCol] || '' : '').trim();
            const extractedMedida = extractMeasurement(desc) || '';
            const medida = String(medidaCol !== -1 && rowArr[medidaCol] ? rowArr[medidaCol] : extractedMedida).trim();
            const extractedEncastre = extractDrive(desc) || '';
            const encastre = String(encastreCol !== -1 && rowArr[encastreCol] ? rowArr[encastreCol] : extractedEncastre).trim();
            const serie = String(serieCol !== -1 ? rowArr[serieCol] || '' : '').trim();
            const cat = detectCategory(desc);
            const isImpact = /impacto/i.test(desc) || cat === 'dado_impacto';
            const defaultLoc = suggestLocation(cat, isImpact);
            const ubicacion = String(ubicacionCol !== -1 && rowArr[ubicacionCol] ? rowArr[ubicacionCol] : defaultLoc).trim();
            const rawCant = parseInt(String(cantCol !== -1 ? rowArr[cantCol] || 1 : 1), 10);
            const cantidad = isNaN(rawCant) || rawCant < 1 ? 1 : rawCant;
            const userCode = codCol !== -1 && rowArr[codCol] ? String(rowArr[codCol]).trim() : '';

            // If quantity > 1, expand into multiple distinct tangible physical units with individual codes!
            for (let q = 0; q < cantidad; q++) {
              rows.push({
                id: `parsed-${idx}-${q}`,
                descripcion: desc,
                marca,
                medida,
                encastre,
                numeroSerie: serie ? (cantidad > 1 ? `${serie}-${q + 1}` : serie) : '',
                ubicacion,
                cantidad: 1,
                codigoGenerado: userCode && q === 0 ? userCode : '',
                categoria: cat,
                esImpacto: isImpact,
                seleccionado: true,
              });
            }
          });

          // Compute codes
          const finalRows = recalculateCodes(rows);
          setParsedRows(finalRows);
          setSuccessMessage(`Se procesaron exitosamente ${finalRows.length} unidades físicas desde el archivo.`);
        } catch (err) {
          console.error('Error parsing excel:', err);
          alert('Ocurrió un error al leer el archivo Excel.');
        } finally {
          setIsProcessing(false);
        }
      }, 700);
    };

    reader.readAsBinaryString(file);
  };

  // Load sample dataset for demonstration
  const handleLoadSample = () => {
    setIsProcessing(true);
    setFileName('MUESTRA_TALLER_HERRAMIENTAS_DADOS.xlsx');

    setTimeout(() => {
      const sampleItems = [
        { desc: 'Dado de Impacto 17mm Encastre 1/2" 6 Puntas', marca: 'DeWalt', encastre: '1/2', medida: '17MM', serie: 'DW-17-A', cant: 2 },
        { desc: 'Dado de Impacto 19mm Encastre 1/2" 6 Puntas', marca: 'DeWalt', encastre: '1/2', medida: '19MM', serie: 'DW-19-A', cant: 2 },
        { desc: 'Dado de Impacto 21mm Encastre 1/2"', marca: 'Milwaukee', encastre: '1/2', medida: '21MM', serie: 'MW-21-X', cant: 1 },
        { desc: 'Dado de Impacto 24mm Encastre 3/4" Alto Torque', marca: 'Proto', encastre: '3/4', medida: '24MM', serie: 'PR-7424', cant: 1 },
        { desc: 'Dado Métrico Estándar 10mm Cromo Encastre 3/8"', marca: 'Stanley', encastre: '3/8', medida: '10MM', serie: 'ST-10M', cant: 1 },
        { desc: 'Barra de Extensión 10 Pulgadas Encastre 1/2"', marca: 'Snap-on', encastre: '1/2', medida: '10IN', serie: 'SN-EXT10', cant: 1 },
        { desc: 'Barra de Extensión 5 Pulgadas Encastre 1/2"', marca: 'Snap-on', encastre: '1/2', medida: '5IN', serie: 'SN-EXT5', cant: 1 },
        { desc: 'Torquímetro Micrométrico de Click 50-250 Ft-Lb 1/2"', marca: 'Snap-on', encastre: '1/2', medida: '50-250FTLB', serie: 'QD3R250', cant: 1 },
        { desc: 'Taladro Percutor Inalámbrico 20V XR Brushless', marca: 'DeWalt', encastre: '', medida: '', serie: 'DCD996-01', cant: 1 },
        { desc: 'Amoladora Angular 4-1/2" 840W con Guarda', marca: 'Makita', encastre: '', medida: '', serie: 'MK-GA4530', cant: 1 },
        { desc: 'Pistola de Impacto Neumática 1/2" Titanio 1350 Nm', marca: 'Ingersoll Rand', encastre: '1/2', medida: '', serie: 'IR-2235', cant: 1 },
        { desc: 'Llave Combinada Corona y Boca 17mm', marca: 'Bahco', encastre: '', medida: '17MM', serie: 'BAH-111M-17', cant: 1 },
        { desc: 'Llave Combinada Corona y Boca 19mm', marca: 'Bahco', encastre: '', medida: '19MM', serie: 'BAH-111M-19', cant: 1 },
        { desc: 'Multímetro Digital True-RMS Cat IV 600V', marca: 'Fluke', encastre: '', medida: '', serie: 'FLK-87V-1', cant: 1 },
      ];

      const rows: ParsedRow[] = [];
      sampleItems.forEach((item, idx) => {
        const cat = detectCategory(item.desc);
        const isImpact = /impacto/i.test(item.desc) || cat === 'dado_impacto';
        for (let q = 0; q < item.cant; q++) {
          rows.push({
            id: `sample-${idx}-${q}`,
            descripcion: item.desc,
            marca: item.marca,
            medida: item.medida,
            encastre: item.encastre,
            numeroSerie: item.serie ? (item.cant > 1 ? `${item.serie}-${q + 1}` : item.serie) : '',
            ubicacion: suggestLocation(cat, isImpact),
            cantidad: 1,
            codigoGenerado: '',
            categoria: cat,
            esImpacto: isImpact,
            seleccionado: true,
          });
        }
      });

      const finalRows = recalculateCodes(rows);
      setParsedRows(finalRows);
      setSuccessMessage(`Se cargaron ${finalRows.length} piezas físicas de ejemplo con códigos asignados.`);
      setIsProcessing(false);
    }, 600);
  };

  // Download blank Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'DESCRIPCION': 'Dado de Impacto 17mm Encastre 1/2" 6 Puntas',
        'MARCA': 'DeWalt',
        'MEDIDA': '17MM',
        'ENCASTRE': '1/2',
        'NUMERO_SERIE': 'DW-17-A',
        'UBICACION': 'Tablero Sombra #1 - Bahía Pesada',
        'CANTIDAD': 2,
        'CODIGO_PREVIO_OPCIONAL': '',
      },
      {
        'DESCRIPCION': 'Torquímetro de Click 50-250 Ft-Lb 1/2"',
        'MARCA': 'Snap-on',
        'MEDIDA': '50-250FTLB',
        'ENCASTRE': '1/2',
        'NUMERO_SERIE': 'QD3R250-1',
        'UBICACION': 'Caja Acolchada - Estante A-1',
        'CANTIDAD': 1,
        'CODIGO_PREVIO_OPCIONAL': 'TORQ-SNA-001',
      },
      {
        'DESCRIPCION': 'Taladro Percutor 20V DCD996',
        'MARCA': 'DeWalt',
        'MEDIDA': '',
        'ENCASTRE': '',
        'NUMERO_SERIE': 'DCD-996-01',
        'UBICACION': 'Estante E-2',
        'CANTIDAD': 1,
        'CODIGO_PREVIO_OPCIONAL': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Pañol');
    XLSX.writeFile(wb, 'Plantilla_Herramientas_Panol.xlsx');
  };

  // Export enriched excel with generated physical codes and QR URLs
  const handleExportEnrichedExcel = () => {
    if (parsedRows.length === 0) return;

    const exportData = parsedRows.map((r, i) => ({
      'ITEM': i + 1,
      'CODIGO_ACTIVO_FISICO': r.codigoGenerado,
      'DESCRIPCION_TECNICA': r.descripcion,
      'CATEGORIA': r.categoria.toUpperCase(),
      'MARCA': r.marca,
      'MEDIDA': r.medida,
      'ENCASTRE': r.encastre,
      'NUMERO_SERIE': r.numeroSerie,
      'UBICACION_FISICA': r.ubicacion,
      'FECHA_CODIFICACION': new Date().toISOString().split('T')[0],
      'ESTADO': 'DISPONIBLE',
      'CONDICION_FISICA': 'OPERATIVO',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activos_Codificados');
    XLSX.writeFile(wb, `ACTIVOS_FISICOS_CODIFICADOS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Update single row field
  const handleUpdateRow = (id: string, field: keyof ParsedRow, value: string | boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          return updated;
        }
        return r;
      })
    );
  };

  // Confirm and import to active workshop catalog
  const handleConfirmImport = () => {
    const selected = parsedRows.filter((r) => r.seleccionado && r.codigoGenerado);
    if (selected.length === 0) {
      alert('Seleccione al menos una herramienta o dado con código generado para importar.');
      return;
    }

    if (onBeforeImport) {
      onBeforeImport();
    }

    const existingDnis = new Set(existingAssets.map((a) => a.dniNumerico).filter(Boolean));
    const newAssets: PhysicalAsset[] = selected.map((r) => {
      const autoPhoto = getAutoReferenceImage(r.descripcion, r.marca);
      let toolDni = '';
      do {
        toolDni = Math.floor(10000000 + Math.random() * 90000000).toString();
      } while (existingDnis.has(toolDni));
      existingDnis.add(toolDni);

      return {
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        codigoActivoFisico: r.codigoGenerado,
        codigoMnemotecnico: r.codigoGenerado,
        dniNumerico: toolDni,
        descripcion: r.descripcion,
        categoria: r.categoria,
        familia: r.categoria.toUpperCase(),
        marca: r.marca || 'GENÉRICO',
        medida: r.medida || undefined,
        encastre: r.encastre || undefined,
        esImpacto: r.esImpacto,
        numeroSerie: r.numeroSerie || undefined,
        ubicacion: r.ubicacion || 'Estante General C-1',
        estado: 'disponible',
        condicionFisica: 'operativo',
        fotoUrl: autoPhoto,
        fechaAlta: new Date().toISOString().split('T')[0],
      };
    });

    onImportAssets(newAssets);
    alert(`¡Éxito! Se han incorporado ${newAssets.length} activos físicos con doble codificación (Texto + DNI 8 dígitos) al inventario de pañol.`);
    setParsedRows([]);
    setFileName(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanatory Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Procesador Inteligente de Nomenclatura Industrial
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Carga Masiva y Generación de Códigos de Plaqueo
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Sube tu inventario en Excel o CSV. El motor analiza automáticamente el tipo de herramienta,
              encastre (<span className="text-amber-700 font-mono font-bold">1/2, 3/4, 3/8</span>), medida métrica o fraccional (<span className="text-amber-700 font-mono font-bold">17MM, 24MM, 10IN</span>), y marca para estandarizar códigos de placa física y QR listo para rotulado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              Muestra Demo (14 ítems)
            </button>

            <button
              onClick={downloadToolsTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition shadow-xs"
              title="Descargar plantilla oficial con columnas estandarizadas de herramientas"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Plantilla Herramientas (.xlsx)
            </button>

            <button
              onClick={downloadWorkersTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition shadow-xs"
              title="Descargar plantilla oficial con columnas estandarizadas de personal"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Plantilla Trabajadores (.xlsx)
            </button>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="mt-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 bg-slate-50 flex flex-col items-center justify-center text-center transition group">
          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="excel-file-input"
            className="cursor-pointer flex flex-col items-center justify-center w-full"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              Haz clic para seleccionar o arrastra tu archivo Excel / CSV
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Soporta columnas de Descripción, Marca, Encastre, Medida, Serie, Ubicación y Cantidad
            </p>
            {fileName && (
              <div className="mt-3 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono text-amber-800 font-bold shadow-xs">
                Archivo activo: {fileName}
              </div>
            )}
          </label>
        </div>

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Rotating Tools Loader during processing */}
      {isProcessing && (
        <ToolSpinLoader
          message="Analizando Nomenclatura y Encastres de Herramientas..."
          submessage="Generando correlativos de placa física y códigos QR de alta resolución"
        />
      )}

      {/* Parsed Table Preview */}
      {!isProcessing && parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Action Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Previsualización y Asignación de Códigos Físicos</span>
                <span className="text-xs bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  {parsedRows.length} Piezas Físicas
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revise o ajuste los códigos generados. Cada fila representará una pieza tangible rotulable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportEnrichedExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Exportar Excel Enriquecido
              </button>

              <button
                onClick={() => {
                  const assetsForLabels = parsedRows
                    .filter((r) => r.seleccionado)
                    .map((r) => ({
                      id: r.id,
                      codigoActivoFisico: r.codigoGenerado,
                      descripcion: r.descripcion,
                      categoria: r.categoria,
                      familia: r.categoria.toUpperCase(),
                      marca: r.marca,
                      medida: r.medida,
                      encastre: r.encastre,
                      esImpacto: r.esImpacto,
                      ubicacion: r.ubicacion,
                      estado: 'disponible' as const,
                      condicionFisica: 'operativo' as const,
                      fechaAlta: new Date().toISOString().split('T')[0],
                    }));
                  onOpenLabelSheet(assetsForLabels);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                <QrCode className="w-4 h-4" />
                Imprimir Stickers QR
              </button>

              <button
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Incorporar a Pañol
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={parsedRows.every((r) => r.seleccionado)}
                      onChange={(e) =>
                        setParsedRows((prev) => prev.map((r) => ({ ...r, seleccionado: e.target.checked })))
                      }
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                  </th>
                  <th className="p-3">Código Físico Asignado</th>
                  <th className="p-3">Descripción Técnica</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Encastre</th>
                  <th className="p-3">Medida</th>
                  <th className="p-3">Ubicación / Tablero</th>
                  <th className="p-3 text-center">Impacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {parsedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.seleccionado}
                        onChange={(e) => handleUpdateRow(row.id, 'seleccionado', e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.codigoGenerado}
                        onChange={(e) => handleUpdateRow(row.id, 'codigoGenerado', e.target.value.toUpperCase())}
                        className="px-2 py-1 bg-amber-50 border border-amber-300 rounded-lg text-slate-900 font-mono font-bold text-xs w-48 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        title="Puede editar manualmente el código si la pieza ya cuenta con rotulado previo"
                      />
                    </td>
                    <td className="p-3 text-slate-800">
                      <input
                        type="text"
                        value={row.descripcion}
                        onChange={(e) => handleUpdateRow(row.id, 'descripcion', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    <td className="p-3 text-slate-700">
                      <input
                        type="text"
                        value={row.marca}
                        onChange={(e) => handleUpdateRow(row.id, 'marca', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      <input
                        type="text"
                        value={row.encastre}
                        onChange={(e) => handleUpdateRow(row.id, 'encastre', e.target.value)}
                        placeholder="1/2, 3/4"
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    <td className="p-3 text-slate-700 font-mono">
                      <input
                        type="text"
                        value={row.medida}
                        onChange={(e) => handleUpdateRow(row.id, 'medida', e.target.value)}
                        placeholder="17MM"
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    <td className="p-3 text-slate-700">
                      <input
                        type="text"
                        value={row.ubicacion}
                        onChange={(e) => handleUpdateRow(row.id, 'ubicacion', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateRow(row.id, 'esImpacto', !row.esImpacto)}
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          row.esImpacto
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {row.esImpacto ? 'Sí (IMP)' : 'Cromo'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
