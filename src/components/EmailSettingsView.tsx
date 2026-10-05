import React, { useState, useEffect } from 'react';
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
  Server
} from 'lucide-react';
import { EmailSettings, PhysicalAsset, LoanDispatch } from '../types/workshop';
import { 
  sendRealEmail, 
  getStoredResendApiKey, 
  saveStoredResendApiKey,
  getStoredResendSender,
  saveStoredResendSender
} from '../utils/realEmailService';

interface EmailSettingsViewProps {
  settings: EmailSettings;
  onSaveSettings: (updated: EmailSettings) => void;
  activeDispatches?: LoanDispatch[];
  calibratedAssets?: PhysicalAsset[];
  storekeeperName?: string;
}

export const EmailSettingsView: React.FC<EmailSettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  // Resend API Key & Sender configuration
  const [resendApiKey, setResendApiKey] = useState(
    settings.resendApiKey || getStoredResendApiKey() || ''
  );
  const [resendSender, setResendSender] = useState(
    settings.resendSender || getStoredResendSender() || 'Almacen Central <onboarding@resend.dev>'
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
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

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
    saveStoredResendSender(resendSender.trim());

    const fixedList = [destinatario1, destinatario2, destinatario3, destinatario4]
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && d.includes('@'));

    const updated: EmailSettings = {
      ...settings,
      resendApiKey: resendApiKey.trim(),
      resendSender: resendSender.trim(),
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

  // Real test email dispatch via POST /api/send-email
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);

    const fixedList = [destinatario1, destinatario2, destinatario3, destinatario4]
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && d.includes('@'));

    const activeRecipients = fixedList.length > 0 ? fixedList : ['supervisor.taller@empresa.com'];

    try {
      const currentConfig: EmailSettings = {
        ...settings,
        resendApiKey: resendApiKey.trim(),
        resendSender: resendSender.trim(),
        remitente: remitenteGmail.trim(),
        passwordApp: passwordApp.trim(),
      };

      // Real fetch call to /api/send-email
      const result = await sendRealEmail({
        to: activeRecipients,
        subject: `[PRUEBA REAL] Verificación de Envío de Almacén - ${new Date().toLocaleTimeString('es-PE')}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; border: 2px solid #2563eb; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a8a; margin-top: 0;">✓ Prueba de Envío Real de Almacén</h2>
            <p style="font-size: 14px; color: #334155;">
              Este es un correo 100% real despachado por el backend de la aplicación para validar la conexión con los servidores de correo.
            </p>
            <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
              <strong>Detalles de configuración activa:</strong><br/>
              • Proveedor: ${resendApiKey.trim() ? 'Resend API (Serverless)' : 'Nodemailer SMTP/Gmail'}<br/>
              • Remitente: ${resendSender.trim() || remitenteGmail.trim()}<br/>
              • Fecha y hora: ${new Date().toLocaleString('es-PE')}<br/>
            </div>
            <p style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">4 Destinatarios fijos configurados:</p>
            <ul style="font-size: 13px; color: #475569; margin-top: 0;">
              <li>Supervisor / Taller: ${destinatario1}</li>
              <li>Jefe de Almacén: ${destinatario2}</li>
              <li>Seguridad / Calidad: ${destinatario3}</li>
              <li>Archivo de Pañol: ${destinatario4}</li>
            </ul>
          </div>
        `,
        settings: currentConfig,
      });

      // Only show success if server returned 200 OK
      setStatusMessage({
        text: `✓ ${result.message}`,
        isError: false,
      });
    } catch (err: unknown) {
      // Show EXACT real server error returned
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        text: msg,
        isError: true,
      });
    } finally {
      setIsSendingTest(false);
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
          <span>{isSendingTest ? 'Contactando Servidor de Correo...' : 'Enviar Correo de Prueba Ahora'}</span>
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
    </div>
  );
};
