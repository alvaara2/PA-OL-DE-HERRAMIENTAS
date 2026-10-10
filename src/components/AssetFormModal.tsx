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
  Trash2,
  Hash,
  RotateCw,
  Binary
} from 'lucide-react';
import { PhysicalAsset, AssetCategory, AssetCondition, AssetStatus, CalibrationData } from '../types/workshop';
import { 
  generateUniquePhysicalCode, 
  generateRandomToolDni,
  detectCategory, 
  extractDrive, 
  extractMeasurement, 
  suggestLocation 
} from '../utils/assetCoder';
import { getAutoReferenceImage } from '../utils/imageCatalog';
import { compressToolImage } from '../utils/imageCompressor';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: PhysicalAsset) => void;
  assetToEdit?: PhysicalAsset | null;
  existingCodes: string[];
  existingDnis?: (string | undefined)[];
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assetToEdit,
  existingCodes,
  existingDnis = [],
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
  const [dniNumerico, setDniNumerico] = useState<string>(() => {
    if (assetToEdit?.dniNumerico && /^\d{8}$/.test(assetToEdit.dniNumerico)) {
      return assetToEdit.dniNumerico;
    }
    return generateRandomToolDni(existingDnis);
  });
  const [condicionFisica, setCondicionFisica] = useState<AssetCondition>(assetToEdit?.condicionFisica || 'operativo');
  const [estado, setEstado] = useState<AssetStatus>(assetToEdit?.estado || 'disponible');
  const [fotoUrl, setFotoUrl] = useState<string>(assetToEdit?.fotoUrl || '');
  const [notas, setNotas] = useState(assetToEdit?.notas || '');

  // Regenerate random 8-digit tool DNI
  const handleRegenerateDni = () => {
    const newDni = generateRandomToolDni(existingDnis);
    setDniNumerico(newDni);
  };

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

  // Photo compression states
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    width: number;
    height: number;
    originalKb?: number;
    compressedKb: number;
  } | null>(null);
  const [compressionError, setCompressionError] = useState<string | null>(null);

  // Handle file photo upload with HTML Canvas automatic compression (Max 600px, JPEG 70%)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    setCompressionError(null);

    try {
      // Compress and resize using HTML canvas: max width 600px, JPEG quality 0.7 (70%)
      const result = await compressToolImage(file, 600, 0.7);
      setFotoUrl(result.dataUrl);
      setCompressionInfo({
        width: result.width,
        height: result.height,
        originalKb: result.originalSizeKb,
        compressedKb: result.compressedSizeKb,
      });
    } catch (err) {
      console.error('Error al comprimir imagen de herramienta:', err);
      setCompressionError('No se pudo procesar la imagen seleccionada. Intente con otro archivo JPG o PNG.');
    } finally {
      setIsCompressingPhoto(false);
      // Reset input value so user can upload the same file again if desired
      e.target.value = '';
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoActivoFisico.trim() || !descripcion.trim()) {
      alert('El código físico y la descripción técnica son requeridos.');
      return;
    }

    // Safety check: If fotoUrl is an uncompressed base64 data URL (e.g. pasted directly), compress it to max 600px, JPEG 70%
    let finalPhoto = fotoUrl.trim();
    if (finalPhoto.startsWith('data:image/')) {
      try {
        const comp = await compressToolImage(finalPhoto, 600, 0.7);
        finalPhoto = comp.dataUrl;
      } catch (e) {
        console.warn('No se pudo recomprimir dataURL antes de guardar, usando original:', e);
      }
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

    const finalDni = (dniNumerico || '').trim();
    const validDni = /^\d{8}$/.test(finalDni) ? finalDni : generateRandomToolDni(existingDnis);

    const assetData: PhysicalAsset = {
      id: assetToEdit?.id || `asset-${Date.now()}`,
      codigoActivoFisico: codigoActivoFisico.trim().toUpperCase(),
      codigoMnemotecnico: codigoActivoFisico.trim().toUpperCase(),
      dniNumerico: validDni,
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
      fotoUrl: finalPhoto || getAutoReferenceImage(descripcion, marca),
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
                {assetToEdit ? 'Editar Ficha de Equipo / Activo Físico' : 'Plaquetear / Registrar Nueva Herramienta o Dado'}
              </h3>
              <p className="text-xs text-slate-500">
                Doble codificación industrial (Código en Texto + DNI 8 dígitos) y ubicación en pañol
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
          {/* Dual Coding Banner: Texto + DNI 8 Dígitos */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-slate-50 to-blue-50 border border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-amber-600" />
                Sistema Oficial de Doble Codificación
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Buscable por ambos códigos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Código Texto Automático */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    1. Código en Texto (Mnemotécnico):
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Automático
                  </span>
                </div>
                <input
                  type="text"
                  value={codigoActivoFisico}
                  onChange={(e) => setCodigoActivoFisico(e.target.value.toUpperCase())}
                  className="font-mono text-sm sm:text-base font-black text-slate-900 bg-transparent border-b border-amber-400 focus:outline-none focus:border-amber-600 w-full"
                  placeholder="Ej: PIST-ED-001 o DAD-IMP-1/2-17MM-001"
                  required
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Placa alfanumérica imprimible en QR
                </span>
              </div>

              {/* 2. DNI Numérico Aleatorio Único de 8 Dígitos */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-blue-600" /> 2. DNI Numérico (8 Dígitos):
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateDni}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition cursor-pointer"
                    title="Generar otro DNI aleatorio de 8 dígitos único"
                  >
                    <RotateCw className="w-2.5 h-2.5" />
                    Aleatorio
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={8}
                  value={dniNumerico}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setDniNumerico(onlyDigits);
                  }}
                  className="font-mono text-sm sm:text-base font-black text-blue-900 bg-transparent border-b border-blue-400 focus:outline-none focus:border-blue-600 w-full tracking-wider"
                  placeholder="Ej: 84920173"
                  required
                />
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Identificador numérico único para escáner y teclado
                </span>
              </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition font-bold border border-slate-200 shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    {isCompressingPhoto ? 'Comprimiendo...' : 'Subir Foto Real'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isCompressingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setFotoUrl(getAutoReferenceImage(descripcion, marca));
                      setCompressionInfo(null);
                      setCompressionError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition font-bold border border-slate-200 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Auto-asignar Foto Referencial
                  </button>

                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoUrl('');
                        setCompressionInfo(null);
                        setCompressionError(null);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-rose-600 text-xs transition"
                      title="Quitar foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Quitar
                    </button>
                  )}
                </div>

                {/* Compression Status Indicators */}
                {isCompressingPhoto && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-bold animate-pulse">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Optimizando foto con Canvas HTML (máx. 600px ancho, JPEG 70%)...</span>
                  </div>
                )}

                {compressionInfo && (
                  <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      ✓ Imagen comprimida: {compressionInfo.width}×{compressionInfo.height}px • JPEG 70% ({compressionInfo.compressedKb} KB
                      {compressionInfo.originalKb ? ` • antes ${compressionInfo.originalKb} KB` : ''})
                    </span>
                  </div>
                )}

                {compressionError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold">
                    {compressionError}
                  </div>
                )}

                <input
                  type="text"
                  value={fotoUrl}
                  onChange={(e) => {
                    setFotoUrl(e.target.value);
                    setCompressionInfo(null);
                  }}
                  placeholder="O pegue una URL de imagen..."
                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  Las fotos se redimensionan automáticamente a máx. 600px (JPEG 70%) para no saturar la memoria local del navegador.
                </span>
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
