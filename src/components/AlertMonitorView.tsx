import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  FileText, 
  User, 
  Search, 
  Camera,
  Layers,
  Mail,
  Send,
  Check
} from 'lucide-react';
import { 
  LoanDispatch, 
  PhysicalAsset, 
  LoanItem, 
  StorekeeperProfile, 
  Technician, 
  EmailSettings, 
  TimeAlertInfo 
} from '../types/workshop';
import { calculateLoanAlert } from '../utils/timeAlerts';
import { sendEmailWithTimeout } from '../utils/emailService';
import { 
  getStoredOAuthSession, 
  connectWithGoogle, 
  connectWithMicrosoft, 
  sendEmailThroughOAuth, 
  OAuthSession 
} from '../utils/oauthService';
import { ReturnModal } from './ReturnModal';
import { ReceiptModal } from './ReceiptModal';
import { QrScannerModal } from './QrScannerModal';

interface AlertMonitorViewProps {
  dispatches: LoanDispatch[];
  allAssets: PhysicalAsset[];
  technicians?: Technician[];
  emailSettings?: EmailSettings;
  activeStorekeeper?: StorekeeperProfile;
  onConfirmReturn: (
    dispatchId: string,
    updatedItems: LoanItem[],
    receiverName: string,
    receiverSignatureBase64: string,
    notes?: string
  ) => void;
  onOpenQuickDispatch: () => void;
}

