import React, { useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  FileText,
  Calendar,
  Building2,
  Printer
} from 'lucide-react';
import { PhysicalAsset } from '../types/workshop';
import { evaluateCalibration } from '../utils/calibrationHelper';
import { downloadPdfFromDataUrl } from '../utils/pdfHelper';

interface CertificatePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: PhysicalAsset | null;
  onUpdatePdf?: (assetId: string, pdfDataUrl: string) => void;
}

export const CertificatePdfModal: React.FC<CertificatePdfModalProps> = ({
  isOpen,
  onClose,
  asset,
  onUpdatePdf,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !asset) return null;

  const cal = asset.calibracion;
  const pdfUrl = cal?.certificadoPdfUrl || (asset as any).certificadoPdfUrl || '';
  const evalCal = evaluateCalibration(cal);

  const handleDownload = () => {
    if (!pdfUrl) {
      alert('No hay archivo PDF cargado para descargar.');
      return;
    }
    const cleanCode = asset.codigoActivoFisico.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadPdfFromDataUrl(pdfUrl, `certificado_calibracion_${cleanCode}.pdf`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor seleccione un archivo PDF válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl && onUpdatePdf) {
        onUpdatePdf(asset.id, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Certificado Oficial de Calibración
                </h3>
                <span className="font-mono text-xs bg-slate-200/80 text-slate-800 px-2.5 py-0.5 rounded-md font-bold">
                  {asset.codigoActivoFisico}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {asset.descripcion} {asset.marca && `• ${asset.marca}`}
              </p>
            </div>
          </div>

          {/* Action buttons & Close */}
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-sm transition cursor-pointer"
                title="Descargar archivo PDF oficial a la computadora o celular"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
            )}

            {onUpdatePdf && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                  title="Subir o reemplazar archivo PDF oficial del laboratorio"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{pdfUrl ? 'Reemplazar PDF' : 'Subir PDF'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrological Metadata Strip & Status Semáforo */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">N° Certificado</span>
              <span className="font-mono font-bold text-slate-900">
                {cal?.numeroCertificado || 'No registrado'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Laboratorio Acreditado</span>
              <span className="font-semibold text-slate-800">
                {cal?.entidadCertificadora || 'INACAL / Metrología Acreditada'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Calibración</span>
              <span className="text-slate-700 font-medium">
                {cal?.fechaCalibracion || 'S/F'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Vencimiento</span>
              <span className="font-bold text-slate-900">
                {cal?.fechaVencimiento || 'S/F'}
              </span>
            </div>
          </div>

          {/* Semáforo badge */}
          <div className="flex items-center gap-2">
            {evalCal.estadoMetrologico === 'vigente' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                🟢 VIGENTE ({evalCal.diasRestantes} días restantes)
              </span>
            )}
            {evalCal.estadoMetrologico === 'por_vencer' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs rounded-full">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                🟡 POR VENCER (Vence en {evalCal.diasRestantes} días)
              </span>
            )}
            {evalCal.estadoMetrologico === 'vencido' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-900 font-black text-xs rounded-full animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                🔴 VENCIDO (BLOQUEADO PARA SALIDA)
              </span>
            )}
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50">
          {pdfUrl ? (
            <div className="w-full h-full min-h-[580px] bg-white rounded-2xl border border-slate-300 shadow-inner overflow-hidden flex flex-col">
              <iframe
                src={pdfUrl}
                title={`Certificado Oficial ${asset.codigoActivoFisico}`}
                className="w-full h-[600px] border rounded"
              />
            </div>
          ) : (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                No hay archivo PDF adjunto
              </h4>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Este instrumento requiere calibración metrológica pero aún no tiene cargado el certificado PDF original otorgado por el laboratorio de calibración.
              </p>
              {onUpdatePdf && (
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Subir Certificado Oficial en PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
