import React, { useState, useEffect, useRef } from 'react';
import { HeaderNav, ActiveTab } from './components/HeaderNav';
import { WorkshopDashboardView } from './components/WorkshopDashboardView';
import { AlertMonitorView } from './components/AlertMonitorView';
import { CatalogView } from './components/CatalogView';
import { WorkersFotocheckView } from './components/WorkersFotocheckView';
import { MetrologyCalibrationView } from './components/MetrologyCalibrationView';
import { ExcelProcessorView } from './components/ExcelProcessorView';
import { TraceabilityReportsView } from './components/TraceabilityReportsView';
import { KardexView } from './components/KardexView';
import { CheckpointsModal } from './components/CheckpointsModal';
import { EmailSettingsView } from './components/EmailSettingsView';
import { StorekeeperShiftModal } from './components/StorekeeperShiftModal';
import { QuickDispatchModal } from './components/QuickDispatchModal';
import { LabelSheetModal } from './components/LabelSheetModal';
import { QrScannerModal } from './components/QrScannerModal';
import { ToolSpinLoader } from './components/ToolSpinLoader';
import { TvAndonLiveView } from './components/TvAndonLiveView';
import { BulkDeleteModal, BulkDeleteExecutionConfig } from './components/BulkDeleteModal';
import { 
  INITIAL_ASSETS, 
  INITIAL_TECHNICIANS, 
  INITIAL_DISPATCHES,
  INITIAL_STOREKEEPERS,
  INITIAL_EMAIL_SETTINGS,
  INITIAL_KARDEX,
  INITIAL_CHECKPOINTS
} from './data/mockWorkshopData';
import { 
  PhysicalAsset, 
  Technician, 
  LoanDispatch, 
  LoanItem, 
  StorekeeperProfile, 
  EmailSettings, 
  CalibrationData,
  KardexEntry,
  SystemCheckpoint,
  RecycleBinItem
} from './types/workshop';
import { calculateLoanAlert } from './utils/timeAlerts';
import { evaluateCalibration } from './utils/calibrationHelper';
import { sendEmailWithTimeout, buildCalibrationAlertEmailHtml } from './utils/emailService';
import { 
  FullBackupPayload, 
  exportManualCheckpointJSON, 
  parseFullBackupJSON 
} from './utils/indexedDBStorage';
import { dispatchKardexEntriesToAppsScript, dispatchToolToAppsScript } from './utils/googleSheetsSync';
import { generateRandomToolDni } from './utils/assetCoder';
import { safeSaveAssetsToLocalStorage } from './utils/storageHelper';
import { AlertOctagon, RotateCw, Lock, AlertTriangle, CheckCircle2, X } from 'lucide-react';

const STORAGE_KEYS = {
  ASSETS: 'panolpro_assets_v45',
  TECHNICIANS: 'panolpro_techs_v45',
  DISPATCHES: 'panolpro_dispatches_v45',
  STOREKEEPERS: 'panolpro_storekeepers_v45',
  ACTIVE_KEEPER: 'panolpro_active_keeper_v45',
  EMAIL_SETTINGS: 'panolpro_email_settings_v45',
  KARDEX: 'panolpro_kardex_v45',
  CHECKPOINTS: 'panolpro_checkpoints_v45',
  RECYCLE_BIN: 'panolpro_recycle_bin_v45',
};

