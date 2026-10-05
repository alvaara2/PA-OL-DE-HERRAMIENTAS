import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  History, 
  RotateCcw, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FolderArchive,
  Layers,
  Sparkles,
  FileJson,
  Database
} from 'lucide-react';
import { 
  SystemCheckpoint, 
  PhysicalAsset, 
  Technician, 
  LoanDispatch, 
  StorekeeperProfile, 
  KardexEntry, 
  RecycleBinItem 
} from '../types/workshop';
import { 
  saveCheckpointToIndexedDB, 
  getAllCheckpointsFromIndexedDB, 
  deleteCheckpointFromIndexedDB, 
  downloadCheckpointFile, 
  parseCheckpointFile,
  exportFullBackupJSON,
  parseFullBackupJSON 
} from '../utils/indexedDBStorage';

interface CheckpointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: SystemCheckpoint[];
  recycleBin: RecycleBinItem[];
  assets: PhysicalAsset[];
  technicians: Technician[];
  dispatches: LoanDispatch[];
  storekeepers: StorekeeperProfile[];
  kardex: KardexEntry[];
  onCreateCheckpoint: (chk: SystemCheckpoint) => void;
  onRestoreCheckpoint: (checkpoint: SystemCheckpoint) => void;
  onDeleteCheckpoint: (id: string) => void;
  onRestoreRecycleItem: (item: RecycleBinItem) => void;
  onPurgeRecycleItem: (id: string) => void;
  onEmptyRecycleBin: () => void;
}

