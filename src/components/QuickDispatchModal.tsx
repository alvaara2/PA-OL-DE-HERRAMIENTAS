import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  UserCheck, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  FileText,
  UserPlus,
  Search,
  Lock,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { PhysicalAsset, Technician, LoanDispatch, LoanItem, StorekeeperProfile } from '../types/workshop';
import { SignaturePadComponent } from './SignaturePadComponent';
import { QrScannerModal } from './QrScannerModal';
import { evaluateCalibration } from '../utils/calibrationHelper';

interface QuickDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAssets: PhysicalAsset[];
  technicians: Technician[];
  activeStorekeeper: StorekeeperProfile;
  onAddTechnician: (tech: Technician) => void;
  onConfirmDispatch: (dispatch: LoanDispatch) => void;
  initialScannedAsset?: PhysicalAsset | null;
}

export const QuickDispatchModal: React.FC<QuickDispatchModalProps> = ({
  isOpen,
  onClose,
  availableAssets,
  technicians,
  activeStorekeeper,
  onAddTechnician,
  onConfirmDispatch,
  initialScannedAsset,
}) => {
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    initialScannedAsset ? [initialScannedAsset.id] : []
  );
  const [selectedTechDni, setSelectedTechDni] = useState<string>('');
  const [techSearchTerm, setTechSearchTerm] = useState<string>('');
  const [workOrder, setWorkOrder] = useState<string>('');
  const [techSignature, setTechSignature] = useState<string>('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'any' | 'tool' | 'technician'>('any');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [showAddTechForm, setShowAddTechForm] = useState(false);

  // New tech mini-form
  const [newDni, setNewDni] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newCargo, setNewCargo] = useState('');
  const [newArea, setNewArea] = useState('');
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);

  const showNotification = (text: string, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 5000);
  };

  if (!isOpen) return null;

  // Selected technician object
  const selectedTech = technicians.find((t) => t.dni === selectedTechDni);

  // Filtered techs
  const filteredTechs = technicians.filter(
    (t) =>
      t.activo &&
      (t.dni.includes(techSearchTerm) ||
        t.nombreCompleto.toLowerCase().includes(techSearchTerm.toLowerCase()) ||
        t.cargo.toLowerCase().includes(techSearchTerm.toLowerCase()))
  );

  // Filtered available assets to add
  const filteredAssets = availableAssets.filter((a) => {
    if (selectedAssetIds.includes(a.id)) return false;
    const q = assetSearchQuery.toLowerCase();
    return (
      a.codigoActivoFisico.toLowerCase().includes(q) ||
      a.descripcion.toLowerCase().includes(q) ||
      a.ubicacion.toLowerCase().includes(q) ||
      a.marca.toLowerCase().includes(q)
    );
  });

  const selectedAssetObjects = availableAssets.filter((a) =>
    selectedAssetIds.includes(a.id)
  );

  // Detect any safety blocked instrument in the selection
  const blockedAssets = selectedAssetObjects.filter((asset) => {
    const evalCal = evaluateCalibration(asset.calibracion);
    return evalCal.estaBloqueadoPorCalibracion;
  });

  // Handle scanned code (Tool QR or Technician Fotocheck QR)
  const handleQrScanned = (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    // 1. Check if it's a Technician DNI
    const matchedTech = technicians.find(
      (t) => t.dni.toUpperCase() === cleanCode || cleanCode.includes(t.dni)
    );
    if (matchedTech) {
      setSelectedTechDni(matchedTech.dni);
      showNotification(`✓ Fotocheck detectado: ${matchedTech.nombreCompleto} (DNI: ${matchedTech.dni})`);
      return;
    }

    // 2. Check if it's an Asset Code
    const foundAsset = availableAssets.find(
      (a) => a.codigoActivoFisico.toUpperCase() === cleanCode
    );
    if (foundAsset) {
      // Check calibration safety block!
      const evalCal = evaluateCalibration(foundAsset.calibracion);
      if (evalCal.estaBloqueadoPorCalibracion) {
        showNotification(`⛔ EQUIPO BLOQUEADO: ${foundAsset.codigoActivoFisico} tiene calibración vencida. No se puede despachar a campo.`, true);
        return;
      }

      if (!selectedAssetIds.includes(foundAsset.id)) {
        setSelectedAssetIds((prev) => [...prev, foundAsset.id]);
        showNotification(`✓ Pieza agregada: ${foundAsset.codigoActivoFisico} - ${foundAsset.descripcion}`);
      }
      return;
    }

    showNotification(`⚠️ El código QR [${code}] no corresponde a un técnico registrado ni a una herramienta disponible.`, true);
  };

  const handleAddAssetWithSafetyCheck = (asset: PhysicalAsset) => {
    const evalCal = evaluateCalibration(asset.calibracion);
    if (evalCal.estaBloqueadoPorCalibracion) {
      showNotification(`⛔ EQUIPO BLOQUEADO: ${asset.codigoActivoFisico} requiere calibración antes de salir a campo.`, true);
      return;
    }
    setSelectedAssetIds((prev) => [...prev, asset.id]);
    setAssetSearchQuery('');
  };

  const handleRemoveAsset = (id: string) => {
    setSelectedAssetIds((prev) => prev.filter((item) => item !== id));
  };

  const handleCreateNewTechnician = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDni.trim() || !newNombre.trim()) {
      showNotification('Ingrese al menos el DNI y Nombre Completo del técnico.', true);
      return;
    }
    const newTech: Technician = {
      id: `tech-${Date.now()}`,
      dni: newDni.trim(),
      nombreCompleto: newNombre.trim(),
      cargo: newCargo.trim() || 'Mecánico de Taller',
      area: newArea.trim() || 'Bahía Central',
      activo: true,
      fechaRegistro: new Date().toISOString().split('T')[0],
    };
    onAddTechnician(newTech);
    setSelectedTechDni(newTech.dni);
    setShowAddTechForm(false);
    showNotification(`✓ Técnico registrado y seleccionado: ${newTech.nombreCompleto}`);
  };

  // Submit dispatch with storekeeper auto-stamped signature
  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAssetIds.length === 0) {
      showNotification('Debe agregar al menos una herramienta o dado al vale de despacho.', true);
      return;
    }

    if (blockedAssets.length > 0) {
      showNotification(`⛔ DESPACHO DENEGADO: El vale contiene ${blockedAssets.length} instrumento(s) con calibración vencida. Debe retirarlos antes de continuar.`, true);
      return;
    }

    if (!selectedTech) {
      showNotification('Seleccione o escanee el fotocheck del técnico receptor.', true);
      return;
    }

    if (!techSignature) {
      showNotification('Es obligatorio registrar la firma táctil del técnico que retira el material.', true);
      return;
    }

    const now = new Date();
    const loanItems: LoanItem[] = selectedAssetObjects.map((asset) => ({
      assetId: asset.id,
      codigoActivoFisico: asset.codigoActivoFisico,
      descripcion: asset.descripcion,
      ubicacion: asset.ubicacion,
      condicionSalida: asset.condicionFisica,
      retornado: false,
      eraCalibrado: asset.calibracion?.requiereCalibracion,
    }));

    // Auto-stamped storekeeper signature
    const defaultStorekeeperSig = activeStorekeeper.firmaBase64 ||
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="38" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231e3a8a">✓ VO.BO. ALMACÉN</text></svg>';

    const dispatch: LoanDispatch = {
      id: `vale-${Date.now()}`,
      codigoVale: `VALE-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tecnicoDni: selectedTech.dni,
      tecnicoNombre: selectedTech.nombreCompleto,
      tecnicoCargo: selectedTech.cargo,
      tecnicoArea: `${selectedTech.area} (${selectedTech.cargo})`,
      ordenTrabajo: workOrder.trim() || 'Servicio de Mantenimiento Preventivo',
      items: loanItems,
      fechaPrestamo: now.toISOString(),
      horaPrestamo: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      firmaTecnicoBase64: techSignature,
      almaceneroId: activeStorekeeper.id,
      nombreAlmacenero: activeStorekeeper.nombreCompleto,
      almaceneroDni: activeStorekeeper.dni,
      firmaAlmaceneroBase64: defaultStorekeeperSig,
      estado: 'abierto',
    };

    onConfirmDispatch(dispatch);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-900">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Nuevo Despacho & Préstamo de Pañol</span>
                  <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full font-mono">
                    SALIDA
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Despachado por: <strong className="text-slate-800">{activeStorekeeper.nombreCompleto}</strong> (Firma predeterminada activa)
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

          {/* Toast Notification Banner */}
          {notification && (
            <div
              className={`px-4 py-2.5 text-xs font-bold text-center border-b transition ${
                notification.isError
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-emerald-600 text-white border-emerald-700'
              }`}
            >
              {notification.text}
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmitDispatch} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Technician Identification (via Fotocheck QR or Picker) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Identificación del Técnico Receptor
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScannerMode('technician');
                      setIsScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Escanear Fotocheck QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddTechForm(!showAddTechForm)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 ml-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {showAddTechForm ? 'Cancelar' : 'Nuevo'}
                  </button>
                </div>
              </div>

              {/* Add New Technician Inline Form */}
              {showAddTechForm && (
                <div className="p-3 mb-3 bg-white rounded-xl border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 shadow-sm">
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="DNI del técnico (ej. 45892301)"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Nombres y Apellidos"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    placeholder="Cargo (ej. Mecánico Diésel)"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Área (ej. Bahía 02)"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateNewTechnician}
                      className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      Guardar y Seleccionar
                    </button>
                  </div>
                </div>
              )}

              {/* Search or Select Existing Technician */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">
                    Buscar por DNI o Nombre:
                  </label>
                  <input
                    type="text"
                    value={techSearchTerm}
                    onChange={(e) => setTechSearchTerm(e.target.value)}
                    placeholder="Tipee DNI o apellido del técnico..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400"
                  />

                  <div className="mt-1.5 max-h-32 overflow-y-auto space-y-1">
                    {filteredTechs.map((tech) => (
                      <div
                        key={tech.dni}
                        onClick={() => setSelectedTechDni(tech.dni)}
                        className={`p-2 rounded-lg cursor-pointer text-xs flex items-center justify-between border transition ${
                          selectedTechDni === tech.dni
                            ? 'bg-blue-50 border-blue-400 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-bold">{tech.nombreCompleto}</p>
                          <p className="text-[11px] text-slate-500">
                            DNI: <span className="font-mono text-blue-700 font-bold">{tech.dni}</span> • {tech.cargo}
                          </p>
                        </div>
                        {selectedTechDni === tech.dni && (
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1">
                    Orden de Trabajo / Labor Asignada (OT):
                  </label>
                  <input
                    type="text"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                    placeholder="Ej: OT-4921 Mantenimiento Motor Diésel Pala 03"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400"
                  />

                  {selectedTech && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200 shadow-xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-800 shrink-0">
                        {selectedTech.nombreCompleto.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {selectedTech.nombreCompleto}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          DNI: <strong className="font-mono text-blue-700">{selectedTech.dni}</strong> • {selectedTech.cargo}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Tool Selection / Scanner with METROLOGY SAFETY CHECK */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Herramientas y Dados a Despachar ({selectedAssetIds.length})
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScannerMode('tool');
                      setIsScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Escanear QR de Herramienta
                  </button>
                </div>
              </div>

              {/* Blocked Instruments Safety Warning */}
              {blockedAssets.length > 0 && (
                <div className="p-3 mb-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-xs text-rose-900 flex items-center gap-3 animate-pulse">
                  <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <strong>⛔ ALERTA DE SEGURIDAD METROLÓGICA:</strong>
                    <p>
                      {blockedAssets.length} instrumento(s) seleccionado(s) tiene(n) la calibración vencida.
                      El sistema prohíbe el despacho hasta que sean retirados del vale.
                    </p>
                  </div>
                </div>
              )}

              {/* Basket list */}
              {selectedAssetObjects.length > 0 ? (
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                  {selectedAssetObjects.map((asset) => {
                    const evalCal = evaluateCalibration(asset.calibracion);
                    const isBlocked = evalCal.estaBloqueadoPorCalibracion;

                    return (
                      <div
                        key={asset.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition shadow-xs ${
                          isBlocked
                            ? 'bg-rose-50 border-rose-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {asset.codigoActivoFisico}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {asset.descripcion}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              📍 {asset.ubicacion} • {asset.marca}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {asset.calibracion?.requiereCalibracion && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${evalCal.badgeClase}`}
                            >
                              {isBlocked ? '⛔ VENCIDO' : '✓ Calibrado'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(asset.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                            title="Quitar del vale"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-dashed border-slate-300 text-center mb-3">
                  <p className="text-xs text-slate-500">
                    No has agregado piezas al despacho aún. Escanea con la cámara o busca abajo:
                  </p>
                </div>
              )}

              {/* Quick Search Picker from catalog */}
              <div className="pt-2 border-t border-slate-200">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Buscar por código (ej. DAD-17, TORQ), descripción o estante..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {assetSearchQuery && (
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    {filteredAssets.slice(0, 8).map((asset) => {
                      const evalCal = evaluateCalibration(asset.calibracion);
                      const isBlocked = evalCal.estaBloqueadoPorCalibracion;

                      return (
                        <div
                          key={asset.id}
                          onClick={() => handleAddAssetWithSafetyCheck(asset)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                            isBlocked ? 'bg-rose-50/70 hover:bg-rose-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                              {asset.codigoActivoFisico}
                            </span>
                            <span className="text-slate-800 font-medium truncate max-w-xs">
                              {asset.descripcion}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isBlocked ? (
                              <span className="text-rose-600 font-bold flex items-center gap-1 text-[10px]">
                                <Lock className="w-3 h-3" /> Calibración Vencida
                              </span>
                            ) : (
                              <span className="text-blue-600 font-bold flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Agregar
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Signatures (Worker signs live; Storekeeper signature is auto-stamped) */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Validación de Entrega y Firmas
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Technician Live Signature */}
                <SignaturePadComponent
                  label="Firma Táctil del Técnico Receptor"
                  signeeName={selectedTech ? selectedTech.nombreCompleto : 'Seleccione técnico arriba'}
                  signeeRole={selectedTech?.cargo}
                  value={techSignature}
                  onChange={setTechSignature}
                  required
                />

                {/* Storekeeper Auto-Stamped Signature */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Firma Predeterminada de Almacén (Auto-Estampada):
                    </span>
                    <p className="text-xs font-bold text-slate-900">
                      {activeStorekeeper.nombreCompleto}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      DNI: {activeStorekeeper.dni} • {activeStorekeeper.cargo}
                    </p>

                    <div className="mt-3 h-20 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-2 overflow-hidden">
                      {activeStorekeeper.firmaBase64 ? (
                        <img
                          src={activeStorekeeper.firmaBase64}
                          alt="Firma del encargado"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          ✓ Sello Vo.Bo. Almacén Activo
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 italic text-center">
                    Se estampará automáticamente con un solo clic sin necesidad de redibujar.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={blockedAssets.length > 0}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Entrega y Estampar Firma
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* QR Scanner Component */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScanned}
        title={scannerMode === 'technician' ? 'Escanear Fotocheck del Técnico' : 'Escanear QR de Herramienta o Técnico'}
        subtitle="Apunte al código QR del carnet del técnico o a la etiqueta de la herramienta."
        suggestedCodes={[
          ...technicians.map((t) => t.dni),
          ...availableAssets.map((a) => a.codigoActivoFisico),
        ]}
      />
    </>
  );
};
