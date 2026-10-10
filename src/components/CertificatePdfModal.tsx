import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  FileText,
  ExternalLink,
  Globe,
  Link2,
  Edit2
} from 'lucide-react';
import { PhysicalAsset } from '../types/workshop';
import { evaluateCalibration } from '../utils/calibrationHelper';
import { 
  downloadPdfFromDataUrl, 
  getEmbeddableCertificateUrl, 
  getOriginalCertificateUrl, 
  isGoogleDriveUrl, 
  isWebUrl, 
  openCertificateInNewTab,
  formatGoogleDriveEmbedUrl
} from '../utils/pdfHelper';

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
  const [showEditUrl, setShowEditUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  if (!isOpen || !asset) return null;

  const cal = asset.calibracion;
  const rawPdfUrl = cal?.certificadoPdfUrl || (asset as any).certificadoPdfUrl || '';
  const evalCal = evaluateCalibration(cal);

  const embedUrl = getEmbeddableCertificateUrl(rawPdfUrl);
  const originalUrl = getOriginalCertificateUrl(rawPdfUrl);
  const isDrive = isGoogleDriveUrl(rawPdfUrl);
  const isWeb = isWebUrl(rawPdfUrl);

  const handleDownload = () => {
    if (!rawPdfUrl) {
      alert('No hay archivo PDF cargado para descargar.');
      return;
    }
    const cleanCode = asset.codigoActivoFisico.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (rawPdfUrl.startsWith('data:')) {
      downloadPdfFromDataUrl(rawPdfUrl, `certificado_calibracion_${cleanCode}.pdf`);
    } else {
      openCertificateInNewTab(rawPdfUrl, `certificado_calibracion_${cleanCode}.pdf`);
    }
  };

  const handleOpenExternal = () => {
    const cleanCode = asset.codigoActivoFisico.replace(/[^a-zA-Z0-9_-]/g, '_');
    openCertificateInNewTab(rawPdfUrl, `certificado_calibracion_${cleanCode}.pdf`);
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

  const handleSaveNewUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      alert('Por favor ingrese una URL válida.');
      return;
    }
    let finalUrl = trimmed;
    if (isGoogleDriveUrl(trimmed)) {
      finalUrl = formatGoogleDriveEmbedUrl(trimmed);
    }
    if (onUpdatePdf) {
      onUpdatePdf(asset.id, finalUrl);
    }
    setShowEditUrl(false);
    setUrlInput('');
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
                {asset.dniNumerico && (
                  <span className="font-mono text-[11px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                    DNI {asset.dniNumerico}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {asset.descripcion} {asset.marca && `• ${asset.marca}`}
              </p>
            </div>
          </div>

          {/* Action buttons & Close */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón principal requerido: Abrir en pestaña nueva */}
            {rawPdfUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                title="Abrir enlace original del certificado en una pestaña nueva del navegador"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir en pestaña nueva</span>
              </button>
            )}

            {/* Descargar o guardar copia local */}
            {rawPdfUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-sm transition cursor-pointer"
                title="Descargar o guardar copia del certificado"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{rawPdfUrl.startsWith('data:') ? 'Descargar PDF' : 'Guardar / Ver'}</span>
              </button>
            )}

            {/* Configurar / Cambiar Enlace o Archivo */}
            {onUpdatePdf && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput(rawPdfUrl && !rawPdfUrl.startsWith('data:') ? rawPdfUrl : '');
                    setShowEditUrl(!showEditUrl);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                  title="Editar enlace web o de Google Drive"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>Enlace Drive/Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
                  title="Subir archivo PDF local"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>PDF Local</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
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

        {/* Formulario rápido para editar/ingresar URL de Google Drive / Web */}
        {showEditUrl && onUpdatePdf && (
          <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200 flex flex-wrap items-center gap-2">
            <Globe className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-xs font-bold text-amber-900 shrink-0">
              Enlace / URL de Certificado (Drive o Web):
            </span>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://drive.google.com/file/d/... o https://servidor.com/cert.pdf"
              className="flex-1 min-w-[240px] px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleSaveNewUrl}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Guardar Enlace
            </button>
            <button
              type="button"
              onClick={() => setShowEditUrl(false)}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs"
            >
              Cancelar
            </button>
          </div>
        )}

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

            {/* Tipo de origen del certificado */}
            {rawPdfUrl && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Origen del Certificado</span>
                {isDrive ? (
                  <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                    ☁️ Google Drive (Embebido /preview)
                  </span>
                ) : isWeb ? (
                  <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                    🌐 Enlace Nube / Web Oficial
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded text-[11px]">
                    📄 Archivo PDF Adjunto
                  </span>
                )}
              </div>
            )}
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

        {/* Banner informativo de Google Drive */}
        {isDrive && (
          <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Visualizando enlace oficial de Google Drive en modo embebido directo (<code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">/preview</code>).
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="text-blue-700 hover:text-blue-900 underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Abrir en pestaña nueva</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* PDF / Iframe Viewer Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50 flex flex-col">
          {rawPdfUrl ? (
            <div className="w-full flex-1 min-h-[560px] bg-white rounded-2xl border border-slate-300 shadow-inner overflow-hidden flex flex-col">
              <iframe
                src={embedUrl}
                title={`Certificado Oficial ${asset.codigoActivoFisico}`}
                className="w-full flex-1 min-h-[560px] border-0"
                allow="autoplay"
              />
            </div>
          ) : (
            <div className="w-full min-h-[420px] flex flex-col items-center justify-center text-center p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                No hay enlace o archivo PDF configurado
              </h4>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Este instrumento requiere control metrológico pero aún no tiene configurado un enlace de Google Drive, URL web o archivo PDF del laboratorio acreditado.
              </p>

              {onUpdatePdf && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput('');
                      setShowEditUrl(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    Pegar Enlace de Google Drive / Web
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Subir Archivo PDF Local
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
