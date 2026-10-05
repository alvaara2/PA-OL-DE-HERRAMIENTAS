import React, { useState } from 'react';
import { 
  TrendingUp, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Layers, 
  Users, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Camera, 
  Sparkles, 
  Activity, 
  Award, 
  Lock, 
  Mail, 
  Contact,
  ShieldCheck,
  Disc,
  Hammer,
  Zap,
  RotateCw,
  Gauge,
  Check,
  AlertTriangle,
  ArrowRight,
  Eye,
  Tv
} from 'lucide-react';
import { PhysicalAsset, LoanDispatch, Technician, StorekeeperProfile } from '../types/workshop';
import { calculateLoanAlert } from '../utils/timeAlerts';
import { evaluateCalibration } from '../utils/calibrationHelper';
import { ToolSpinLoader } from './ToolSpinLoader';
import { ActiveTab } from './HeaderNav';

interface WorkshopDashboardViewProps {
  assets: PhysicalAsset[];
  dispatches: LoanDispatch[];
  technicians: Technician[];
  activeStorekeeper: StorekeeperProfile;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenShiftModal: () => void;
  onOpenQuickDispatch: () => void;
  onOpenScanner: () => void;
  onOpenLabelSheet: (assets: PhysicalAsset[]) => void;
}

export const WorkshopDashboardView: React.FC<WorkshopDashboardViewProps> = ({
  assets,
  dispatches,
  technicians,
  activeStorekeeper,
  onNavigateTab,
  onOpenShiftModal,
  onOpenQuickDispatch,
  onOpenScanner,
  onOpenLabelSheet,
}) => {
  // Interactive loader showcase state
  const [showRotatingToolLoader, setShowRotatingToolLoader] = useState(false);
  const [selectedKpiFilter, setSelectedKpiFilter] = useState<'all' | 'dados' | 'calibrables' | 'electricas' | 'manuales'>('all');

  // Filter assets if user selects category filter
  const filteredAssets = assets.filter((asset) => {
    if (selectedKpiFilter === 'dados') {
      return (
        asset.categoria === 'dado_estandar' ||
        asset.categoria === 'dado_impacto' ||
        asset.categoria === 'copa_accesorio' ||
        asset.categoria === 'extension'
      );
    }
    if (selectedKpiFilter === 'calibrables') return asset.calibracion?.requiereCalibracion;
    if (selectedKpiFilter === 'electricas') {
      return asset.categoria === 'herramienta_electrica' || asset.categoria === 'herramienta_neumatica';
    }
    if (selectedKpiFilter === 'manuales') {
      return asset.categoria === 'herramienta_manual' || asset.categoria === 'llave_combinada';
    }
    return true;
  });

  // KPI 1: Fleet availability & physical condition
  const totalAssets = assets.length;
  const availableAssets = assets.filter((a) => a.estado === 'disponible').length;
  const inFieldAssets = assets.filter((a) => a.estado === 'prestado').length;
  const inMaintenanceAssets = assets.filter((a) => a.estado === 'mantenimiento' || a.condicionFisica === 'fisurado').length;
  const availabilityRate = totalAssets > 0 ? Math.round((availableAssets / totalAssets) * 100) : 0;
  const inFieldRate = totalAssets > 0 ? Math.round((inFieldAssets / totalAssets) * 100) : 0;
  const maintenanceRate = totalAssets > 0 ? Math.max(0, 100 - availabilityRate - inFieldRate) : 0;

  // Asset Condition Health Score
  const optimalAssets = assets.filter((a) => a.condicionFisica === 'operativo').length;
  const wearAssets = assets.filter((a) => a.condicionFisica === 'desgaste').length;
  const damagedAssets = assets.filter((a) => a.condicionFisica === 'fisurado' || a.condicionFisica === 'perdido').length;
  const healthScore = totalAssets > 0 ? Math.round((optimalAssets / totalAssets) * 100) : 100;

  // KPI 2: Live overdue (> 24 hours) & overtime hours
  const activeDispatches = dispatches.filter((d) => d.items.some((it) => !it.retornado));
  const analyzedActiveLoans = activeDispatches.map((d) => ({
    dispatch: d,
    alert: calculateLoanAlert(d.fechaPrestamo),
  }));

  const overdueLoans = analyzedActiveLoans.filter((x) => x.alert.estadoSemaforo === 'vencido');
  const warningLoans = analyzedActiveLoans.filter((x) => x.alert.estadoSemaforo === 'por_vencer');
  const onTimeLoans = analyzedActiveLoans.filter((x) => x.alert.estadoSemaforo === 'normal');
  const totalOverdueHours = overdueLoans.reduce((sum, item) => sum + item.alert.horasSobretiempo, 0);

  // Technician with highest overdue delay
  const maxOverdueItem = overdueLoans.length > 0 
    ? [...overdueLoans].sort((a, b) => b.alert.horasSobretiempo - a.alert.horasSobretiempo)[0]
    : null;

  // KPI 3: Metrology & Calibration Status (ISO / QA compliance)
  const calibratedAssets = assets.filter((a) => a.calibracion?.requiereCalibracion);
  const metrologyEvaluations = calibratedAssets.map((a) => ({
    asset: a,
    evaluation: evaluateCalibration(a.calibracion),
  }));
  const validCalibrations = metrologyEvaluations.filter((x) => x.evaluation.estadoMetrologico === 'vigente');
  const warningCalibrations = metrologyEvaluations.filter((x) => x.evaluation.estadoMetrologico === 'por_vencer');
  const expiredCalibrations = metrologyEvaluations.filter((x) => x.evaluation.estadoMetrologico === 'vencido');
  const metrologyComplianceRate = calibratedAssets.length > 0
    ? Math.round((validCalibrations.length / calibratedAssets.length) * 100)
    : 100;

  // KPI 4: Global Technician On-time rate & Return condition
  const totalDispatchesCount = dispatches.length;
  const completedDispatches = dispatches.filter((d) => d.estado === 'completado');
  const overdueDispatchesCount = dispatches.filter((d) => d.estado === 'vencido').length;
  const globalOnTimeRate = totalDispatchesCount > 0
    ? Math.round(((totalDispatchesCount - overdueDispatchesCount) / totalDispatchesCount) * 100)
    : 100;

  // Turn Productivity (Today's movements)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDispatches = dispatches.filter((d) => d.fechaPrestamo.startsWith(todayStr)).length;
  const todayReturns = dispatches.filter((d) => d.devolucionTimestamp?.startsWith(todayStr)).length;

  // Average loan retention time (hours)
  let totalRetentionHours = 0;
  let retentionSamples = 0;
  completedDispatches.forEach((d) => {
    if (d.devolucionTimestamp) {
      const start = new Date(d.fechaPrestamo).getTime();
      const end = new Date(d.devolucionTimestamp).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours > 0 && diffHours < 168) {
        totalRetentionHours += diffHours;
        retentionSamples++;
      }
    }
  });
  const avgRetentionHours = retentionSamples > 0 ? (totalRetentionHours / retentionSamples).toFixed(1) : '3.8';

  // KPI 5: Most Requested Tools / Sockets
  const toolUsageCounter: Record<string, { asset: PhysicalAsset; count: number }> = {};
  dispatches.forEach((d) => {
    d.items.forEach((it) => {
      const foundAsset = assets.find((a) => a.codigoActivoFisico === it.codigoActivoFisico);
      if (foundAsset) {
        if (!toolUsageCounter[foundAsset.codigoActivoFisico]) {
          toolUsageCounter[foundAsset.codigoActivoFisico] = { asset: foundAsset, count: 0 };
        }
        toolUsageCounter[foundAsset.codigoActivoFisico].count += 1;
      }
    });
  });

  const topRequestedTools = Object.values(toolUsageCounter)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxUsageCount = topRequestedTools.length > 0 ? topRequestedTools[0].count : 1;

  // Active technicians with tools in custody
  const activeTechCustodyMap: Record<string, { technician: Technician | null; name: string; dni: string; count: number; hasOverdue: boolean }> = {};
  activeDispatches.forEach((d) => {
    const isOverdue = calculateLoanAlert(d.fechaPrestamo).estadoSemaforo === 'vencido';
    const unreturnedCount = d.items.filter((it) => !it.retornado).length;
    if (!activeTechCustodyMap[d.tecnicoDni]) {
      const matchedTech = technicians.find((t) => t.dni === d.tecnicoDni) || null;
      activeTechCustodyMap[d.tecnicoDni] = {
        technician: matchedTech,
        name: d.tecnicoNombre,
        dni: d.tecnicoDni,
        count: unreturnedCount,
        hasOverdue: isOverdue,
      };
    } else {
      activeTechCustodyMap[d.tecnicoDni].count += unreturnedCount;
      if (isOverdue) activeTechCustodyMap[d.tecnicoDni].hasOverdue = true;
    }
  });
  const activeCustodyList = Object.values(activeTechCustodyMap).slice(0, 4);

  // Category breakdown counts
  const socketsCount = assets.filter(
    (a) =>
      a.categoria === 'dado_estandar' ||
      a.categoria === 'dado_impacto' ||
      a.categoria === 'copa_accesorio' ||
      a.categoria === 'extension'
  ).length;
  const manualCount = assets.filter(
    (a) => a.categoria === 'herramienta_manual' || a.categoria === 'llave_combinada'
  ).length;
  const electricalCount = assets.filter(
    (a) => a.categoria === 'herramienta_electrica' || a.categoria === 'herramienta_neumatica'
  ).length;
  const metrologyCount = calibratedAssets.length;

  return (
    <div className="space-y-6">
      {/* Interactive Rotating Tool Loader Modal */}
      {showRotatingToolLoader && (
        <div 
          onClick={() => setShowRotatingToolLoader(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ToolSpinLoader
              message="Simulación: Mecanismo de Pañol y Rotación de Herramientas"
              submessage="Verificando códigos físicos únicos, tableros de sombra y llaves en rotación"
              onClose={() => setShowRotatingToolLoader(false)}
            />
          </div>
        </div>
      )}

      {/* Top Welcome & Operational Status Hero with Clear Palette */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="space-y-2 z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold tracking-tight">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Sistema Industrial de Control de Pañol & Metrología
            </div>

            <button
              onClick={onOpenShiftModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs"
              title="Clic para cambiar de turno o firma predeterminada"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Turno: <strong>{activeStorekeeper.nombreCompleto}</strong> (DNI: {activeStorekeeper.dni})</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Firma Auto-Estampada OK
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Ejecutivo de Pañol, Herramientas & Calibración
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
            Gestión en tiempo real con trazabilidad física plaquetada, fotochecks con lectura QR,
            bloqueo de seguridad para instrumentos vencidos y monitor de sobretiempo superior a 24 horas.
          </p>
        </div>

        {/* Action Fast-Buttons & Loader Trigger */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 shrink-0">
          {/* Modo TV Andon Button */}
          <button
            onClick={() => onNavigateTab('tv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-black text-xs transition border border-amber-500/40 shadow-xs group cursor-pointer"
            title="Abrir Pantalla en Vivo para Smart TV / Modo Andon (/tv)"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
            <span>Modo TV Andon</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping ml-0.5" />
          </button>

          {/* Animated Spinner Showcase Button */}
          <button
            onClick={() => setShowRotatingToolLoader(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition shadow-2xs group"
            title="Ver animación de herramientas mecánicas girando en acción"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-180 transition-transform duration-500" />
            <span>Herramientas Girando</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-200"
            title="Escanear carnet fotocheck de técnico o QR de herramienta con cámara"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Escanear QR</span>
          </button>

          <button
            onClick={() => onOpenLabelSheet(assets)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-200"
            title="Imprimir hoja de etiquetas QR adhesivas"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>Rótulos QR</span>
          </button>

          <button
            onClick={onOpenQuickDispatch}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Despacho</span>
          </button>
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">
            Filtro Rápido:
          </span>
          <button
            onClick={() => setSelectedKpiFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedKpiFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Todos ({totalAssets})
          </button>
          <button
            onClick={() => setSelectedKpiFilter('dados')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              selectedKpiFilter === 'dados'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            Dados & Copas ({socketsCount})
          </button>
          <button
            onClick={() => setSelectedKpiFilter('calibrables')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              selectedKpiFilter === 'calibrables'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Calibrables ISO ({metrologyCount})
          </button>
          <button
            onClick={() => setSelectedKpiFilter('electricas')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              selectedKpiFilter === 'electricas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Eléctricas ({electricalCount})
          </button>
          <button
            onClick={() => setSelectedKpiFilter('manuales')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              selectedKpiFilter === 'manuales'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Manuales ({manualCount})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Mostrando {filteredAssets.length} de {totalAssets} activos registrados
        </span>
      </div>

      {/* 4 Premier Executive KPI Cards (Luminous, High-Contrast Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Disponibilidad Operativa de Pañol */}
        <div 
          onClick={() => onNavigateTab('catalog')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-emerald-300 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Disponibilidad de Flota
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {availabilityRate}%
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {availableAssets} en pañol
            </span>
          </div>

          {/* Stacked multi-status progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${availabilityRate}%` }}
              title={`Disponible: ${availableAssets} (${availabilityRate}%)`}
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${inFieldRate}%` }}
              title={`En campo: ${inFieldAssets} (${inFieldRate}%)`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${maintenanceRate}%` }}
              title={`Mantenimiento: ${inMaintenanceAssets} (${maintenanceRate}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> {inFieldAssets} en uso
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> {inMaintenanceAssets} daño
            </span>
            <span className="text-blue-600 font-bold group-hover:underline">Ver catálogo &gt;</span>
          </div>
        </div>

        {/* KPI 2: Semáforo Crítico > 24H (Retrasos en Campo) */}
        <div
          onClick={() => onNavigateTab('monitor')}
          className={`cursor-pointer rounded-2xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition group ${
            overdueLoans.length > 0
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/20 hover:bg-rose-50 animate-overdue-alert'
              : 'bg-white border-slate-200/90 hover:shadow-md hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              overdueLoans.length > 0 ? 'text-rose-800' : 'text-slate-500'
            }`}>
              {overdueLoans.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
              )}
              Retrasos &gt; 24 Horas
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition ${
              overdueLoans.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${
              overdueLoans.length > 0 ? 'text-rose-950' : 'text-slate-900'
            }`}>
              {overdueLoans.length}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
              overdueLoans.length > 0 
                ? 'text-rose-800 bg-rose-100 border-rose-200' 
                : 'text-slate-600 bg-slate-100 border-slate-200'
            }`}>
              vales vencidos
            </span>
          </div>

          <p className={`text-[11px] font-semibold mt-2.5 ${
            overdueLoans.length > 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {overdueLoans.length > 0
              ? `Acumula +${Math.round(totalOverdueHours)}h de sobretiempo en taller`
              : '✓ Cero retrasos críticos en campo'}
          </p>

          <div className="flex items-center justify-between text-[11px] mt-2 font-bold">
            <span className="text-slate-400">
              {warningLoans.length > 0 ? `⚠️ ${warningLoans.length} por vencer (18-24h)` : `${onTimeLoans.length} en plazo normal`}
            </span>
            <span className="text-rose-700 underline group-hover:text-rose-900">
              Abrir Monitor &gt;
            </span>
          </div>
        </div>

        {/* KPI 3: Control Metrológico & Bloqueos de Seguridad */}
        <div
          onClick={() => onNavigateTab('metrology')}
          className={`cursor-pointer rounded-2xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition group ${
            expiredCalibrations.length > 0
              ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-50'
              : warningCalibrations.length > 0
              ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-slate-200/90 hover:shadow-md hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" /> Trazabilidad ISO
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition ${
              expiredCalibrations.length > 0
                ? 'bg-rose-100 text-rose-700'
                : warningCalibrations.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {expiredCalibrations.length > 0 ? <Lock className="w-5 h-5 text-rose-600" /> : <Gauge className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {metrologyComplianceRate}%
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {validCalibrations.length} de {calibratedAssets.length} al día
            </span>
          </div>

          <div className="mt-2.5 text-[11px]">
            {expiredCalibrations.length > 0 ? (
              <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 inline-block">
                ⛔ {expiredCalibrations.length} Bloqueado(s) por vencimiento
              </span>
            ) : warningCalibrations.length > 0 ? (
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                ⚠️ {warningCalibrations.length} Por vencer (&le;30 días)
              </span>
            ) : (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                ✓ 100% de instrumentos certificados
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] mt-2 font-bold">
            <span className="text-slate-400">Torquímetros & Calibres</span>
            <span className="text-blue-700 underline group-hover:text-blue-900">
              Ver Certificados &gt;
            </span>
          </div>
        </div>

        {/* KPI 4: Salud Física y Tasa de Integridad de Herramientas */}
        <div 
          onClick={() => onNavigateTab('reports')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Índice de Salud Física
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {healthScore}%
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {optimalAssets} óptimas
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${healthScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
            <span>{wearAssets} con desgaste menor</span>
            <span className="text-blue-600 font-bold group-hover:underline">Reportes &gt;</span>
          </div>
        </div>
      </div>

      {/* Two-Column Industrial Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Rotation Ranking & Custody Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 5 Most Requested Tools & Sockets Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Top Herramientas y Dados con Mayor Rotación
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Activos más solicitados por el personal técnico en turnos operativos
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Frecuencia
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {topRequestedTools.map(({ asset, count }, idx) => {
                const percentage = Math.round((count / maxUsageCount) * 100);
                return (
                  <div
                    key={asset.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            {asset.codigoActivoFisico}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {asset.marca} {asset.modelo ? `• ${asset.modelo}` : ''}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                          {asset.descripcion}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          📍 {asset.ubicacion} {asset.encastre ? `• Encastre: ${asset.encastre}` : ''} {asset.medida ? `• Medida: ${asset.medida}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="w-24 sm:w-28 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {count}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">despachos</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border shrink-0 ${
                          asset.estado === 'disponible' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {asset.estado === 'disponible' ? '✓ En pañol' : '• En uso'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Technicians with Tools in Custody */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Personal Técnico con Herramientas en Custodia
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Técnicos que mantienen herramientas prestadas en este momento
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('workers')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Ver Personal &gt;
              </button>
            </div>

            {activeCustodyList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                ✓ Todas las herramientas han sido retornadas al pañol. Ningún técnico en custodia activa.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {activeCustodyList.map((custody) => (
                  <div
                    key={custody.dni}
                    className={`p-3.5 rounded-xl border transition ${
                      custody.hasOverdue 
                        ? 'bg-rose-50/70 border-rose-300' 
                        : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {custody.name}
                      </span>
                      {custody.hasOverdue ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase">
                          +24h Retraso
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          En plazo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>DNI: <strong className="font-mono text-slate-700">{custody.dni}</strong></span>
                      <span className="font-bold text-slate-800">{custody.count} piezas prestadas</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Module Navigation Hub */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div
              onClick={() => onNavigateTab('workers')}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-400 hover:shadow-md cursor-pointer transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                <Contact className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Fotochecks QR</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Credenciales tamaño carnet con DNI en QR grande para cámara.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('metrology')}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-emerald-400 hover:shadow-md cursor-pointer transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Calibraciones</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Visor PDF oficial embebido y bloqueo estricto de vencidos.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('excel')}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-amber-400 hover:shadow-md cursor-pointer transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Carga Excel</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Nomenclatura física individual para dados y herramientas.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('email')}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-indigo-400 hover:shadow-md cursor-pointer transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase">Ajustes Correo</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Alertas automáticas con tolerancia de timeout en Vercel.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Storekeeper Turn, Today's Metrics & Safety Rules */}
        <div className="space-y-6">
          {/* Active Storekeeper Profile Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Encargado en Turno
              </span>
              <button
                onClick={onOpenShiftModal}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                Cambiar Turno
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-lg border border-amber-200 shrink-0">
                {activeStorekeeper.nombreCompleto.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {activeStorekeeper.nombreCompleto}
                </p>
                <p className="text-xs text-slate-500">
                  DNI: <strong className="font-mono text-slate-800">{activeStorekeeper.dni}</strong>
                </p>
                <p className="text-[11px] text-amber-700 font-semibold">{activeStorekeeper.cargo}</p>
              </div>
            </div>

            {/* Default Pre-saved Signature Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                <span>Firma Guardada:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Auto-Estampado OK
                </span>
              </div>
              <div className="h-16 bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-center overflow-hidden">
                {activeStorekeeper.firmaBase64 ? (
                  <img
                    src={activeStorekeeper.firmaBase64}
                    alt="Firma del encargado"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-bold text-emerald-600">✓ Sello de Visto Bueno Activo</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
                Se estampa automáticamente al despachar y recibir herramientas
              </p>
            </div>
          </div>

          {/* Today's Turn Productivity Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Productividad del Turno Actual
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Despachos Hoy</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{todayDispatches}</span>
                <span className="text-[10px] text-slate-500 font-medium">vales generados</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Retornos Hoy</span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{todayReturns}</span>
                <span className="text-[10px] text-slate-500 font-medium">recepciones OK</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="text-slate-500">Tiempo prom. en campo:</span>
              <strong className="font-mono text-slate-900">{avgRetentionHours} horas</strong>
            </div>
          </div>

          {/* Quick Metrology Alert Card */}
          {expiredCalibrations.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs text-rose-950 space-y-1.5 animate-pulse">
              <p className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-600" />
                {expiredCalibrations.length} Instrumento(s) Bloqueado(s)
              </p>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                EQUIPO BLOQUEADO: Requiere calibración antes de salir a campo. Prohibido préstamo preventivo.
              </p>
              <button
                onClick={() => onNavigateTab('metrology')}
                className="inline-block font-bold text-rose-900 underline text-[11px] pt-1"
              >
                Abrir módulo metrológico &gt;
              </button>
            </div>
          )}

          {/* Overtime Policy Card */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950">
            <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
              <Clock className="w-4 h-4 text-amber-700" />
              Política Industrial de 24 Horas
            </p>
            <p className="leading-relaxed text-[11px] text-amber-900/80 font-medium">
              Todo activo físico despachado debe ser retornado dentro de las 24 horas continuas
              para inspección de fisuras y disponibilidad del siguiente turno.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