export const AlertMonitorView: React.FC<AlertMonitorViewProps> = ({
  dispatches,
  allAssets,
  technicians = [],
  emailSettings,
  activeStorekeeper,
  onConfirmReturn,
  onOpenQuickDispatch,
}) => {
  // Live tick to keep elapsed times fresh
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterState, setFilterState] = useState<'all' | 'vencido' | 'por_vencer' | 'normal'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [monitorToast, setMonitorToast] = useState<string | null>(null);

  // Email alert states
  const [isSendingEmailId, setIsSendingEmailId] = useState<string | null>(null);
  const [alertSuccessMessage, setAlertSuccessMessage] = useState<string | null>(null);
  const [alertErrorMessage, setAlertErrorMessage] = useState<string | null>(null);

  // Selected dispatch for modal
  const [activeReturnDispatch, setActiveReturnDispatch] = useState<LoanDispatch | null>(null);
  const [activeReceiptDispatch, setActiveReceiptDispatch] = useState<LoanDispatch | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // OAuth Modal state for alerts when not logged in
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [pendingAlertData, setPendingAlertData] = useState<{ dispatch: LoanDispatch; alert: TimeAlertInfo } | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<'google' | 'microsoft' | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000); // Re-calculate every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter only active loans (not fully completed)
  const activeDispatches = dispatches.filter(
    (d) => d.items.some((it) => !it.retornado)
  );

  // Calculate alerts for all active
  const analyzedDispatches = activeDispatches.map((d) => {
    const alert = calculateLoanAlert(d.fechaPrestamo, currentTime);
    return {
      dispatch: d,
      alert,
    };
  });

  const totalInField = analyzedDispatches.length;
  const overdueCount = analyzedDispatches.filter((x) => x.alert.estadoSemaforo === 'vencido').length;
  const warningCount = analyzedDispatches.filter((x) => x.alert.estadoSemaforo === 'por_vencer').length;
  const normalCount = analyzedDispatches.filter((x) => x.alert.estadoSemaforo === 'normal').length;

  // Filter list
  const filteredList = analyzedDispatches.filter(({ dispatch, alert }) => {
    if (filterState !== 'all' && alert.estadoSemaforo !== filterState) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTech = dispatch.tecnicoNombre.toLowerCase().includes(q);
      const matchDni = dispatch.tecnicoDni.includes(q);
      const matchVale = dispatch.codigoVale.toLowerCase().includes(q);
      const matchItem = dispatch.items.some(
        (it) =>
          it.codigoActivoFisico.toLowerCase().includes(q) ||
          it.descripcion.toLowerCase().includes(q)
      );
      return matchTech || matchDni || matchVale || matchItem;
    }
    return true;
  });

  // Handle scanned QR in monitor
  const handleScannerResult = (code: string) => {
    const upperCode = code.toUpperCase();
    const matched = activeDispatches.find((d) =>
      d.items.some((it) => !it.retornado && it.codigoActivoFisico.toUpperCase() === upperCode)
    );

    if (matched) {
      setActiveReturnDispatch(matched);
    } else {
      setMonitorToast(`⚠️ No se encontró un préstamo activo en campo con el código [${code}].`);
      setTimeout(() => setMonitorToast(null), 4500);
    }
  };

  // Core function to dispatch email alert once OAuth session is verified
  const dispatchOverdueEmail = async (
    session: OAuthSession,
    dispatch: LoanDispatch,
    alert: TimeAlertInfo
  ) => {
    setIsSendingEmailId(dispatch.id);
    setAlertSuccessMessage(null);
    setAlertErrorMessage(null);

    try {
      // 1. Identify technician personal email from their file
      const matchedTech = technicians.find((t) => t.dni === dispatch.tecnicoDni);
      const personalEmail =
        matchedTech?.correo?.trim() ||
        `${dispatch.tecnicoNombre.toLowerCase().replace(/[^a-z0-9]/g, '.')}@empresa.com`;

      // 2. Fixed 4 recipients configured in email settings
      const d1 = emailSettings?.destinatario1 || emailSettings?.destinatarios?.[0] || 'supervisor.taller@empresa.com';
      const d2 = emailSettings?.destinatario2 || emailSettings?.destinatarios?.[1] || 'jefe.almacen@empresa.com';
      const d3 = emailSettings?.destinatario3 || emailSettings?.destinatarios?.[2] || 'seguridad.calidad@empresa.com';
      const d4 = emailSettings?.destinatario4 || emailSettings?.destinatarios?.[3] || 'archivo.panol@empresa.com';

      const fixedSupervisors = [d1, d2, d3, d4].filter(Boolean);

      // 3. Combined 5 recipients: 4 fixed supervisors + 1 personal email of technician
      const allRecipients = Array.from(new Set([...fixedSupervisors, personalEmail]));

      // 4. Tool/die details
      const unreturned = dispatch.items.filter((it) => !it.retornado);
      const toolCodes = unreturned.map((it) => it.codigoActivoFisico).join(', ');
      const toolNames = unreturned.map((it) => `${it.codigoActivoFisico} - ${it.descripcion}`).join(' / ');

      // 5. Subject
      const subject = `🚨 URGENTE: Retención de Herramienta Vencida (> 24h) - [${toolCodes}]`;

      // 6. Formal Body HTML
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 19px; letter-spacing: -0.5px;">🚨 NOTIFICACIÓN URGENTE: RETENCIÓN DE HERRAMIENTA (> 24H)</h2>
            <p style="margin: 5px 0 0; font-size: 12px;">Control de Pañol, Trazabilidad Física y Seguridad Industrial</p>
          </div>
          <div style="padding: 24px; color: #0f172a; background-color: #ffffff;">
            <p style="font-size: 14px; margin-top: 0;">Estimado(a) <strong>${dispatch.tecnicoNombre}</strong>,</p>
            <p style="font-size: 13px; line-height: 1.5; color: #334155;">
              El sistema de control de herramientas y dados registra que el siguiente material despachado bajo su responsabilidad <strong>ha superado el límite permitido de 24 horas continuas de uso en campo</strong>:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 35%;">Trabajador Responsable:</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${dispatch.tecnicoNombre} (DNI: ${dispatch.tecnicoDni})</td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">Correo Personal:</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${personalEmail}</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">Herramienta(s) Retenida(s):</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #b45309;">
                  ${unreturned.map((u) => `<div>• <strong>${u.codigoActivoFisico}</strong>: ${u.descripcion} (Ubicación: ${u.ubicacion})</div>`).join('')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">Fecha y Hora de Retiro:</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${new Date(dispatch.fechaPrestamo).toLocaleString('es-PE')} (Vale: ${dispatch.codigoVale})</td>
              </tr>
              <tr style="background-color: #fef2f2;">
                <td style="padding: 8px 10px; border: 1px solid #fecaca; font-weight: bold; color: #991b1b;">Horas de Sobretiempo Acumuladas:</td>
                <td style="padding: 8px 10px; border: 1px solid #fecaca; font-weight: bold; color: #991b1b;">+${alert.horasSobretiempo.toFixed(1)} horas de retraso</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: bold;">Área / Labor:</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${dispatch.ordenTrabajo} (${dispatch.tecnicoArea})</td>
              </tr>
            </table>

            <div style="background-color: #fff1f2; border: 2px solid #fda4af; border-radius: 10px; padding: 14px; margin: 18px 0; color: #9f1239; font-weight: bold; text-align: center; font-size: 13px;">
              ⚠️ INDICACIÓN CLARA: Sírvase apersonarse de manera INMEDIATA al pañol/almacén central para la recepción conforme e inspección de este activo.
            </div>

            <p style="font-size: 11px; color: #64748b; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
              Notificación oficial despachada a través de ${session.provider === 'google' ? 'Google Workspace' : 'Microsoft 365'} (${session.email}).<br/>
              Destinatarios en copia (${allRecipients.length}): ${allRecipients.join(', ')}.<br/>
              Encargado de Pañol en Turno: <strong>${activeStorekeeper?.nombreCompleto || 'Pañolero'}</strong>.
            </p>
          </div>
        </div>
      `;

      // 7. Send through OAuth
      const result = await sendEmailThroughOAuth(session, {
        recipients: allRecipients,
        subject,
        bodyHtml,
      });

      if (result.success) {
        setAlertSuccessMessage(`Alerta enviada con éxito a ${allRecipients.length} destinatarios`);
      } else {
        // Fallback with timeout protection
        await sendEmailWithTimeout(
          {
            remitente: session.email,
            passwordApp: '',
            destinatarios: allRecipients,
          },
          subject,
          bodyHtml
        );
        setAlertSuccessMessage(`Alerta enviada con éxito a ${allRecipients.length} destinatarios`);
      }
      setTimeout(() => setAlertSuccessMessage(null), 6000);
    } catch (err: unknown) {
      console.warn('Error sending alert email', err);
      const msg = err instanceof Error ? err.message : 'Error al despachar el correo';
      setAlertErrorMessage(`No se pudo enviar el correo de alerta: ${msg}`);
      setTimeout(() => setAlertErrorMessage(null), 5000);
    } finally {
      setIsSendingEmailId(null);
    }
  };

  // Step 1: Check if OAuth email account is connected before sending
  const handleSendOverdueEmail = async (dispatch: LoanDispatch, alert: TimeAlertInfo) => {
    const session = getStoredOAuthSession();
    if (!session) {
      // Open modal requesting Google / Microsoft sign-in
      setPendingAlertData({ dispatch, alert });
      setIsOAuthModalOpen(true);
      return;
    }

    // Account connected: proceed to send
    await dispatchOverdueEmail(session, dispatch, alert);
  };

  // Handle OAuth connection from modal
  const handleConnectAndSend = async (provider: 'google' | 'microsoft') => {
    setIsConnectingOAuth(provider);
    try {
      let session: OAuthSession;
      if (provider === 'google') {
        session = await connectWithGoogle(emailSettings?.remitente || 'alvaara2@gmail.com');
      } else {
        session = await connectWithMicrosoft('almacen.panol@outlook.com');
      }

      setIsOAuthModalOpen(false);

      if (pendingAlertData) {
        const { dispatch, alert } = pendingAlertData;
        setPendingAlertData(null);
        await dispatchOverdueEmail(session, dispatch, alert);
      }
    } catch (e) {
      alert('Error al conectar con la cuenta de correo. Intente nuevamente.');
    } finally {
      setIsConnectingOAuth(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {alertSuccessMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 font-bold text-xs rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{alertSuccessMessage}</span>
          </div>
          <button
            onClick={() => setAlertSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {alertErrorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 text-rose-900 font-bold text-xs rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{alertErrorMessage}</span>
          </div>
          <button
            onClick={() => setAlertErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {monitorToast && (
        <div className="p-3 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md text-center">
          {monitorToast}
        </div>
      )}
      {/* Top Banner & KPI Traffic-Light Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Field */}
        <div
          onClick={() => setFilterState('all')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            filterState === 'all'
              ? 'bg-white border-amber-500 ring-2 ring-amber-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total en Campo</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 font-mono">{totalInField}</p>
          <p className="text-[11px] text-slate-500 mt-1">Vales activos con herramientas fuera</p>
        </div>

        {/* KPI 2: Overdue > 24H (Red Semáforo) */}
        <div
          onClick={() => setFilterState('vencido')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            overdueCount > 0 ? 'animate-overdue-alert' : ''
          } ${
            filterState === 'vencido'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/30'
              : 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
              Vencidos &gt; 24 Horas
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-950 mt-2 font-mono">{overdueCount}</p>
          <p className="text-[11px] text-rose-700 mt-1 font-semibold">
            {overdueCount > 0 ? '¡Requiere retorno urgente al pañol!' : 'Sin retrasos críticos'}
          </p>
        </div>

        {/* KPI 3: Warning 18-24H (Yellow Semáforo) */}
        <div
          onClick={() => setFilterState('por_vencer')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            filterState === 'por_vencer'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/20'
              : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Por Vencer (18 a 24 h)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-950 mt-2 font-mono">{warningCount}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">Alerta preventiva de turno</p>
        </div>

        {/* KPI 4: Normal < 18H (Green Semáforo) */}
        <div
          onClick={() => setFilterState('normal')}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            filterState === 'normal'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/20'
              : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              En Tiempo (&lt; 18 h)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-950 mt-2 font-mono">{normalCount}</p>
          <p className="text-[11px] text-emerald-700 mt-1">Custodia en tiempo reglamentario</p>
        </div>
      </div>

      {/* Action and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por DNI, Técnico, Vale o Código Físico..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            Escanear QR de Retorno
          </button>

          <button
            onClick={onOpenQuickDispatch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition"
          >
            + Nuevo Despacho
          </button>
        </div>
      </div>

      {/* Dispatches List */}
      <div className="space-y-4">
        {filteredList.map(({ dispatch, alert }) => {
          const isOverdue = alert.estadoSemaforo === 'vencido';
          const isWarning = alert.estadoSemaforo === 'por_vencer';
          const unreturnedItems = dispatch.items.filter((it) => !it.retornado);

          return (
            <div
              key={dispatch.id}
              className={`rounded-2xl border p-5 transition shadow-sm relative overflow-hidden ${
                isOverdue
                  ? 'bg-rose-50/70 border-2 border-rose-400 ring-2 ring-rose-500/20 shadow-md'
                  : isWarning
                  ? 'bg-white border-amber-300 ring-1 ring-amber-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Overdue Glow Stripe */}
              {isOverdue && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500" />
              )}

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Dispatch metadata & Technician */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800">
                      {dispatch.codigoVale}
                    </span>

                    {/* Semáforo Badge */}
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                        🔴 VENCIDO: {alert.textoRetraso}
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        🟡 POR VENCER: {alert.textoRetraso}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        🟢 EN TIEMPO REGULAR
                      </span>
                    )}

                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {alert.textoTiempo}
                    </span>
                  </div>

                  {/* Technician & Labor details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>{dispatch.tecnicoNombre}</span>
                    </div>
                    <span className="text-slate-500">
                      DNI: <strong className="text-slate-800 font-mono">{dispatch.tecnicoDni}</strong>
                    </span>
                    <span className="text-slate-500">• {dispatch.tecnicoArea}</span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <span className="text-slate-400 font-medium">Labor:</span> {dispatch.ordenTrabajo}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                  {/* Botón destacado de Alerta de Correo cuando está vencido (> 24h) */}
                  {isOverdue && (
                    <button
                      type="button"
                      onClick={() => handleSendOverdueEmail(dispatch, alert)}
                      disabled={isSendingEmailId === dispatch.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md shadow-rose-600/30 transition disabled:opacity-50 shrink-0"
                      title="Enviar correo formal de sobretiempo al trabajador y a los 4 supervisores"
                    >
                      <Mail className="w-4 h-4 stroke-[2.5]" />
                      <span>{isSendingEmailId === dispatch.id ? 'Enviando Alerta...' : '✉️ Enviar Correo de Alerta'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveReceiptDispatch(dispatch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Acta & Firmas
                  </button>

                  <button
                    onClick={() => setActiveReturnDispatch(dispatch)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Recepción y Retorno
                  </button>
                </div>
              </div>

              {/* Items chips in field */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Piezas tangibles pendientes de retorno ({unreturnedItems.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {dispatch.items.map((item) => (
                    <div
                      key={item.assetId}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                        item.retornado
                          ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                          : isOverdue
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="font-mono font-bold text-amber-700">
                        {item.codigoActivoFisico}
                      </span>
                      <span className="truncate max-w-[200px] font-medium">{item.descripcion}</span>
                      {item.retornado ? (
                        <span className="text-[10px] text-emerald-700 font-bold ml-1">✓ Devuelto</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">📍 {item.ubicacion}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
            <h4 className="text-base font-bold text-slate-900">No hay vales activos en este estado</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Todas las herramientas correspondientes se encuentran actualmente devueltas al pañol.
            </p>
          </div>
        )}
      </div>

      {/* Return Modal */}
      <ReturnModal
        isOpen={!!activeReturnDispatch}
        onClose={() => setActiveReturnDispatch(null)}
        dispatch={activeReturnDispatch}
        allAssets={allAssets}
        activeStorekeeper={activeStorekeeper}
        onConfirmReturn={onConfirmReturn}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptDispatch}
        onClose={() => setActiveReceiptDispatch(null)}
        dispatch={activeReceiptDispatch}
      />

      {/* QR Scanner for direct return */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannerResult}
        title="Escanear QR para Devolución Inmediata"
        subtitle="Acerque la placa QR de la pieza física que el técnico está entregando."
        suggestedCodes={activeDispatches.flatMap((d) =>
          d.items.filter((it) => !it.retornado).map((it) => it.codigoActivoFisico)
        )}
      />

      {/* OAuth Connect Modal when user clicks Send Alert without active session */}
      {isOAuthModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    Conectar Cuenta de Correo (OAuth2)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Autenticación oficial de un solo clic sin contraseñas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOAuthModalOpen(false);
                  setPendingAlertData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">
                Para enviar la alerta por herramienta retenida (&gt; 24h), conecte su cuenta:
              </p>
              <p className="text-[11px] text-slate-500">
                Se enviará automáticamente a los <strong>4 supervisores fijos</strong> y al <strong>correo personal del técnico</strong> responsable.
              </p>
            </div>

            <div className="space-y-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleConnectAndSend('google')}
                disabled={isConnectingOAuth !== null}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-left transition shadow-xs flex items-center gap-3.5 cursor-pointer disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.78-2.1-6.73-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.99 0 12s.45 3.84 1.24 5.41l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.03 3.15c.95-2.84 3.61-4.99 6.73-4.99z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Conectar cuenta de Google (Gmail)</div>
                  <div className="text-[11px] text-slate-500">
                    {isConnectingOAuth === 'google' ? 'Conectando y despachando...' : 'Iniciar con Google Workspace'}
                  </div>
                </div>
              </button>

              {/* Microsoft Button */}
              <button
                type="button"
                onClick={() => handleConnectAndSend('microsoft')}
                disabled={isConnectingOAuth !== null}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/50 text-left transition shadow-xs flex items-center gap-3.5 cursor-pointer disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                    <path fill="#7fba00" d="M13 1h10v10H13z"/>
                    <path fill="#ffb900" d="M13 13h10v10H13z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Conectar cuenta de Microsoft (Outlook)</div>
                  <div className="text-[11px] text-slate-500">
                    {isConnectingOAuth === 'microsoft' ? 'Conectando y despachando...' : 'Hotmail, Live y Microsoft 365'}
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOAuthModalOpen(false);
                  setPendingAlertData(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
