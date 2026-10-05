import React, { useState, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Printer, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  QrCode, 
  Wrench, 
  MapPin, 
  FileSpreadsheet, 
  Edit3, 
  Trash2,
  ArrowUpRight,
  Lock,
  FileText,
  Award,
  Upload,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { PhysicalAsset, AssetCategory, AssetStatus } from '../types/workshop';
import { AssetFormModal } from './AssetFormModal';
import { CertificatePdfModal } from './CertificatePdfModal';
import { evaluateCalibration } from '../utils/calibrationHelper';
import * as XLSX from 'xlsx';
import { downloadToolsTemplate } from '../utils/excelTemplates';
import { 
  generateUniquePhysicalCode, 
  detectCategory, 
  extractDrive, 
  extractMeasurement, 
  suggestLocation 
} from '../utils/assetCoder';
import { getAutoReferenceImage } from '../utils/imageCatalog';

interface CatalogViewProps {
  assets: PhysicalAsset[];
  onSaveAsset: (asset: PhysicalAsset) => void;
  onDeleteAsset: (id: string) => void;
  onOpenLabelSheet: (assetsToPrint: PhysicalAsset[]) => void;
  onDispatchAsset: (asset: PhysicalAsset) => void;
  onImportAssets?: (newAssets: PhysicalAsset[]) => void;
  onOpenBulkDelete?: (selectedIds?: string[]) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  assets,
  onSaveAsset,
  onDeleteAsset,
  onOpenLabelSheet,
  onDispatchAsset,
  onImportAssets,
  onOpenBulkDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Selection for bulk label printing
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<PhysicalAsset | null>(null);

  // Official Certificate Viewer modal
  const [selectedCertificateAsset, setSelectedCertificateAsset] = useState<PhysicalAsset | null>(null);

  // Bulk Excel Tools Import state
  const toolsFileInputRef = useRef<HTMLInputElement>(null);
  const [isToolsImportModalOpen, setIsToolsImportModalOpen] = useState(false);
  const [previewTools, setPreviewTools] = useState<PhysicalAsset[]>([]);
  const [toolsToastMessage, setToolsToastMessage] = useState<string | null>(null);

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter !== 'all' && asset.categoria !== categoryFilter) return false;
    if (statusFilter !== 'all' && asset.estado !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = asset.codigoActivoFisico.toLowerCase().includes(q);
      const matchDesc = asset.descripcion.toLowerCase().includes(q);
      const matchLoc = asset.ubicacion.toLowerCase().includes(q);
      const matchBrand = asset.marca.toLowerCase().includes(q);
      return matchCode || matchDesc || matchLoc || matchBrand;
    }
    return true;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  // Export current catalog view to Excel
  const handleExportCatalogExcel = () => {
    const data = filteredAssets.map((a, idx) => ({
      '#': idx + 1,
      'CODIGO_ACTIVO_FISICO': a.codigoActivoFisico,
      'DESCRIPCION': a.descripcion,
      'CATEGORIA': a.categoria,
      'MARCA': a.marca,
      'MEDIDA': a.medida || '-',
      'ENCASTRE': a.encastre || '-',
      'UBICACION': a.ubicacion,
      'ESTADO': a.estado.toUpperCase(),
      'CONDICION_FISICA': a.condicionFisica.toUpperCase(),
      'NUMERO_SERIE': a.numeroSerie || '-',
      'FECHA_ALTA': a.fechaAlta,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_Panol');
    XLSX.writeFile(wb, `CATALOGO_HERRAMIENTAS_PANOL_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Handle Excel Tools Upload
  const handleToolsExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        if (rawData.length < 2) {
          alert('El archivo Excel no contiene filas de datos.');
          return;
        }

        const rawHeaders = (rawData[0] || []) as unknown[];
        const headers = rawHeaders.map((h) => (h || '').toString().toLowerCase().trim());

        const codCol = headers.findIndex((h) => /codigo|código|placa|activo|code/.test(h));
        const nombreCol = headers.findIndex((h) => /nombre|descrip|herramienta|item|pieza/.test(h));
        const catCol = headers.findIndex((h) => /categoria|categoría|tipo|clase|family/.test(h));
        const ubicCol = headers.findIndex((h) => /ubicaci|estante|tablero|lugar|location/.test(h));
        const calCol = headers.findIndex((h) => /requiere_calibracion|calibraci|calibrado|requiere/.test(h));
        const marcaCol = headers.findIndex((h) => /marca|brand/.test(h));

        const dataRows = rawData.slice(1);
        const existingCodes = new Set(assets.map((a) => a.codigoActivoFisico.toUpperCase().trim()));
        const parsedList: PhysicalAsset[] = [];
        const usedCodes = [...assets.map((a) => a.codigoActivoFisico)];

        dataRows.forEach((row, idx) => {
          const rowArr = (row || []) as unknown[];
          const rawNombre = String(rowArr[nombreCol !== -1 ? nombreCol : 1] || rowArr[0] || '').trim();
          if (!rawNombre) return;

          let rawCod = codCol !== -1 ? String(rowArr[codCol] || '').trim().toUpperCase() : '';
          const rawCat = catCol !== -1 ? String(rowArr[catCol] || '').toLowerCase().trim() : '';
          const rawUbic = ubicCol !== -1 ? String(rowArr[ubicCol] || '').trim() : '';
          const rawCal = calCol !== -1 ? String(rowArr[calCol] || '').toLowerCase().trim() : '';
          const rawMarca = marcaCol !== -1 ? String(rowArr[marcaCol] || '').trim() : 'GENÉRICO';

          const detectedCat = detectCategory(rawNombre);
          let finalCat: AssetCategory = detectedCat;
          if (rawCat.includes('impacto')) finalCat = 'dado_impacto';
          else if (rawCat.includes('torquim')) finalCat = 'torquimetro';
          else if (rawCat.includes('medicion') || rawCat.includes('vernier') || rawCat.includes('manomet')) finalCat = 'instrumento_medicion';
          else if (rawCat.includes('electr')) finalCat = 'herramienta_electrica';
          else if (rawCat.includes('neumat')) finalCat = 'herramienta_neumatica';
          else if (rawCat.includes('extens')) finalCat = 'extension';
          else if (rawCat.includes('manual') || rawCat.includes('llave')) finalCat = 'herramienta_manual';

          const reqCal = rawCal === 'si' || rawCal === 'true' || rawCal === '1' || finalCat === 'torquimetro' || finalCat === 'instrumento_medicion';

          const drive = extractDrive(rawNombre) || undefined;
          const measurement = extractMeasurement(rawNombre) || undefined;
          const isImpact = finalCat === 'dado_impacto' || /impacto/i.test(rawNombre);

          // Auto-generate code if empty or already used
          if (!rawCod || existingCodes.has(rawCod) || usedCodes.includes(rawCod)) {
            rawCod = generateUniquePhysicalCode(
              {
                descripcion: rawNombre,
                marca: rawMarca,
                medida: measurement,
                encastre: drive,
                categoria: finalCat,
                esImpacto: isImpact,
              },
              usedCodes
            );
          }
          usedCodes.push(rawCod);

          const finalUbic = rawUbic || suggestLocation(finalCat, isImpact);

          const calData = reqCal ? {
            requiereCalibracion: true,
            instrumentoTipo: rawNombre,
            entidadCertificadora: 'INACAL / Metrología Acreditada',
            toleranciaError: '± 2% / Conforme',
          } : undefined;

          parsedList.push({
            id: `asset-imp-${Date.now()}-${idx}`,
            codigoActivoFisico: rawCod,
            descripcion: rawNombre,
            categoria: finalCat,
            familia: finalCat.toUpperCase(),
            marca: rawMarca || 'GENÉRICO',
            medida: measurement,
            encastre: drive,
            esImpacto: isImpact,
            ubicacion: finalUbic,
            estado: 'disponible',
            condicionFisica: 'operativo',
            fotoUrl: getAutoReferenceImage(rawNombre, rawMarca),
            fechaAlta: new Date().toISOString().split('T')[0],
            calibracion: calData,
          });
        });

        if (parsedList.length === 0) {
          alert('No se pudieron extraer herramientas válidas del archivo Excel.');
          return;
        }

        setPreviewTools(parsedList);
        setIsToolsImportModalOpen(true);
      } catch (err) {
        alert('Error al leer el archivo Excel de herramientas.');
      } finally {
        if (toolsFileInputRef.current) {
          toolsFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmToolsImport = () => {
    if (previewTools.length === 0) return;

    if (onImportAssets) {
      onImportAssets(previewTools);
    } else {
      previewTools.forEach((t) => onSaveAsset(t));
    }

    setToolsToastMessage(`✅ ${previewTools.length} herramientas guardadas en el inventario activo.`);
    setIsToolsImportModalOpen(false);
    setPreviewTools([]);
    setTimeout(() => setToolsToastMessage(null), 5000);
  };

  const selectedAssetObjects = assets.filter((a) => selectedAssetIds.includes(a.id));

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Catálogo Visual de Activos Físicos y Tableros</span>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {assets.length} Piezas Físicas
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Piezas individuales tangibles, códigos de placa industrial y ubicación en tablero de sombra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cargar Herramientas desde Excel */}
          <button
            type="button"
            onClick={() => toolsFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>📥 Cargar Herramientas desde Excel</span>
          </button>
          <input
            ref={toolsFileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleToolsExcelUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={downloadToolsTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
            title="Descargar Plantilla Base Excel para importación de herramientas"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Descargar Plantilla Base Excel</span>
          </button>

          <button
            onClick={() => {
              if (selectedAssetObjects.length === 0) {
                onOpenLabelSheet(filteredAssets);
              } else {
                onOpenLabelSheet(selectedAssetObjects);
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            {selectedAssetIds.length > 0
              ? `Imprimir Etiquetas (${selectedAssetIds.length})`
              : 'Imprimir Todas las Etiquetas'}
          </button>

          <button
            onClick={handleExportCatalogExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar Excel
          </button>

          <button
            type="button"
            onClick={() => onOpenBulkDelete && onOpenBulkDelete(selectedAssetIds)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
            title="Abrir Menú de Borrado en General para eliminar herramientas"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Borrado Masivo {selectedAssetIds.length > 0 && `(${selectedAssetIds.length})`}</span>
          </button>

          <button
            onClick={() => {
              setAssetToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Plaquetear Nueva Pieza
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toolsToastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toolsToastMessage}</span>
        </div>
      )}

      {/* Filter and View Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa física, descripción, medida o estante..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Quick Select & View Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200"
            >
              {selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0
                ? 'Deseleccionar Todos'
                : 'Seleccionar Visibles'}
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                title="Vista Cuadrícula / Tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                title="Vista Tabla Compacta"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" /> Familia:
          </span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'dado_impacto', label: 'Dados Impacto' },
            { id: 'dado_estandar', label: 'Dados Estándar' },
            { id: 'extension', label: 'Extensiones' },
            { id: 'torquimetro', label: 'Torquímetros' },
            { id: 'herramienta_electrica', label: 'Eléctricas' },
            { id: 'herramienta_neumatica', label: 'Neumáticas' },
            { id: 'llave_combinada', label: 'Llaves' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <span className="text-slate-500 font-bold">Estado:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'disponible', label: 'Disponibles' },
            { id: 'prestado', label: 'En Campo' },
            { id: 'mantenimiento', label: 'Mantenimiento' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-lg transition font-semibold ${
                statusFilter === st.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetIds.includes(asset.id);
            const isAvailable = asset.estado === 'disponible';
            const calEval = evaluateCalibration(asset.calibracion);
            const isBlockedByCal = calEval.estaBloqueadoPorCalibracion;

            return (
              <div
                key={asset.id}
                className={`bg-white rounded-2xl border transition shadow-xs hover:shadow-md overflow-hidden flex flex-col justify-between group ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {asset.fotoUrl ? (
                      <img
                        src={asset.fotoUrl}
                        alt={asset.descripcion}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Wrench className="w-12 h-12" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Checkbox for label printing */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(asset.id)}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer shadow-sm"
                      />
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isAvailable ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                          Disponible
                        </span>
                      ) : asset.estado === 'prestado' ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm">
                          En Campo
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm">
                          Mantenimiento
                        </span>
                      )}
                    </div>

                    {/* Physical Code Strip */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="font-mono text-xs font-black bg-white/95 text-slate-900 px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                        {asset.codigoActivoFisico}
                      </span>

                      <button
                        onClick={() => onOpenLabelSheet([asset])}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-sm transition"
                        title="Imprimir Sticker QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {asset.descripcion}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="font-bold text-blue-700">{asset.marca}</span>
                      {asset.medida && <span className="font-mono">• {asset.medida}</span>}
                      {asset.encastre && <span className="font-mono">• {asset.encastre}"</span>}
                      {asset.esImpacto && (
                        <span className="text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase">
                          Impacto
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="truncate font-medium">{asset.ubicacion}</span>
                    </p>

                    {/* Metrology semáforo & Official Certificate Button */}
                    {asset.calibracion?.requiereCalibracion && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          {calEval.estadoMetrologico === 'vigente' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              🟢 Vigente ({calEval.diasRestantes}d)
                            </span>
                          )}
                          {calEval.estadoMetrologico === 'por_vencer' && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              🟡 Vence en {calEval.diasRestantes}d
                            </span>
                          )}
                          {calEval.estadoMetrologico === 'vencido' && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                              🔴 Vencido
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCertificateAsset(asset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] rounded-lg border border-blue-200 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>📄 Ver Certificado Oficial</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAssetToEdit(asset);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition"
                      title="Editar ficha"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la pieza ${asset.codigoActivoFisico}?`)) {
                          onDeleteAsset(asset.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition"
                      title="Eliminar de inventario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isAvailable ? (
                    isBlockedByCal ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-bold rounded-lg cursor-not-allowed"
                        title="EQUIPO BLOQUEADO: Requiere calibración antes de salir a campo"
                      >
                        <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>BLOQUEADO: Calibración vencida</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onDispatchAsset(asset)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs"
                      >
                        Despachar <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 italic">
                      En custodia
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                  </th>
                  <th className="p-3">Código Placa Físico</th>
                  <th className="p-3">Descripción Técnica</th>
                  <th className="p-3">Marca / Medida</th>
                  <th className="p-3">Ubicación Tablero</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAssets.map((asset) => {
                  const calEval = evaluateCalibration(asset.calibracion);
                  const isBlockedByCal = calEval.estaBloqueadoPorCalibracion;

                  return (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAssetIds.includes(asset.id)}
                        onChange={() => handleToggleSelect(asset.id)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {asset.codigoActivoFisico}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">
                      <div>{asset.descripcion}</div>
                      {asset.calibracion?.requiereCalibracion && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {calEval.estadoMetrologico === 'vigente' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              🟢 Vigente ({calEval.diasRestantes}d)
                            </span>
                          )}
                          {calEval.estadoMetrologico === 'por_vencer' && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              🟡 Vence en {calEval.diasRestantes}d
                            </span>
                          )}
                          {calEval.estadoMetrologico === 'vencido' && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                              🔴 Vencido
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedCertificateAsset(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] rounded-lg border border-blue-200 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📄 Ver Certificado Oficial</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {asset.marca} {asset.medida && `• ${asset.medida}`} {asset.encastre && `(${asset.encastre}")`}
                    </td>
                    <td className="p-3 text-slate-600">
                      📍 {asset.ubicacion}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          asset.estado === 'disponible'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : asset.estado === 'prestado'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {asset.estado}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenLabelSheet([asset])}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="Imprimir QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAssetToEdit(asset);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {asset.estado === 'disponible' && (
                          isBlockedByCal ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200 cursor-not-allowed"
                              title="EQUIPO BLOQUEADO: Requiere calibración antes de salir a campo"
                            >
                              <Lock className="w-3 h-3 text-rose-600" />
                              Bloqueado
                            </span>
                          ) : (
                            <button
                              onClick={() => onDispatchAsset(asset)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                            >
                              Despachar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset Form Modal */}
      <AssetFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={(saved) => {
          onSaveAsset(saved);
        }}
        assetToEdit={assetToEdit}
        existingCodes={assets.map((a) => a.codigoActivoFisico)}
      />

      {/* Official Certificate PDF Viewer Modal */}
      <CertificatePdfModal
        isOpen={Boolean(selectedCertificateAsset)}
        onClose={() => setSelectedCertificateAsset(null)}
        asset={selectedCertificateAsset}
        onUpdatePdf={(assetId, pdfUrl) => {
          if (!selectedCertificateAsset) return;
          const updated: PhysicalAsset = {
            ...selectedCertificateAsset,
            calibracion: {
              ...(selectedCertificateAsset.calibracion || { requiereCalibracion: true }),
              certificadoPdfUrl: pdfUrl,
            },
          };
          onSaveAsset(updated);
          setSelectedCertificateAsset(updated);
        }}
      />

      {/* Modal Vista Previa de Importación de Herramientas desde Excel */}
      {isToolsImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <span>Vista Previa de Importación de Herramientas y Dados</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se detectaron <strong>{previewTools.length}</strong> ítems: <strong>{previewTools.filter((t) => !t.calibracion?.requiereCalibracion).length}</strong> herramientas estándar y <strong>{previewTools.filter((t) => t.calibracion?.requiereCalibracion).length}</strong> instrumentos de medición / calibrados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsToolsImportModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Counters Badge Strip */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-xl text-slate-700">
                📦 Total a incorporar: <strong>{previewTools.length}</strong>
              </span>
              <span className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-blue-800">
                🔧 Estándar / Operativas: <strong>{previewTools.filter((t) => !t.calibracion?.requiereCalibracion).length}</strong>
              </span>
              <span className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-amber-900 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Medición / Calibración: <strong>{previewTools.filter((t) => t.calibracion?.requiereCalibracion).length}</strong>
              </span>
            </div>

            {/* Table */}
            <div className="flex-1 p-6 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2">Código Físico</th>
                    <th className="pb-2">Nombre / Descripción</th>
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2">Ubicación Tablero</th>
                    <th className="pb-2 text-center">Calibración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {previewTools.map((tool, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-slate-900">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                          {tool.codigoActivoFisico}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-900 font-semibold">{tool.descripcion}</td>
                      <td className="py-2.5 text-slate-600 uppercase text-[10px] font-bold">{tool.categoria}</td>
                      <td className="py-2.5 text-slate-600">📍 {tool.ubicacion}</td>
                      <td className="py-2.5 text-center">
                        {tool.calibracion?.requiereCalibracion ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-600" /> Requiere Calibración
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Estándar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => downloadToolsTemplate()}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Plantilla Base Excel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsToolsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToolsImport}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                >
                  Guardar en Inventario ({previewTools.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Selected Tools */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedAssetIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">Herramientas seleccionadas</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <button
            type="button"
            onClick={() => onOpenLabelSheet(selectedAssetObjects)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimir QR ({selectedAssetIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenBulkDelete && onOpenBulkDelete(selectedAssetIds)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar Seleccionadas en Masa</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAssetIds([])}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
            title="Deseleccionar todo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
