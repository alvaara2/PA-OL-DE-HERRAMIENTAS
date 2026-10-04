import React from 'react';
import { Cog, Wrench, Disc, Settings, Hammer, Sparkles } from 'lucide-react';

interface ToolSpinLoaderProps {
  message?: string;
  submessage?: string;
  isOverlay?: boolean;
  onClose?: () => void;
}

export const ToolSpinLoader: React.FC<ToolSpinLoaderProps> = ({
  message = 'Sincronizando Herramientas y Dados de Pañol...',
  submessage = 'Verificando placas de activos físicos, calibres y tableros de sombra',
  isOverlay = false,
  onClose,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 bg-white/98 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-2xl max-w-sm text-center relative overflow-hidden">
      {/* Background Soft Aura */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />

      {/* Close button if provided */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition"
        >
          ✕
        </button>
      )}

      {/* Animated Workshop Mechanical Assembly */}
      <div className="relative w-36 h-36 flex items-center justify-center my-3">
        {/* Outer Orbit Guide Ring */}
        <div className="absolute inset-2 rounded-full border border-dashed border-slate-300 animate-spin-gear pointer-events-none" />

        {/* Outer Glow Ring */}
        <div className="absolute inset-4 rounded-full bg-amber-400/20 blur-xl animate-pulse pointer-events-none" />

        {/* Central Golden Sun Gear */}
        <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-lg animate-spin-gear z-10">
          <Cog className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Secondary Counter-Rotating Dark Industrial Gear */}
        <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-md animate-spin-gear-reverse z-10">
          <Settings className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* Tool 1: Orbiting Rotating Wrench (Llave Corona / Boca) */}
        <div className="absolute w-8 h-8 flex items-center justify-center animate-wrench-orbit text-blue-600 z-20">
          <div className="p-1.5 bg-white border-2 border-blue-600 rounded-full shadow-md animate-tool-self-spin">
            <Wrench className="w-4 h-4 transform -rotate-45" />
          </div>
        </div>

        {/* Tool 2: Orbiting Rotating Socket (Dado Hexagonal de Impacto) */}
        <div className="absolute w-8 h-8 flex items-center justify-center animate-socket-orbit text-amber-600 z-20">
          <div className="p-1.5 bg-white border-2 border-amber-600 rounded-full shadow-md animate-tool-self-spin">
            <Disc className="w-4 h-4" />
          </div>
        </div>

        {/* Tool 3: Orbiting Rotating Hammer (Martillo de Pañol) */}
        <div className="absolute w-8 h-8 flex items-center justify-center animate-hammer-orbit text-emerald-600 z-20">
          <div className="p-1.5 bg-white border-2 border-emerald-600 rounded-full shadow-md animate-tool-self-spin">
            <Hammer className="w-4 h-4" />
          </div>
        </div>

        {/* Tool 4: Orbiting Rotating Precision Spark (Chispa de Torque) */}
        <div className="absolute w-8 h-8 flex items-center justify-center animate-screwdriver-orbit text-rose-600 z-20">
          <div className="p-1.5 bg-white border-2 border-rose-600 rounded-full shadow-md animate-tool-self-spin">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Title & Status Message */}
      <div className="mt-2 space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
          Mecanismo de Pañol en Marcha
        </div>
        <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug">
          {message}
        </h4>
        {submessage && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
            {submessage}
          </p>
        )}
      </div>

      {/* Progress Bounce Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="py-8 flex items-center justify-center w-full">
      {content}
    </div>
  );
};
