import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Wrench, 
  Trash2, 
  PlusCircle, 
  Calendar, 
  Clock, 
  FileCheck,
  CheckCircle2,
  RefreshCw,
  Layers,
  Link2,
  Copy,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { KardexEntry, KardexEventType } from '../types/workshop';
import { 
  exportKardexToExcel, 
  exportKardexToCSV, 
  downloadToolsTemplate, 
  downloadWorkersTemplate 
} from '../utils/excelTemplates';

interface KardexViewProps {
  entries: KardexEntry[];
  onAddManualEntry?: (entry: KardexEntry) => void;
  onOpenBulkDelete?: () => void;
}

export const KardexView: React.FC<KardexViewProps> = ({ entries, onOpenBulkDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | KardexEventType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [formulaCopied, setFormulaCopied] = useState(false);

  // Construct dynamic Google Sheets IMPORTDATA formula
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.vercel.app';
  const sheetsFormula = `=IMPORTDATA("${currentOrigin}/api/kardex/export-csv")`;

  const handleCopySheetsFormula = () => {
    navigator.clipboard.writeText(sheetsFormula);
    setFormulaCopied(true);
    setTimeout(() => setFormulaCopied(false), 3000);
  };

  // Filter logic
  const filteredEntries = entries.filter((entry) => {
    if (tipoFilter !== 'all' && entry.tipoEvento !== tipoFilter) {
      return false;
    }

    if (startDate) {
      const entryDate = entry.fecha.split('T')[0];
      if (entryDate < startDate) return false;
    }

    if (endDate) {
      const entryDate = entry.fecha.split('T')[0];
      if (entryDate > endDate) return false;
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = entry.codigoActivoFisico.toLowerCase().includes(q);
      const matchDesc = entry.descripcion.toLowerCase().includes(q);
      const matchTech = (entry.tecnicoNombre || '').toLowerCase().includes(q) || (entry.tecnicoDni || '').includes(q);
      const matchKeeper = entry.almaceneroNombre.toLowerCase().includes(q);
      const matchOt = (entry.ordenTrabajo || '').toLowerCase().includes(q);
      const matchVale = (entry.valeId || '').toLowerCase().includes(q);

      return matchCode || matchDesc || matchTech || matchKeeper || matchOt || matchVale;
    }

    return true;
  });

  // Calculate stats
  const totalMovimientos = entries.length;
  const totalPrestamos = entries.filter((e) => e.tipoEvento === 'prestamo').length;
  const totalDevoluciones = entries.filter((e) => e.tipoEvento === 'devolucion').length;
  const totalCalibraciones = entries.filter((e) => e.tipoEvento === 'calibracion').length;

  const getEventBadge = (tipo: KardexEventType) => {
    switch (tipo) {
      case 'entrada_inicial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <PlusCircle className="w-3 h-3 text-blue-600" />
            Entrada Inicial
          </span>
        );
      case 'prestamo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <ArrowUpRight className="w-3 h-3 text-amber-700" />
            Despacho / Salida
          </span>
        );
      case 'devolucion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
            Devolución OK
          </span>
        );
      case 'calibracion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <ShieldCheck className="w-3 h-3 text-purple-700" />
            Calibración
          </span>
        );
      case 'mantenimiento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
            <Wrench className="w-3 h-3 text-orange-700" />
            Mantenimiento
          </span>
        );
      case 'baja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3 text-rose-700" />
            Baja
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Download Action Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Kardex General de Almacén & Trazabilidad
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Libro de movimientos en tiempo real. Cada entrada inicial, despacho a campo, recepción conforme y calibración metrológica queda auditada de forma inmutable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Opción A: Sincronización con Google Sheets */}
          <button
            type="button"
            onClick={() => {
              handleCopySheetsFormula();
              setIsSheetsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Copiar fórmula =IMPORTDATA(...) y ver guía para Google Sheets"
          >
            <Link2 className="w-4 h-4" />
            <span>🔗 Copiar Enlace para Google Sheets</span>
          </button>

          {/* Opción B: Exportación directa Excel para Sheets */}
          <button
            type="button"
            onClick={() => exportKardexToExcel(filteredEntries)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Descargar archivo Excel con formato listo para Google Drive"
          >
            <Download className="w-4 h-4" />
            <span>📊 Abrir / Descargar Kardex para Sheets (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportKardexToCSV(filteredEntries)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            title="Descargar archivo .CSV compatible con hojas de cálculo"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Descargar CSV</span>
          </button>

          <button
            onClick={downloadToolsTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
            title="Descargar plantilla de Excel para importar herramientas"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            Plantilla Herramientas
          </button>

          <button
            onClick={downloadWorkersTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            title="Descargar plantilla de Excel para importar personal técnico"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Plantilla Trabajadores
          </button>

          {onOpenBulkDelete && (
            <button
              type="button"
              onClick={onOpenBulkDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer"
              title="Abrir Menú de Borrado Masivo para purgar movimientos del Kardex"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Purgar Kardex Masivo</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Movimientos
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalMovimientos}</p>
          <span className="text-[10px] text-slate-400">Eventos de inventario auditados</span>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Despachos a Campo
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1 font-mono">{totalPrestamos}</p>
          <span className="text-[10px] text-amber-700">Vales de salida ejecutados</span>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Retornos Conformes
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1 font-mono">{totalDevoluciones}</p>
          <span className="text-[10px] text-emerald-700">Reincorporaciones verificadas</span>
        </div>

        <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
            Eventos Metrológicos
          </span>
          <p className="text-2xl font-black text-purple-950 mt-1 font-mono">{totalCalibraciones}</p>
          <span className="text-[10px] text-purple-700">Inspecciones de calibración</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código físico, descripción, técnico, DNI, OT o encargado..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
            />
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            {(startDate || endDate || searchTerm || tipoFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  setTipoFilter('all');
                }}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-bold"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Event Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtrar por:
          </span>
          <button
            onClick={() => setTipoFilter('all')}
            className={`px-3 py-1 rounded-xl transition ${
              tipoFilter === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({entries.length})
          </button>
          <button
            onClick={() => setTipoFilter('prestamo')}
            className={`px-3 py-1 rounded-xl transition ${
              tipoFilter === 'prestamo'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Despachos ({entries.filter((e) => e.tipoEvento === 'prestamo').length})
          </button>
          <button
            onClick={() => setTipoFilter('devolucion')}
            className={`px-3 py-1 rounded-xl transition ${
              tipoFilter === 'devolucion'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Devoluciones ({entries.filter((e) => e.tipoEvento === 'devolucion').length})
          </button>
          <button
            onClick={() => setTipoFilter('entrada_inicial')}
            className={`px-3 py-1 rounded-xl transition ${
              tipoFilter === 'entrada_inicial'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entradas ({entries.filter((e) => e.tipoEvento === 'entrada_inicial').length})
          </button>
          <button
            onClick={() => setTipoFilter('calibracion')}
            className={`px-3 py-1 rounded-xl transition ${
              tipoFilter === 'calibracion'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Calibraciones ({entries.filter((e) => e.tipoEvento === 'calibracion').length})
          </button>
        </div>
      </div>

      {/* Kardex Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Tipo de Evento</th>
                <th className="p-3">Código Placa</th>
                <th className="p-3">Descripción de Pieza</th>
                <th className="p-3">Técnico Receptor</th>
                <th className="p-3">Encargado Pañol</th>
                <th className="p-3">OT / Vale</th>
                <th className="p-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry, idx) => {
                const dateObj = new Date(entry.fecha);
                const fechaStr = dateObj.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const horaStr = dateObj.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{fechaStr}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {horaStr}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getEventBadge(entry.tipoEvento)}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {entry.codigoActivoFisico}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800 min-w-[200px]">
                      {entry.descripcion}
                    </td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      {entry.tecnicoNombre ? (
                        <div>
                          <div className="font-bold text-slate-900">{entry.tecnicoNombre}</div>
                          <div className="text-[10px] font-mono text-slate-400">DNI: {entry.tecnicoDni}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                      {entry.almaceneroNombre}
                    </td>
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                      {entry.ordenTrabajo ? (
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-bold block text-center">
                          {entry.ordenTrabajo.split(' ')[0]}
                        </span>
                      ) : entry.valeId ? (
                        <span className="text-slate-500 font-bold">{entry.valeId}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate" title={entry.observaciones}>
                      {entry.observaciones || '-'}
                    </td>
                  </tr>
                );
              })}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No se encontraron movimientos con los filtros seleccionados</p>
                    <p className="text-xs text-slate-400 mt-0.5">Modifique los términos de búsqueda o el rango de fechas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Guía Google Sheets */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Sincronización en Vivo con Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fórmula dinámica con auto-actualización en la nube
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Sheets permite conectar hojas de cálculo directamente a un endpoint CSV mediante la función nativa <strong>=IMPORTDATA()</strong>.
              </p>

              {/* Formula Box */}
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs flex items-center justify-between gap-3 border border-slate-800">
                <span className="truncate selection:bg-emerald-700">{sheetsFormula}</span>
                <button
                  type="button"
                  onClick={handleCopySheetsFormula}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[11px] shrink-0 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {formulaCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Fórmula</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instructions steps */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Pasos para sincronizar en Google Sheets:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-medium">
                  <li>
                    Abra cualquier hoja de cálculo en blanco de Google Sheets (puede usar el atajo <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-3 h-3" /></a>).
                  </li>
                  <li>
                    Haga clic en la celda <strong>A1</strong> (primera celda superior izquierda).
                  </li>
                  <li>
                    Presione <strong>Ctrl + V</strong> (o Pegar) para insertar la fórmula.
                  </li>
                  <li>
                    ¡Listo! Google Sheets consultará el endpoint <code>/api/kardex/export-csv</code> y desplegará todas las columnas con filtros automáticos.
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => exportKardexToCSV(filteredEntries)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Descargar Archivo CSV Local
              </button>

              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
