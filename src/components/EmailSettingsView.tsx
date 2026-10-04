import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  LogOut, 
  Save, 
  Sparkles,
  ExternalLink,
  Send,
  AlertCircle
} from 'lucide-react';
import { EmailSettings, PhysicalAsset, LoanDispatch } from '../types/workshop';
import { 
  getStoredOAuthSession, 
  connectWithGoogle, 
  connectWithMicrosoft, 
  clearOAuthSession, 
  OAuthSession,
  sendEmailThroughOAuth
} from '../utils/oauthService';

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
  // OAuth session state
  const [oauthSession, setOauthSession] = useState<OAuthSession | null>(null);
  const [isConnecting, setIsConnecting] = useState<'google' | 'microsoft' | null>(null);

  // 4 Destinatarios fijos de almacén
  const [destinatario1, setDestinatario1] = useState(
    settings.destinatario1 || settings.destinatarios[0] || 'supervisor.taller@empresa.com'
  );
  const [destinatario2, setDestinatario2] = useState(
    settings.destinatario2 || settings.destinatarios[1] || 'jefe.almacen@empresa.com'
  );
  const [destinatario3, setDestinatario3] = useState(
    settings.destinatario3 || settings.destinatarios[2] || 'seguridad.calidad@empresa.com'
  );
  const [destinatario4, setDestinatario4] = useState(
    settings.destinatario4 || settings.destinatarios[3] || 'archivo.panol@empresa.com'
  );

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const existing = getStoredOAuthSession();
    if (existing) {
      setOauthSession(existing);
    }
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnecting('google');
    setStatusMessage(null);
    try {
      const session = await connectWithGoogle(settings.remitente || 'alvaara2@gmail.com');
      setOauthSession(session);
      setStatusMessage({
        text: `✓ Conectado exitosamente con Google Workspace como ${session.email}`,
        isError: false,
      });
      // Sync sender email into settings
      const updated: EmailSettings = {
        ...settings,
        remitente: session.email,
        servidor: 'gmail',
      };
      onSaveSettings(updated);
    } catch (e) {
      setStatusMessage({
        text: 'Error al conectar con la cuenta de Google.',
        isError: true,
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleConnectMicrosoft = async () => {
    setIsConnecting('microsoft');
    setStatusMessage(null);
    try {
      const session = await connectWithMicrosoft('almacen.panol@outlook.com');
      setOauthSession(session);
      setStatusMessage({
        text: `✓ Conectado exitosamente con Microsoft 365 como ${session.email}`,
        isError: false,
      });
      const updated: EmailSettings = {
        ...settings,
        remitente: session.email,
        servidor: 'outlook',
      };
      onSaveSettings(updated);
    } catch (e) {
      setStatusMessage({
        text: 'Error al conectar con la cuenta de Microsoft.',
        isError: true,
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = () => {
    clearOAuthSession();
    setOauthSession(null);
    setStatusMessage({
      text: 'Sesión de correo cerrada. Conecte una cuenta para habilitar el envío de alertas.',
      isError: false,
    });
  };

  const handleSaveRecipients = (e: React.FormEvent) => {
    e.preventDefault();

    const fixedList = [destinatario1, destinatario2, destinatario3, destinatario4]
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && d.includes('@'));

    const updated: EmailSettings = {
      ...settings,
      remitente: oauthSession ? oauthSession.email : settings.remitente,
      destinatario1: destinatario1.trim(),
      destinatario2: destinatario2.trim(),
      destinatario3: destinatario3.trim(),
      destinatario4: destinatario4.trim(),
      destinatarios: fixedList.length > 0 ? fixedList : ['supervisor.taller@empresa.com'],
      ultimoMensaje: 'Destinatarios fijos guardados.',
    };

    onSaveSettings(updated);
    setStatusMessage({
      text: '✓ 4 Destinatarios fijos de almacén guardados correctamente.',
      isError: false,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSendTestEmail = async () => {
    if (!oauthSession) {
      setStatusMessage({
        text: 'Debe conectar su cuenta de Google o Microsoft primero antes de enviar correos de prueba.',
        isError: true,
      });
      return;
    }

    setIsSendingTest(true);
    setStatusMessage(null);

    const fixedList = [destinatario1, destinatario2, destinatario3, destinatario4]
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && d.includes('@'));

    try {
      const result = await sendEmailThroughOAuth(oauthSession, {
        recipients: fixedList.length > 0 ? fixedList : ['supervisor.taller@empresa.com'],
        subject: `[TEST] Verificación de Envío OAuth - ${new Date().toLocaleTimeString('es-PE')}`,
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px;">
            <h3 style="color: #0f172a; margin-top: 0;">✓ Autenticación OAuth Validada</h3>
            <p>Este correo confirma que la cuenta <strong>${oauthSession.email}</strong> está conectada mediante token oficial (${oauthSession.provider === 'google' ? 'Google OAuth2' : 'Microsoft MSAL'}).</p>
            <p><strong>Destinatarios fijos de almacén:</strong></p>
            <ul>
              <li>Supervisor: ${destinatario1}</li>
              <li>Jefe de Almacén: ${destinatario2}</li>
              <li>Seguridad: ${destinatario3}</li>
              <li>Archivo: ${destinatario4}</li>
            </ul>
          </div>
        `,
      });

      setStatusMessage({
        text: result.message,
        isError: !result.success,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al enviar';
      setStatusMessage({
        text: `Error de envío: ${msg}`,
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
            <span>Ajustes de Notificaciones & Envío de Alertas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Conecte su cuenta de correo con OAuth2 oficial en un solo clic y configure los 4 destinatarios fijos de supervisión de almacén.
          </p>
        </div>

        {oauthSession && (
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={isSendingTest}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>{isSendingTest ? 'Enviando Prueba...' : 'Enviar Correo de Prueba'}</span>
          </button>
        )}
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold text-center border shadow-xs transition flex items-center justify-center gap-2 ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Section 1: Inicio de Sesión Real con Google / Microsoft (OAuth) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Conexión de Cuenta de Correo (OAuth2)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sin contraseñas manuales ni puertos SMTP. La aplicación utiliza tokens de sesión seguros listos para Vercel.
            </p>
          </div>

          {oauthSession && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Sesión Activa
            </span>
          )}
        </div>

        {/* State: Connected vs Not Connected */}
        {oauthSession ? (
          <div className="p-5 bg-emerald-50/70 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center shadow-xs text-emerald-600 font-bold shrink-0">
                {oauthSession.provider === 'google' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.78-2.1-6.73-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.03 3.15c.95-2.84 3.61-4.99 6.73-4.99z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                    <path fill="#7fba00" d="M13 1h10v10H13z"/>
                    <path fill="#ffb900" d="M13 13h10v10H13z"/>
                  </svg>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-sm font-black text-slate-900">
                    Conectado como: <strong className="text-emerald-800 font-mono">{oauthSession.email}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proveedor: <strong className="text-slate-800">{oauthSession.provider === 'google' ? 'Google (Gmail)' : 'Microsoft (Hotmail/Outlook)'}</strong> • Token autorizado y vigente
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Cerrar sesión / Cambiar cuenta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Seleccione su proveedor de correo institucional o personal para iniciar sesión con un solo clic:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Botón 1: Google (Gmail) */}
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnecting !== null}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-left transition shadow-xs flex items-center gap-4 group cursor-pointer disabled:opacity-60"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.78-2.1-6.73-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.03 3.15c.95-2.84 3.61-4.99 6.73-4.99z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                    Conectar cuenta de Google (Gmail)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isConnecting === 'google' ? 'Conectando con Google...' : 'Acceso seguro OAuth2 de un solo clic'}
                  </p>
                </div>
              </button>

              {/* Botón 2: Microsoft (Hotmail / Outlook) */}
              <button
                type="button"
                onClick={handleConnectMicrosoft}
                disabled={isConnecting !== null}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 text-left transition shadow-xs flex items-center gap-4 group cursor-pointer disabled:opacity-60"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                    <path fill="#7fba00" d="M13 1h10v10H13z"/>
                    <path fill="#ffb900" d="M13 13h10v10H13z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800">
                    Conectar cuenta de Microsoft (Outlook)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isConnecting === 'microsoft' ? 'Conectando con Microsoft...' : 'Hotmail, Live y cuentas Microsoft 365'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: 4 Destinatarios Fijos para Notificaciones de Almacén */}
      <form onSubmit={handleSaveRecipients} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>4 Destinatarios Fijos para Notificaciones de Almacén</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estos 4 correos recibirán automáticamente copia de cada alerta emitida por herramientas retenidas (&gt; 24h) y calibraciones.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Correo 1: Supervisor / Jefe de Taller */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Correo 1 (Supervisor / Jefe de Taller)</span>
              <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
              <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition active:scale-98"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar 4 Destinatarios Fijos</span>
          </button>
        </div>
      </form>
    </div>
  );
};
