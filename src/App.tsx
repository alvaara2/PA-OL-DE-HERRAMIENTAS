import React, { useState, useEffect } from 'react';
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
import { AlertOctagon, RotateCw, Lock } from 'lucide-react';

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

  // Assets
  const [assets, setAssets] = useState<PhysicalAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSETS);
      if (saved) return JSON.parse(saved);
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
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
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

  // Technician actions
  const handleAddTechnician = (tech: Technician) => {
    setTechnicians((prev) => [tech, ...prev]);
    broadcastRealtimeSync();
  };

  const handleUpdateTechnician = (tech: Technician) => {
    setTechnicians((prev) => prev.map((t) => (t.id === tech.id ? tech : t)));
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
    setAssets((prev) => {
      const exists = prev.some((a) => a.id === asset.id);
      if (exists) {
        return prev.map((a) => (a.id === asset.id ? asset : a));
      }
      // New asset: append Kardex entrada event
      const kdx: KardexEntry = {
        id: `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fecha: new Date().toISOString(),
        tipoEvento: 'entrada_inicial',
        assetId: asset.id,
        codigoActivoFisico: asset.codigoActivoFisico,
        descripcion: asset.descripcion,
        almaceneroNombre: activeStorekeeper.nombreCompleto,
        condicion: asset.condicionFisica,
        observaciones: 'Ingreso manual a inventario de pañol',
      };
      setKardex((k) => [kdx, ...k]);

      return [asset, ...prev];
    });
    broadcastRealtimeSync();
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

  const handleImportAssets = (newAssets: PhysicalAsset[]) => {
    // Generate Kardex entries for all imported assets
    const nowIso = new Date().toISOString();
    const newKardex: KardexEntry[] = newAssets.map((a) => ({
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

    setAssets((prev) => [...newAssets, ...prev]);
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
        syncState={syncState}
        onManualSync={handleManualSync}
      />

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
          />
        )}

        {currentTab === 'metrology' && (
          <MetrologyCalibrationView
            assets={assets}
            onUpdateAssetCalibration={handleUpdateAssetCalibration}
            onSendCalibrationAlertEmail={handleSendCalibrationAlertEmail}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogView
            assets={assets}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
            onOpenLabelSheet={handleOpenLabelSheet}
            onDispatchAsset={handleDispatchAsset}
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
