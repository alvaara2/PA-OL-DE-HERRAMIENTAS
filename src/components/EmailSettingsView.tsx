import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  Save, 
  Send, 
  AlertCircle,
  Key,
  Info,
  Server,
  Download,
  Upload,
  Database,
  FolderArchive,
  RotateCcw,
  AlertTriangle,
  FileJson,
  Trash2
} from 'lucide-react';
import { 
  EmailSettings, 
  PhysicalAsset, 
  LoanDispatch, 
  Technician, 
  StorekeeperProfile, 
  KardexEntry 
} from '../types/workshop';
import { 
  sendRealEmail, 
  getStoredResendApiKey, 
  saveStoredResendApiKey,
  getStoredResendSender,
  saveStoredResendSender
} from '../utils/realEmailService';
import { 
  exportManualCheckpointJSON,
  exportFullBackupJSON, 
  parseFullBackupJSON, 
  FullBackupPayload 
} from '../utils/indexedDBStorage';

interface EmailSettingsViewProps {
  settings: EmailSettings;
  onSaveSettings: (updated: EmailSettings) => void;
  activeDispatches?: LoanDispatch[];
  calibratedAssets?: PhysicalAsset[];
  storekeeperName?: string;
  assets?: PhysicalAsset[];
  technicians?: Technician[];
  dispatches?: LoanDispatch[];
  storekeepers?: StorekeeperProfile[];
  kardex?: KardexEntry[];
  onRestoreFullBackup?: (backupData: FullBackupPayload) => void;
  onOpenBulkDelete?: () => void;
}