export const CheckpointsModal: React.FC<CheckpointsModalProps> = ({
  isOpen,
  onClose,
  checkpoints,
  recycleBin,
  assets,
  technicians,
  dispatches,
  storekeepers,
  kardex,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  onRestoreRecycleItem,
  onPurgeRecycleItem,
  onEmptyRecycleBin,
}) => {
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'papelera'>('checkpoints');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointDesc, setNewCheckpointDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal confirm restore state
  const [checkpointToRestore, setCheckpointToRestore] = useState<SystemCheckpoint | null>(null);
  const [checkpointToDelete, setCheckpointToDelete] = useState<SystemCheckpoint | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with IndexedDB on mount / update
  useEffect(() => {
    if (isOpen) {
      getAllCheckpointsFromIndexedDB().then((idbCheckpoints) => {
        if (idbCheckpoints && idbCheckpoints.length > 0) {
          // If IndexedDB has items not in memory, ensure we keep them
          idbCheckpoints.forEach((chk) => {
            if (!checkpoints.some((c) => c.id === chk.id)) {
              onCreateCheckpoint(chk);
            }
          });
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Create Manual Checkpoint with IndexedDB and Automatic Physical Download
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCheckpointName.trim() || `Respaldo Almacén ${new Date().toLocaleDateString('es-PE')}`;

    const newCheckpoint: SystemCheckpoint = {
      id: `chk-${Date.now()}`,
      nombre: name,
      descripcion: newCheckpointDesc.trim() || 'Punto manual guardado en IndexedDB y descargado en JSON seguro.',
      timestamp: new Date().toISOString(),
      tipo: 'manual',
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

    // 1. Save to IndexedDB
    await saveCheckpointToIndexedDB(newCheckpoint);

    // 2. Add to app state
    onCreateCheckpoint(newCheckpoint);

    // 3. Automatic physical file download
    downloadCheckpointFile(newCheckpoint);

    // 4. Reset form & show toast
    setNewCheckpointName('');
    setNewCheckpointDesc('');
    setIsCreating(false);
    setToastMessage('✓ Checkpoint creado con éxito');
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 2. Full Backup Download
  const handleDownloadFullBackup = () => {
    try {
      exportFullBackupJSON({
        storekeepers,
        technicians,
        assets,
        dispatches,
        kardex,
        emailSettings: {},
      });
      setToastMessage('✅ Respaldo descargado correctamente');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al exportar.';
      alert(`Error al generar respaldo: ${msg}`);
    }
  };

  // 3. Handle File Upload (.json) with validation & confirmation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // First try full backup structure
      try {
        const fullBackup = await parseFullBackupJSON(file);
        const chk: SystemCheckpoint = {
          id: `chk-restored-${Date.now()}`,
          nombre: `Respaldo del ${new Date(fullBackup.fechaBackup).toLocaleDateString('es-PE')}`,
          descripcion: `Restaurado de archivo ${file.name}`,
          timestamp: fullBackup.fechaBackup,
          tipo: 'manual',
          totalActivos: fullBackup.herramientas.length,
          totalVales: fullBackup.prestamos.length,
          totalTecnicos: fullBackup.trabajadores.length,
          data: {
            assets: fullBackup.herramientas,
            technicians: fullBackup.trabajadores,
            dispatches: fullBackup.prestamos,
            storekeepers: fullBackup.encargados,
            kardex: fullBackup.kardex,
          },
        };
        setCheckpointToRestore(chk);
        return;
      } catch {
        // Fallback to standard checkpoint
        const parsedChk = await parseCheckpointFile(file);
        setCheckpointToRestore(parsedChk);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar archivo JSON.';
      alert(`Error: ${msg}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Execute restore after confirmation
  const handleConfirmRestore = async () => {
    if (!checkpointToRestore) return;
    await saveCheckpointToIndexedDB(checkpointToRestore);
    onRestoreCheckpoint(checkpointToRestore);
    setToastMessage(`✅ Sistema restaurado con éxito desde el archivo JSON`);
    setCheckpointToRestore(null);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Execute delete after confirmation
  const handleConfirmDelete = async () => {
    if (!checkpointToDelete) return;
    await deleteCheckpointFromIndexedDB(checkpointToDelete.id);
    onDeleteCheckpoint(checkpointToDelete.id);
    setCheckpointToDelete(null);
    setToastMessage('Punto de restauración eliminado.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-800">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Checkpoints & Puntos de Restauración</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-600" /> INDEXEDDB + RESPALDO FÍSICO
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Guarde instantáneas de seguridad en el navegador y descargue respaldos .JSON listos para Vercel.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast / Notification Indicator */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab switcher & Action bar */}
        <div className="px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'checkpoints'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              Checkpoints Guardados ({checkpoints.length})
            </button>

            <button
              onClick={() => setActiveTab('papelera')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'papelera'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Papelera de Reciclaje ({recycleBin.length})
            </button>
          </div>

          {/* Quick Backup & Restore Buttons */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer"
              title="Descargar copia completa de seguridad del almacén"
            >
              <Download className="w-3.5 h-3.5" />
              <span>💾 Descargar Respaldo Completo (.JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition cursor-pointer"
              title="Restaurar base de datos desde un archivo JSON"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>📂 Restaurar Datos desde Archivo (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'checkpoints' ? (
            <div className="space-y-6">
              {/* Creator Form / Trigger */}
              {!isCreating ? (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Crear Nuevo Punto de Restauración (Snapshot)</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Guarda el estado completo en IndexedDB y descarga el archivo seguro <strong>checkpoint_almacen_[fecha].json</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Crear Checkpoint Manual</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-700">Nuevo Punto de Restauración</span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCheckpointName}
                      onChange={(e) => setNewCheckpointName(e.target.value)}
                      placeholder="Nombre del Checkpoint (ej: Cierre de Turno Mañana / Pre-Mantenimiento)"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium"
                      required
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newCheckpointDesc}
                      onChange={(e) => setNewCheckpointDesc(e.target.value)}
                      placeholder="Descripción u observaciones opcionales..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      💾 Incluye: {assets.length} activos, {dispatches.length} vales, {technicians.length} técnicos y kardex completo.
                    </span>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Guardar en IndexedDB & Descargar JSON</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Checkpoints List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Historial de Puntos Disponibles:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Haga clic en "Restaurar este punto" para volver en el tiempo
                  </span>
                </div>

                {checkpoints.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No hay checkpoints creados todavía. Cree el primero arriba para tener un respaldo seguro.
                  </div>
                ) : (
                  checkpoints.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {chk.nombre}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            chk.tipo === 'automatico'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {chk.tipo}
                          </span>
                        </div>

                        {chk.descripcion && (
                          <p className="text-xs text-slate-500">{chk.descripcion}</p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(chk.timestamp).toLocaleString('es-PE')}
                          </span>
                          <span>• {chk.totalActivos} Activos</span>
                          <span>• {chk.totalVales} Vales</span>
                          <span>• {chk.totalTecnicos} Técnicos</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Download JSON copy */}
                        <button
                          type="button"
                          onClick={() => downloadCheckpointFile(chk)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Descargar archivo físico .JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Restore Button */}
                        <button
                          type="button"
                          onClick={() => setCheckpointToRestore(chk)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs border border-blue-200 hover:border-blue-600 transition"
                          title="Restaurar toda la base de datos a este punto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar este punto</span>
                        </button>

                        {/* Delete Checkpoint */}
                        <button
                          type="button"
                          onClick={() => setCheckpointToDelete(chk)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                          title="Eliminar este checkpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Papelera de Reciclaje (Soft Delete) */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Papelera de Elementos Dados de Baja</h4>
                  <p className="text-xs text-slate-500">Elementos eliminados de forma preventiva listos para restaurar.</p>
                </div>
                {recycleBin.length > 0 && (
                  <button
                    type="button"
                    onClick={onEmptyRecycleBin}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    Vaciar papelera permanentemente
                  </button>
                )}
              </div>

              {recycleBin.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  La papelera está vacía. No hay elementos eliminados recientemente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recycleBin.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-800">{item.codigoOIdentificador}</span>
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {item.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold">{item.nombreODescripcion}</p>
                        <p className="text-[11px] text-slate-400">
                          Eliminado por: {item.eliminadoPor} • {new Date(item.fechaEliminacion).toLocaleString('es-PE')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestoreRecycleItem(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold text-xs border border-emerald-200 transition"
                        >
                          Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => onPurgeRecycleItem(item.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 transition"
                          title="Borrado definitivo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            PañolPro Data Guard • IndexedDB & Respaldos Portables
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      {checkpointToRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  ¿Deseas restaurar este checkpoint?
                </h4>
                <p className="text-xs text-slate-500">Los datos actuales serán reemplazados por los de este punto.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-900 font-bold">{checkpointToRestore.nombre}</p>
              <p className="text-slate-500">
                Fecha: <strong className="font-mono text-slate-800">{new Date(checkpointToRestore.timestamp).toLocaleString('es-PE')}</strong>
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-700">
                <span>{checkpointToRestore.totalActivos} Activos</span>
                <span>{checkpointToRestore.totalVales} Vales</span>
                <span>{checkpointToRestore.totalTecnicos} Técnicos</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCheckpointToRestore(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition"
              >
                Sí, Restaurar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Checkpoint */}
      {checkpointToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  ¿Eliminar este checkpoint?
                </h4>
                <p className="text-xs text-slate-500">Se eliminará de la base de datos local IndexedDB.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-900 font-bold">{checkpointToDelete.nombre}</p>
              <p className="text-slate-500">{checkpointToDelete.descripcion}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCheckpointToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
