import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertTriangle, Search, Keyboard } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  subtitle?: string;
  suggestedCodes?: string[];
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código QR de Activo Físico',
  subtitle = 'Apunte la cámara a la placa física o etiqueta QR del dado o herramienta.',
  suggestedCodes = [],
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-interactive-reader';

  // Play a crisp beep tone using Web Audio API on successful detection
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext may be blocked or unsupported; silent fallback
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setCameraError(null);
    setIsScanning(true);

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(readerElementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (mounted) {
              playBeep();
              onScan(decodedText.trim());
              onClose();
            }
          },
          () => {
            // Frame ignored (no code detected)
          }
        );
      } catch (err) {
        if (mounted) {
          console.warn('Camera scanner initialization failed:', err);
          setCameraError(
            'No se pudo acceder a la cámara. Puede usar el teclado o seleccionar códigos rápidos abajo.'
          );
          setIsScanning(false);
        }
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScan(manualCode.trim().toUpperCase());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50 overflow-y-auto">
          <div className="w-full max-w-xs relative rounded-2xl overflow-hidden border-2 border-amber-500 shadow-md bg-black aspect-square flex items-center justify-center">
            <div id={readerElementId} className="w-full h-full" />
            {cameraError && (
              <div className="absolute inset-0 p-4 bg-slate-900/90 text-white flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-xs text-slate-200 font-medium">{cameraError}</p>
              </div>
            )}
            {isScanning && !cameraError && (
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="w-full mt-5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-amber-600" />
              O ingrese / tipee el código de activo físico:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ej: DAD-IMP-1/2-17MM-001 o TAL-DEW-001"
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
            </div>
          </form>

          {/* Quick Select Chips */}
          {suggestedCodes.length > 0 && (
            <div className="w-full mt-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Códigos de prueba rápidos en pañol:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestedCodes.slice(0, 6).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      playBeep();
                      onScan(code);
                      onClose();
                    }}
                    className="text-xs font-mono bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-xs"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
