import React, { useState, useRef, useEffect } from 'react';
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
  X,
  Hash,
  Binary,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import { PhysicalAsset, AssetCategory, AssetStatus } from '../types/workshop';
import { AssetFormModal } from './AssetFormModal';
import { CertificatePdfModal } from './CertificatePdfModal';
import { evaluateCalibration } from '../utils/calibrationHelper';
import * as XLSX from 'xlsx';
import { downloadToolsTemplate } from '../utils/excelTemplates';
import { 
  generateUniquePhysicalCode, 
  generateRandomToolDni,
  detectCategory, 
  extractDrive, 
  extractMeasurement, 
  suggestLocation 
} from '../utils/assetCoder';
import { getAutoReferenceImage } from '../utils/imageCatalog';
import { getCachedQrDataUrl } from '../utils/qrHelper';

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

  // Ficha del Equipo (Modal de Detalle Completo)
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<PhysicalAsset | null>(null);
  const [detailQrUrl, setDetailQrUrl] = useState<string>('');
  const [copiedCodeToast, setCopiedCodeToast] = useState<string | null>(null);

  // Official Certificate Viewer modal
  const [selectedCertificateAsset, setSelectedCertificateAsset] = useState<PhysicalAsset | null>(null);

  // Bulk Excel Tools Import state
  const toolsFileInputRef = useRef<HTMLInputElement>(null);
  const [isToolsImportModalOpen, setIsToolsImportModalOpen] = useState(false);
  const [previewTools, setPreviewTools] = useState<PhysicalAsset[]>([]);
  const [toolsToastMessage, setToolsToastMessage] = useState<string | null>(null);

  // Generate QR for detail modal when open
  useEffect(() => {
    if (selectedDetailAsset) {
      getCachedQrDataUrl(selectedDetailAsset.codigoActivoFisico).then((url) => {
        setDetailQrUrl(url);
      });
    } else {
      setDetailQrUrl('');
    }
  }, [selectedDetailAsset]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeToast(`Copiado: ${label} (${text})`);
    setTimeout(() => setCopiedCodeToast(null), 2500);
  };

  // Filter logic: finds tool by text code OR by 8-digit DNI number or description/location
  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter !== 'all' && asset.categoria !== categoryFilter) return false;
    if (statusFilter !== 'all' && asset.estado !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const matchCode = asset.codigoActivoFisico.toLowerCase().includes(q);
      const matchDni = asset.dniNumerico ? asset.dniNumerico.toLowerCase().includes(q) : false;
      const matchMnem = asset.codigoMnemotecnico ? asset.codigoMnemotecnico.toLowerCase().includes(q) : false;
      const matchDesc = asset.descripcion.toLowerCase().includes(q);
      const matchLoc = asset.ubicacion.toLowerCase().includes(q);
      const matchBrand = asset.marca.toLowerCase().includes(q);
      return matchCode || matchDni || matchMnem || matchDesc || matchLoc || matchBrand;
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

  // Export current catalog view to Excel with dual codes
  const handleExportCatalogExcel = () => {
    const data = filteredAssets.map((a, idx) => ({
      '#': idx + 1,
      'CODIGO_TEXTO': a.codigoActivoFisico,
      'DNI_NUMERICO_8_DIGITOS': a.dniNumerico || '-',
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
        const existingDnis = new Set(assets.map((a) => a.dniNumerico).filter(Boolean));

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

          // Auto-generate unique 8-digit DNI
          let toolDni = '';
          do {
            toolDni = Math.floor(10000000 + Math.random() * 90000000).toString();
          } while (existingDnis.has(toolDni));
          existingDnis.add(toolDni);

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
            codigoMnemotecnico: rawCod,
            dniNumerico: toolDni,
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
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código texto (PIST-ED-001), DNI 8 dígitos (84920173), descripción..."
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
                  <div 
                    onClick={() => setSelectedDetailAsset(asset)}
                    className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                    title="Click para ver Ficha Completa del Equipo"
                  >
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

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent pointer-events-none" />

                    {/* Checkbox for label printing */}
                    <div 
                      className="absolute top-2.5 left-2.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
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

                    {/* Dual Physical Code Strip on Photo Overlay */}
                    <div 
                      className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center gap-1 overflow-hidden">
                        <span 
                          className="font-mono text-xs font-black bg-white/95 text-slate-900 px-2 py-0.5 rounded border border-slate-200 shadow-sm"
                          title="1° Código en Texto (Mnemotécnico)"
                        >
                          {asset.codigoActivoFisico}
                        </span>
                        {asset.dniNumerico && (
                          <span 
                            className="font-mono text-[11px] font-black bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5"
                            title="2° DNI Numérico de 8 Dígitos"
                          >
                            <Hash className="w-3 h-3 text-blue-200" />
                            {asset.dniNumerico}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onOpenLabelSheet([asset])}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-sm transition shrink-0"
                        title="Imprimir Sticker QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    {/* Double Code Card Badge */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1 truncate mr-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Texto:</span>
                        <span className="font-bold text-amber-950 bg-amber-100/80 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] truncate">
                          {asset.codigoActivoFisico}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">DNI:</span>
                        <span className="font-bold text-blue-900 bg-blue-100/80 border border-blue-300 px-1.5 py-0.5 rounded text-[11px]">
                          {asset.dniNumerico || '--------'}
                        </span>
                      </div>
                    </div>

                    <h3 
                      onClick={() => setSelectedDetailAsset(asset)}
                      className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-blue-700 transition"
                      title="Ver Ficha Técnica del Equipo"
                    >
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] rounded-lg border border-blue-200 transition cursor-pointer"
                          title="Ver Certificado Oficial (Google Drive, Web o PDF)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>📄 Ver Certificado</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDetailAsset(asset)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-blue-700 hover:bg-blue-50 font-bold text-[11px] transition"
                      title="Ver Ficha Técnica Completa"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>
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
                        <span>BLOQUEADO</span>
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
                  <th className="p-3">Código Texto / DNI 8 Dígitos</th>
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
                    <td className="p-3 font-mono">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200 font-black text-xs">
                          {asset.codigoActivoFisico}
                        </span>
                        {asset.dniNumerico && (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-black text-[11px] inline-flex items-center gap-1">
                            <Hash className="w-3 h-3 text-blue-600" /> DNI {asset.dniNumerico}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">
                      <div 
                        onClick={() => setSelectedDetailAsset(asset)}
                        className="cursor-pointer hover:text-blue-700 transition"
                        title="Ver Ficha Técnica"
                      >
                        {asset.descripcion}
                      </div>
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] rounded-lg border border-blue-200 transition cursor-pointer"
                            title="Ver Certificado Oficial (Google Drive, Web o PDF)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📄 Ver Certificado</span>
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
                          onClick={() => setSelectedDetailAsset(asset)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                          title="Ver Ficha del Equipo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
        existingDnis={assets.map((a) => a.dniNumerico)}
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

      {/* Ficha Oficial del Equipo / Activo Físico Modal (Doble Codificación) */}
      {selectedDetailAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ficha Técnica del Equipo / Activo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Doble codificación física oficial, ubicación en sombra y estado de trazabilidad
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailAsset(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toast Copiado */}
            {copiedCodeToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in">
                ✓ {copiedCodeToast}
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* DOBLE CODIFICACIÓN BANNER DESTACADO */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-slate-50 to-blue-50 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Binary className="w-4 h-4 text-amber-600" />
                    Doble Codificación Registrada en el Sistema
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Activo y Buscable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1° Código en Texto */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-800 block mb-1">
                        1° Código en Texto (Mnemotécnico):
                      </span>
                      <div className="font-mono text-base sm:text-lg font-black text-slate-900 break-all">
                        {selectedDetailAsset.codigoActivoFisico}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Placa física grabada</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedDetailAsset.codigoActivoFisico, 'Código en Texto')}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded text-[10px] transition cursor-pointer border border-amber-200"
                      >
                        <Copy className="w-3 h-3" /> Copiar
                      </button>
                    </div>
                  </div>

                  {/* 2° DNI Numérico 8 Dígitos */}
                  <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-800 block mb-1 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-blue-600" /> 2° DNI Numérico (8 Dígitos):
                      </span>
                      <div className="font-mono text-base sm:text-lg font-black text-blue-900 tracking-wider">
                        {selectedDetailAsset.dniNumerico || 'Sin DNI asignado'}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Identificador aleatorio único</span>
                      {selectedDetailAsset.dniNumerico && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedDetailAsset.dniNumerico!, 'DNI Numérico')}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded text-[10px] transition cursor-pointer border border-blue-200"
                        >
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 text-center">
                  💡 <em>El buscador principal del catálogo encuentra esta herramienta escribiendo su código en texto (<span className="font-mono font-bold text-slate-700">{selectedDetailAsset.codigoActivoFisico}</span>) o su DNI de 8 dígitos (<span className="font-mono font-bold text-blue-700">{selectedDetailAsset.dniNumerico}</span>).</em>
                </p>
              </div>

              {/* Foto & QR Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-2xs">
                  {selectedDetailAsset.fotoUrl ? (
                    <img
                      src={selectedDetailAsset.fotoUrl}
                      alt={selectedDetailAsset.descripcion}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Wrench className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm ${
                        selectedDetailAsset.estado === 'disponible'
                          ? 'bg-emerald-500 text-white'
                          : selectedDetailAsset.estado === 'prestado'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {selectedDetailAsset.estado}
                    </span>
                  </div>
                </div>

                {/* QR Preview Card */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center">
                    {detailQrUrl ? (
                      <img src={detailQrUrl} alt="QR" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-2 truncate max-w-[140px]">
                    {selectedDetailAsset.codigoActivoFisico}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenLabelSheet([selectedDetailAsset])}
                    className="mt-1 text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" /> Imprimir Sticker
                  </button>
                </div>
              </div>

              {/* Technical Description */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Descripción Técnica Completa:
                </span>
                <p className="text-sm font-black text-slate-900 leading-snug">
                  {selectedDetailAsset.descripcion}
                </p>
              </div>

              {/* Technical Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Marca</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedDetailAsset.marca || 'GENÉRICO'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Categoría</span>
                  <span className="font-bold text-slate-900 text-xs uppercase">{selectedDetailAsset.categoria}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Medida / Rango</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{selectedDetailAsset.medida || '-'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Encastre</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {selectedDetailAsset.encastre ? `${selectedDetailAsset.encastre}"` : '-'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Tipo Impacto</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedDetailAsset.esImpacto ? '★ De Impacto' : 'Estándar'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">N° Serie Fábrica</span>
                  <span className="font-mono font-bold text-slate-900 text-xs truncate block">
                    {selectedDetailAsset.numeroSerie || 'S/N grabado'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Condición Física</span>
                  <span className="font-bold text-slate-900 text-xs uppercase">{selectedDetailAsset.condicionFisica}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fecha Alta</span>
                  <span className="font-mono text-slate-900 text-xs">{selectedDetailAsset.fechaAlta}</span>
                </div>
              </div>

              {/* Ubicación en Tablero de Sombra */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ubicación Asignada en Pañol / Tablero:</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedDetailAsset.ubicacion}</span>
                </div>
              </div>

              {/* Metrología si aplica */}
              {selectedDetailAsset.calibracion?.requiereCalibracion && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-900 text-xs flex items-center gap-1.5 uppercase">
                      <Award className="w-4 h-4 text-amber-600" />
                      Control Metrológico ISO / Calibración
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCertificateAsset(selectedDetailAsset)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      title="Ver Certificado Oficial (Google Drive, Web o PDF)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Certificado
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">N° Certificado:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedDetailAsset.calibracion.numeroCertificado || 'Pendiente'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Laboratorio:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {selectedDetailAsset.calibracion.entidadCertificadora || 'INACAL'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fecha Vencimiento:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedDetailAsset.calibracion.fechaVencimiento || 'No registrada'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const asset = selectedDetailAsset;
                  setSelectedDetailAsset(null);
                  setAssetToEdit(asset);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition"
              >
                <Edit3 className="w-4 h-4 text-slate-600" />
                Editar Ficha
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenLabelSheet([selectedDetailAsset]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition"
                >
                  <Printer className="w-4 h-4 text-amber-600" />
                  Imprimir Sticker
                </button>

                {selectedDetailAsset.estado === 'disponible' && (
                  <button
                    type="button"
                    onClick={() => {
                      const asset = selectedDetailAsset;
                      setSelectedDetailAsset(null);
                      onDispatchAsset(asset);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs transition"
                  >
                    Despachar a Campo <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailAsset(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
