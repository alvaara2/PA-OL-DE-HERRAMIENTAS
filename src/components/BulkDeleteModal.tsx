import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  Users, 
  FileText, 
  Layers, 
  RotateCcw, 
  X, 
  Check, 
  CheckCircle2, 
  AlertOctagon,
  RefreshCw,
  Archive,
  Database
} from 'lucide-react';
import { 
  PhysicalAsset, 
  Technician, 
  LoanDispatch, 
  KardexEntry, 
  RecycleBinItem, 
  StorekeeperProfile 
} from '../types/workshop';

export type BulkDeleteTarget =
  | 'selected_assets'
  | 'assets_baja'
  | 'assets_disponibles'
  | 'all_assets'
  | 'technicians_no_loans'
  | 'all_technicians'
  | 'completed_dispatches'
  | 'old_completed_dispatches'
  | 'all_dispatches'
  | 'old_kardex'
  | 'all_kardex'
  | 'empty_recycle_bin'
  | 'factory_reset';

export interface BulkDeleteExecutionConfig {
  target: BulkDeleteTarget;
  sendToRecycleBin: boolean;
  description: string;
  selectedAssetIds?: string[];
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: PhysicalAsset[];
  technicians: Technician[];
  dispatches: LoanDispatch[];
  kardex: KardexEntry[];
  recycleBin: RecycleBinItem[];
  activeStorekeeper: StorekeeperProfile;
  selectedAssetIds?: string[];
  onExecuteBulkDelete: (config: BulkDeleteExecutionConfig) => void;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  assets,
  technicians,
  dispatches,
  kardex,
  recycleBin,
  activeStorekeeper,
  selectedAssetIds = [],
  onExecuteBulkDelete,
}) => {
  const [activeCategory, setActiveCategory] = useState<'tools' | 'workers' | 'loans' | 'kardex' | 'recycle' | 'reset'>('tools');
  const [selectedAction, setSelectedAction] = useState<BulkDeleteTarget | null>(null);
  const [sendToRecycleBin, setSendToRecycleBin] = useState<boolean>(true);
  const [confirmationWord, setConfirmationWord] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Computed counts for each deletion target
  const counts = useMemo(() => {
    // 1. Assets
    const selectedToolsCount = selectedAssetIds.length;
    const bajaToolsCount = assets.filter((a) => a.estado === 'baja' || a.condicionFisica === 'fisurado' || a.condicionFisica === 'perdido').length;
    const disponiblesToolsCount = assets.filter((a) => a.estado === 'disponible').length;
    const allToolsCount = assets.length;

    // 2. Technicians with active loans
    const techDnisWithActiveLoans = new Set(
      dispatches
        .filter((d) => d.estado !== 'completado')
        .map((d) => d.tecnicoDni)
    );
    const techniciansNoLoansCount = technicians.filter((t) => !techDnisWithActiveLoans.has(t.dni)).length;
    const allTechniciansCount = technicians.length;

    // 3. Dispatches
    const completedLoansCount = dispatches.filter((d) => d.estado === 'completado').length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldCompletedLoansCount = dispatches.filter((d) => d.estado === 'completado' && d.fechaPrestamo < thirtyDaysAgo).length;
    const allLoansCount = dispatches.length;

    // 4. Kardex
    const oldKardexCount = kardex.filter((k) => k.fecha < thirtyDaysAgo).length;
    const allKardexCount = kardex.length;

    // 5. Recycle Bin
    const recycleBinCount = recycleBin.length;

    return {
      selectedToolsCount,
      bajaToolsCount,
      disponiblesToolsCount,
      allToolsCount,
      techniciansNoLoansCount,
      allTechniciansCount,
      completedLoansCount,
      oldCompletedLoansCount,
      allLoansCount,
      oldKardexCount,
      allKardexCount,
      recycleBinCount,
    };
  }, [assets, technicians, dispatches, kardex, recycleBin, selectedAssetIds]);

  if (!isOpen) return null;

  // Get details of chosen target
  const getTargetMeta = (target: BulkDeleteTarget) => {
    switch (target) {
      case 'selected_assets':
        return {
          title: `Borrar Herramientas Seleccionadas en Catálogo`,
          count: counts.selectedToolsCount,
          description: `Se eliminarán las ${counts.selectedToolsCount} herramientas actualmente marcadas en la tabla del catálogo.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: true,
        };
      case 'assets_baja':
        return {
          title: `Borrar Herramientas en Baja / Dañadas`,
          count: counts.bajaToolsCount,
          description: `Se eliminarán ${counts.bajaToolsCount} herramientas registradas como dadas de baja, rotas, fisuradas o perdidas.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: true,
        };
      case 'assets_disponibles':
        return {
          title: `Borrar Herramientas Disponibles (En Pañol)`,
          count: counts.disponiblesToolsCount,
          description: `Se eliminarán ${counts.disponiblesToolsCount} herramientas en pañol. Las herramientas que están actualmente prestadas a técnicos en campo NO se tocarán.`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: true,
        };
      case 'all_assets':
        return {
          title: `Borrar Catálogo Completo de Herramientas`,
          count: counts.allToolsCount,
          description: `Se vaciará todo el catálogo (${counts.allToolsCount} piezas). Los técnicos, vales e historial no serán afectados.`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: true,
        };
      case 'technicians_no_loans':
        return {
          title: `Borrar Técnicos sin Préstamos Activos`,
          count: counts.techniciansNoLoansCount,
          description: `Se eliminarán ${counts.techniciansNoLoansCount} trabajadores que actualmente no adeudan ninguna herramienta en el taller.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: true,
        };
      case 'all_technicians':
        return {
          title: `Borrar Todo el Directorio de Personal Técnico`,
          count: counts.allTechniciansCount,
          description: `Se eliminarán los ${counts.allTechniciansCount} técnicos registrados en el sistema.`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: true,
        };
      case 'completed_dispatches':
        return {
          title: `Purgar Vales Concluidos / Retornados`,
          count: counts.completedLoansCount,
          description: `Se purgarán ${counts.completedLoansCount} vales que ya fueron 100% devueltos y firmados por el almacenero. Los vales activos con herramientas en campo se mantendrán intactos.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: false,
        };
      case 'old_completed_dispatches':
        return {
          title: `Purgar Vales Concluidos de más de 30 Días`,
          count: counts.oldCompletedLoansCount,
          description: `Se eliminarán ${counts.oldCompletedLoansCount} vales cerrados con fecha de emisión mayor a 30 días atrás.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: false,
        };
      case 'all_dispatches':
        return {
          title: `Purgar Todo el Historial de Vales de Salida`,
          count: counts.allLoansCount,
          description: `Se purgarán todos los ${counts.allLoansCount} vales de despacho del sistema.`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: false,
        };
      case 'old_kardex':
        return {
          title: `Purgar Movimientos de Kardex Antiguos (>30 días)`,
          count: counts.oldKardexCount,
          description: `Se limpiarán ${counts.oldKardexCount} registros históricos de auditoría anteriores a 30 días.`,
          isDestructive: false,
          requiresConfirmWord: false,
          supportsRecycleBin: false,
        };
      case 'all_kardex':
        return {
          title: `Vaciar el Kardex de Movimientos Completo`,
          count: counts.allKardexCount,
          description: `Se reiniciará el registro de auditoría de pañol (${counts.allKardexCount} movimientos registrados).`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: false,
        };
      case 'empty_recycle_bin':
        return {
          title: `Vaciar Papelera de Reciclaje Definitivamente`,
          count: counts.recycleBinCount,
          description: `Se purgarán de manera definitiva los ${counts.recycleBinCount} ítems almacenados en la papelera de reciclaje liberando almacenamiento local.`,
          isDestructive: true,
          requiresConfirmWord: false,
          supportsRecycleBin: false,
        };
      case 'factory_reset':
        return {
          title: `Restablecimiento Total de Fábrica (Reset de Almacén)`,
          count: counts.allToolsCount + counts.allTechniciansCount + counts.allLoansCount + counts.allKardexCount,
          description: `ATENCIÓN MÁXIMA: Esta acción restablecerá toda la base de datos a su estado limpio inicial. Se eliminarán todas las herramientas, técnicos, vales e historial.`,
          isDestructive: true,
          requiresConfirmWord: true,
          supportsRecycleBin: false,
        };
    }
  };

  const handleSelectAction = (target: BulkDeleteTarget) => {
    setSelectedAction(target);
    setConfirmationWord('');
    const meta = getTargetMeta(target);
    setSendToRecycleBin(meta.supportsRecycleBin);
  };

  const handleConfirmExecution = () => {
    if (!selectedAction) return;
    const meta = getTargetMeta(selectedAction);

    if (meta.requiresConfirmWord && confirmationWord.trim().toUpperCase() !== 'BORRAR') {
      alert('Debe escribir exactamente la palabra "BORRAR" para confirmar esta operación de alto impacto.');
      return;
    }

    setIsProcessing(true);
    try {
      onExecuteBulkDelete({
        target: selectedAction,
        sendToRecycleBin: meta.supportsRecycleBin ? sendToRecycleBin : false,
        description: meta.title,
        selectedAssetIds,
      });
      setSelectedAction(null);
      setConfirmationWord('');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Menú de Borrado en General & Purga Masiva
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  Gestor de Limpieza
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Seleccione el módulo o criterio para depurar o vaciar registros con respaldo preventivo automático.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('tools');
              setSelectedAction(null);
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'tools'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-500" />
            <span>Herramientas ({counts.allToolsCount})</span>
            {counts.selectedToolsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px]">
                {counts.selectedToolsCount} sel
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('workers');
              setSelectedAction(null);
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'workers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Personal Técnico ({counts.allTechniciansCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('loans');
              setSelectedAction(null);
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'loans'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Vales y Préstamos ({counts.allLoansCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('kardex');
              setSelectedAction(null);
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'kardex'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>Kardex ({counts.allKardexCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('recycle');
              setSelectedAction(null);
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'recycle'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Papelera ({counts.recycleBinCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('reset');
              setSelectedAction('factory_reset');
            }}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
              activeCategory === 'reset'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Reset Total</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Main Action Selection Cards */}
          {!selectedAction && (
            <div className="space-y-4">
              {/* Category: Tools */}
              {activeCategory === 'tools' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Opciones de Borrado en Masa para Catálogo de Herramientas:
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option 1: Selected Tools */}
                    <div
                      onClick={() => counts.selectedToolsCount > 0 && handleSelectAction('selected_assets')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.selectedToolsCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            Borrar Herramientas Seleccionadas
                          </span>
                          <span className="text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                            {counts.selectedToolsCount} marcadas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Elimina únicamente las herramientas seleccionadas con casillas en la tabla del catálogo.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        {counts.selectedToolsCount > 0 ? 'Haga clic para configurar borrado →' : 'Marque herramientas en la tabla para habilitar'}
                      </div>
                    </div>

                    {/* Option 2: Baja or Damaged Tools */}
                    <div
                      onClick={() => counts.bajaToolsCount > 0 && handleSelectAction('assets_baja')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.bajaToolsCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Borrar Ítems en Baja / Fisurados
                          </span>
                          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                            {counts.bajaToolsCount} piezas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Limpia del catálogo todos los activos con condición "fisurado", "perdido" o estado "baja".
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        {counts.bajaToolsCount > 0 ? 'Depurar piezas dañadas →' : 'No hay piezas en baja actualmente'}
                      </div>
                    </div>

                    {/* Option 3: Available Tools in Storage */}
                    <div
                      onClick={() => counts.disponiblesToolsCount > 0 && handleSelectAction('assets_disponibles')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.disponiblesToolsCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <Wrench className="w-4 h-4 text-blue-600" />
                            Borrar Herramientas Disponibles
                          </span>
                          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {counts.disponiblesToolsCount} en pañol
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Borra las piezas disponibles en pañol. Las herramientas que están prestadas a técnicos se conservan.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        {counts.disponiblesToolsCount > 0 ? 'Configurar borrado de disponibles →' : 'Sin piezas disponibles'}
                      </div>
                    </div>

                    {/* Option 4: All Tools */}
                    <div
                      onClick={() => counts.allToolsCount > 0 && handleSelectAction('all_assets')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.allToolsCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                            <ShieldAlert className="w-4 h-4" />
                            Vaciar Catálogo Completo
                          </span>
                          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full">
                            {counts.allToolsCount} total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Borra todas las herramientas del almacén dejándolo en blanco (mantiene los técnicos y el historial).
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        Vaciar catálogo de herramientas →
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Workers */}
              {activeCategory === 'workers' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Opciones de Borrado en Masa para Personal Técnico:
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option 1: Workers without active loans */}
                    <div
                      onClick={() => counts.techniciansNoLoansCount > 0 && handleSelectAction('technicians_no_loans')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.techniciansNoLoansCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <Users className="w-4 h-4 text-blue-600" />
                            Borrar Técnicos sin Préstamos Activos
                          </span>
                          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                            {counts.techniciansNoLoansCount} técnicos
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Borra trabajadores que no tienen ninguna herramienta pendiente de retorno. Protege a quienes tienen vales abiertos.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        {counts.techniciansNoLoansCount > 0 ? 'Depurar técnicos sin pendientes →' : 'Todos tienen préstamos o no hay'}
                      </div>
                    </div>

                    {/* Option 2: All Workers */}
                    <div
                      onClick={() => counts.allTechniciansCount > 0 && handleSelectAction('all_technicians')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.allTechniciansCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                            <ShieldAlert className="w-4 h-4" />
                            Borrar Todo el Directorio de Personal
                          </span>
                          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full">
                            {counts.allTechniciansCount} total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Vacía el listado completo de técnicos y mecánicos (útil para recargar personal desde Excel limpio).
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        Vaciar directorio de personal →
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Loans */}
              {activeCategory === 'loans' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Opciones de Purga Masiva para Vales y Préstamos:
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option 1: Completed Loans */}
                    <div
                      onClick={() => counts.completedLoansCount > 0 && handleSelectAction('completed_dispatches')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.completedLoansCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Purgar Vales Concluidos / Retornados
                          </span>
                          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {counts.completedLoansCount} vales
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Elimina los registros de vales que ya retornaron al 100% a pañol. Los vales con herramientas en campo se conservan.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        {counts.completedLoansCount > 0 ? 'Purgar vales cerrados →' : 'No hay vales completados'}
                      </div>
                    </div>

                    {/* Option 2: Old Completed Loans (> 30 days) */}
                    <div
                      onClick={() => counts.oldCompletedLoansCount > 0 && handleSelectAction('old_completed_dispatches')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.oldCompletedLoansCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <FileText className="w-4 h-4 text-amber-600" />
                            Purgar Vales Cerrados &gt; 30 Días
                          </span>
                          <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                            {counts.oldCompletedLoansCount} antiguos
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Limpia únicamente los vales históricos de más de un mes de antigüedad.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        {counts.oldCompletedLoansCount > 0 ? 'Purgar vales antiguos →' : 'No hay vales mayores a 30 días'}
                      </div>
                    </div>

                    {/* Option 3: All Dispatches */}
                    <div
                      onClick={() => counts.allLoansCount > 0 && handleSelectAction('all_dispatches')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between md:col-span-2 ${
                        counts.allLoansCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                            <AlertOctagon className="w-4 h-4" />
                            Purgar Todo el Historial de Vales
                          </span>
                          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full">
                            {counts.allLoansCount} total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Elimina todos los vales registrados en la base de datos (tanto cerrados como activos).
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        Purgar todo el historial de préstamos →
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Kardex */}
              {activeCategory === 'kardex' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Opciones de Depuración para Kardex de Movimientos:
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Option 1: Old Kardex > 30 days */}
                    <div
                      onClick={() => counts.oldKardexCount > 0 && handleSelectAction('old_kardex')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.oldKardexCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-rose-700">
                            <Layers className="w-4 h-4 text-purple-600" />
                            Purgar Kardex Antiguo (&gt; 30 Días)
                          </span>
                          <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                            {counts.oldKardexCount} filas
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Elimina auditorías y movimientos de más de un mes conservando los recientes.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        {counts.oldKardexCount > 0 ? 'Purgar movimientos antiguos →' : 'No hay filas mayores a 30 días'}
                      </div>
                    </div>

                    {/* Option 2: All Kardex */}
                    <div
                      onClick={() => counts.allKardexCount > 0 && handleSelectAction('all_kardex')}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        counts.allKardexCount > 0
                          ? 'bg-white hover:bg-rose-50/50 border-slate-200 hover:border-rose-300 cursor-pointer shadow-xs group'
                          : 'bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-rose-600">
                            <ShieldAlert className="w-4 h-4" />
                            Vaciar Kardex Completo
                          </span>
                          <span className="text-xs font-mono font-bold bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full">
                            {counts.allKardexCount} total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Reinicia el libro mayor de auditoría de pañol desde cero.
                        </p>
                      </div>
                      <div className="pt-3 text-[11px] font-bold text-rose-600">
                        Vaciar libro Kardex completo →
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Category: Recycle Bin */}
              {activeCategory === 'recycle' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Gestión y Purga de la Papelera de Reciclaje:
                  </h4>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Archive className="w-5 h-5 text-slate-600" />
                        <span className="font-bold text-slate-900 text-sm">
                          Ítems en Papelera de Reciclaje
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full">
                        {counts.recycleBinCount} archivados
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      La papelera contiene activos y técnicos eliminados preventivamente. Puede vaciarla permanentemente para liberar memoria local o mantenerla para restauraciones.
                    </p>

                    <button
                      type="button"
                      disabled={counts.recycleBinCount === 0}
                      onClick={() => handleSelectAction('empty_recycle_bin')}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Vaciar Papelera Permanentemente ({counts.recycleBinCount})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Category: Reset Total */}
              {activeCategory === 'reset' && (
                <div className="p-6 rounded-3xl bg-rose-50/70 border-2 border-rose-300 space-y-4">
                  <div className="flex items-center gap-3 text-rose-700">
                    <div className="w-12 h-12 rounded-2xl bg-rose-200/80 flex items-center justify-center shrink-0">
                      <AlertOctagon className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-rose-950">
                        Restablecimiento Total de Fábrica (Reset de Almacén)
                      </h4>
                      <p className="text-xs text-rose-800 font-medium">
                        Operación destructiva global para empezar desde cero
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    Esta acción purga todas las <strong>herramientas ({counts.allToolsCount})</strong>, <strong>técnicos ({counts.allTechniciansCount})</strong>, <strong>vales ({counts.allLoansCount})</strong> y el <strong>Kardex ({counts.allKardexCount})</strong>. El sistema creará un punto de restauración preventivo antes de ejecutar la limpieza.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAction('factory_reset')}
                      className="px-5 py-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Configurar Restablecimiento Total de Fábrica</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Confirmation & Safety Step */}
          {selectedAction && (() => {
            const meta = getTargetMeta(selectedAction);
            const isConfirmWordValid = !meta.requiresConfirmWord || confirmationWord.trim().toUpperCase() === 'BORRAR';

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                      meta.isDestructive ? 'bg-rose-600' : 'bg-amber-600'
                    }`}>
                      {meta.isDestructive ? <AlertOctagon className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {meta.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Confirmación de borrado masivo ({meta.count} elementos a procesar)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAction(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200/70"
                  >
                    ← Volver a opciones
                  </button>
                </div>

                {/* Explanation */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium space-y-2">
                  <p>{meta.description}</p>
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-[11px] pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Se generará automáticamente un Checkpoint de Respaldo en IndexedDB antes de borrar.</span>
                  </div>
                </div>

                {/* Recycle Bin Option if supported */}
                {meta.supportsRecycleBin && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Destino de los elementos eliminados:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {sendToRecycleBin 
                          ? 'Se enviarán a la Papelera de Reciclaje (permite restaurarlos luego).'
                          : 'Eliminación permanente e inmediata (no irán a la papelera).'}
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendToRecycleBin}
                        onChange={(e) => setSendToRecycleBin(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-2 text-xs font-bold text-slate-800">
                        {sendToRecycleBin ? 'Papelera' : 'Directo'}
                      </span>
                    </label>
                  </div>
                )}

                {/* Security confirmation word for destructive actions */}
                {meta.requiresConfirmWord && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <label className="text-xs font-black text-rose-900 block">
                      Operación de Alto Impacto: Escriba "BORRAR" para desbloquear:
                    </label>
                    <input
                      type="text"
                      value={confirmationWord}
                      onChange={(e) => setConfirmationWord(e.target.value)}
                      placeholder="Escriba BORRAR aquí..."
                      className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs font-mono font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-wider"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAction(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={!isConfirmWordValid || isProcessing || meta.count === 0}
                    onClick={handleConfirmExecution}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'Procesando borrado...' : `Confirmar y Ejecutar Borrado (${meta.count})`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            Turno activo: <strong>{activeStorekeeper.nombreCompleto}</strong> • Auditoría automática en Kardex
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Cerrar Menú
          </button>
        </div>
      </div>
    </div>
  );
};
