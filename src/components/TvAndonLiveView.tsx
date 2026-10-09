import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, 
  Clock, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Wrench, 
  ShieldCheck, 
  ArrowLeft,
  Radio,
  Sparkles,
  Flame,
  Calendar,
  Layers,
  UserCheck
} from 'lucide-react';
import { LoanDispatch, PhysicalAsset, StorekeeperProfile, Technician } from '../types/workshop';
import { calculateLoanAlert } from '../utils/timeAlerts';

interface TvAndonLiveViewProps {
  dispatches: LoanDispatch[];
  assets: PhysicalAsset[];
  activeStorekeeper: StorekeeperProfile;
  technicians?: Technician[];
  onExitTvMode: () => void;
  onRefreshData?: () => void;
}

export const TvAndonLiveView: React.FC<TvAndonLiveViewProps> = ({
  dispatches,
  assets,
  activeStorekeeper,
  technicians = [],
  onExitTvMode,
  onRefreshData,
}) => {
  // Real-time clock tick (every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [rotationProgress, setRotationProgress] = useState(0);

  // Track previous overdue count to trigger audio alert when a new one appears
  const prevOverdueCountRef = useRef<number>(0);

  const CAROUSEL_INTERVAL_SEC = 15;
  const ITEMS_PER_PAGE = 6;

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 3. Auto-refresh background poll (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefreshData) {
        onRefreshData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [onRefreshData]);

  // Compute active loans and analyzed states
  const activeDispatches = useMemo(() => {
    return dispatches.filter((d) => d.items.some((it) => !it.retornado));
  }, [dispatches]);

  const analyzedLoans = useMemo(() => {
    return activeDispatches.map((dispatch) => {
      const alert = calculateLoanAlert(dispatch.fechaPrestamo, currentTime);
      const unreturnedItems = dispatch.items.filter((it) => !it.retornado);

      // Find matching asset photos if available
      const firstItem = unreturnedItems[0];
      const matchedAsset = assets.find(
        (a) => a.codigoActivoFisico.toUpperCase() === firstItem?.codigoActivoFisico.toUpperCase()
      );

      // Matched technician info
      const matchedTech = technicians.find((t) => t.dni === dispatch.tecnicoDni);

      return {
        dispatch,
        alert,
        unreturnedItems,
        matchedAsset,
        matchedTech,
      };
    }).sort((a, b) => {
      // Priority sorting: Overdue first (highest overdue first), then warning, then regular
      const priorityOrder = { vencido: 0, por_vencer: 1, normal: 2 };
      const diff = priorityOrder[a.alert.estadoSemaforo] - priorityOrder[b.alert.estadoSemaforo];
      if (diff !== 0) return diff;
      return b.alert.horasSobretiempo - a.alert.horasSobretiempo;
    });
  }, [activeDispatches, currentTime, assets, technicians]);

  // Counts
  const overdueCount = analyzedLoans.filter((x) => x.alert.estadoSemaforo === 'vencido').length;
  const warningCount = analyzedLoans.filter((x) => x.alert.estadoSemaforo === 'por_vencer').length;
  const normalCount = analyzedLoans.filter((x) => x.alert.estadoSemaforo === 'normal').length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(analyzedLoans.length / ITEMS_PER_PAGE));
  const currentLoansPage = analyzedLoans.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Sound chime synthesizer via Web Audio API
  const playAlertSound = () => {
    if (!isAudioEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.35);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio might be blocked by browser policy until user gesture
    }
  };

  // Trigger sound when critical count increments
  useEffect(() => {
    if (overdueCount > prevOverdueCountRef.current) {
      playAlertSound();
    }
    prevOverdueCountRef.current = overdueCount;
  }, [overdueCount]);

  // 4. Carousel / 15-second rotation
  useEffect(() => {
    if (totalPages <= 1 || isPaused) {
      setRotationProgress(0);
      return;
    }

    const stepMs = 100;
    const totalSteps = (CAROUSEL_INTERVAL_SEC * 1000) / stepMs;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;
      setRotationProgress((currentStep / totalSteps) * 100);

      if (currentStep >= totalSteps) {
        currentStep = 0;
        setRotationProgress(0);
        setCurrentPage((prev) => (prev + 1) % totalPages);
      }
    }, stepMs);

    return () => clearInterval(interval);
  }, [totalPages, isPaused]);

  // Reset page if bounds change
  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(0);
    }
  }, [totalPages, currentPage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Upcoming calibration alerts for marquee ticker
  const calibratableNearDue = useMemo(() => {
    return assets.filter((a) => {
      if (!a.calibracion?.requiereCalibracion || !a.calibracion?.fechaVencimiento) return false;
      const due = new Date(a.calibracion.fechaVencimiento).getTime();
      const now = currentTime.getTime();
      const diffDays = (due - now) / (1000 * 3600 * 24);
      return diffDays <= 30;
    });
  }, [assets, currentTime]);

  // Formatted date string
  const formattedDate = currentTime.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Ambient background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER SECTION */}
      <header className="relative z-10 px-6 py-4 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xl">
        {/* Left: Branding & Workshop Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 shrink-0">
            <Tv className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                TRANSMISIÓN EN VIVO
              </span>
              <span className="text-xs font-mono text-slate-400">
                ANDON v3.4 • PAÑOL CENTRAL
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
              <span>TALLER INDUSTRIAL - MONITOR ANDON</span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guardia Activa:</span>
              <strong className="text-emerald-400 font-bold tracking-wide">
                {activeStorekeeper?.nombreCompleto || 'Álvaro Aragón Puertas'}
              </strong>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">DNI: {activeStorekeeper?.dni || '71424847'}</span>
            </p>
          </div>
        </div>

        {/* Center: Real-Time Digital Clock */}
        <div className="flex items-center justify-center">
          <div className="px-6 py-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-inner flex flex-col items-center">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {currentTime.toLocaleTimeString('es-PE', { hour12: false })}
              </span>
            </div>
            <span className="text-xs font-semibold capitalize text-slate-400 tracking-wider mt-0.5">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Right: 3 Big KPI Counters */}
        <div className="flex items-center gap-3">
          {/* KPI 1: En Plazo (<24h) */}
          <div className="px-4 py-2 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center min-w-[110px]">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
              🟢 En Plazo
            </span>
            <span className="text-3xl font-black text-emerald-300 font-mono">
              {normalCount}
            </span>
            <span className="text-[10px] text-emerald-500 font-bold block">&lt; 18h en campo</span>
          </div>

          {/* KPI 2: Por Vencer (18-24h) */}
          <div className="px-4 py-2 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-center min-w-[110px]">
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              🟡 Por Vencer
            </span>
            <span className="text-3xl font-black text-amber-300 font-mono">
              {warningCount}
            </span>
            <span className="text-[10px] text-amber-500 font-bold block">18 - 24 horas</span>
          </div>

          {/* KPI 3: Crítico / Sobretiempo (>24h) */}
          <div className={`px-5 py-2 rounded-2xl text-center min-w-[130px] border-2 transition ${
            overdueCount > 0 
              ? 'bg-red-950/80 border-red-500 shadow-lg shadow-red-500/30 glow-danger' 
              : 'bg-slate-900 border-slate-800'
          }`}>
            <span className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>🔴 CRÍTICO</span>
            </span>
            <span className="text-3xl font-black text-red-300 font-mono">
              {overdueCount}
            </span>
            <span className="text-[10px] text-red-400 font-bold block animate-pulse">
              &gt; 24h RETENCIÓN
            </span>
          </div>
        </div>
      </header>

      {/* ROTATION PROGRESS & CONTROLS BAR (if more than 1 page) */}
      <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">
              Mostrando {currentLoansPage.length} de {analyzedLoans.length} préstamos activos
            </span>
            {totalPages > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold border border-slate-700">
                Pág. {currentPage + 1} / {totalPages}
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 font-mono text-[11px]"
                title={isPaused ? 'Reanudar rotación automática' : 'Pausar rotación'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isPaused ? 'Pausado' : 'Rotando 15s'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => (prev + 1) % totalPages)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Siguiente página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Rotation progress bar */}
        {totalPages > 1 && !isPaused && (
          <div className="hidden sm:flex items-center gap-2 w-64">
            <span className="text-[10px] text-slate-500 font-mono">Ciclo 15s:</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${rotationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isAudioEnabled;
              setIsAudioEnabled(next);
              if (next) playAlertSound();
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isAudioEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Activar/desactivar aviso sonoro para items mayores a 24 horas"
          >
            {isAudioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Alertas: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Audio Alertas: OFF</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            title="Modo pantalla completa (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir Fullscreen' : '⛶ Modo Pantalla Completa'}</span>
          </button>

          {/* Exit TV Mode */}
          <button
            type="button"
            onClick={onExitTvMode}
            className="px-3 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-bold transition flex items-center gap-1.5"
            title="Salir a la administración del taller"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panel Taller</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA: LIVE CARDS GRID */}
      <main className="flex-1 p-6 overflow-y-auto">
        {analyzedLoans.length === 0 ? (
          /* Empty State: Zero tools in field (100% in warehouse) */
          <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-2xl shadow-emerald-500/20 animate-pulse">
              <CheckCircle2 className="w-14 h-14" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              TODO EL EQUIPAMIENTO ESTÁ EN PAÑOL
            </h2>
            <p className="text-base text-emerald-400/90 font-medium max-w-md mt-2">
              No hay herramientas retenidas en campo en este momento. Inventario 100% resguardado y seguro.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Inspección al día • Pañolero en turno: {activeStorekeeper?.nombreCompleto}</span>
            </div>
          </div>
        ) : (
          /* Live Cards Grid: High-contrast, large typography, legible at 5+ meters */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {currentLoansPage.map(({ dispatch, alert, unreturnedItems, matchedAsset }) => {
              const isOverdue = alert.estadoSemaforo === 'vencido';
              const isWarning = alert.estadoSemaforo === 'por_vencer';

              // Calculate remaining time percentage (out of 24h limit)
              const maxHours = 24;
              const usedHours = Math.min(maxHours, alert.horasTranscurridas);
              const remainingPercent = Math.max(0, 100 - (usedHours / maxHours) * 100);

              const firstItem = unreturnedItems[0];
              const remainingCount = unreturnedItems.length - 1;

              return (
                <div
                  key={dispatch.id}
                  className={`rounded-3xl p-6 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-2xl ${
                    isOverdue
                      ? 'bg-gradient-to-br from-rose-950/95 via-red-950/90 to-slate-950 border-2 border-red-500 shadow-red-600/30 glow-danger'
                      : isWarning
                      ? 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-2 border-amber-500/80 shadow-amber-500/20'
                      : 'bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950 border-2 border-slate-700/80 hover:border-emerald-500/60'
                  }`}
                >
                  {/* Top Badge & Time Counter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                      {isOverdue ? (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5" />
                            RETRASO CRÍTICO
                          </span>
                        </div>
                      ) : isWarning ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full">
                            ⚠️ POR VENCER (18-24H)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full">
                            ✓ EN PLAZO REGULAR
                          </span>
                        </div>
                      )}

                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
                        {dispatch.codigoVale}
                      </span>
                    </div>

                    {/* GIANT TIME INDICATOR */}
                    {isOverdue ? (
                      <div className="bg-red-950/70 p-3.5 rounded-2xl border border-red-500/40 text-center">
                        <span className="text-[11px] font-black uppercase text-red-300 tracking-widest block">
                          SOBRETIEMPO ACUMULADO
                        </span>
                        <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2 my-1">
                          <span className="text-red-400">+{alert.horasSobretiempo.toFixed(1)}</span>
                          <span className="text-xl text-red-300 font-bold">HORAS</span>
                        </div>
                        <span className="text-xs text-red-200 font-semibold block">
                          Total en campo: {alert.textoTiempo}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-400 font-medium">Tiempo en campo:</span>
                          <span className="font-mono font-bold text-white text-sm">
                            {alert.textoTiempo}
                          </span>
                        </div>
                        {/* Progress Bar out of 24h */}
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, (alert.horasTranscurridas / 24) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                          <span>0h</span>
                          <span>Límite 24h ({Math.max(0, 24 - alert.horasTranscurridas).toFixed(1)}h restantes)</span>
                        </div>
                      </div>
                    )}

                    {/* ASSET DETAILS (with optional image) */}
                    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {matchedAsset?.fotoUrl ? (
                          <img
                            src={matchedAsset.fotoUrl}
                            alt={firstItem?.descripcion || 'Herramienta'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Wrench className="w-8 h-8 text-amber-500/80" />
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-amber-400 tracking-wider">
                            {firstItem?.codigoActivoFisico || 'ACTIVO'}
                          </span>
                          {matchedAsset?.dniNumerico && (
                            <span className="font-mono font-bold text-[11px] bg-blue-600/80 text-white px-1.5 py-0.5 rounded border border-blue-400/50">
                              DNI {matchedAsset.dniNumerico}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white truncate" title={firstItem?.descripcion}>
                          {firstItem?.descripcion || 'Herramienta / Dado'}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Ubic: <strong className="text-slate-300 font-mono">{firstItem?.ubicacion || 'Taller'}</strong></span>
                          {remainingCount > 0 && (
                            <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                              +{remainingCount} ítem(s) más
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM: TECHNICIAN RESPONSIBLE (LEGIBLE AT 5 METERS) */}
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      TÉCNICO RESPONSABLE DEL VALE:
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* Huge Technician Name */}
                        <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                          {dispatch.tecnicoNombre}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 font-mono">
                          <span>DNI: <strong className="text-amber-400 font-bold">{dispatch.tecnicoDni}</strong></span>
                          <span>•</span>
                          <span className="text-slate-400">{dispatch.tecnicoArea}</span>
                        </div>
                      </div>

                      {/* Area Badge */}
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold shrink-0 self-start">
                        {dispatch.ordenTrabajo || 'Mantenimiento'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                      <span>Retiro: {new Date(dispatch.fechaPrestamo).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Fecha: {new Date(dispatch.fechaPrestamo).toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* BOTTOM MARQUEE / INFORMATIVE TICKER */}
      <footer className="relative z-10 bg-slate-950 border-t-2 border-slate-800 overflow-hidden py-3 px-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>AVISOS DE PAÑOL</span>
          </div>

          <div className="overflow-hidden flex-1 relative">
            <div className="animate-marquee whitespace-nowrap text-xs text-slate-300 font-medium">
              <span className="inline-flex items-center gap-2 mx-6">
                🚨 <strong className="text-white">REGLAMENTO GENERAL DE SEGURIDAD:</strong> Todo equipo, dado de impacto y herramienta especial debe retornar al almacén al término del turno o antes de las 24 horas continuas de uso.
              </span>
              <span className="inline-flex items-center gap-2 mx-6">
                ⭐ <strong className="text-amber-400">DESPACHO CONFORMADO:</strong> Todo préstamo requiere firma digital registrada y verificación visual de fisuras al momento de la entrega y devolución.
              </span>
              {calibratableNearDue.length > 0 && (
                <span className="inline-flex items-center gap-2 mx-6 text-red-300">
                  ⚠️ <strong className="text-red-400">ALERTA DE METROLOGÍA:</strong> {calibratableNearDue.length} instrumento(s) con certificación por vencer en los próximos 30 días. Inspección requerida.
                </span>
              )}
              <span className="inline-flex items-center gap-2 mx-6">
                👷 <strong>GUARDIA CENTRAL EN TURNO:</strong> {activeStorekeeper?.nombreCompleto || 'Álvaro Aragón Puertas'} (DNI: {activeStorekeeper?.dni || '71424847'}) • Módulo de Atención de Almacén.
              </span>
              <span className="inline-flex items-center gap-2 mx-6">
                🔄 <strong>SINCRONIZACIÓN AUTOMÁTICA ACTIVA:</strong> Las herramientas devueltas se actualizan instantáneamente en esta pantalla.
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate-400 shrink-0 border-l border-slate-800 pl-3">
            <span>Activos: <strong className="text-white">{assets.length}</strong></span>
            <span>•</span>
            <span>En campo: <strong className="text-amber-400">{activeDispatches.length}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
