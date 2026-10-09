import React, { useEffect, useState } from 'react';
import { X, Printer, Settings2, Sparkles, CheckSquare } from 'lucide-react';
import { PhysicalAsset } from '../types/workshop';
import { getCachedQrDataUrl } from '../utils/qrHelper';

interface LabelSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: PhysicalAsset[];
}

export const LabelSheetModal: React.FC<LabelSheetModalProps> = ({
  isOpen,
  onClose,
  assets,
}) => {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [layoutMode, setLayoutMode] = useState<'a4_dense' | 'a4_large' | 'single'>('a4_dense');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [companyHeader, setCompanyHeader] = useState('PAÑOL CENTRAL - TALLER INDUSTRIAL');

  useEffect(() => {
    if (!isOpen || assets.length === 0) return;

    let mounted = true;
    const generateAllQrs = async () => {
      const map: Record<string, string> = {};
      for (const asset of assets) {
        map[asset.codigoActivoFisico] = await getCachedQrDataUrl(asset.codigoActivoFisico);
      }
      if (mounted) {
        setQrMap(map);
      }
    };

    generateAllQrs();
    return () => {
      mounted = false;
    };
  }, [isOpen, assets]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Modal Header (No Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-400" />
              <span>Generador de Etiquetas Físicas Adhesivas con QR</span>
            </h3>
            <p className="text-xs text-slate-400">
              Imprima para rotulado directo sobre dados (grabado/adhesivo vinilo) o paneles de sombra.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Hojas ({assets.length} Etiquetas)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Configuration Controls (No Print) */}
        <div className="no-print px-6 py-3 bg-slate-800/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-amber-400" /> Formato:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="layout"
                checked={layoutMode === 'a4_dense'}
                onChange={() => setLayoutMode('a4_dense')}
                className="text-amber-500 focus:ring-amber-400"
              />
              Hoja A4 Compacta (3 x 8 = 24 / pág)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="layout"
                checked={layoutMode === 'a4_large'}
                onChange={() => setLayoutMode('a4_large')}
                className="text-amber-500 focus:ring-amber-400"
              />
              Hoja A4 Grande (2 x 4 = 8 / pág)
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              Incluir ubicación en tablero
            </label>

            <input
              type="text"
              value={companyHeader}
              onChange={(e) => setCompanyHeader(e.target.value)}
              placeholder="Membrete de etiqueta"
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs w-56"
            />
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/70 flex justify-center">
          <div
            id="printable-label-sheet"
            className={`w-full max-w-[210mm] bg-white text-black p-4 sm:p-6 shadow-2xl rounded-sm print:m-0 print:p-2 print:shadow-none print:max-w-none print:w-full ${
              layoutMode === 'a4_dense'
                ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
            }`}
          >
            {assets.map((asset) => {
              const qr = qrMap[asset.codigoActivoFisico];
              return (
                <div
                  key={asset.id}
                  className="border-2 border-dashed border-gray-400 p-2 rounded flex flex-col justify-between bg-white relative break-inside-avoid print:border-gray-500"
                  style={{ minHeight: layoutMode === 'a4_dense' ? '32mm' : '48mm' }}
                >
                  {/* Top Company Bar */}
                  <div className="border-b border-gray-300 pb-1 mb-1.5 flex items-center justify-between">
                    <span className="text-[8px] font-black tracking-wider text-gray-700 uppercase truncate">
                      {companyHeader}
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 font-bold uppercase">
                      {asset.esImpacto ? '★ IMPACTO' : 'REGULAR'}
                    </span>
                  </div>

                  {/* Body: QR + Details */}
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 w-16 h-16 border border-gray-300 p-0.5 rounded bg-white flex items-center justify-center">
                      {qr ? (
                        <img src={qr} alt={asset.codigoActivoFisico} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 animate-pulse text-[8px] flex items-center justify-center">
                          QR...
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Physical Code & DNI 8 Digits in High-Visibility Monospace */}
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className="text-[10px] font-mono font-black text-black tracking-tight leading-none truncate bg-yellow-100 px-1 py-0.5 rounded border border-yellow-300">
                          {asset.codigoActivoFisico}
                        </span>
                        {asset.dniNumerico && (
                          <span className="text-[9px] font-mono font-black text-blue-900 bg-blue-100 px-1 py-0.5 rounded border border-blue-300">
                            DNI: {asset.dniNumerico}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[9px] font-bold text-gray-800 line-clamp-2 leading-tight">
                        {asset.descripcion}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1 text-[8px] text-gray-600 font-mono">
                        {asset.marca && <span className="font-semibold">{asset.marca}</span>}
                        {asset.medida && <span>• {asset.medida}</span>}
                        {asset.encastre && <span>• Encastre {asset.encastre}"</span>}
                      </div>

                      {includeLocation && asset.ubicacion && (
                        <p className="text-[7.5px] text-gray-500 truncate mt-0.5">
                          📍 {asset.ubicacion}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="mt-1 pt-0.5 border-t border-gray-200 flex justify-between items-center text-[7px] text-gray-400 font-mono">
                    <span>PAÑOL ACTIVO TANGIBLE</span>
                    <span>{asset.fechaAlta}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
