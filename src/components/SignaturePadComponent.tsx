import React, { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Eraser, CheckCircle2 } from 'lucide-react';

interface SignaturePadComponentProps {
  label: string;
  signeeName?: string;
  signeeRole?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  required?: boolean;
}

export const SignaturePadComponent: React.FC<SignaturePadComponentProps> = ({
  label,
  signeeName,
  signeeRole,
  value,
  onChange,
  required = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState<boolean>(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas with devicePixelRatio for ultra-crisp signatures
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.parentElement?.clientWidth || 360;
    const height = 130;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    const pad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#0f172a',
      minWidth: 1.2,
      maxWidth: 2.8,
    });
    signaturePadRef.current = pad;

    // If pre-existing value
    if (value && value.startsWith('data:image')) {
      pad.fromDataURL(value, { ratio: 1 });
      setHasSignature(true);
    }

    const handleEndStroke = () => {
      if (!pad.isEmpty()) {
        const data = pad.toDataURL('image/png');
        setHasSignature(true);
        onChange(data);
      }
    };

    pad.addEventListener('endStroke', handleEndStroke);

    return () => {
      pad.removeEventListener('endStroke', handleEndStroke);
      pad.off();
    };
  }, []);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasSignature(false);
      onChange('');
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            {label}
            {required && <span className="text-rose-500">*</span>}
          </span>
          {signeeName && (
            <p className="text-xs text-blue-700 font-bold truncate max-w-[240px]">
              {signeeName} {signeeRole && <span className="text-slate-500 font-normal">({signeeRole})</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSignature ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Firmado
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Pendiente de trazo</span>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg transition"
            title="Borrar y volver a firmar"
          >
            <Eraser className="w-3 h-3" /> Limpiar
          </button>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-white shadow-xs">
        <canvas
          ref={canvasRef}
          className="touch-none w-full block cursor-crosshair bg-white"
          height={130}
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <span className="text-slate-400 text-xs tracking-widest font-mono uppercase font-bold">
              Firme aquí con el dedo o puntero
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 text-center font-medium">
        Validez legal interna de pañol conforme a la directiva de seguridad del taller.
      </p>
    </div>
  );
};
