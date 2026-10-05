import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Edit3, 
  Plus, 
  Camera, 
  Eraser, 
  Check, 
  ShieldCheck, 
  Upload,
  User,
  Trash2
} from 'lucide-react';
import { StorekeeperProfile } from '../types/workshop';
import { SignaturePadComponent } from './SignaturePadComponent';

interface StorekeeperShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  storekeepers: StorekeeperProfile[];
  activeStorekeeperId: string;
  onSelectStorekeeper: (id: string) => void;
  onUpdateStorekeeper: (updated: StorekeeperProfile) => void;
  onAddStorekeeper: (newProfile: StorekeeperProfile) => void;
  onDeleteStorekeeper?: (id: string) => void;
  handleDeleteEncargado?: (id: string) => void;
}

export const StorekeeperShiftModal: React.FC<StorekeeperShiftModalProps> = ({
  isOpen,
  onClose,
  storekeepers,
  activeStorekeeperId,
  onSelectStorekeeper,
  onUpdateStorekeeper,
  onAddStorekeeper,
  onDeleteStorekeeper,
  handleDeleteEncargado,
}) => {
  const deleteAction = handleDeleteEncargado || onDeleteStorekeeper || (() => {});
  const [editingStorekeeper, setEditingStorekeeper] = useState<StorekeeperProfile | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Signature drawing/upload for profile
  const [tempSignature, setTempSignature] = useState<string>('');

  // Add form fields
  const [newDni, setNewDni] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCargo, setNewCargo] = useState('Encargado de Pañol / Turno');
  const [newTurno, setNewTurno] = useState('Turno Mañana (07:00 - 15:30)');

  // Storekeeper to delete confirmation modal state
  const [storekeeperToDelete, setStorekeeperToDelete] = useState<StorekeeperProfile | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartEditSignature = (keeper: StorekeeperProfile) => {
    setEditingStorekeeper(keeper);
    setTempSignature(keeper.firmaBase64 || '');
  };

  const handleSaveSignature = () => {
    if (!editingStorekeeper) return;
    const updated: StorekeeperProfile = {
      ...editingStorekeeper,
      firmaBase64: tempSignature,
    };
    onUpdateStorekeeper(updated);
    setEditingStorekeeper(null);
  };

  const handleFileUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setTempSignature(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateNewKeeper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDni.trim() || !newNombre.trim()) {
      alert('Por favor ingrese el DNI y Nombre Completo del encargado.');
      return;
    }
    const newKeeper: StorekeeperProfile = {
      id: `alm-${Date.now()}`,
      dni: newDni.trim(),
      nombreCompleto: newNombre.trim(),
      cargo: newCargo.trim(),
      ultimoTurno: newTurno.trim(),
      activo: false,
    };
    onAddStorekeeper(newKeeper);
    setShowAddForm(false);
    setNewDni('');
    setNewNombre('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Encargados de Pañol y Firma Predeterminada
              </h3>
              <p className="text-xs text-slate-500">
                Seleccione quién está de turno. Su firma se estampará automáticamente en los despachos.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Storekeeper Picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Personal de Almacén Disponible:
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? 'Cancelar' : 'Agregar Encargado'}
              </button>
            </div>

            {/* Add New Keeper Form */}
            {showAddForm && (
              <form onSubmit={handleCreateNewKeeper} className="p-4 mb-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800">Registrar Nuevo Encargado de Almacén:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="DNI (ej: 71424847)"
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Nombres y Apellidos"
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    required
                  />
                  <input
                    type="text"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    placeholder="Cargo"
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={newTurno}
                    onChange={(e) => setNewTurno(e.target.value)}
                    placeholder="Horario / Turno"
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                  >
                    Guardar Personal
                  </button>
                </div>
              </form>
            )}

            {/* Storekeepers list cards */}
            <div className="space-y-3">
              {storekeepers.map((keeper) => {
                const isActive = keeper.id === activeStorekeeperId;

                return (
                  <div
                    key={keeper.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <input
                          type="radio"
                          name="activeKeeper"
                          checked={isActive}
                          onChange={() => onSelectStorekeeper(keeper.id)}
                          className="w-4 h-4 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          id={`keeper-${keeper.id}`}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`keeper-${keeper.id}`}
                          className="text-sm font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                        >
                          <span>{keeper.nombreCompleto}</span>
                          {isActive && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                              DE TURNO AHORA
                            </span>
                          )}
                        </label>
                        <p className="text-xs text-slate-500">
                          DNI: <strong className="font-mono text-slate-800">{keeper.dni}</strong> • {keeper.cargo}
                        </p>
                        {keeper.ultimoTurno && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            ⏰ {keeper.ultimoTurno}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Signature Preview & Edit Button */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="h-14 w-28 border border-slate-200 rounded-xl bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                        {keeper.firmaBase64 ? (
                          <img
                            src={keeper.firmaBase64}
                            alt="Firma"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sin firma</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEditSignature(keeper)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200"
                        title="Modificar firma predeterminada"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Firma
                      </button>

                      <button
                        type="button"
                        onClick={() => setStorekeeperToDelete(keeper)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition border border-slate-200 hover:border-rose-300 cursor-pointer"
                        title={`Eliminar a ${keeper.nombreCompleto}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* In-app feedback toast */}
            {deleteFeedback && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl text-center shadow-xs">
                {deleteFeedback}
              </div>
            )}
          </div>

          {/* Edit Signature Modal Section */}
          {editingStorekeeper && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Configurar Firma Predeterminada: {editingStorekeeper.nombreCompleto}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dibuje en el lienzo táctil o suba una foto/imagen de su firma una sola vez.
                  </p>
                </div>
                <button
                  onClick={() => setEditingStorekeeper(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Upload photo button */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Subir Foto de Firma (PNG / JPG)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadSignature}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">O dibuje abajo con el dedo/puntero:</span>
              </div>

              <SignaturePadComponent
                label="Lienzo de Firma Predeterminada"
                signeeName={editingStorekeeper.nombreCompleto}
                signeeRole={editingStorekeeper.cargo}
                value={tempSignature}
                onChange={setTempSignature}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStorekeeper(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar Firma Permanente
                </button>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed">
            <strong>✓ Ventaja Operativa:</strong> Al despachar o recibir herramientas, el pañolero de turno
            solo hace un clic en <em>"Confirmar Entrega"</em> o <em>"Recepción Conforme"</em> y el sistema
            estampará de inmediato su firma y sello oficial sin necesidad de volver a dibujar.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Listo / Confirmar Turno
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Storekeeper Deletion */}
      {storekeeperToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  ¿Eliminar al encargado "{storekeeperToDelete.nombreCompleto}" del sistema?
                </h4>
                <p className="text-xs text-slate-500">Esta acción removerá al encargado y limpiará sus firmas asociadas.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-900 font-bold">{storekeeperToDelete.nombreCompleto}</p>
              <p className="text-slate-500">
                DNI: <strong className="font-mono text-slate-800">{storekeeperToDelete.dni}</strong> • {storekeeperToDelete.cargo}
              </p>
              <p className="text-[11px] text-amber-700 pt-1 font-semibold">
                ⚠️ Se removerá de la lista de selección de turno y se limpiarán sus firmas asociadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStorekeeperToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = storekeeperToDelete.id;
                  const nameToDelete = storekeeperToDelete.nombreCompleto;
                  if (editingStorekeeper?.id === idToDelete) {
                    setEditingStorekeeper(null);
                    setTempSignature('');
                  }
                  deleteAction(idToDelete);
                  setStorekeeperToDelete(null);
                  setDeleteFeedback(`✓ Encargado ${nameToDelete} eliminado del sistema.`);
                  setTimeout(() => setDeleteFeedback(null), 4000);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
              >
                Sí, Eliminar Encargado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