export default function App() {
  // Storekeepers
  const [storekeepers, setStorekeepers] = useState<StorekeeperProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOREKEEPERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load storekeepers', e);
    }
    return INITIAL_STOREKEEPERS;
  });

  const [activeStorekeeperId, setActiveStorekeeperId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_KEEPER);
      if (saved) return saved;
    } catch (e) {
      console.warn('Could not load active keeper ID', e);
    }
    return INITIAL_STOREKEEPERS[0].id;
  });

  // Assets with dual coding (código físico texto + DNI 8 dígitos)
  const [assets, setAssets] = useState<PhysicalAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSETS);
      if (saved) {
        const parsed: PhysicalAsset[] = JSON.parse(saved);
        const usedDnis = new Set(parsed.map((a) => a.dniNumerico).filter(Boolean));
        let modified = false;
        const enriched = parsed.map((asset) => {
          if (!asset.dniNumerico || !/^\d{8}$/.test(String(asset.dniNumerico).trim())) {
            modified = true;
            let newDni = '';
            do {
              newDni = Math.floor(10000000 + Math.random() * 90000000).toString();
            } while (usedDnis.has(newDni));
            usedDnis.add(newDni);
            return {
              ...asset,
              codigoMnemotecnico: asset.codigoMnemotecnico || asset.codigoActivoFisico,
              dniNumerico: newDni,
            };
          }
          return {
            ...asset,
            codigoMnemotecnico: asset.codigoMnemotecnico || asset.codigoActivoFisico,
          };
        });
        if (modified) {
          localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(enriched));
        }
        return enriched;
      }
    } catch (e) {
      console.warn('Could not load assets from storage', e);
    }
    return INITIAL_ASSETS;
  });

  // Technicians
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load technicians from storage', e);
    }
    return INITIAL_TECHNICIANS;
  });

  // Dispatches
  const [dispatches, setDispatches] = useState<LoanDispatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load dispatches from storage', e);
    }
    return INITIAL_DISPATCHES;
  });

  // Kardex
  const [kardex, setKardex] = useState<KardexEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KARDEX);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load kardex', e);
    }
    return INITIAL_KARDEX;
  });

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState<SystemCheckpoint[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load checkpoints', e);
    }
    return INITIAL_CHECKPOINTS;
  });

  // Recycle bin
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECYCLE_BIN);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load recycle bin', e);
    }
    return [];
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load email settings', e);
    }
    return INITIAL_EMAIL_SETTINGS;
  });

  // Active navigation tab with /tv and /live URL route detection
  const [currentTab, setCurrentTab] = useState<ActiveTab>(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const search = window.location.search.toLowerCase();
        if (
          path === '/tv' || 
          path === '/live' || 
          path.endsWith('/tv') || 
          path.endsWith('/live') ||
          hash === '#tv' || 
          hash === '#/tv' || 
          hash === '#live' || 
          hash === '#/live' ||
          search.includes('mode=tv') ||
          search.includes('mode=live')
        ) {
          return 'tv';
        }
      }
    } catch (e) {
      // ignore
    }
    return 'dashboard';
  });

  const handleTabChange = (tab: ActiveTab) => {
    setCurrentTab(tab);
    try {
      if (typeof window !== 'undefined') {
        if (tab === 'tv') {
          window.history.pushState({ tab: 'tv' }, '', '/tv');
        } else {
          if (window.location.pathname === '/tv' || window.location.pathname === '/live') {
            window.history.pushState({ tab }, '', '/');
          }
        }
      }
    } catch (e) {
      // ignore
    }
  };

  // Listen to browser forward/back buttons for /tv
  useEffect(() => {
    const handlePopState = () => {
      try {
        if (typeof window !== 'undefined') {
          const path = window.location.pathname.toLowerCase();
          const hash = window.location.hash.toLowerCase();
          if (path === '/tv' || path === '/live' || hash === '#tv' || hash === '#/tv') {
            setCurrentTab('tv');
          } else {
            setCurrentTab('dashboard');
          }
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Modals & sync states
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [isCheckpointsOpen, setIsCheckpointsOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(() => {
    try {
      return !sessionStorage.getItem('panolpro_shift_selected');
    } catch {
      return true;
    }
  });
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [isLabelSheetOpen, setIsLabelSheetOpen] = useState(false);
  const [assetsForLabelSheet, setAssetsForLabelSheet] = useState<PhysicalAsset[]>([]);
  const [isMainScannerOpen, setIsMainScannerOpen] = useState(false);
  const [preselectedAssetForDispatch, setPreselectedAssetForDispatch] = useState<PhysicalAsset | null>(null);
  const [showDemoLoader, setShowDemoLoader] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteSelectedAssetIds, setBulkDeleteSelectedAssetIds] = useState<string[]>([]);
  const [pendingCheckpointRestore, setPendingCheckpointRestore] = useState<FullBackupPayload | null>(null);
  const [manualCheckpointToast, setManualCheckpointToast] = useState<string | null>(null);
  const manualRestoreFileInputRef = useRef<HTMLInputElement>(null);

  // Storage Quota Warning banner state
  const [storageQuotaWarning, setStorageQuotaWarning] = useState<{
    message: string;
    affectedAssetCode?: string;
  } | null>(null);

  // Synchronize with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOREKEEPERS, JSON.stringify(storekeepers));
    } catch (e) {
      console.warn('Storekeeper storage error', e);
    }
  }, [storekeepers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_KEEPER, activeStorekeeperId);
    } catch (e) {
      console.warn('Active keeper storage error', e);
    }
  }, [activeStorekeeperId]);

  useEffect(() => {
    try {
      const res = safeSaveAssetsToLocalStorage(STORAGE_KEYS.ASSETS, assets);
      if (res.fallbackApplied && !storageQuotaWarning) {
        setStorageQuotaWarning({
          message: 'Se optimizó el almacenamiento local para evitar saturación de memoria. Todas las herramientas y sus códigos están 100% protegidos.',
        });
      }
    } catch (e) {
      console.warn('Assets storage error', e);
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(technicians));
    } catch (e) {
      console.warn('Technicians storage error', e);
    }
  }, [technicians]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches));
    } catch (e) {
      console.warn('Dispatches storage error', e);
    }
  }, [dispatches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(kardex));
      // Real-time sync to backend endpoint for Google Sheets =IMPORTDATA
      fetch('/api/kardex/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: kardex }),
      }).catch(() => {
        // Safe fallback if offline
      });
    } catch (e) {
      console.warn('Kardex storage error', e);
    }
  }, [kardex]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(checkpoints));
    } catch (e) {
      console.warn('Checkpoints storage error', e);
    }
  }, [checkpoints]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECYCLE_BIN, JSON.stringify(recycleBin));
    } catch (e) {
      console.warn('Recycle bin storage error', e);
    }
  }, [recycleBin]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(emailSettings));
    } catch (e) {
      console.warn('Email settings storage error', e);
    }
  }, [emailSettings]);

  // Multidevice / Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('panolpro_multidevice_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC_RELOAD') {
            try {
              const a = localStorage.getItem(STORAGE_KEYS.ASSETS);
              if (a) setAssets(JSON.parse(a));
              const t = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
              if (t) setTechnicians(JSON.parse(t));
              const d = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
              if (d) setDispatches(JSON.parse(d));
              const k = localStorage.getItem(STORAGE_KEYS.KARDEX);
              if (k) setKardex(JSON.parse(k));
              const s = localStorage.getItem(STORAGE_KEYS.STOREKEEPERS);
              if (s) setStorekeepers(JSON.parse(s));
            } catch (err) {
              console.warn('Broadcast sync error', err);
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
    return () => {
      bc?.close();
    };
  }, []);

  const broadcastRealtimeSync = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('panolpro_multidevice_sync');
        bc.postMessage({ type: 'SYNC_RELOAD', timestamp: Date.now() });
        bc.close();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleManualSync = () => {
    setSyncState('syncing');
    try {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(technicians));
      localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches));
      localStorage.setItem(STORAGE_KEYS.STOREKEEPERS, JSON.stringify(storekeepers));
      localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(kardex));
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(checkpoints));
      broadcastRealtimeSync();
      setTimeout(() => {
        setSyncState('synced');
      }, 400);
    } catch (e) {
      console.warn('Manual sync error', e);
      setSyncState('offline');
    }
  };

  // Active storekeeper object
  const activeStorekeeper = storekeepers.find((k) => k.id === activeStorekeeperId) || storekeepers[0];

  // Storekeeper actions
  const handleSelectStorekeeper = (id: string) => {
    setActiveStorekeeperId(id);
    try {
      sessionStorage.setItem('panolpro_shift_selected', 'true');
    } catch (e) {
      console.warn(e);
    }
    setStorekeepers((prev) =>
      prev.map((k) => ({
        ...k,
        activo: k.id === id,
      }))
    );
    broadcastRealtimeSync();
  };

  const handleUpdateStorekeeper = (updated: StorekeeperProfile) => {
    setStorekeepers((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    broadcastRealtimeSync();
  };

  const handleAddStorekeeper = (newProfile: StorekeeperProfile) => {
    setStorekeepers((prev) => [...prev, newProfile]);
    broadcastRealtimeSync();
  };

  const handleDeleteEncargado = (id: string) => {
    const target = storekeepers.find((k) => k.id === id);
    if (!target) return;

    const updatedStorekeepers = storekeepers.filter((k) => k.id !== id);

    // If deleting currently active storekeeper, switch immediately to the next one or empty
    if (id === activeStorekeeperId) {
      const nextActive = updatedStorekeepers[0];
      if (nextActive) {
        setActiveStorekeeperId(nextActive.id);
        try {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_KEEPER, nextActive.id);
        } catch (e) {
          console.warn('Failed to update active keeper in storage', e);
        }
      } else {
        setActiveStorekeeperId('');
        try {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_KEEPER);
        } catch (e) {
          // ignore
        }
      }
    }

    // Immediately persist updated list to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.STOREKEEPERS, JSON.stringify(updatedStorekeepers));
    } catch (e) {
      console.warn('Failed to save storekeepers to storage', e);
    }

    // Add to recycle bin (Soft Delete)
    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tipo: 'encargado',
      codigoOIdentificador: target.dni,
      nombreODescripcion: `${target.nombreCompleto} (${target.cargo})`,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: activeStorekeeper?.nombreCompleto || 'Administrador',
      data: target,
    };
    setRecycleBin((prev) => [binItem, ...prev]);

    setStorekeepers(updatedStorekeepers);
    broadcastRealtimeSync();
  };

  const handleDeleteStorekeeper = handleDeleteEncargado;

  // Checkpoints management
  const handleCreateCheckpoint = (nombre: string, descripcion?: string, tipo: 'manual' | 'automatico' = 'manual') => {
    const chk: SystemCheckpoint = {
      id: `chk-${Date.now()}`,
      nombre,
      descripcion,
      timestamp: new Date().toISOString(),
      tipo,
      totalActivos: assets.length,
      totalVales: dispatches.length,
      totalTecnicos: technicians.length,
      data: {
        assets,
        technicians,
        dispatches,
        storekeepers,
        kardex,
      },
    };
    setCheckpoints((prev) => [chk, ...prev.slice(0, 24)]);
  };

  const handleRestoreCheckpoint = (chk: SystemCheckpoint) => {
    // Auto-save backup before reverting
    handleCreateCheckpoint(
      `Pre-Restauración de "${chk.nombre}"`,
      'Respaldo automático generado antes de restaurar punto histórico',
      'automatico'
    );

    if (chk.data.assets) setAssets(chk.data.assets);
    if (chk.data.technicians) setTechnicians(chk.data.technicians);
    if (chk.data.dispatches) setDispatches(chk.data.dispatches);
    if (chk.data.storekeepers) setStorekeepers(chk.data.storekeepers);
    if (chk.data.kardex) setKardex(chk.data.kardex);

    broadcastRealtimeSync();
  };

  const handleDeleteCheckpoint = (id: string) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
  };

  // Recycle Bin actions
  const handleRestoreRecycleItem = (item: RecycleBinItem) => {
    if (item.tipo === 'activo') {
      const asset = item.data as PhysicalAsset;
      setAssets((prev) => [asset, ...prev]);
    } else if (item.tipo === 'tecnico') {
      const tech = item.data as Technician;
      setTechnicians((prev) => [tech, ...prev]);
    } else if (item.tipo === 'encargado') {
      const keeper = item.data as StorekeeperProfile;
      setStorekeepers((prev) => [keeper, ...prev]);
    }
    setRecycleBin((prev) => prev.filter((x) => x.id !== item.id));
    broadcastRealtimeSync();
  };

  const handlePurgeRecycleItem = (id: string) => {
    setRecycleBin((prev) => prev.filter((x) => x.id !== id));
  };

  const handleEmptyRecycleBin = () => {
    setRecycleBin([]);
  };

  const handleExportFullBackup = () => {
    const backup = {
      app: 'PanolPro',
      version: '4.5',
      exportDate: new Date().toISOString(),
      data: {
        assets,
        technicians,
        dispatches,
        storekeepers,
        kardex,
        checkpoints,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Completo_PanolPro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFullBackup = (backup: FullBackupPayload) => {
    // 1. Safe automatic checkpoint before overwriting
    handleCreateCheckpoint(
      `Pre-Restauración Backup (${new Date().toLocaleDateString('es-PE')})`,
      'Respaldo de seguridad generado automáticamente antes de la restauración',
      'automatico'
    );

    // 2. Overwrite state and localStorage
    if (Array.isArray(backup.herramientas)) {
      setAssets(backup.herramientas);
      try {
        localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(backup.herramientas));
      } catch (e) {
        console.warn(e);
      }
    }

    if (Array.isArray(backup.trabajadores)) {
      setTechnicians(backup.trabajadores);
      try {
        localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(backup.trabajadores));
      } catch (e) {
        console.warn(e);
      }
    }

    if (Array.isArray(backup.encargados) && backup.encargados.length > 0) {
      setStorekeepers(backup.encargados);
      try {
        localStorage.setItem(STORAGE_KEYS.STOREKEEPERS, JSON.stringify(backup.encargados));
        const firstActive = backup.encargados.find((s: any) => s.activo) || backup.encargados[0];
        if (firstActive) {
          setActiveStorekeeperId(firstActive.id);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_KEEPER, firstActive.id);
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (Array.isArray(backup.prestamos)) {
      setDispatches(backup.prestamos);
      try {
        localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(backup.prestamos));
      } catch (e) {
        console.warn(e);
      }
    }

    if (Array.isArray(backup.kardex)) {
      setKardex(backup.kardex);
      try {
        localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(backup.kardex));
      } catch (e) {
        console.warn(e);
      }
    }

    if (backup.configuracion && typeof backup.configuracion === 'object') {
      setEmailSettings((prev) => ({ ...prev, ...backup.configuracion }));
      try {
        localStorage.setItem(
          STORAGE_KEYS.EMAIL_SETTINGS,
          JSON.stringify({ ...emailSettings, ...backup.configuracion })
        );
      } catch (e) {
        console.warn(e);
      }
    }

    broadcastRealtimeSync();
  };

  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.data) {
          handleCreateCheckpoint('Pre-Restauración Backup JSON', 'Checkpoint automático antes de importar archivo de respaldo', 'automatico');
          if (json.data.assets) setAssets(json.data.assets);
          if (json.data.technicians) setTechnicians(json.data.technicians);
          if (json.data.dispatches) setDispatches(json.data.dispatches);
          if (json.data.storekeepers) setStorekeepers(json.data.storekeepers);
          if (json.data.kardex) setKardex(json.data.kardex);
          broadcastRealtimeSync();
          alert('¡Copia de seguridad restaurada exitosamente!');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON de copia de seguridad.');
      }
    };
    reader.readAsText(file);
  };

  // Manual Checkpoint (.JSON) Handlers
  const handleDownloadManualCheckpoint = () => {
    try {
      const filename = exportManualCheckpointJSON({
        storekeepers,
        technicians,
        assets,
        dispatches,
        kardex,
        emailSettings,
      });
      setManualCheckpointToast(`✅ Checkpoint descargado en su dispositivo (${filename})`);
      setTimeout(() => setManualCheckpointToast(null), 6000);
    } catch (err) {
      alert('Error al generar el archivo físico de checkpoint.');
    }
  };

  const handleSelectRestoreCheckpointFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const backup = await parseFullBackupJSON(file);
      setPendingCheckpointRestore(backup);
    } catch (err: any) {
      alert(`Error al procesar checkpoint: ${err.message || 'Estructura inválida'}`);
    } finally {
      if (manualRestoreFileInputRef.current) {
        manualRestoreFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmRestoreCheckpoint = () => {
    if (!pendingCheckpointRestore) return;

    handleRestoreFullBackup(pendingCheckpointRestore);
    setPendingCheckpointRestore(null);
    alert('✅ Sistema restaurado correctamente desde el Checkpoint');
  };

  // Technician actions
  const handleAddTechnician = (tech: Technician) => {
    setTechnicians((prev) => [tech, ...prev]);
    broadcastRealtimeSync();
  };

  const handleUpdateTechnician = (tech: Technician) => {
    setTechnicians((prev) => prev.map((t) => (t.id === tech.id ? tech : t)));
    broadcastRealtimeSync();
  };

  const handleBatchImportTechnicians = (importedTechs: Technician[]) => {
    setTechnicians((prev) => {
      const map = new Map<string, Technician>();
      prev.forEach((t) => map.set(t.dni.trim(), t));
      importedTechs.forEach((t) => {
        const existing = map.get(t.dni.trim());
        if (existing) {
          map.set(t.dni.trim(), { ...existing, ...t, id: existing.id });
        } else {
          map.set(t.dni.trim(), t);
        }
      });
      return Array.from(map.values());
    });
    broadcastRealtimeSync();
  };

  const handleDeleteTechnician = (id: string) => {
    const target = technicians.find((t) => t.id === id);
    if (!target) return;

    // Soft delete to recycle bin
    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tipo: 'tecnico',
      codigoOIdentificador: target.dni,
      nombreODescripcion: `${target.nombreCompleto} (${target.cargo})`,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: activeStorekeeper.nombreCompleto,
      data: target,
    };
    setRecycleBin((prev) => [binItem, ...prev]);

    setTechnicians((prev) => prev.filter((t) => t.id !== id));
    broadcastRealtimeSync();
  };

  // Asset actions
  const handleSaveAsset = (asset: PhysicalAsset) => {
    // Ensure 8-digit numeric DNI is present and unique
    const assetToSave = { ...asset };
    if (!assetToSave.dniNumerico || !/^\d{8}$/.test(String(assetToSave.dniNumerico).trim())) {
      const existingDnis = assets.filter((a) => a.id !== assetToSave.id).map((a) => a.dniNumerico);
      assetToSave.dniNumerico = generateRandomToolDni(existingDnis);
    }
    if (!assetToSave.codigoMnemotecnico) {
      assetToSave.codigoMnemotecnico = assetToSave.codigoActivoFisico;
    }

    setAssets((prev) => {
      const exists = prev.some((a) => a.id === assetToSave.id);
      const updatedList = exists
        ? prev.map((a) => (a.id === assetToSave.id ? assetToSave : a))
        : [assetToSave, ...prev];

      // Safely persist with QuotaExceeded fallback protection
      const saveResult = safeSaveAssetsToLocalStorage(STORAGE_KEYS.ASSETS, updatedList, assetToSave);

      if (saveResult.fallbackApplied) {
        setStorageQuotaWarning({
          message: `Límite de almacenamiento del navegador (localStorage) alcanzado. La herramienta [${assetToSave.codigoActivoFisico}] se guardó correctamente conservando todos sus datos técnicos, pero sin la foto pesada para evitar la pérdida del registro.`,
          affectedAssetCode: assetToSave.codigoActivoFisico,
        });
      }

      // New asset: append Kardex entrada event
      if (!exists) {
        const kdx: KardexEntry = {
          id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fecha: new Date().toISOString(),
          tipoEvento: 'entrada_inicial',
          assetId: assetToSave.id,
          codigoActivoFisico: assetToSave.codigoActivoFisico,
          descripcion: assetToSave.descripcion,
          almaceneroNombre: activeStorekeeper.nombreCompleto,
          condicion: assetToSave.condicionFisica,
          observaciones: 'Ingreso manual a inventario de pañol',
        };
        setKardex((k) => [kdx, ...k]);
        dispatchKardexEntriesToAppsScript([kdx], activeStorekeeper.nombreCompleto);
      }

      return saveResult.assetsSaved;
    });

    broadcastRealtimeSync();
    dispatchToolToAppsScript(assetToSave);
  };

  const handleDeleteAsset = (id: string) => {
    const target = assets.find((a) => a.id === id);
    if (!target) return;

    // Create Kardex baja event
    const kdx: KardexEntry = {
      id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha: new Date().toISOString(),
      tipoEvento: 'baja',
      assetId: target.id,
      codigoActivoFisico: target.codigoActivoFisico,
      descripcion: target.descripcion,
      almaceneroNombre: activeStorekeeper.nombreCompleto,
      condicion: target.condicionFisica,
      observaciones: 'Baja de inventario (enviado a papelera de reciclaje)',
    };
    setKardex((prev) => [kdx, ...prev]);

    // Send to recycle bin (Soft delete)
    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tipo: 'activo',
      codigoOIdentificador: target.codigoActivoFisico,
      nombreODescripcion: target.descripcion,
      fechaEliminacion: new Date().toISOString(),
      eliminadoPor: activeStorekeeper.nombreCompleto,
      data: target,
    };
    setRecycleBin((prev) => [binItem, ...prev]);

    setAssets((prev) => prev.filter((a) => a.id !== id));
    broadcastRealtimeSync();
  };

  const handleExecuteBulkDelete = (config: BulkDeleteExecutionConfig) => {
    // 1. Create an automatic safety checkpoint in IndexedDB before executing any bulk deletion
    handleCreateCheckpoint(
      `Pre-Borrado: ${config.description}`,
      `Respaldo automático generado antes de ejecutar: ${config.description}`,
      'automatico'
    );

    const nowIso = new Date().toISOString();
    const newBinItems: RecycleBinItem[] = [];
    const newKardexItems: KardexEntry[] = [];

    switch (config.target) {
      case 'selected_assets': {
        const idsToDelete = new Set(config.selectedAssetIds || []);
        const toDelete = assets.filter((a) => idsToDelete.has(a.id));
        if (config.sendToRecycleBin) {
          toDelete.forEach((asset) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'activo',
              codigoOIdentificador: asset.codigoActivoFisico,
              nombreODescripcion: asset.descripcion,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: asset,
            });
          });
        }
        toDelete.forEach((a) => {
          newKardexItems.push({
            id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fecha: nowIso,
            tipoEvento: 'baja',
            assetId: a.id,
            codigoActivoFisico: a.codigoActivoFisico,
            descripcion: a.descripcion,
            almaceneroNombre: activeStorekeeper.nombreCompleto,
            condicion: a.condicionFisica,
            observaciones: `Borrado en masa (${config.sendToRecycleBin ? 'enviado a papelera' : 'purga definitiva'})`,
          });
        });
        setAssets((prev) => prev.filter((a) => !idsToDelete.has(a.id)));
        break;
      }

      case 'assets_baja': {
        const toDelete = assets.filter(
          (a) => a.estado === 'baja' || a.condicionFisica === 'fisurado' || a.condicionFisica === 'perdido'
        );
        const idsToDelete = new Set(toDelete.map((a) => a.id));
        if (config.sendToRecycleBin) {
          toDelete.forEach((asset) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'activo',
              codigoOIdentificador: asset.codigoActivoFisico,
              nombreODescripcion: asset.descripcion,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: asset,
            });
          });
        }
        toDelete.forEach((a) => {
          newKardexItems.push({
            id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fecha: nowIso,
            tipoEvento: 'baja',
            assetId: a.id,
            codigoActivoFisico: a.codigoActivoFisico,
            descripcion: a.descripcion,
            almaceneroNombre: activeStorekeeper.nombreCompleto,
            condicion: a.condicionFisica,
            observaciones: 'Purga masiva de herramientas en baja / dañadas',
          });
        });
        setAssets((prev) => prev.filter((a) => !idsToDelete.has(a.id)));
        break;
      }

      case 'assets_disponibles': {
        const toDelete = assets.filter((a) => a.estado === 'disponible');
        const idsToDelete = new Set(toDelete.map((a) => a.id));
        if (config.sendToRecycleBin) {
          toDelete.forEach((asset) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'activo',
              codigoOIdentificador: asset.codigoActivoFisico,
              nombreODescripcion: asset.descripcion,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: asset,
            });
          });
        }
        toDelete.forEach((a) => {
          newKardexItems.push({
            id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fecha: nowIso,
            tipoEvento: 'baja',
            assetId: a.id,
            codigoActivoFisico: a.codigoActivoFisico,
            descripcion: a.descripcion,
            almaceneroNombre: activeStorekeeper.nombreCompleto,
            condicion: a.condicionFisica,
            observaciones: 'Borrado masivo de herramientas disponibles en pañol',
          });
        });
        setAssets((prev) => prev.filter((a) => !idsToDelete.has(a.id)));
        break;
      }

      case 'all_assets': {
        if (config.sendToRecycleBin) {
          assets.forEach((asset) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'activo',
              codigoOIdentificador: asset.codigoActivoFisico,
              nombreODescripcion: asset.descripcion,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: asset,
            });
          });
        }
        newKardexItems.push({
          id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fecha: nowIso,
          tipoEvento: 'baja',
          assetId: 'TODOS',
          codigoActivoFisico: 'CATALOGO_COMPLETO',
          descripcion: `Vaciado masivo del catálogo (${assets.length} activos)`,
          almaceneroNombre: activeStorekeeper.nombreCompleto,
          condicion: 'operativo',
          observaciones: 'Vaciado completo del inventario de activos físicos',
        });
        setAssets([]);
        break;
      }

      case 'technicians_no_loans': {
        const activeTechDnis = new Set(
          dispatches.filter((d) => d.estado !== 'completado').map((d) => d.tecnicoDni)
        );
        const toDelete = technicians.filter((t) => !activeTechDnis.has(t.dni));
        const idsToDelete = new Set(toDelete.map((t) => t.id));
        if (config.sendToRecycleBin) {
          toDelete.forEach((tech) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'tecnico',
              codigoOIdentificador: tech.dni,
              nombreODescripcion: `${tech.nombreCompleto} (${tech.cargo})`,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: tech,
            });
          });
        }
        setTechnicians((prev) => prev.filter((t) => !idsToDelete.has(t.id)));
        break;
      }

      case 'all_technicians': {
        if (config.sendToRecycleBin) {
          technicians.forEach((tech) => {
            newBinItems.push({
              id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              tipo: 'tecnico',
              codigoOIdentificador: tech.dni,
              nombreODescripcion: `${tech.nombreCompleto} (${tech.cargo})`,
              fechaEliminacion: nowIso,
              eliminadoPor: activeStorekeeper.nombreCompleto,
              data: tech,
            });
          });
        }
        setTechnicians([]);
        break;
      }

      case 'completed_dispatches': {
        setDispatches((prev) => prev.filter((d) => d.estado !== 'completado'));
        break;
      }

      case 'old_completed_dispatches': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        setDispatches((prev) =>
          prev.filter((d) => !(d.estado === 'completado' && d.fechaPrestamo < thirtyDaysAgo))
        );
        break;
      }

      case 'all_dispatches': {
        setDispatches([]);
        break;
      }

      case 'old_kardex': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        setKardex((prev) => prev.filter((k) => k.fecha >= thirtyDaysAgo));
        break;
      }

      case 'all_kardex': {
        setKardex([]);
        break;
      }

      case 'empty_recycle_bin': {
        setRecycleBin([]);
        break;
      }

      case 'factory_reset': {
        setAssets([]);
        setTechnicians([]);
        setDispatches([]);
        setKardex([]);
        setRecycleBin([]);
        break;
      }
    }

    if (newBinItems.length > 0) {
      setRecycleBin((prev) => [...newBinItems, ...prev]);
    }

    if (newKardexItems.length > 0 && config.target !== 'all_kardex') {
      setKardex((prev) => [...newKardexItems, ...prev]);
    }

    broadcastRealtimeSync();
    alert(`✅ Operación completada: ${config.description}. Se generó un punto de restauración preventivo en IndexedDB.`);
  };

  const handleImportAssets = (newAssets: PhysicalAsset[]) => {
    // Ensure all imported assets have dual coding (text code + 8-digit unique DNI)
    const existingDnis = new Set(assets.map((a) => a.dniNumerico).filter(Boolean));
    const finalizedAssets = newAssets.map((a) => {
      let dni = a.dniNumerico;
      if (!dni || !/^\d{8}$/.test(String(dni).trim()) || existingDnis.has(dni)) {
        do {
          dni = Math.floor(10000000 + Math.random() * 90000000).toString();
        } while (existingDnis.has(dni));
        existingDnis.add(dni);
      }
      return {
        ...a,
        codigoMnemotecnico: a.codigoMnemotecnico || a.codigoActivoFisico,
        dniNumerico: dni,
      };
    });

    // Generate Kardex entries for all imported assets
    const nowIso = new Date().toISOString();
    const newKardex: KardexEntry[] = finalizedAssets.map((a) => ({
      id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha: nowIso,
      tipoEvento: 'entrada_inicial',
      assetId: a.id,
      codigoActivoFisico: a.codigoActivoFisico,
      descripcion: a.descripcion,
      almaceneroNombre: activeStorekeeper.nombreCompleto,
      condicion: a.condicionFisica,
      observaciones: 'Carga masiva desde archivo Excel',
    }));
    setKardex((prev) => [...newKardex, ...prev]);

    setAssets((prev) => {
      const merged = [...finalizedAssets, ...prev];
      const saveRes = safeSaveAssetsToLocalStorage(STORAGE_KEYS.ASSETS, merged);
      if (saveRes.fallbackApplied) {
        setStorageQuotaWarning({
          message: 'Se cargaron las herramientas conservando todos sus datos técnicos. Se optimizó el espacio de imágenes para no superar la capacidad local del navegador.',
        });
      }
      return saveRes.assetsSaved;
    });
    setCurrentTab('catalog');
    broadcastRealtimeSync();
  };

  const handleUpdateAssetCalibration = (assetId: string, calibration: CalibrationData) => {
    const target = assets.find((a) => a.id === assetId);

    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.id === assetId) {
          return {
            ...asset,
            calibracion: calibration,
          };
        }
        return asset;
      })
    );

    if (target) {
      const kdx: KardexEntry = {
        id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: new Date().toISOString(),
        tipoEvento: 'calibracion',
        assetId: target.id,
        codigoActivoFisico: target.codigoActivoFisico,
        descripcion: target.descripcion,
        almaceneroNombre: activeStorekeeper.nombreCompleto,
        condicion: 'operativo',
        observaciones: `Certificado N° ${calibration.numeroCertificado || 'S/N'} emitido por ${calibration.entidadCertificadora || 'Laboratorio'}. Vence: ${calibration.fechaVencimiento || 'N/A'}.`,
      };
      setKardex((prev) => [kdx, ...prev]);
      dispatchKardexEntriesToAppsScript([kdx], activeStorekeeper.nombreCompleto);
    }

    broadcastRealtimeSync();
    alert('✓ Registro metrológico y certificado oficial actualizados.');
  };

  // Dispatch & Return handlers
  const handleConfirmDispatch = (newDispatch: LoanDispatch) => {
    setDispatches((prev) => [newDispatch, ...prev]);

    const dispatchedAssetIds = newDispatch.items.map((i) => i.assetId);
    setAssets((prev) =>
      prev.map((asset) => {
        if (dispatchedAssetIds.includes(asset.id)) {
          return {
            ...asset,
            estado: 'prestado',
            prestamoActivoId: newDispatch.id,
          };
        }
        return asset;
      })
    );

    // Register each loan item in Kardex
    const nowIso = new Date().toISOString();
    const newKardexEntries: KardexEntry[] = newDispatch.items.map((it) => ({
      id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha: nowIso,
      tipoEvento: 'prestamo',
      assetId: it.assetId,
      codigoActivoFisico: it.codigoActivoFisico,
      descripcion: it.descripcion,
      tecnicoDni: newDispatch.tecnicoDni,
      tecnicoNombre: newDispatch.tecnicoNombre,
      almaceneroNombre: activeStorekeeper.nombreCompleto,
      ordenTrabajo: newDispatch.ordenTrabajo,
      valeId: newDispatch.codigoVale,
      condicion: it.condicionSalida,
      observaciones: newDispatch.observaciones || 'Despacho para labor en campo',
    }));
    setKardex((prev) => [...newKardexEntries, ...prev]);

    // Disparador en segundo plano para Google Apps Script
    dispatchKardexEntriesToAppsScript(newKardexEntries, activeStorekeeper.nombreCompleto);

    broadcastRealtimeSync();
    setCurrentTab('monitor');
  };

  const handleConfirmReturn = (
    dispatchId: string,
    updatedItems: LoanItem[],
    receiverName: string,
    receiverSignatureBase64: string,
    notes?: string
  ) => {
    const allReturned = updatedItems.every((it) => it.retornado);

    // Auto-stamp active storekeeper signature if none provided
    const stampedSig = receiverSignatureBase64 || activeStorekeeper.firmaBase64 || '';

    const currentDisp = dispatches.find((d) => d.id === dispatchId);

    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id === dispatchId) {
          return {
            ...d,
            items: updatedItems,
            estado: allReturned ? 'completado' : 'parcial',
            devolucionTimestamp: new Date().toISOString(),
            receptorDevolucionId: activeStorekeeper.id,
            nombreReceptorDevolucion: receiverName || activeStorekeeper.nombreCompleto,
            firmaReceptorDevolucionBase64: stampedSig,
            observaciones: notes ? `${d.observaciones || ''} | Retorno: ${notes}` : d.observaciones,
          };
        }
        return d;
      })
    );

    setAssets((prev) =>
      prev.map((asset) => {
        const returnedItem = updatedItems.find((it) => it.assetId === asset.id);
        if (returnedItem && returnedItem.retornado) {
          const isDamaged = returnedItem.condicionRetorno === 'fisurado';
          const isLost = returnedItem.condicionRetorno === 'perdido';

          return {
            ...asset,
            estado: isDamaged ? 'mantenimiento' : isLost ? 'baja' : 'disponible',
            condicionFisica: returnedItem.condicionRetorno || 'operativo',
            prestamoActivoId: undefined,
          };
        }
        return asset;
      })
    );

    // Register returned items in Kardex
    if (currentDisp) {
      const nowIso = new Date().toISOString();
      const returnedItems = updatedItems.filter((it) => it.retornado);
      const returnKardex: KardexEntry[] = returnedItems.map((it) => ({
        id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: nowIso,
        tipoEvento: 'devolucion',
        assetId: it.assetId,
        codigoActivoFisico: it.codigoActivoFisico,
        descripcion: it.descripcion,
        tecnicoDni: currentDisp.tecnicoDni,
        tecnicoNombre: currentDisp.tecnicoNombre,
        almaceneroNombre: receiverName || activeStorekeeper.nombreCompleto,
        ordenTrabajo: currentDisp.ordenTrabajo,
        valeId: currentDisp.codigoVale,
        condicion: it.condicionRetorno || 'operativo',
        observaciones: it.observacionesRetorno || notes || 'Retorno conforme a pañol',
      }));
      setKardex((prev) => [...returnKardex, ...prev]);
      // Disparador en segundo plano para Google Apps Script
      dispatchKardexEntriesToAppsScript(returnKardex, receiverName || activeStorekeeper.nombreCompleto);
    }

    broadcastRealtimeSync();
  };

  // Launch dispatch with preselected asset (checks safety calibration block first)
  const handleDispatchAsset = (asset: PhysicalAsset) => {
    const evalCal = evaluateCalibration(asset.calibracion);
    if (evalCal.estaBloqueadoPorCalibracion) {
      alert(`⛔ EQUIPO BLOQUEADO: ${asset.codigoActivoFisico} tiene su certificado de calibración vencido. Prohibido préstamo a campo.`);
      return;
    }
    setPreselectedAssetForDispatch(asset);
    setIsQuickDispatchOpen(true);
  };

  const handleOpenLabelSheet = (assetsToPrint: PhysicalAsset[]) => {
    setAssetsForLabelSheet(assetsToPrint);
    setIsLabelSheetOpen(true);
  };

  // Main QR scanner handler (auto-detects technician fotocheck or tool QR)
  const handleMainScanResult = (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    // 1. Is it a technician DNI?
    const matchedTech = technicians.find(
      (t) => t.dni.toUpperCase() === cleanCode || cleanCode.includes(t.dni)
    );
    if (matchedTech) {
      setPreselectedAssetForDispatch(null);
      setIsQuickDispatchOpen(true);
      alert(`✓ Fotocheck detectado: ${matchedTech.nombreCompleto} (DNI: ${matchedTech.dni}). Abriendo vale de despacho.`);
      return;
    }

    // 2. Is it a tool?
    const matchedAsset = assets.find((a) => a.codigoActivoFisico.toUpperCase() === cleanCode);
    if (!matchedAsset) {
      alert(`No se encontró en inventario ningún activo con el código [${code}].`);
      return;
    }

    if (matchedAsset.estado === 'disponible') {
      handleDispatchAsset(matchedAsset);
    } else if (matchedAsset.estado === 'prestado') {
      setCurrentTab('monitor');
      alert(`La pieza [${matchedAsset.codigoActivoFisico}] está actualmente en campo. Acceda al vale en el monitor para registrar su devolución.`);
    } else {
      alert(`La pieza [${matchedAsset.codigoActivoFisico}] está marcada como "${matchedAsset.estado}".`);
    }
  };

  // Send calibration alert email handler
  const handleSendCalibrationAlertEmail = async (asset: PhysicalAsset, diasRestantes: number) => {
    const subject = `⚠️ AVISO METROLÓGICO: ${asset.codigoActivoFisico} próximo a vencer (${diasRestantes} días)`;
    const html = buildCalibrationAlertEmailHtml(asset, diasRestantes);
    const result = await sendEmailWithTimeout(emailSettings, subject, html);
    alert(result.message);
  };

  // Overdue count (> 24h)
  const overdueCount = dispatches
    .filter((d) => d.items.some((it) => !it.retornado))
    .filter((d) => calculateLoanAlert(d.fechaPrestamo).estadoSemaforo === 'vencido').length;

  // Expired calibrations count
  const expiredCalibrationsCount = assets
    .filter((a) => a.calibracion?.requiereCalibracion)
    .filter((a) => evaluateCalibration(a.calibracion).estaBloqueadoPorCalibracion).length;

  // Dedicated Kiosk / Fullscreen Mode TV Andon (/tv or /live)
  if (currentTab === 'tv') {
    return (
      <TvAndonLiveView
        dispatches={dispatches}
        assets={assets}
        activeStorekeeper={activeStorekeeper}
        technicians={technicians}
        onExitTvMode={() => handleTabChange('dashboard')}
        onRefreshData={() => {
          try {
            const a = localStorage.getItem(STORAGE_KEYS.ASSETS);
            if (a) setAssets(JSON.parse(a));
            const d = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
            if (d) setDispatches(JSON.parse(d));
            const t = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
            if (t) setTechnicians(JSON.parse(t));
          } catch (e) {
            // ignore
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Sticky Navigation */}
      <HeaderNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        dispatches={dispatches}
        activeStorekeeper={activeStorekeeper}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenQuickDispatch={() => {
          setPreselectedAssetForDispatch(null);
          setIsQuickDispatchOpen(true);
        }}
        onOpenScanner={() => setIsMainScannerOpen(true)}
        onOpenCheckpoints={() => setIsCheckpointsOpen(true)}
        onOpenBulkDelete={() => {
          setBulkDeleteSelectedAssetIds([]);
          setIsBulkDeleteModalOpen(true);
        }}
        onDownloadManualCheckpoint={handleDownloadManualCheckpoint}
        onTriggerRestoreCheckpoint={() => manualRestoreFileInputRef.current?.click()}
        syncState={syncState}
        onManualSync={handleManualSync}
      />

      {/* Hidden file input for manual checkpoint restore */}
      <input
        ref={manualRestoreFileInputRef}
        type="file"
        accept=".json"
        onChange={handleSelectRestoreCheckpointFile}
        className="hidden"
      />

      {/* Notification banner for manual checkpoint download */}
      {manualCheckpointToast && (
        <div className="no-print bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{manualCheckpointToast}</span>
            </span>
            <button
              type="button"
              onClick={() => setManualCheckpointToast(null)}
              className="text-white hover:text-emerald-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Storage Quota Warning Banner */}
      {storageQuotaWarning && (
        <div className="no-print bg-amber-600 text-white px-4 py-3 shadow-md border-b border-amber-700 animate-in fade-in">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Aviso de Protección de Almacenamiento Local (localStorage)</span>
                  {storageQuotaWarning.affectedAssetCode && (
                    <span className="font-mono bg-amber-700/80 px-1.5 py-0.2 rounded text-[11px] text-amber-100">
                      [{storageQuotaWarning.affectedAssetCode}]
                    </span>
                  )}
                </p>
                <p className="text-xs text-amber-100 mt-0.5 leading-relaxed">
                  {storageQuotaWarning.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStorageQuotaWarning(null)}
              className="p-1 rounded-lg hover:bg-amber-700 text-amber-100 hover:text-white transition shrink-0"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Critical Overdue Banner (> 24h) */}
      {overdueCount > 0 && currentTab !== 'monitor' && (
        <div
          onClick={() => setCurrentTab('monitor')}
          className="no-print bg-rose-600 hover:bg-rose-700 cursor-pointer text-white px-4 py-2 text-xs font-black flex items-center justify-between transition shadow-sm"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 animate-spin" />
              <span>
                ALERTA CRÍTICA: {overdueCount} herramienta{overdueCount > 1 ? 's' : ''} supera{overdueCount > 1 ? 'n' : ''} el límite de 24 horas sin retornar al pañol.
              </span>
            </span>
            <span className="underline uppercase tracking-wider text-[11px] font-bold">
              Ver Monitor Semafórico &gt;
            </span>
          </div>
        </div>
      )}

      {/* Expired Calibration Safety Banner */}
      {expiredCalibrationsCount > 0 && currentTab !== 'metrology' && (
        <div
          onClick={() => setCurrentTab('metrology')}
          className="no-print bg-amber-500 hover:bg-amber-600 cursor-pointer text-slate-950 px-4 py-1.5 text-xs font-black flex items-center justify-between transition shadow-2xs border-b border-amber-600"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>
                AVISO METROLÓGICO: {expiredCalibrationsCount} instrumento(s) con calibración vencida se encuentra(n) BLOQUEADO(S) para salida a campo.
              </span>
            </span>
            <span className="underline uppercase tracking-wider text-[10px] font-bold">
              Revisar Módulo Metrológico &gt;
            </span>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <WorkshopDashboardView
            assets={assets}
            dispatches={dispatches}
            technicians={technicians}
            activeStorekeeper={activeStorekeeper}
            onNavigateTab={handleTabChange}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            onOpenQuickDispatch={() => {
              setPreselectedAssetForDispatch(null);
              setIsQuickDispatchOpen(true);
            }}
            onOpenScanner={() => setIsMainScannerOpen(true)}
            onOpenLabelSheet={handleOpenLabelSheet}
          />
        )}

        {currentTab === 'monitor' && (
          <AlertMonitorView
            dispatches={dispatches}
            allAssets={assets}
            technicians={technicians}
            emailSettings={emailSettings}
            activeStorekeeper={activeStorekeeper}
            onConfirmReturn={handleConfirmReturn}
            onOpenQuickDispatch={() => {
              setPreselectedAssetForDispatch(null);
              setIsQuickDispatchOpen(true);
            }}
          />
        )}

        {currentTab === 'dispatch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Módulo de Despacho Rápido & Vales de Salida
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Despachando como: <strong className="text-slate-800">{activeStorekeeper.nombreCompleto}</strong> (Firma predeterminada activa).
                  Escanee el fotocheck QR del técnico y las placas físicas.
                </p>
              </div>
              <button
                onClick={() => {
                  setPreselectedAssetForDispatch(null);
                  setIsQuickDispatchOpen(true);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-sm transition"
              >
                + Crear Nuevo Vale de Despacho
              </button>
            </div>

            <CatalogView
              assets={assets.filter((a) => a.estado === 'disponible')}
              onSaveAsset={handleSaveAsset}
              onDeleteAsset={handleDeleteAsset}
              onOpenLabelSheet={handleOpenLabelSheet}
              onDispatchAsset={handleDispatchAsset}
            />
          </div>
        )}

        {currentTab === 'workers' && (
          <WorkersFotocheckView
            technicians={technicians}
            onAddTechnician={handleAddTechnician}
            onUpdateTechnician={handleUpdateTechnician}
            onDeleteTechnician={handleDeleteTechnician}
            onBatchImportTechnicians={handleBatchImportTechnicians}
            onOpenBulkDelete={() => {
              setBulkDeleteSelectedAssetIds([]);
              setIsBulkDeleteModalOpen(true);
            }}
          />
        )}

        {currentTab === 'metrology' && (
          <MetrologyCalibrationView
            assets={assets}
            onUpdateAssetCalibration={handleUpdateAssetCalibration}
            onSendCalibrationAlertEmail={handleSendCalibrationAlertEmail}
          />
        )}

        {currentTab === 'kardex' && (
          <KardexView
            entries={kardex}
            onOpenBulkDelete={() => {
              setBulkDeleteSelectedAssetIds([]);
              setIsBulkDeleteModalOpen(true);
            }}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogView
            assets={assets}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
            onOpenLabelSheet={handleOpenLabelSheet}
            onDispatchAsset={handleDispatchAsset}
            onImportAssets={handleImportAssets}
            onOpenBulkDelete={(ids) => {
              setBulkDeleteSelectedAssetIds(ids || []);
              setIsBulkDeleteModalOpen(true);
            }}
          />
        )}

        {currentTab === 'excel' && (
          <ExcelProcessorView
            existingAssets={assets}
            onImportAssets={handleImportAssets}
            onOpenLabelSheet={handleOpenLabelSheet}
          />
        )}

        {currentTab === 'reports' && (
          <TraceabilityReportsView
            dispatches={dispatches}
            assets={assets}
            technicians={technicians}
          />
        )}

        {currentTab === 'email' && (
          <EmailSettingsView
            settings={emailSettings}
            onSaveSettings={setEmailSettings}
            activeDispatches={dispatches.filter((d) => d.items.some((it) => !it.retornado))}
            calibratedAssets={assets.filter((a) => a.calibracion?.requiereCalibracion)}
            storekeeperName={activeStorekeeper.nombreCompleto}
            assets={assets}
            technicians={technicians}
            dispatches={dispatches}
            storekeepers={storekeepers}
            kardex={kardex}
            onRestoreFullBackup={handleRestoreFullBackup}
          />
        )}
      </main>

      {/* Storekeeper Profile & Shift Switcher Modal */}
      <StorekeeperShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          try {
            sessionStorage.setItem('panolpro_shift_selected', 'true');
          } catch (e) {
            console.warn(e);
          }
          setIsShiftModalOpen(false);
        }}
        storekeepers={storekeepers}
        activeStorekeeperId={activeStorekeeperId}
        onSelectStorekeeper={handleSelectStorekeeper}
        onUpdateStorekeeper={handleUpdateStorekeeper}
        onAddStorekeeper={handleAddStorekeeper}
        onDeleteStorekeeper={handleDeleteStorekeeper}
        handleDeleteEncargado={handleDeleteEncargado}
      />

      {/* Global Quick Dispatch Modal with auto-stamped signature */}
      <QuickDispatchModal
        isOpen={isQuickDispatchOpen}
        onClose={() => {
          setIsQuickDispatchOpen(false);
          setPreselectedAssetForDispatch(null);
        }}
        availableAssets={assets.filter((a) => a.estado === 'disponible')}
        technicians={technicians}
        activeStorekeeper={activeStorekeeper}
        onAddTechnician={handleAddTechnician}
        onConfirmDispatch={handleConfirmDispatch}
        initialScannedAsset={preselectedAssetForDispatch}
      />

      {/* Global Printable Label Sheet Modal */}
      <LabelSheetModal
        isOpen={isLabelSheetOpen}
        onClose={() => setIsLabelSheetOpen(false)}
        assets={assetsForLabelSheet}
      />

      {/* Global Standalone QR Camera Scanner */}
      <QrScannerModal
        isOpen={isMainScannerOpen}
        onClose={() => setIsMainScannerOpen(false)}
        onScan={handleMainScanResult}
        title="Lector QR de Pañol Central"
        subtitle="Escanee el carnet fotocheck de un técnico o la placa de cualquier herramienta."
        suggestedCodes={[
          ...technicians.map((t) => t.dni),
          ...assets.map((a) => a.codigoActivoFisico),
        ]}
      />

      {/* Rotating Tools Loader Interactive Modal */}
      {showDemoLoader && (
        <div
          onClick={() => setShowDemoLoader(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ToolSpinLoader
              message="Sincronizando Herramientas & Calibraciones..."
              submessage="Haga clic afuera para cerrar esta animación mecánica"
            />
          </div>
        </div>
      )}

      {/* Menú Global de Borrado en General & Purga Masiva */}
      <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
          setBulkDeleteSelectedAssetIds([]);
        }}
        assets={assets}
        technicians={technicians}
        dispatches={dispatches}
        kardex={kardex}
        recycleBin={recycleBin}
        activeStorekeeper={activeStorekeeper}
        selectedAssetIds={bulkDeleteSelectedAssetIds}
        onExecuteBulkDelete={handleExecuteBulkDelete}
      />

      {/* Modal de Confirmación de Restauración de Checkpoint */}
      {pendingCheckpointRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Restauración de Checkpoint
                </h3>
                <p className="text-xs text-slate-500">
                  Reemplazo total de datos en memoria y almacenamiento
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-amber-50 border border-amber-200 p-3.5 rounded-xl font-medium">
              ¿Desea restaurar este checkpoint? Se reemplazará el estado actual por el guardado con fecha <strong>{new Date(pendingCheckpointRestore.fechaBackup).toLocaleString('es-PE')}</strong>.
            </p>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
              <div>• Herramientas y dados: <strong>{pendingCheckpointRestore.herramientas?.length || 0}</strong></div>
              <div>• Personal técnico: <strong>{pendingCheckpointRestore.trabajadores?.length || 0}</strong></div>
              <div>• Préstamos / Vales: <strong>{pendingCheckpointRestore.prestamos?.length || 0}</strong></div>
              <div>• Movimientos en Kardex: <strong>{pendingCheckpointRestore.kardex?.length || 0}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingCheckpointRestore(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreCheckpoint}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Confirmar e Instalar Checkpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            PañolPro • Control de Herramientas, Fotochecks QR, Calibraciones & Notificaciones Tolerantes a Vercel
          </p>
          <button
            onClick={() => setShowDemoLoader(true)}
            className="text-[11px] font-bold text-amber-600 hover:text-amber-800 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
          >
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Ver Animación de Herramientas Girando
          </button>
        </div>
      </footer>
    </div>
  );
}
