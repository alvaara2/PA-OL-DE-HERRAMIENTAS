import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  HelpCircle,
  FileCheck,
  Camera
} from 'lucide-react';
import { LoanDispatch, LoanItem, AssetCondition, PhysicalAsset, StorekeeperProfile } from '../types/workshop';
import { SignaturePadComponent } from './SignaturePadComponent';
import { QrScannerModal } from './QrScannerModal';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: LoanDispatch | null;
  allAssets: PhysicalAsset[];
  activeStorekeeper?: StorekeeperProfile;
  onConfirmReturn: (
    dispatchId: string,
    updatedItems: LoanItem[],
    receiverName: string,
    receiverSignatureBase64: string,
    notes?: string
  ) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  dispatch,
  allAssets,
  activeStorekeeper,
  onConfirmReturn,
}) => {
  if (!isOpen || !dispatch) return null;

  const [itemConditions, setItemConditions] = useState<Record<string, AssetCondition>>(() => {
    const map: Record<string, AssetCondition> = {};
    dispatch.items.forEach((item) => {
      map[item.assetId] = item.condicionRetorno || 'operativo';
    });
    return map;
  });

  const [itemObservations, setItemObservations] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    dispatch.items.forEach((item) => {
      map[item.assetId] = item.observacionesRetorno || '';
    });
    return map;
  });

  const [itemReturnedStatus, setItemReturnedStatus] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    dispatch.items.forEach((item) => {
      map[item.assetId] = item.retornado ?? true;
    });
    return map;
  });

  const [receiverName, setReceiverName] = useState(
    activeStorekeeper?.nombreCompleto || 'Alvaro Aragón Puertas (Encargado)'
  );
  const [receiverSignature, setReceiverSignature] = useState('');
  const [useQuickVoBo, setUseQuickVoBo] = useState(true);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Quick mark by scanning QR or typing Text Code / 8-digit DNI
  const handleQrScanReturn = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const matchedItem = dispatch.items.find((it) => {
      const asset = allAssets.find((a) => a.id === it.assetId);
      return (
        it.codigoActivoFisico.toUpperCase() === cleanCode ||
        (asset?.dniNumerico && asset.dniNumerico.toUpperCase() === cleanCode) ||
        (asset?.codigoMnemotecnico && asset.codigoMnemotecnico.toUpperCase() === cleanCode)
      );
    });

    if (matchedItem) {
      setItemReturnedStatus((prev) => ({ ...prev, [matchedItem.assetId]: true }));
      setFeedbackMsg(`✓ Pieza física [${matchedItem.codigoActivoFisico}] verificada y marcada para retorno.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg(`⚠️ La pieza [${code}] no pertenece a este vale (${dispatch.codigoVale}).`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleConditionChange = (assetId: string, condition: AssetCondition) => {
    setItemConditions((prev) => ({ ...prev, [assetId]: condition }));
  };

  const handleObsChange = (assetId: string, text: string) => {
    setItemObservations((prev) => ({ ...prev, [assetId]: text }));
  };

  const handleToggleItemReturn = (assetId: string) => {
    setItemReturnedStatus((prev) => ({ ...prev, [assetId]: !prev[assetId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedItems: LoanItem[] = dispatch.items.map((item) => {
      const isRet = itemReturnedStatus[item.assetId] ?? true;
      const cond = itemConditions[item.assetId] || 'operativo';
      const obs = itemObservations[item.assetId] || '';

      return {
        ...item,
        retornado: isRet,
        condicionRetorno: cond,
        fechaRetorno: isRet ? new Date().toISOString() : undefined,
        observacionesRetorno: obs,
      };
    });

    const defaultStamp = activeStorekeeper?.firmaBase64 ||
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="38" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">✓ RECEPCIÓN CONFORME</text></svg>';

    const signatureToUse = useQuickVoBo ? defaultStamp : receiverSignature;

    if (!useQuickVoBo && !receiverSignature) {
      setFeedbackMsg('⚠️ Por favor dibuje su firma en el lienzo digital o marque Visto Bueno.');
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    onConfirmReturn(dispatch.id, updatedItems, receiverName, signatureToUse, generalNotes);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-900">
          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center border-b border-amber-600 transition-all">
              {feedbackMsg}
            </div>
          )}
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Recepción y Retorno al Pañol</span>
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    {dispatch.codigoVale}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Técnico: <span className="text-slate-800 font-bold">{dispatch.tecnicoNombre}</span> (DNI: {dispatch.tecnicoDni})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                Escanear QR de Retorno
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Items Verification Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Inspección del Estado Físico de Piezas:
              </h4>

              <div className="space-y-3">
                {dispatch.items.map((item) => {
                  const isRet = itemReturnedStatus[item.assetId] ?? true;
                  const currentCond = itemConditions[item.assetId] || 'operativo';

                  return (
                    <div
                      key={item.assetId}
                      className={`p-4 rounded-2xl border transition ${
                        isRet
                          ? currentCond === 'fisurado' || currentCond === 'perdido'
                            ? 'bg-rose-50/70 border-rose-300'
                            : 'bg-white border-slate-200 shadow-xs'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isRet}
                            onChange={() => handleToggleItemReturn(item.assetId)}
                            className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            id={`ret-${item.assetId}`}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <label
                                htmlFor={`ret-${item.assetId}`}
                                className="font-mono text-xs font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
                              >
                                {item.codigoActivoFisico}
                              </label>
                              {(() => {
                                const matchedAsset = allAssets.find((a) => a.id === item.assetId);
                                if (!matchedAsset?.dniNumerico) return null;
                                return (
                                  <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    DNI {matchedAsset.dniNumerico}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-1">
                              {item.descripcion}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              📍 Ubicación de retorno: {item.ubicacion}
                            </p>
                          </div>
                        </div>

                        {/* Condition Selector */}
                        {isRet && (
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleConditionChange(item.assetId, 'operativo')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                currentCond === 'operativo'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" /> Operativo
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConditionChange(item.assetId, 'desgaste')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                currentCond === 'desgaste'
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" /> Desgaste
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConditionChange(item.assetId, 'fisurado')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                currentCond === 'fisurado'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <ShieldAlert className="w-3 h-3" /> Fisurado / Roto
                            </button>

                            <button
                              type="button"
                              onClick={() => handleConditionChange(item.assetId, 'perdido')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                currentCond === 'perdido'
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <HelpCircle className="w-3 h-3" /> Extraviado
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Warning box if cracked */}
                      {isRet && currentCond === 'fisurado' && (
                        <div className="mt-2.5 p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 font-medium">
                          ⚠️ <strong>Atención:</strong> Esta pieza será bloqueada automáticamente como "En Mantenimiento" y no estará disponible para futuros préstamos hasta su inspección o reemplazo.
                        </div>
                      )}

                      {/* Observations field */}
                      {isRet && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <input
                            type="text"
                            value={itemObservations[item.assetId] || ''}
                            onChange={(e) => handleObsChange(item.assetId, e.target.value)}
                            placeholder="Observaciones de recepción (ej. retorno con suciedad, rayaduras leves, perno trabado)..."
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Receiver / Pañolero Verification */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recepción Conforme de Pañol
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseQuickVoBo(true)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                      useQuickVoBo
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Visto Bueno (OK)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseQuickVoBo(false)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                      !useQuickVoBo
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Firma Táctil
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1">
                  Nombre del Pañolero Receptor:
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {!useQuickVoBo ? (
                <SignaturePadComponent
                  label="Firma de Conformidad de Recepción"
                  signeeName={receiverName}
                  signeeRole="Pañolero"
                  value={receiverSignature}
                  onChange={setReceiverSignature}
                  required
                />
              ) : (
                <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Sello de Visto Bueno (OK) y Firma Predeterminada de Almacén:
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        El encargado <strong>{receiverName}</strong> certifica la recepción física y su reincorporación al tablero.
                      </p>
                      <p className="text-[10px] text-emerald-700 italic mt-1">
                        ✓ Se estampará automáticamente con un solo clic sin necesidad de volver a dibujar.
                      </p>
                    </div>
                  </div>

                  <div className="h-14 w-28 border border-emerald-300 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {activeStorekeeper?.firmaBase64 ? (
                      <img
                        src={activeStorekeeper.firmaBase64}
                        alt="Firma del Encargado"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700">✓ Sello VO.BO.</span>
                    )}
                  </div>
                </div>
              )}
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
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Registrar Devolución en Pañol
              </button>
            </div>
          </form>
        </div>
      </div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScanReturn}
        title="Escanear QR de Retorno de Pieza"
        subtitle="Acerque el QR del dado o herramienta devuelta físicamente."
        suggestedCodes={dispatch.items.map((it) => it.codigoActivoFisico)}
      />
    </>
  );
};
