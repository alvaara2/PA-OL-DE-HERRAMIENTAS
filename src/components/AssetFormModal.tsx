import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  Camera, 
  Sparkles, 
  MapPin, 
  Image as ImageIcon,
  Award,
  Upload,
  FileText,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { PhysicalAsset, AssetCategory, AssetCondition, AssetStatus, CalibrationData } from '../types/workshop';
import { 
  generateUniquePhysicalCode, 
  detectCategory, 
  extractDrive, 
  extractMeasurement, 
  suggestLocation 
} from '../utils/assetCoder';
import { getAutoReferenceImage } from '../utils/imageCatalog';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: PhysicalAsset) => void;
  assetToEdit?: PhysicalAsset | null;
  existingCodes: string[];
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assetToEdit,
  existingCodes,
}) => {
  if (!isOpen) return null;

  const [descripcion, setDescripcion] = useState(assetToEdit?.descripcion || '');
  const [marca, setMarca] = useState(assetToEdit?.marca || 'DeWalt');
  const [modelo, setModelo] = useState(assetToEdit?.modelo || '');
  const [categoria, setCategoria] = useState<AssetCategory>(assetToEdit?.categoria || 'dado_impacto');
  const [encastre, setEncastre] = useState(assetToEdit?.encastre || '1/2');
  const [medida, setMedida] = useState(assetToEdit?.medida || '17MM');
  const [esImpacto, setEsImpacto] = useState<boolean>(assetToEdit?.esImpacto ?? true);
  const [numeroSerie, setNumeroSerie] = useState(assetToEdit?.numeroSerie || '');
  const [ubicacion, setUbicacion] = useState(assetToEdit?.ubicacion || '');
  const [codigoActivoFisico, setCodigoActivoFisico] = useState(assetToEdit?.codigoActivoFisico || '');
  const [condicionFisica, setCondicionFisica] = useState<AssetCondition>(assetToEdit?.condicionFisica || 'operativo');
  const [estado, setEstado] = useState<AssetStatus>(assetToEdit?.estado || 'disponible');
  const [fotoUrl, setFotoUrl] = useState<string>(assetToEdit?.fotoUrl || '');
  const [notas, setNotas] = useState(assetToEdit?.notas || '');

  // Metrological Calibration fields
  const [requiereCalibracion, setRequiereCalibracion] = useState<boolean>(
    Boolean(
      assetToEdit?.calibracion?.requiereCalibracion || 
      assetToEdit?.categoria === 'torquimetro' || 
      assetToEdit?.categoria === 'instrumento_medicion'
    )
  );
  const [numeroCertificado, setNumeroCertificado] = useState<string>(
    assetToEdit?.calibracion?.numeroCertificado || ''
  );
  const [entidadCertificadora, setEntidadCertificadora] = useState<string>(
    assetToEdit?.calibracion?.entidadCertificadora || 'INACAL / Metrología Acreditada'
  );
  const [fechaCalibracion, setFechaCalibracion] = useState<string>(
    assetToEdit?.calibracion?.fechaCalibracion || new Date().toISOString().split('T')[0]
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(() => {
    if (assetToEdit?.calibracion?.fechaVencimiento) {
      return assetToEdit.calibracion.fechaVencimiento;
    }
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [certificadoPdfUrl, setCertificadoPdfUrl] = useState<string>(
    assetToEdit?.calibracion?.certificadoPdfUrl || (assetToEdit as any)?.certificadoPdfUrl || ''
  );
  const [pdfFileName, setPdfFileName] = useState<string>(
    certificadoPdfUrl ? 'Certificado_Oficial_Adjunto.pdf' : ''
  );
  const [toleranciaError, setToleranciaError] = useState<string>(
    assetToEdit?.calibracion?.toleranciaError || '± 2%'
  );

  // Auto-generate code when creating a new asset and fields change
  useEffect(() => {
    if (!assetToEdit) {
      const generated = generateUniquePhysicalCode(
        {
          descripcion,
          marca,
          medida,
          encastre,
          categoria,
          esImpacto,
        },
        existingCodes
      );
      setCodigoActivoFisico(generated);

      if (!ubicacion) {
        setUbicacion(suggestLocation(categoria, esImpacto));
      }

      if (!fotoUrl) {
        setFotoUrl(getAutoReferenceImage(descripcion, marca));
      }
    }
  }, [descripcion, marca, medida, encastre, categoria, esImpacto]);

  // Handle Description change with smart extraction
  const handleDescriptionChange = (text: string) => {
    setDescripcion(text);
    if (!assetToEdit) {
      const cat = detectCategory(text);
      setCategoria(cat);
      if (cat === 'torquimetro' || cat === 'instrumento_medicion') {
        setRequiereCalibracion(true);
      }
      const isImp = /impacto/i.test(text) || cat === 'dado_impacto';
      setEsImpacto(isImp);
      const drv = extractDrive(text);
      if (drv) setEncastre(drv);
      const m = extractMeasurement(text);
      if (m) setMedida(m);
      setFotoUrl(getAutoReferenceImage(text, marca));
    }
  };

  const handleCategoryChange = (newCat: AssetCategory) => {
    setCategoria(newCat);
    if (newCat === 'torquimetro' || newCat === 'instrumento_medicion') {
      setRequiereCalibracion(true);
    }
  };

  // Handle file photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setFotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Official Certificate PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se admiten documentos en formato PDF (.pdf).');
      return;
    }

    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setCertificadoPdfUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoActivoFisico.trim() || !descripcion.trim()) {
      alert('El código físico y la descripción técnica son requeridos.');
      return;
    }

    const calData: CalibrationData | undefined = requiereCalibracion
      ? {
          requiereCalibracion: true,
          instrumentoTipo: descripcion.trim(),
          rangoMedicion: medida.trim() || undefined,
          fechaCalibracion: fechaCalibracion || undefined,
          fechaVencimiento: fechaVencimiento || undefined,
          entidadCertificadora: entidadCertificadora.trim() || 'INACAL / Metrología Acreditada',
          numeroCertificado: numeroCertificado.trim() || undefined,
          toleranciaError: toleranciaError.trim() || undefined,
          certificadoPdfUrl: certificadoPdfUrl || undefined,
        }
      : undefined;

    const assetData: PhysicalAsset = {
      id: assetToEdit?.id || `asset-${Date.now()}`,
      codigoActivoFisico: codigoActivoFisico.trim().toUpperCase(),
      descripcion: descripcion.trim(),
      categoria,
      familia: categoria.toUpperCase(),
      marca: marca.trim() || 'GENÉRICO',
      modelo: modelo.trim() || undefined,
      medida: medida.trim() || undefined,
      encastre: encastre.trim() || undefined,
      esImpacto,
      numeroSerie: numeroSerie.trim() || undefined,
      ubicacion: ubicacion.trim() || 'Estante General',
      estado,
      condicionFisica,
      fotoUrl: fotoUrl || getAutoReferenceImage(descripcion, marca),
      notas: notas.trim() || undefined,
      fechaAlta: assetToEdit?.fechaAlta || new Date().toISOString().split('T')[0],
      prestamoActivoId: assetToEdit?.prestamoActivoId,
      calibracion: calData,
      certificadoPdfUrl: certificadoPdfUrl || undefined,
    };

    onSave(assetData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {assetToEdit ? 'Editar Activo Físico' : 'Plaquetear / Registrar Nueva Herramienta o Dado'}
              </h3>
              <p className="text-xs text-slate-500">
                Asignación de código físico industrial y ubicación en sombra
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Physical Code Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Código de Activo Físico / Placa (Imprimible en QR):
              </span>
              <input
                type="text"
                value={codigoActivoFisico}
                onChange={(e) => setCodigoActivoFisico(e.target.value.toUpperCase())}
                className="font-mono text-base font-black text-slate-900 bg-transparent border-b border-amber-400 focus:outline-none focus:border-amber-600 w-full"
                placeholder="DAD-IMP-1/2-17MM-001"
              />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Nomenclatura</span>
              <span className="text-[11px] font-bold text-emerald-700">✓ Normalizada</span>
            </div>
          </div>

          {/* Description & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-slate-700 font-bold block mb-1">
                Descripción Técnica: *
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Ej: Dado de Impacto 17mm Encastre 1/2..."
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Marca:</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="DeWalt, Snap-on, Bosch..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Category, Drive & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-slate-700 font-bold block mb-1">Categoría:</label>
              <select
                value={categoria}
                onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="dado_impacto">Dado de Impacto (Fosfatado)</option>
                <option value="dado_estandar">Dado Estándar / Cromo</option>
                <option value="extension">Extensión / Cardan</option>
                <option value="torquimetro">Torquímetro / Dinamométrica (Requiere Calibración)</option>
                <option value="instrumento_medicion">Instrumento de Medición (Vernier / Manómetro / Reloj)</option>
                <option value="llave_combinada">Llave Combinada</option>
                <option value="herramienta_electrica">Herramienta Eléctrica</option>
                <option value="herramienta_neumatica">Herramienta Neumática</option>
                <option value="herramienta_manual">Herramienta Manual</option>
                <option value="copa_accesorio">Copa / Accesorio Especial</option>
                <option value="otro">Otro Activo</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Encastre:</label>
              <input
                type="text"
                value={encastre}
                onChange={(e) => setEncastre(e.target.value)}
                placeholder="1/2, 3/4, 3/8..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Medida:</label>
              <input
                type="text"
                value={medida}
                onChange={(e) => setMedida(e.target.value)}
                placeholder="17MM, 10IN..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Location & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Ubicación en Estante / Tablero de Sombra:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: Tablero Sombra #1 - Gancho 04"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">
                Número de Serie / Código de Fábrica:
              </label>
              <input
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="S/N grabado o etiqueta de fábrica..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Photo Section: Auto-suggest or real upload */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Foto de la Pieza (Referencial o Captura Real de Almacén):
            </span>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition font-bold border border-slate-200 shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    Subir Foto Real
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setFotoUrl(getAutoReferenceImage(descripcion, marca))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition font-bold border border-slate-200 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Auto-asignar Foto Referencial
                  </button>
                </div>

                <input
                  type="text"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="O pegue una URL de imagen..."
                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Metrological Calibration & Official PDF Certificate Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiereCalibracion}
                  onChange={(e) => setRequiereCalibracion(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4"
                />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  Requiere Calibración Metrológica Periódica (Torquímetro / Vernier / Manómetro)
                </span>
              </label>
              {requiereCalibracion && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                  ISO/IEC 17025
                </span>
              )}
            </div>

            {requiereCalibracion && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                {/* PDF Certificate Upload Field */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Certificado de Calibración Oficial del Proveedor/Laboratorio (PDF Original):
                    </span>
                    {certificadoPdfUrl ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PDF Cargado
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Pendiente</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition font-bold text-xs shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      {certificadoPdfUrl ? 'Reemplazar Certificado PDF' : 'Subir Archivo PDF Oficial (.pdf)'}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>

                    {certificadoPdfUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCertificadoPdfUrl('');
                          setPdfFileName('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition font-bold text-xs"
                        title="Quitar PDF adjunto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar
                      </button>
                    )}

                    {pdfFileName && (
                      <span className="text-xs font-mono text-slate-600 truncate max-w-[220px]">
                        📄 {pdfFileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Fields: Number, Issuer, Cal Date, Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Número de Certificado:
                    </label>
                    <input
                      type="text"
                      value={numeroCertificado}
                      onChange={(e) => setNumeroCertificado(e.target.value)}
                      placeholder="Ej: CERT-2026-0891, CL-2025-4491..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Entidad / Laboratorio Calibrador:
                    </label>
                    <input
                      type="text"
                      value={entidadCertificadora}
                      onChange={(e) => setEntidadCertificadora(e.target.value)}
                      placeholder="INACAL, SGS, Metrología del Sur..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Fecha de Calibración:
                    </label>
                    <input
                      type="date"
                      value={fechaCalibracion}
                      onChange={(e) => setFechaCalibracion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Fecha de Vencimiento: *
                    </label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      required={requiereCalibracion}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-rose-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-bold block mb-1">
                      Tolerancia Máxima / Error Permisible:
                    </label>
                    <input
                      type="text"
                      value={toleranciaError}
                      onChange={(e) => setToleranciaError(e.target.value)}
                      placeholder="± 4% horario, ± 0.02 mm..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Condition and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 font-bold block mb-1">Estado Físico:</label>
              <select
                value={condicionFisica}
                onChange={(e) => setCondicionFisica(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="operativo">Operativo (100% Conforme)</option>
                <option value="desgaste">Con Desgaste Aceptable</option>
                <option value="fisurado">Fisurado / Roto (Bloqueado)</option>
                <option value="en_mantenimiento">En Mantenimiento / Calibración</option>
              </select>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Disponibilidad en Pañol:</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as AssetStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="disponible">Disponible para Préstamo</option>
                <option value="prestado">En Campo (Prestado)</option>
                <option value="mantenimiento">Mantenimiento / Taller</option>
                <option value="baja">Dado de Baja</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-700 font-bold block mb-1">Notas / Instrucciones de Seguridad:</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Calibración anual requerida, almacenar siempre en valor mínimo, etc."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition"
            >
              Guardar Activo Físico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