export const EmailSettingsView: React.FC<EmailSettingsViewProps> = ({
  settings,
  onSaveSettings,
  assets = [],
  technicians = [],
  dispatches = [],
  storekeepers = [],
  kardex = [],
  onRestoreFullBackup,
  onOpenBulkDelete,
}) => {
  // Resend API Key & Sender configuration
  const [resendApiKey, setResendApiKey] = useState(
    settings.resendApiKey || getStoredResendApiKey() || ''
  );
  const [resendSender, setResendSender] = useState(
    'onboarding@resend.dev'
  );

  // Optional SMTP / Gmail credentials
  const [remitenteGmail, setRemitenteGmail] = useState(settings.remitente || '');
  const [passwordApp, setPasswordApp] = useState(settings.passwordApp || '');

  // 4 Destinatarios fijos de almacén
  const [destinatario1, setDestinatario1] = useState(
    settings.destinatario1 || settings.destinatarios?.[0] || 'supervisor.taller@empresa.com'
  );
  const [destinatario2, setDestinatario2] = useState(
    settings.destinatario2 || settings.destinatarios?.[1] || 'jefe.almacen@empresa.com'
  );
  const [destinatario3, setDestinatario3] = useState(
    settings.destinatario3 || settings.destinatarios?.[2] || 'seguridad.calidad@empresa.com'
  );
  const [destinatario4, setDestinatario4] = useState(
    settings.destinatario4 || settings.destinatarios?.[3] || 'archivo.panol@empresa.com'
  );

  // Status feedback states
  const [testEmailRecipient, setTestEmailRecipient] = useState('alvaara2@gmail.com');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Backup & Restore states
  const [pendingRestoreBackup, setPendingRestoreBackup] = useState<FullBackupPayload | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!resendApiKey) {
      const stored = getStoredResendApiKey();
      if (stored) setResendApiKey(stored);
    }
  }, []);

  // Save full configuration
  const handleSaveConfiguration = (e: React.FormEvent) => {
    e.preventDefault();

    // Persist API key in localStorage
    saveStoredResendApiKey(resendApiKey.trim());
    saveStoredResendSender('onboarding@resend.dev');

    const fixedList = [destinatario1, destinatario2, destinatario3, destinatario4]
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && d.includes('@'));

    const updated: EmailSettings = {
      ...settings,
      resendApiKey: resendApiKey.trim(),
      resendSender: 'onboarding@resend.dev',
      remitente: remitenteGmail.trim(),
      passwordApp: passwordApp.trim(),
      destinatario1: destinatario1.trim(),
      destinatario2: destinatario2.trim(),
      destinatario3: destinatario3.trim(),
      destinatario4: destinatario4.trim(),
      destinatarios: fixedList.length > 0 ? fixedList : ['supervisor.taller@empresa.com'],
      ultimoMensaje: 'Configuración guardada.',
    };

    onSaveSettings(updated);
    setStatusMessage({
      text: '✓ Configuración de envíos y 4 destinatarios fijos guardados correctamente.',
      isError: false,
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Real test email dispatch directly to https://api.resend.com/emails (no local proxy routes)
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);

    const toEmail = testEmailRecipient.trim() || 'alvaara2@gmail.com';
    const apiKey = resendApiKey.trim() || getStoredResendApiKey();

    if (!apiKey) {
      setStatusMessage({
        text: 'Falta la API Key de Resend. Ingrésela en la casilla (ej. re_xxxxxxxx) y guarde.',
        isError: true,
      });
      setIsSendingTest(false);
      return;
    }

    try {
      const subject = `[PRUEBA ALMACÉN] Verificación Directa Resend - ${new Date().toLocaleTimeString('es-PE')}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; border: 2px solid #2563eb; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a; margin-top: 0;">✓ Prueba de Envío Real (Resend API Directa)</h2>
          <p style="font-size: 14px; color: #334155;">
            Este es un correo 100% real despachado directamente hacia la API oficial de Resend (https://api.resend.com/emails) usando el remitente oficial <strong>onboarding@resend.dev</strong> sin intermediarios locales.
          </p>
          <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
            <strong>Detalles del envío:</strong><br/>
            • Destinatario: <strong>${toEmail}</strong><br/>
            • Remitente: <strong>onboarding@resend.dev</strong><br/>
            • Fecha y hora: <strong>${new Date().toLocaleString('es-PE')}</strong><br/>
          </div>
          <p style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">4 Destinatarios fijos configurados en pañol:</p>
          <ul style="font-size: 13px; color: #475569; margin-top: 0;">
            <li>Supervisor / Taller: ${destinatario1}</li>
            <li>Jefe de Almacén: ${destinatario2}</li>
            <li>Seguridad / Calidad: ${destinatario3}</li>
            <li>Archivo de Pañol: ${destinatario4}</li>
          </ul>
        </div>
      `;

      // Petición DIRECTA a la API oficial de Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          from: 'Almacen Central <onboarding@resend.dev>',
          to: [toEmail], // Debe ser alvaara2@gmail.com en pruebas
          subject: subject,
          html: htmlContent
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }

      // Mostrar éxito: "Correo enviado con éxito. ID: " + data.id
      setStatusMessage({
        text: "Correo enviado con éxito. ID: " + data.id,
        isError: false,
      });
    } catch (err: unknown) {
      // Mostrar el ERROR REAL devuelto por el servidor
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        text: msg,
        isError: true,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Aliases for accessibility
  const testEmail = handleSendTestEmail;
  const handleSendEmail = handleSendTestEmail;

  // Backup Download Handler
  const handleDownloadFullBackup = () => {
    try {
      const filename = exportManualCheckpointJSON({
        storekeepers,
        technicians,
        assets,
        dispatches,
        kardex,
        emailSettings: settings,
      });
      setStatusMessage({
        text: `✅ Checkpoint descargado en su dispositivo (${filename})`,
        isError: false,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        text: `Error al generar el checkpoint: ${msg}`,
        isError: true,
      });
    }
  };

  // Restore File Selection Handler
  const handleSelectRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const backupPayload = await parseFullBackupJSON(file);
      setPendingRestoreBackup(backupPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Archivo no válido.';
      alert(`Error al leer archivo de respaldo: ${msg}`);
    } finally {
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
    }
  };

  // Confirm Full Restore
  const handleConfirmRestore = () => {
    if (!pendingRestoreBackup) return;

    if (onRestoreFullBackup) {
      onRestoreFullBackup(pendingRestoreBackup);
      setStatusMessage({
        text: '✅ Sistema restaurado con éxito desde el archivo JSON',
        isError: false,
      });
      setPendingRestoreBackup(null);
      setTimeout(() => setStatusMessage(null), 6000);
    } else {
      alert('Función de restauración global no disponible.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Ajustes de Correo & Envíos 100% Reales</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure la API Key de Resend o credenciales de correo para despacho serverless sin simulaciones.
          </p>
        </div>

        {/* Real Test Email Button */}
        <button
          type="button"
          onClick={handleSendTestEmail}
          disabled={isSendingTest}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-60 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>{isSendingTest ? 'Enviando...' : 'Enviar Correo de Prueba Ahora'}</span>
        </button>
      </div>

      {/* Real Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border shadow-xs transition flex items-center gap-3 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span className="leading-relaxed flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveConfiguration} className="space-y-6">
        {/* Section 1: Configuración de Envíos (Resend API Key & Sender) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Configuración de Envíos (API de Resend / Vercel Serverless)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Despacho directo y confiable mediante la API oficial de Resend (recomendado para Vercel).
              </p>
            </div>
            <span className="text-[11px] bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-200">
              API SERVERLESS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo 1: Resend API Key */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  API Key de Resend (o variable RESEND_API_KEY)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ej. re_12345678...</span>
              </label>
              <input
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-400 transition"
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400 shrink-0" />
                Obtenga su clave gratuita en <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">resend.com</a>. También puede definirla como variable de entorno <code>RESEND_API_KEY</code> en Vercel.
              </p>
            </div>

            {/* Campo 2: Remitente de Resend */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Remitente Autorizado</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  Default: onboarding@resend.dev
                </span>
              </label>
              <input
                type="text"
                value={resendSender}
                onChange={(e) => setResendSender(e.target.value)}
                placeholder="Almacen Central <onboarding@resend.dev>"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Opcional: Credenciales SMTP de Gmail / Nodemailer */}
          <details className="pt-2 border-t border-slate-100 text-xs">
            <summary className="font-bold text-slate-600 cursor-pointer hover:text-slate-900 flex items-center gap-2 select-none py-1">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>Alternativa opcional: Enviar mediante Gmail SMTP (Nodemailer)</span>
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Mi Correo Gmail</label>
                <input
                  type="email"
                  value={remitenteGmail}
                  onChange={(e) => setRemitenteGmail(e.target.value)}
                  placeholder="tu_correo@gmail.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Contraseña de Aplicación (16 dígitos)</label>
                <input
                  type="password"
                  value={passwordApp}
                  onChange={(e) => setPasswordApp(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Section 2: 4 Destinatarios Fijos para Notificaciones de Almacén */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>4 Destinatarios Fijos para Notificaciones de Almacén</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Estos 4 correos recibirán simultáneamente cada alerta por herramienta retenida (&gt; 24h).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Correo 1: Supervisor / Jefe de Taller */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Correo 1 (Supervisor / Jefe de Taller)</span>
                <span className="text-[10px] text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Fijo 1
                </span>
              </label>
              <input
                type="email"
                value={destinatario1}
                onChange={(e) => setDestinatario1(e.target.value)}
                placeholder="supervisor.taller@empresa.com"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-400 transition"
                required
              />
            </div>

            {/* Correo 2: Jefe de Almacén */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Correo 2 (Jefe de Almacén)</span>
                <span className="text-[10px] text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Fijo 2
                </span>
              </label>
              <input
                type="email"
                value={destinatario2}
                onChange={(e) => setDestinatario2(e.target.value)}
                placeholder="jefe.almacen@empresa.com"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 transition"
                required
              />
            </div>

            {/* Correo 3: Seguridad / Calidad */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Correo 3 (Seguridad / Calidad)</span>
                <span className="text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Fijo 3
                </span>
              </label>
              <input
                type="email"
                value={destinatario3}
                onChange={(e) => setDestinatario3(e.target.value)}
                placeholder="seguridad.calidad@empresa.com"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-400 transition"
                required
              />
            </div>

            {/* Correo 4: Copia Almacén / Archivo */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Correo 4 (Copia Almacén / Archivo)</span>
                <span className="text-[10px] text-slate-700 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Fijo 4
                </span>
              </label>
              <input
                type="email"
                value={destinatario4}
                onChange={(e) => setDestinatario4(e.target.value)}
                placeholder="archivo.panol@empresa.com"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-slate-400 transition"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Guardar Configuración de Envíos</span>
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Sistema de Respaldo y Base de Datos JSON (Backup & Restore) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Ajustes / Base de Datos y Copias de Seguridad (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Garantice que la información nunca se pierda: descargue o restaure en 1 clic el estado completo del pañol.
            </p>
          </div>
          <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> BASE DE DATOS SEGURA
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Botón A: Crear Checkpoint Manual (.JSON) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Crear Checkpoint Manual (.JSON)</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compila en un solo archivo <strong>checkpoint_almacen_YYYY-MM-DD_HHmm.json</strong> todo el estado actual del almacén: encargados con firmas en Base64, personal, herramientas con códigos y certificados PDF embebidos, préstamos y kardex.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>💾 Crear Checkpoint Manual (Descargar .JSON)</span>
            </button>
          </div>

          {/* Botón B: Restaurar desde Checkpoint (.JSON) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm mb-1">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restaurar desde Checkpoint (.JSON)</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seleccione un archivo <strong>.json</strong> previo para validar y reemplazar el estado global al instante, refrescando todas las tablas y pantallas.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                <span>📂 Restaurar desde Checkpoint (.JSON)</span>
              </button>
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json"
                onChange={handleSelectRestoreFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Centro de Borrado en General y Purga */}
        {onOpenBulkDelete && (
          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Menú de Borrado en General & Purga Masiva</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed max-w-xl">
                Depure o vacíe registros en masa: herramientas por condición, técnicos sin pendientes, vales cerrados, auditoría Kardex o reinicio total con respaldo automático.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBulkDelete}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Abrir Menú de Borrado Masivo</span>
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Full Restore */}
      {pendingRestoreBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Restauración de Checkpoint
                </h3>
                <p className="text-xs text-slate-500">
                  Operación de reemplazo de base de datos
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-amber-50 border border-amber-200 p-3.5 rounded-xl font-medium">
              ¿Desea restaurar este checkpoint? Se reemplazará el estado actual por el guardado con fecha <strong>{new Date(pendingRestoreBackup.fechaBackup).toLocaleString('es-PE')}</strong>.
            </p>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
              <div>• Herramientas a restaurar: <strong>{pendingRestoreBackup.herramientas?.length || 0}</strong></div>
              <div>• Trabajadores técnicos: <strong>{pendingRestoreBackup.trabajadores?.length || 0}</strong></div>
              <div>• Préstamos / Vales: <strong>{pendingRestoreBackup.prestamos?.length || 0}</strong></div>
              <div>• Encargados con firma: <strong>{pendingRestoreBackup.encargados?.length || 0}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingRestoreBackup(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                Confirmar y Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
