import React, { useState } from 'react';
import { 
  History, 
  UserCheck, 
  Search, 
  FileText, 
  Wrench, 
  FileSpreadsheet
} from 'lucide-react';
import { LoanDispatch, PhysicalAsset, Technician } from '../types/workshop';
import { formatDateTime } from '../utils/timeAlerts';
import { ReceiptModal } from './ReceiptModal';
import * as XLSX from 'xlsx';

interface TraceabilityReportsViewProps {
  dispatches: LoanDispatch[];
  assets: PhysicalAsset[];
  technicians: Technician[];
}

export const TraceabilityReportsView: React.FC<TraceabilityReportsViewProps> = ({
  dispatches,
  assets,
  technicians,
}) => {
  const [activeTab, setActiveTab] = useState<'technicians' | 'assets'>('technicians');
  const [selectedTechDni, setSelectedTechDni] = useState<string>(technicians[0]?.dni || '');
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>(assets[0]?.codigoActivoFisico || '');
  const [techSearch, setTechSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');

  const [activeReceipt, setActiveReceipt] = useState<LoanDispatch | null>(null);

  // Selected technician
  const selectedTech = technicians.find((t) => t.dni === selectedTechDni);

  // All dispatches belonging to selected technician
  const techDispatches = dispatches.filter((d) => d.tecnicoDni === selectedTechDni);
  const totalTechLoans = techDispatches.length;
  const overdueTechLoans = techDispatches.filter((d) => d.estado === 'vencido').length;
  const punctualityRate = totalTechLoans > 0
    ? Math.round(((totalTechLoans - overdueTechLoans) / totalTechLoans) * 100)
    : 100;

  // Selected asset
  const selectedAsset = assets.find((a) => a.codigoActivoFisico === selectedAssetCode);

  // Dispatches containing this physical asset
  const assetDispatches = dispatches.filter((d) =>
    d.items.some((it) => it.codigoActivoFisico === selectedAssetCode)
  );

  // Export report to Excel
  const handleExportReportExcel = () => {
    if (activeTab === 'technicians') {
      const rows = techDispatches.flatMap((d) =>
        d.items.map((it) => ({
          'VALE': d.codigoVale,
          'TECNICO_DNI': d.tecnicoDni,
          'TECNICO_NOMBRE': d.tecnicoNombre,
          'OT_LABOR': d.ordenTrabajo,
          'FECHA_PRESTAMO': d.fechaPrestamo,
          'CODIGO_ACTIVO_FISICO': it.codigoActivoFisico,
          'DESCRIPCION': it.descripcion,
          'ESTADO_RETORNO': it.retornado ? (it.condicionRetorno || 'DEVUELTO') : 'EN CAMPO',
          'FECHA_RETORNO': it.fechaRetorno || '-',
          'OBSERVACIONES': it.observacionesRetorno || d.observaciones || '-',
        }))
      );
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial_Tecnico');
      XLSX.writeFile(wb, `HISTORIAL_TECNICO_${selectedTechDni}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const rows = assetDispatches.map((d) => {
        const it = d.items.find((x) => x.codigoActivoFisico === selectedAssetCode);
        return {
          'VALE': d.codigoVale,
          'CODIGO_ACTIVO_FISICO': selectedAssetCode,
          'DESCRIPCION': selectedAsset?.descripcion,
          'TECNICO_DNI': d.tecnicoDni,
          'TECNICO_NOMBRE': d.tecnicoNombre,
          'OT_LABOR': d.ordenTrabajo,
          'FECHA_PRESTAMO': d.fechaPrestamo,
          'ESTADO_RETORNO': it?.retornado ? (it.condicionRetorno || 'DEVUELTO') : 'EN CAMPO',
          'FECHA_RETORNO': it?.fechaRetorno || '-',
          'OBSERVACIONES': it?.observacionesRetorno || '-',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hoja_De_Vida_Activo');
      XLSX.writeFile(wb, `TRAZABILIDAD_${selectedAssetCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>Módulo de Trazabilidad, Auditoría y Hoja de Vida</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historial exhaustivo por DNI de técnico o código individual de placa física.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs font-bold">
            <button
              onClick={() => setActiveTab('technicians')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'technicians'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Por Técnico (DNI)
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'assets'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              Por Activo Físico
            </button>
          </div>

          <button
            onClick={handleExportReportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Tab 1: Traceability by Technician */}
      {activeTab === 'technicians' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tech Selector List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                placeholder="Buscar por DNI o Nombre de técnico..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {technicians
                .filter(
                  (t) =>
                    t.dni.includes(techSearch) ||
                    t.nombreCompleto.toLowerCase().includes(techSearch.toLowerCase())
                )
                .map((tech) => {
                  const isSelected = selectedTechDni === tech.dni;
                  const loansCount = dispatches.filter((d) => d.tecnicoDni === tech.dni).length;

                  return (
                    <div
                      key={tech.dni}
                      onClick={() => setSelectedTechDni(tech.dni)}
                      className={`p-3 rounded-xl cursor-pointer border transition ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 leading-tight">{tech.nombreCompleto}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>
                          DNI: <strong className="font-mono text-blue-700">{tech.dni}</strong>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                          {loansCount} vales
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{tech.especialidad}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Detailed History for Selected Tech */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTech && (
              <>
                {/* Tech KPI Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{selectedTech.nombreCompleto}</h3>
                      <p className="text-xs text-slate-600">
                        DNI: <span className="font-mono text-amber-700 font-bold">{selectedTech.dni}</span> • {selectedTech.area}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedTech.especialidad}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Puntualidad</span>
                        <span className="text-lg font-black text-emerald-700 font-mono">{punctualityRate}%</span>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Total Préstamos</span>
                        <span className="text-lg font-black text-blue-700 font-mono">{totalTechLoans}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline of loans */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Historial Cronológico de Vales y Herramientas Retiradas
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                    {techDispatches.map((dispatch) => (
                      <div key={dispatch.id} className="p-4 hover:bg-slate-50/70 transition space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {dispatch.codigoVale}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {formatDateTime(dispatch.fechaPrestamo)}
                            </span>
                          </div>

                          <button
                            onClick={() => setActiveReceipt(dispatch)}
                            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition font-bold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Ver Acta con Firmas
                          </button>
                        </div>

                        <p className="text-xs text-slate-700">
                          <span className="text-slate-400 font-medium">OT / Labor:</span> {dispatch.ordenTrabajo}
                        </p>

                        <div className="space-y-1 pt-1">
                          {dispatch.items.map((item) => (
                            <div
                              key={item.assetId}
                              className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                                  {item.codigoActivoFisico}
                                </span>
                                <span className="text-slate-700 font-medium">{item.descripcion}</span>
                              </div>

                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  item.retornado
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {item.retornado ? `Retornado (${item.condicionRetorno || 'OK'})` : 'En Campo'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {techDispatches.length === 0 && (
                      <p className="text-center p-8 text-xs text-slate-400">
                        Este técnico no registra movimientos o vales en el sistema.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Traceability by Physical Asset */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Buscar placa física (ej. DAD-IMP, TORQ)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {assets
                .filter(
                  (a) =>
                    a.codigoActivoFisico.toLowerCase().includes(assetSearch.toLowerCase()) ||
                    a.descripcion.toLowerCase().includes(assetSearch.toLowerCase())
                )
                .map((asset) => {
                  const isSelected = selectedAssetCode === asset.codigoActivoFisico;
                  const loanCount = dispatches.filter((d) =>
                    d.items.some((it) => it.codigoActivoFisico === asset.codigoActivoFisico)
                  ).length;

                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedAssetCode(asset.codigoActivoFisico)}
                      className={`p-3 rounded-xl cursor-pointer border transition ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                          {asset.codigoActivoFisico}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                          {loanCount} salidas
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
                        {asset.descripcion}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">📍 {asset.ubicacion}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Life Cycle Card for Selected Asset */}
          <div className="lg:col-span-2 space-y-4">
            {selectedAsset && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {selectedAsset.fotoUrl ? (
                        <img src={selectedAsset.fotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Wrench className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                        {selectedAsset.codigoActivoFisico}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedAsset.descripcion}</h3>
                      <p className="text-xs text-slate-500">
                        📍 Ubicación Fija: <span className="text-slate-800 font-semibold">{selectedAsset.ubicacion}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Condición</span>
                      <span className="text-xs font-bold text-emerald-700 uppercase">
                        {selectedAsset.condicionFisica}
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-blue-800 block">Ciclos Préstamo</span>
                      <span className="text-sm font-black text-blue-700 font-mono">
                        {assetDispatches.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Usage Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Trazabilidad de Custodia y Retornos de esta Pieza Tangible
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                    {assetDispatches.map((dispatch) => {
                      const item = dispatch.items.find((x) => x.codigoActivoFisico === selectedAssetCode);
                      return (
                        <div key={dispatch.id} className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {dispatch.codigoVale}
                              </span>
                              <span className="text-slate-500 font-mono">
                                {formatDateTime(dispatch.fechaPrestamo)}
                              </span>
                            </div>

                            <p className="text-slate-800 font-semibold mt-1">
                              Técnico: {dispatch.tecnicoNombre} (DNI: {dispatch.tecnicoDni})
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Labor: {dispatch.ordenTrabajo}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                item?.retornado
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {item?.retornado ? `Devuelto (${item.condicionRetorno || 'OK'})` : 'En Campo'}
                            </span>

                            <button
                              onClick={() => setActiveReceipt(dispatch)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                              title="Ver Acta"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {assetDispatches.length === 0 && (
                      <p className="text-center p-8 text-xs text-slate-400">
                        Esta pieza física no registra salidas ni préstamos en el historial aún.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        dispatch={activeReceipt}
      />
    </div>
  );
};
