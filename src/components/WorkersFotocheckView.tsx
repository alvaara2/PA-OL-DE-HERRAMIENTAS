import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  QrCode, 
  Printer, 
  Phone, 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  X,
  Camera,
  Check,
  Download
} from 'lucide-react';
import { Technician } from '../types/workshop';
import { getCachedQrDataUrl } from '../utils/qrHelper';
import * as XLSX from 'xlsx';

interface WorkersFotocheckViewProps {
  technicians: Technician[];
  onAddTechnician: (tech: Technician) => void;
  onUpdateTechnician: (tech: Technician) => void;
  onDeleteTechnician: (id: string) => void;
}

export const WorkersFotocheckView: React.FC<WorkersFotocheckViewProps> = ({
  technicians,
  onAddTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cargoFilter, setCargoFilter] = useState('all');

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Form fields
  const [dni, setDni] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cargo, setCargo] = useState('Mecánico Diésel');
  const [area, setArea] = useState('Bahía 02 - Mantenimiento');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');

  // Fotocheck badge preview modal
  const [badgeTech, setBadgeTech] = useState<Technician | null>(null);
  const [badgeQrDataUrl, setBadgeQrDataUrl] = useState<string>('');
  const [printAllBadges, setPrintAllBadges] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (badgeTech) {
      getCachedQrDataUrl(badgeTech.dni).then((url) => {
        setBadgeQrDataUrl(url);
      });
    }
  }, [badgeTech]);

  // Pre-generate QRs when printing all badges
  useEffect(() => {
    if (printAllBadges) {
      const loadAll = async () => {
        const map: Record<string, string> = {};
        for (const t of technicians) {
          map[t.dni] = await getCachedQrDataUrl(t.dni);
        }
        setQrMap(map);
      };
      loadAll();
    }
  }, [printAllBadges, technicians]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) setFotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreate = () => {
    setEditingTech(null);
    setDni('');
    setNombreCompleto('');
    setCargo('Mecánico Diésel');
    setArea('Bahía Central');
    setCelular('');
    setCorreo('');
    setFotoUrl('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tech: Technician) => {
    setEditingTech(tech);
    setDni(tech.dni);
    setNombreCompleto(tech.nombreCompleto);
    setCargo(tech.cargo);
    setArea(tech.area);
    setCelular(tech.celular || '');
    setCorreo(tech.correo || '');
    setFotoUrl(tech.fotoUrl || '');
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim() || !nombreCompleto.trim()) {
      alert('DNI y Nombres Completos son obligatorios.');
      return;
    }

    if (editingTech) {
      const updated: Technician = {
        ...editingTech,
        dni: dni.trim(),
        nombreCompleto: nombreCompleto.trim(),
        cargo: cargo.trim(),
        area: area.trim(),
        celular: celular.trim() || undefined,
        correo: correo.trim() || undefined,
        fotoUrl: fotoUrl.trim() || undefined,
      };
      onUpdateTechnician(updated);
    } else {
      const created: Technician = {
        id: `tech-${Date.now()}`,
        dni: dni.trim(),
        nombreCompleto: nombreCompleto.trim(),
        cargo: cargo.trim(),
        area: area.trim(),
        celular: celular.trim() || undefined,
        correo: correo.trim() || undefined,
        fotoUrl: fotoUrl.trim() || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        activo: true,
        fechaRegistro: new Date().toISOString().split('T')[0],
      };
      onAddTechnician(created);
    }

    setIsFormOpen(false);
  };

  // Filtered list
  const filteredTechnicians = technicians.filter((t) => {
    if (cargoFilter !== 'all' && !t.cargo.toLowerCase().includes(cargoFilter.toLowerCase())) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.dni.includes(q) ||
        t.nombreCompleto.toLowerCase().includes(q) ||
        t.area.toLowerCase().includes(q) ||
        t.cargo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportExcel = () => {
    const data = filteredTechnicians.map((t, idx) => ({
      '#': idx + 1,
      'DNI': t.dni,
      'NOMBRES_APELLIDOS': t.nombreCompleto,
      'CARGO': t.cargo,
      'AREA': t.area,
      'CELULAR': t.celular || '-',
      'CORREO': t.correo || '-',
      'FECHA_REGISTRO': t.fechaRegistro || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personal_Tecnico');
    XLSX.writeFile(wb, `FOTOCHECKS_PERSONAL_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Gestión de Personal Técnico y Fotochecks QR</span>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {technicians.length} Registrados
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generador de credenciales carnet con QR para lectura instantánea en despachos de pañol.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setPrintAllBadges(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <Printer className="w-4 h-4 text-amber-600" />
            Imprimir Hoja de Fotochecks
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar Excel
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Registrar Trabajador
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por DNI, Nombre, Cargo o Bahía..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Cargo:</span>
          {['all', 'Mecánico', 'Electricista', 'Soldador', 'Lubricador'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCargoFilter(cat)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                cargoFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Workers Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechnicians.map((tech) => (
          <div
            key={tech.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {tech.fotoUrl ? (
                      <img src={tech.fotoUrl} alt={tech.nombreCompleto} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                        {tech.nombreCompleto.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {tech.nombreCompleto}
                    </h3>
                    <p className="text-xs font-mono font-bold text-blue-700 mt-0.5">
                      DNI: {tech.dni}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setBadgeTech(tech)}
                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition shrink-0"
                  title="Generar Carnet Fotocheck QR"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{tech.cargo}</span>
                </p>
                <p className="text-slate-500 pl-5 text-[11px]">
                  📍 {tech.area}
                </p>
                {tech.celular && (
                  <p className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{tech.celular}</span>
                  </p>
                )}
                {tech.correo && (
                  <p className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tech.correo}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(tech)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                  title="Editar datos"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar al trabajador ${tech.nombreCompleto}?`)) {
                      onDeleteTechnician(tech.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setBadgeTech(tech)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition border border-slate-200"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                Ver Fotocheck
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Worker Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingTech ? 'Editar Ficha del Trabajador' : 'Registrar Nuevo Técnico / Operador'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">DNI del Trabajador: *</label>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="8 dígitos (ej: 45892301)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Celular / Teléfono:</label>
                  <input
                    type="text"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="+51 987 654 321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Nombres y Apellidos Completos: *</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez Huamán"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Cargo / Especialidad:</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Mecánico Diésel, Soldador, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Área / Bahía Habitual:</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Bahía 02, Taller Palas, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="usuario@tallerindustrial.pe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Foto para el Fotocheck:</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition">
                      <Camera className="w-3.5 h-3.5 text-amber-600" />
                      Tomar Foto / Subir Archivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="O pegue URL de imagen..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs"
                >
                  Guardar Trabajador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Fotocheck Carnet Preview Modal */}
      {badgeTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900">
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fotocheck de Acceso a Pañol
                </h3>
                <p className="text-xs text-slate-500">
                  Credencial carnet con QR de lectura rápida para despachos.
                </p>
              </div>
              <button
                onClick={() => setBadgeTech(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable ID Carnet Card (CR80 standard ratio) */}
            <div
              id="printable-single-carnet"
              className="w-full max-w-sm mx-auto bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl border-2 border-amber-500/40 relative overflow-hidden"
              style={{ minHeight: '230px' }}
            >
              {/* Header */}
              <div className="border-b border-slate-700 pb-2.5 mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    PAÑOL CENTRAL • TALLER INDUSTRIAL
                  </h4>
                  <p className="text-[8.5px] text-slate-400 uppercase font-mono">
                    CREDENCIAL DE CONTROL DE HERRAMIENTAS
                  </p>
                </div>
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  P
                </div>
              </div>

              {/* Body: Photo + Info + Large QR */}
              <div className="flex items-center gap-3.5">
                {/* Photo */}
                <div className="w-20 h-24 rounded-xl border-2 border-amber-500/60 overflow-hidden bg-slate-950 shrink-0 shadow-md">
                  {badgeTech.fotoUrl ? (
                    <img src={badgeTech.fotoUrl} alt={badgeTech.nombreCompleto} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">
                      {badgeTech.nombreCompleto.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white leading-tight uppercase line-clamp-2">
                    {badgeTech.nombreCompleto}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                    DNI: {badgeTech.dni}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-300 mt-0.5">
                    {badgeTech.cargo}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate">
                    {badgeTech.area}
                  </p>
                </div>

                {/* Large QR Code */}
                <div className="w-20 h-20 bg-white p-1 rounded-xl shrink-0 shadow-md flex items-center justify-center">
                  {badgeQrDataUrl ? (
                    <img src={badgeQrDataUrl} alt={badgeTech.dni} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-[9px] text-slate-500">QR...</div>
                  )}
                </div>
              </div>

              {/* Bottom Security Band */}
              <div className="mt-3 pt-2 border-t border-slate-700/80 flex items-center justify-between text-[8px] font-mono text-slate-400">
                <span>VIGENCIA: 2026-2027</span>
                <span>AUTORIZADO PARA CUSTODIA</span>
              </div>
            </div>

            {/* Actions */}
            <div className="no-print mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setBadgeTech(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Credencial Carnet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Printable Badges Sheet Modal */}
      {printAllBadges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 flex flex-col max-h-[92vh]">
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hoja Completa de Credenciales / Fotochecks QR ({technicians.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Listo para imprimir en cartulina o mica carnet tamaño A4.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Hoja A4
                </button>
                <button
                  onClick={() => setPrintAllBadges(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl">
              {technicians.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 text-white rounded-2xl p-4 border border-amber-500/40 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                      {t.fotoUrl ? (
                        <img src={t.fotoUrl} alt={t.nombreCompleto} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                          {t.nombreCompleto.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-amber-400 block uppercase font-bold">
                        PAÑOL CENTRAL
                      </span>
                      <p className="text-xs font-bold text-white line-clamp-1">{t.nombreCompleto}</p>
                      <p className="text-[11px] font-mono font-bold text-blue-400">DNI: {t.dni}</p>
                      <p className="text-[10px] text-slate-300">{t.cargo}</p>
                      <p className="text-[9px] text-slate-400">{t.area}</p>
                    </div>
                  </div>

                  <div className="w-16 h-16 bg-white p-1 rounded-xl shrink-0">
                    {qrMap[t.dni] ? (
                      <img src={qrMap[t.dni]} alt={t.dni} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-[8px] text-slate-400">QR</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
