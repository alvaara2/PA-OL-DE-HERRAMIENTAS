import React from 'react';
import { X, Printer, FileCheck } from 'lucide-react';
import { LoanDispatch } from '../types/workshop';
import { formatDateTime } from '../utils/timeAlerts';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: LoanDispatch | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  dispatch,
}) => {
  if (!isOpen || !dispatch) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden text-slate-900">
        {/* Modal Controls (No Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-600" />
              <span>Acta Oficial de Control de Pañol: {dispatch.codigoVale}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Documento formal con validez interna y renderizado de firmas en Base64.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar en PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Formal Document Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            id="printable-formal-receipt"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 shadow-md rounded-xl print:m-0 print:p-6 print:shadow-none print:max-w-none print:w-full font-sans text-xs border border-slate-200 print:border-none"
          >
            {/* Formal Company Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-900 text-amber-400 font-black flex items-center justify-center rounded">
                    P
                  </div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                    COMPLEJO INDUSTRIAL & MINERO
                  </h1>
                </div>
                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mt-0.5">
                  DEPARTAMENTO DE MANTENIMIENTO • CONTROL DE PAÑOL, CALIBRACIONES Y ACTIVOS
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Sistema de Trazabilidad, Rotulado QR y Despacho con Firma Digital
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                  {dispatch.codigoVale}
                </span>
                <p className="text-[10px] font-mono text-slate-600 mt-1">
                  Fecha Emisión: {formatDateTime(dispatch.fechaPrestamo)}
                </p>
                <p className="text-[10px] font-bold text-slate-700">
                  Estado: <span className="uppercase text-emerald-700">{dispatch.estado}</span>
                </p>
              </div>
            </div>

            {/* Sub-header title */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center mb-4">
              <h2 className="text-xs font-black tracking-wide text-slate-800 uppercase">
                ACTA FORMAL DE ENTREGA Y CUSTODIA TEMPORAL DE HERRAMIENTAS Y EQUIPOS
              </h2>
            </div>

            {/* Two-Column Metadata */}
            <div className="grid grid-cols-2 gap-4 mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Datos del Técnico Receptor:</p>
                <p className="text-xs font-bold text-slate-900">{dispatch.tecnicoNombre}</p>
                <p className="text-[11px] text-slate-700">
                  DNI: <span className="font-mono font-bold">{dispatch.tecnicoDni}</span>
                </p>
                <p className="text-[11px] text-slate-700">
                  Cargo / Área: {dispatch.tecnicoCargo || 'Técnico de Taller'} • {dispatch.tecnicoArea}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Detalles del Despacho:</p>
                <p className="text-xs font-bold text-slate-900">
                  OT / Labor: <span className="font-mono text-slate-800">{dispatch.ordenTrabajo}</span>
                </p>
                <p className="text-[11px] text-slate-700">
                  Despachado por: <strong>{dispatch.nombreAlmacenero}</strong> (DNI: {dispatch.almaceneroDni})
                </p>
                <p className="text-[11px] text-slate-700">
                  Límite de Custodia en Campo: <strong className="text-rose-700">24 Horas Máximas</strong>
                </p>
              </div>
            </div>

            {/* Table of Dispatched Tools */}
            <div className="mb-5">
              <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                Inventario de Piezas Tangibles Despachadas ({dispatch.items.length}):
              </h3>
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase">
                  <tr>
                    <th className="p-2 border border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border border-slate-300">Código Activo Físico (Placa)</th>
                    <th className="p-2 border border-slate-300">Descripción Técnica</th>
                    <th className="p-2 border border-slate-300">Ubicación Tablero</th>
                    <th className="p-2 border border-slate-300 text-center">Salida</th>
                    <th className="p-2 border border-slate-300 text-center">Retorno</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatch.items.map((item, idx) => (
                    <tr key={item.assetId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-slate-900 bg-amber-50">
                        {item.codigoActivoFisico}
                      </td>
                      <td className="p-2 border border-slate-300 font-medium text-slate-800">
                        {item.descripcion}
                      </td>
                      <td className="p-2 border border-slate-300 text-slate-600 font-mono">
                        {item.ubicacion}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-emerald-700 uppercase">
                        {item.condicionSalida}
                      </td>
                      <td className="p-2 border border-slate-300 text-center">
                        {item.retornado ? (
                          <span className="text-emerald-700 font-bold">
                            ✓ {item.condicionRetorno || 'OK'}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">En Campo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observations */}
            {dispatch.observaciones && (
              <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700">
                <strong>Observaciones de Entrega:</strong> {dispatch.observaciones}
              </div>
            )}

            {/* Policy Clause */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-[8.5px] text-slate-600 mb-6 leading-relaxed">
              <strong>TÉRMINOS DE CUSTODIA Y METROLOGÍA:</strong> El técnico receptor asume la custodia directa
              de las herramientas y dados codificados detallados en este vale. Declara haber verificado el buen
              estado mecánico y calibración vigente antes de su uso. Cualquier fisura, desgaste anómalo o extravío
              debe ser reportado inmediatamente. Toda herramienta debe retornar al pañol dentro del plazo máximo de 24 horas continuas.
            </div>

            {/* Digital Signatures Render in Base64 */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-slate-300">
              {/* Technician Signature */}
              <div className="flex flex-col items-center text-center">
                <div className="w-full h-24 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-2 mb-2 overflow-hidden">
                  {dispatch.firmaTecnicoBase64 ? (
                    <img
                      src={dispatch.firmaTecnicoBase64}
                      alt="Firma del Técnico"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[10px]">Sin firma registrada</span>
                  )}
                </div>
                <div className="border-t border-slate-800 w-4/5 pt-1">
                  <p className="font-bold text-slate-900 text-xs">{dispatch.tecnicoNombre}</p>
                  <p className="text-[10px] text-slate-600">
                    TÉCNICO RECEPTOR • DNI: {dispatch.tecnicoDni}
                  </p>
                </div>
              </div>

              {/* Storekeeper Stamped Signature */}
              <div className="flex flex-col items-center text-center">
                <div className="w-full h-24 border border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center p-2 mb-2 overflow-hidden">
                  {dispatch.firmaAlmaceneroBase64 ? (
                    <img
                      src={dispatch.firmaAlmaceneroBase64}
                      alt="Firma del Encargado"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[10px]">Sello Vo.Bo. de Almacén</span>
                  )}
                </div>
                <div className="border-t border-slate-800 w-4/5 pt-1">
                  <p className="font-bold text-slate-900 text-xs">{dispatch.nombreAlmacenero}</p>
                  <p className="text-[10px] text-slate-600">
                    ENCARGADO DE PAÑOL • DNI: {dispatch.almaceneroDni}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer QR Verification Code */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>SISTEMA PAÑOLPRO METROLOGÍA • VERSIÓN 4.5</span>
              <span>VALE ID: {dispatch.id.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
