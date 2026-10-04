import React from 'react';
import { 
  Wrench, 
  AlertOctagon, 
  FileText, 
  Layers, 
  FileSpreadsheet, 
  History, 
  Plus, 
  Camera,
  LayoutDashboard,
  Award,
  Contact,
  Mail,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { LoanDispatch, StorekeeperProfile } from '../types/workshop';
import { calculateLoanAlert } from '../utils/timeAlerts';

export type ActiveTab = 
  | 'dashboard' 
  | 'monitor' 
  | 'dispatch' 
  | 'workers' 
  | 'metrology' 
  | 'kardex'
  | 'catalog' 
  | 'excel' 
  | 'reports' 
  | 'email';

interface HeaderNavProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dispatches: LoanDispatch[];
  activeStorekeeper: StorekeeperProfile;
  onOpenShiftModal: () => void;
  onOpenQuickDispatch: () => void;
  onOpenScanner: () => void;
  onOpenCheckpoints: () => void;
  syncState: 'synced' | 'syncing' | 'offline';
  onManualSync: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTab,
  onTabChange,
  dispatches,
  activeStorekeeper,
  onOpenShiftModal,
  onOpenQuickDispatch,
  onOpenScanner,
  onOpenCheckpoints,
  syncState,
  onManualSync,
}) => {
  // Compute active overdue count for the alert pill
  const activeDispatches = dispatches.filter((d) => d.items.some((it) => !it.retornado));
  const overdueCount = activeDispatches.filter(
    (d) => calculateLoanAlert(d.fechaPrestamo).estadoSemaforo === 'vencido'
  ).length;

  return (
    <header className="no-print bg-white/95 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-400/20 font-black">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">
                  PAÑOL<span className="text-amber-500">PRO</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                  v4.5 METROLOGÍA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block font-medium">
                Control de Activos, Fotochecks QR, Calibraciones & Notificaciones
              </p>
            </div>
          </div>

          {/* Active Storekeeper Profile Selector / Switcher */}
          <button
            type="button"
            onClick={onOpenShiftModal}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition shadow-2xs"
            title="Cambiar encargado de turno o firma predeterminada"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block -mb-0.5">
                Turno Activo:
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[140px] block">
                {activeStorekeeper.nombreCompleto.split(' ')[0]} {activeStorekeeper.nombreCompleto.split(' ')[1] || ''}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Quick Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Sync Status Indicator & Manual Sync Button */}
            <button
              onClick={onManualSync}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                syncState === 'synced'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : syncState === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title="Autoguardado en segundo plano activo. Haga clic para forzar guardado y sincronización inmediata."
            >
              <span className={`w-2 h-2 rounded-full ${
                syncState === 'synced' ? 'bg-emerald-500' : syncState === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
              }`} />
              <span>{syncState === 'synced' ? 'Sincronizado' : syncState === 'syncing' ? 'Guardando...' : 'Modo Local'}</span>
            </button>

            {/* Checkpoints & Backup Button */}
            <button
              onClick={onOpenCheckpoints}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
              title="Puntos de restauración y copias de seguridad"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Checkpoints</span>
            </button>

            <button
              onClick={onOpenShiftModal}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              title="Cambiar Encargado de Turno"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </button>

            <button
              onClick={onOpenScanner}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              title="Abrir Escáner de Cámara QR"
            >
              <Camera className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={onOpenQuickDispatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nuevo Despacho</span>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Horizontal Scrollable) */}
        <div className="hidden md:flex items-center gap-1 pb-2.5 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('monitor')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'monitor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
            <span>Monitor Alertas &gt;24h</span>
            {overdueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono animate-pulse">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('dispatch')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'dispatch'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Despacho Rápido</span>
          </button>

          <button
            onClick={() => onTabChange('workers')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'workers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Contact className="w-3.5 h-3.5 text-blue-500" />
            <span>Personal & Fotochecks QR</span>
          </button>

          <button
            onClick={() => onTabChange('metrology')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'metrology'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Metrología & Calibraciones</span>
          </button>

          <button
            onClick={() => onTabChange('kardex')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'kardex'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
            <span>Kardex (.xlsx)</span>
          </button>

          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'catalog'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Catálogo & QR</span>
          </button>

          <button
            onClick={() => onTabChange('excel')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'excel'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Importar Excel</span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'reports'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-500" />
            <span>Trazabilidad</span>
          </button>

          <button
            onClick={() => onTabChange('email')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              currentTab === 'email'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            <span>Ajustes Correo</span>
          </button>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex overflow-x-auto py-2 gap-1 border-t border-slate-100 scrollbar-none text-xs">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'monitor', label: 'Monitor', icon: AlertOctagon, count: overdueCount },
            { id: 'dispatch', label: 'Despacho', icon: FileText },
            { id: 'workers', label: 'Fotochecks', icon: Contact },
            { id: 'metrology', label: 'Calibración', icon: Award },
            { id: 'kardex', label: 'Kardex', icon: FileSpreadsheet },
            { id: 'catalog', label: 'Catálogo', icon: Layers },
            { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
            { id: 'reports', label: 'Reportes', icon: History },
            { id: 'email', label: 'Correo', icon: Mail },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as ActiveTab)}
                className={`px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 font-bold ${
                  currentTab === item.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count && item.count > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600 text-white font-mono">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
