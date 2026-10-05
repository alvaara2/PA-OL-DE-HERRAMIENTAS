import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  FileText, 
  Search, 
  Calendar, 
  Upload, 
  Plus, 
  X, 
  Printer, 
  Mail, 
  ExternalLink,
  Award,
  Lock,
  Unlock,
  Download
} from 'lucide-react';
import { PhysicalAsset, CalibrationData } from '../types/workshop';
import { evaluateCalibration } from '../utils/calibrationHelper';
import { CertificatePdfModal } from './CertificatePdfModal';
import * as XLSX from 'xlsx';

interface MetrologyCalibrationViewProps {
  assets: PhysicalAsset[];
  onUpdateAssetCalibration: (assetId: string, calibration: CalibrationData) => void;
  onSendCalibrationAlertEmail: (asset: PhysicalAsset, diasRestantes: number) => void;
}

export const MetrologyCalibrationView: React.FC<MetrologyCalibrationViewProps> = ({
  assets,
  onUpdateAssetCalibration,
  onSendCalibrationAlertEmail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vigente' | 'por_vencer' | 'vencido'>('all');

  // Certificate PDF viewer modal
  const [viewingCertificateAsset, setViewingCertificateAsset] = useState<PhysicalAsset | null>(null);

  // Edit / Recalibrate modal
  const [editingAsset, setEditingAsset] = useState<PhysicalAsset | null>(null);
  const [fechaCal, setFechaCal] = useState('');
  const [fechaVen, setFechaVen] = useState('');
  const [entidad, setEntidad] = useState('INACAL / Metrología Acreditada');
  const [numCert, setNumCert] = useState('');
  const [tolerancia, setTolerancia] = useState('± 4%');
  const [rango, setRango] = useState('');
  const [tipoInstrumento, setTipoInstrumento] = useState('');
  const [pdfDataUrl, setPdfDataUrl] = useState('');

  // Filter only assets that require calibration
  const calibratedAssets = assets.filter((a) => a.calibracion?.requiereCalibracion);

  // Analyze all
  const analyzedAssets = calibratedAssets.map((asset) => {
    const evaluation = evaluateCalibration(asset.calibracion);
    return {
      asset,
      evaluation,
    };
  });

  const totalInstruments = analyzedAssets.length;
  const expiredCount = analyzedAssets.filter((x) => x.evaluation.estadoMetrologico === 'vencido').length;
  const warningCount = analyzedAssets.filter((x) => x.evaluation.estadoMetrologico === 'por_vencer').length;
  const validCount = analyzedAssets.filter((x) => x.evaluation.estadoMetrologico === 'vigente').length;

  const filteredAssets = analyzedAssets.filter(({ asset, evaluation }) => {
    if (statusFilter !== 'all' && evaluation.estadoMetrologico !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        asset.codigoActivoFisico.toLowerCase().includes(q) ||
        asset.descripcion.toLowerCase().includes(q) ||
        asset.marca.toLowerCase().includes(q) ||
        (asset.calibracion?.numeroCertificado || '').toLowerCase().includes(q) ||
        (asset.calibracion?.entidadCertificadora || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenRecalibration = (asset: PhysicalAsset) => {
    setEditingAsset(asset);
    const cal = asset.calibracion;
    setFechaCal(cal?.fechaCalibracion || new Date().toISOString().split('T')[0]);
    // default 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setFechaVen(cal?.fechaVencimiento || nextYear.toISOString().split('T')[0]);
    setEntidad(cal?.entidadCertificadora || 'INACAL / Metrología Acreditada');
    setNumCert(cal?.numeroCertificado || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setTolerancia(cal?.toleranciaError || '± 2%');
    setRango(cal?.rangoMedicion || asset.medida || '');
    setTipoInstrumento(cal?.instrumentoTipo || asset.descripcion);
    setPdfDataUrl(cal?.certificadoPdfUrl || '');
  };

  const handleSaveRecalibration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const updatedCal: CalibrationData = {
      requiereCalibracion: true,
      instrumentoTipo: tipoInstrumento.trim(),
      rangoMedicion: rango.trim(),
      fechaCalibracion: fechaCal,
      fechaVencimiento: fechaVen,
      entidadCertificadora: entidad.trim(),
      numeroCertificado: numCert.trim(),
      toleranciaError: tolerancia.trim(),
      certificadoPdfUrl: pdfDataUrl,
    };

    onUpdateAssetCalibration(editingAsset.id, updatedCal);
    setEditingAsset(null);
  };

  const handleFileUploadPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setPdfDataUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportExcel = () => {
    const data = analyzedAssets.map(({ asset, evaluation }, idx) => ({
      '#': idx + 1,
      'CODIGO_ACTIVO': asset.codigoActivoFisico,
      'DESCRIPCION': asset.descripcion,
      'MARCA': asset.marca,
      'NUMERO_CERTIFICADO': asset.calibracion?.numeroCertificado || '-',
      'ENTIDAD_CERTIFICADORA': asset.calibracion?.entidadCertificadora || '-',
      'FECHA_CALIBRACION': asset.calibracion?.fechaCalibracion || '-',
      'FECHA_VENCIMIENTO': asset.calibracion?.fechaVencimiento || '-',
      'DIAS_RESTANTES': evaluation.diasRestantes,
      'ESTADO_METROLOGICO': evaluation.estadoMetrologico.toUpperCase(),
      'BLOQUEO_SALIDA': evaluation.estaBloqueadoPorCalibracion ? 'BLOQUEADO' : 'HABILITADO',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Control_Metrologico');
    XLSX.writeFile(wb, `CONTROL_METROLOGICO_CALIBRACIONES_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>Módulo Metrológico: Control de Calibraciones y Certificados</span>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {totalInstruments} Instrumentos Críticos
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bloqueo automático de seguridad en caso de certificados vencidos conforme a ISO 9001 / ISO 17025.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar Registro Metrológico
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 🟢 Vigentes */}
        <div
          onClick={() => setStatusFilter('vigente')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === 'vigente'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Calibración al Día
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              &gt; 30 días
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-2 font-mono">{validCount}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">Equipos habilitados para campo</p>
        </div>

        {/* 🟡 Próximos a Vencer (15-30 días) */}
        <div
          onClick={() => setStatusFilter('por_vencer')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === 'por_vencer'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Próximos a Vencer
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              15 a 30 días
            </span>
          </div>
          <p className="text-3xl font-black text-amber-950 mt-2 font-mono">{warningCount}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">Requiere programar calibración</p>
        </div>

        {/* 🔴 Vencidos (BLOQUEADOS) */}
        <div
          onClick={() => setStatusFilter('vencido')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            expiredCount > 0 ? 'animate-overdue-alert' : ''
          } ${
            statusFilter === 'vencido'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/30'
              : 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Bloqueados (Vencidos)
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              Salida Denegada
            </span>
          </div>
          <p className="text-3xl font-black text-rose-950 mt-2 font-mono">{expiredCount}</p>
          <p className="text-[11px] text-rose-700 mt-1 font-bold">
            {expiredCount > 0 ? '¡Bloqueo activo para despacho!' : 'Cero instrumentos bloqueados'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, instrumento, certificado o entidad..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Semáforo:</span>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'vigente', label: 'Vigentes' },
            { id: 'por_vencer', label: 'Por Vencer' },
            { id: 'vencido', label: 'Vencidos (Bloqueados)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as typeof statusFilter)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                statusFilter === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instruments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Placa Activo</th>
                <th className="p-3.5">Instrumento de Medición</th>
                <th className="p-3.5">N° Certificado & Entidad</th>
                <th className="p-3.5">Vencimiento</th>
                <th className="p-3.5 text-center">Semáforo Metrológico</th>
                <th className="p-3.5 text-center">Estado Préstamo</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAssets.map(({ asset, evaluation }) => {
                const cal = asset.calibracion;
                const isBlocked = evaluation.estaBloqueadoPorCalibracion;

                return (
                  <tr
                    key={asset.id}
                    className={`transition ${
                      isBlocked ? 'bg-rose-50/50 hover:bg-rose-50/80' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                        {asset.codigoActivoFisico}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{asset.descripcion}</p>
                      <p className="text-[11px] text-slate-500">
                        {asset.marca} • Rango: {cal?.rangoMedicion || asset.medida || '-'}
                      </p>
                    </td>

                    <td className="p-3.5">
                      <p className="font-mono font-bold text-blue-700">
                        {cal?.numeroCertificado || 'Sin N° registrado'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {cal?.entidadCertificadora || 'Entidad no especificada'}
                      </p>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">
                      <p className="font-bold">{cal?.fechaVencimiento}</p>
                      <p className="text-[10px] text-slate-400">
                        Cal: {cal?.fechaCalibracion}
                      </p>
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block text-[11px] px-2.5 py-1 rounded-full border ${evaluation.badgeClase}`}
                      >
                        {evaluation.badgeTexto}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                          <Lock className="w-3 h-3" /> BLOQUEADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Unlock className="w-3 h-3" /> HABILITADO
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingCertificateAsset(asset)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 transition cursor-pointer shadow-2xs"
                          title="Ver Certificado Oficial en PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>📄 Ver Certificado Oficial</span>
                        </button>

                        <button
                          onClick={() => handleOpenRecalibration(asset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-xs cursor-pointer"
                          title="Registrar nueva calibración y subir PDF"
                        >
                          Recalibrar
                        </button>

                        {evaluation.estadoMetrologico !== 'vigente' && (
                          <button
                            onClick={() => onSendCalibrationAlertEmail(asset, evaluation.diasRestantes)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                            title="Enviar alerta por correo a supervisor"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-600" />
                          </button>
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

      {/* Recalibrate / Update Certificate Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Actualizar Calibración de Instrumento
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editingAsset.codigoActivoFisico} - {editingAsset.descripcion}
                </p>
              </div>
              <button
                onClick={() => setEditingAsset(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecalibration} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Fecha Calibración:</label>
                  <input
                    type="date"
                    value={fechaCal}
                    onChange={(e) => setFechaCal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Fecha Vencimiento: *</label>
                  <input
                    type="date"
                    value={fechaVen}
                    onChange={(e) => setFechaVen(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">N° Certificado Oficial:</label>
                  <input
                    type="text"
                    value={numCert}
                    onChange={(e) => setNumCert(e.target.value)}
                    placeholder="CERT-2026-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tolerancia / Incertidumbre:</label>
                  <input
                    type="text"
                    value={tolerancia}
                    onChange={(e) => setTolerancia(e.target.value)}
                    placeholder="± 2% / ± 0.02 mm"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Entidad Certificadora / Laboratorio:</label>
                <input
                  type="text"
                  value={entidad}
                  onChange={(e) => setEntidad(e.target.value)}
                  placeholder="INACAL, SGS, Metrología del Sur S.A.C."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tipo de Instrumento:</label>
                  <input
                    type="text"
                    value={tipoInstrumento}
                    onChange={(e) => setTipoInstrumento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Rango de Medición:</label>
                  <input
                    type="text"
                    value={rango}
                    onChange={(e) => setRango(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {/* Upload Certificate File */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold block text-xs">
                    Certificado Oficial en PDF (Laboratorio / Proveedor):
                  </label>
                  {pdfDataUrl && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ PDF Adjunto
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUploadPdf}
                  className="text-xs text-slate-500 w-full file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs"
                >
                  Actualizar y Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Official Certificate PDF Viewer Modal (No simulated certificates) */}
      <CertificatePdfModal
        isOpen={Boolean(viewingCertificateAsset)}
        onClose={() => setViewingCertificateAsset(null)}
        asset={viewingCertificateAsset}
        onUpdatePdf={(assetId, pdfUrl) => {
          if (!viewingCertificateAsset) return;
          const updatedCal: CalibrationData = {
            ...(viewingCertificateAsset.calibracion || { requiereCalibracion: true }),
            certificadoPdfUrl: pdfUrl,
          };
          onUpdateAssetCalibration(assetId, updatedCal);
          setViewingCertificateAsset({
            ...viewingCertificateAsset,
            calibracion: updatedCal,
          });
        }}
      />
    </div>
  );
};
