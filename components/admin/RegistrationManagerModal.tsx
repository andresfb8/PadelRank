import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  Download,
  Share2,
  Copy,
  QrCode,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Shirt,
  MoonStar,
  MessageCircle,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  subscribeToRegistrations,
  updateTournamentRegistration,
  deleteTournamentRegistration,
  createTournamentRegistration,
  batchApproveRegistrations,
  updateRanking
} from '../../services/db';
import { Ranking, TournamentRegistration } from '../../types';
import type { DaySchedule } from '../../services/scheduler/types';
import { BlockedTimesPicker } from '../registration/BlockedTimesPicker';
import { pairLabel } from '../scheduler/pairLabel';
import {
  clipToDays,
  effectiveBlockedRanges,
  notesWithSummary,
  registrationNote,
  sortDays,
  summarize
} from '../../services/registration/blockedTimes';
import { applyRegistrationBlocks, generateDivisionsFromRegistrations, importRegistrations, isImported } from '../../services/registration/syncRegistration';

interface RegistrationManagerModalProps {
  ranking: Ranking;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRanking: (updated: Ranking) => void;
  /** Opens "Disponibilidad" so the admin can configure the tournament days. */
  onConfigureDays?: () => void;
}

export const RegistrationManagerModal: React.FC<RegistrationManagerModalProps> = ({
  ranking,
  isOpen,
  onClose,
  onUpdateRanking,
  onConfigureDays
}) => {
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'waitlist'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState<TournamentRegistration | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [manualBlocked, setManualBlocked] = useState<DaySchedule[]>([]);
  const [editingBlocks, setEditingBlocks] = useState<DaySchedule[]>([]);
  const [savingBlocks, setSavingBlocks] = useState(false);

  const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);
  const hasDays = days.length > 0;
  /** Empty tournament created in registration mode: the bracket/schedule is generated from the approved registrations. */
  const hasNoBracket = ranking.divisions.length === 0;

  // Manual Form State
  const [manualData, setManualData] = useState({
    p1Name: '',
    p1Phone: '',
    p1Email: '',
    p1Shirt: 'M',
    p2Name: '',
    p2Phone: '',
    p2Email: '',
    p2Shirt: 'L',
    category: '',
    notes: '',
    status: 'approved' as const,
    paymentStatus: 'paid' as const
  });

  const availableCategories = ranking.registrationConfig?.categories?.length
    ? ranking.registrationConfig.categories
    : [
        '1ª Masculina',
        '2ª Masculina',
        '3ª Masculina',
        '1ª Femenina',
        '2ª Femenina',
        '3ª Femenina',
        'Mixto A',
        'Mixto B'
      ];

  const registrationUrl = `${window.location.origin}/?inscripcion=${ranking.id}`;

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = subscribeToRegistrations(ranking.id, (list) => {
      setRegistrations(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [ranking.id, isOpen]);

  if (!isOpen) return null;

  // Stats calculation
  const totalCount = registrations.length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;
  const waitlistCount = registrations.filter(r => r.status === 'waitlist').length;
  const paidCount = registrations.filter(r => r.paymentStatus === 'paid').length;

  const filteredRegistrations = registrations.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    const cat = r.assignedCategory || r.selectedCategory;
    if (filterCategory !== 'all' && cat !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchP1 = r.player1.name.toLowerCase().includes(q) || r.player1.phone.includes(q);
      const matchP2 = r.player2?.name.toLowerCase().includes(q) || r.player2?.phone.includes(q);
      return matchP1 || matchP2;
    }
    return true;
  });

  // Action handlers
  const handleStatusChange = async (regId: string, status: TournamentRegistration['status']) => {
    try {
      await updateTournamentRegistration(ranking.id, regId, { status });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCategoryChange = async (regId: string, newCategory: string) => {
    try {
      await updateTournamentRegistration(ranking.id, regId, { assignedCategory: newCategory });
    } catch (err) {
      console.error('Error changing category:', err);
    }
  };

  const handlePaymentToggle = async (reg: TournamentRegistration) => {
    const newStatus = reg.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await updateTournamentRegistration(ranking.id, reg.id, { paymentStatus: newStatus });
    } catch (err) {
      console.error('Error toggling payment:', err);
    }
  };

  const handleDelete = async (regId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta inscripción?')) return;
    try {
      await deleteTournamentRegistration(ranking.id, regId);
    } catch (err) {
      console.error('Error deleting registration:', err);
    }
  };

  const handleToggleRegistrationOpen = async () => {
    // Without tournament days there is no blocked-times grid: send the admin to configure them
    if (!hasDays) {
      onConfigureDays?.();
      return;
    }
    const isCurrentlyOpen = ranking.registrationConfig?.isOpen !== false;
    const updatedConfig = {
      ...ranking.registrationConfig,
      isOpen: !isCurrentlyOpen,
      categories: availableCategories
    };
    const updatedRanking: Ranking = {
      ...ranking,
      registrationConfig: updatedConfig
    };
    try {
      await updateRanking(updatedRanking);
      onUpdateRanking(updatedRanking);
    } catch (err) {
      console.error('Error updating registration config:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  /** WhatsApp one-click notice to the registered pair, wording depending on the current status. */
  const localizadorOf = (reg: TournamentRegistration) => (reg.localizador || reg.id.substring(0, 8)).toUpperCase();
  const waPhoneOf = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    return digits.length === 9 ? `34${digits}` : digits; // Spanish mobile without country prefix
  };
  const handleWhatsAppNotice = (reg: TournamentRegistration) => {
    const code = localizadorOf(reg);
    const cat = reg.assignedCategory || reg.selectedCategory;
    const pair = `${reg.player1.name}${reg.player2 ? ` y ${reg.player2.name}` : ''}`;
    const base = `Torneo: ${ranking.nombre}\nCategoría: ${cat}\nLocalizador: #${code}`;
    let msg: string;
    switch (reg.status) {
      case 'approved':
        msg = `✅ ¡Estáis DENTRO!\n\n${pair} ha quedado inscrito en ${ranking.nombre}.\nCategoría: ${cat}\nLocalizador: #${code}\n\nNos vemos en el torneo. ¡Un saludo!`;
        break;
      case 'waitlist':
        msg = `📋 Hola, seguimos con vuestra inscripción de ${pair} pero de momento estáis en lista de espera.\n\n${base}\n\nSi se libera un hueco, os llamamos sin falta.`;
        break;
      case 'rejected':
        msg = `Lamentamos comunicaros que la inscripción de ${pair} no ha sido admitida en esta edición.\n\n${base}\n\nEsperamos veros en las próximas, ¡gracias por inscribiros!`;
        break;
      default:
        msg = `👋 Hola, hemos recibido vuestra inscripción de ${pair} y está en revisión.\n\n${base}\n\nOs avisamos en cuanto esté aprobada.`;
    }
    window.open(`https://wa.me/${waPhoneOf(reg.player1.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = `🎾 ¡Inscripciones abiertas para el torneo "${ranking.nombre}"!\n\n📲 Inscríbete online en el siguiente enlace:\n${registrationUrl}\n\n¡Plazas limitadas!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.p1Name.trim() || !manualData.p1Phone.trim()) return;

    const cat = manualData.category || availableCategories[0];

    const readableSummary = notesWithSummary(summarize(manualBlocked, days), manualData.notes);

    const newReg: Omit<TournamentRegistration, 'id'> = {
      rankingId: ranking.id,
      ownerId: ranking.ownerId || '',
      player1: {
        name: manualData.p1Name.trim(),
        phone: manualData.p1Phone.trim(),
        email: manualData.p1Email.trim() || undefined,
        shirtSize: manualData.p1Shirt
      },
      player2: manualData.p2Name.trim() ? {
        name: manualData.p2Name.trim(),
        phone: manualData.p2Phone.trim(),
        email: manualData.p2Email.trim() || undefined,
        shirtSize: manualData.p2Shirt
      } : undefined,
      selectedCategory: cat,
      assignedCategory: cat,
      status: manualData.status,
      paymentStatus: manualData.paymentStatus,
      blockedRanges: manualBlocked,
      availabilityNotes: readableSummary,
      createdAt: new Date().toISOString()
    };

    try {
      await createTournamentRegistration(ranking.id, newReg);
      setShowManualModal(false);
      setManualData({
        p1Name: '',
        p1Phone: '',
        p1Email: '',
        p1Shirt: 'M',
        p2Name: '',
        p2Phone: '',
        p2Email: '',
        p2Shirt: 'L',
        category: '',
        notes: '',
        status: 'approved',
        paymentStatus: 'paid'
      });
      setManualBlocked([]);
    } catch (err) {
      console.error('Error creating manual registration:', err);
    }
  };

  // Import approved pairs into tournament guest players and divisions
  const handleImportApprovedToTournament = async () => {
    const approvedList = registrations.filter(r => r.status === 'approved');
    if (approvedList.length === 0) {
      alert('No hay inscripciones aprobadas para importar.');
      return;
    }

    setImporting(true);
    try {
      const updatedRanking = importRegistrations(ranking, approvedList);

      await updateRanking(updatedRanking);
      onUpdateRanking(updatedRanking);

      setImportSuccessMessage(
        `✅ ${approvedList.length} parejas aprobadas se han incorporado al torneo con sus restricciones horarias configuradas.`
      );
      setTimeout(() => setImportSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error importing registrations:', err);
      alert('Error al importar jugadores: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  /** Generates the tournament bracket/schedule from the approved registrations (empty tournaments). */
  const handleGenerateBracketFromRegistrations = async () => {
    const approvedList = registrations.filter(r => r.status === 'approved');
    if (approvedList.length < 2) {
      alert('Necesitas al menos 2 inscripciones aprobadas (ambos jugadores) para generar el torneo.');
      return;
    }

    setImporting(true);
    try {
      const updatedRanking = generateDivisionsFromRegistrations(ranking, approvedList);
      if (!updatedRanking) {
        alert('No hay suficientes parejas completas aprobadas (se necesitan al menos 2 con los dos jugadores).');
        return;
      }

      await updateRanking(updatedRanking);
      onUpdateRanking(updatedRanking);

      setImportSuccessMessage(
        `✅ Torneo generado con ${approvedList.length} parejas aprobadas y sus restricciones horarias. Revisa el cuadro/calendario en la vista del torneo.`
      );
      setTimeout(() => setImportSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Error generating the tournament from registrations:', err);
      alert('Error al generar el torneo: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleOpenBlocksEditor = (reg: TournamentRegistration) => {
    setSelectedReg(reg);
    setEditingBlocks(clipToDays(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days).kept);
  };

  /** Saves the blocks; an imported registration also updates the tournament and re-checks its conflicts. */
  const handleSaveBlocks = async () => {
    if (!selectedReg) return;
    const updatedReg: TournamentRegistration = {
      ...selectedReg,
      blockedRanges: editingBlocks,
      availabilityNotes: notesWithSummary(summarize(editingBlocks, days), registrationNote(selectedReg))
    };
    setSavingBlocks(true);
    try {
      await updateTournamentRegistration(ranking.id, selectedReg.id, {
        blockedRanges: updatedReg.blockedRanges,
        availabilityNotes: updatedReg.availabilityNotes
      });
    } catch (err) {
      console.error('Error saving blocked times:', err);
      alert('No se pudieron guardar los bloqueos. Inténtalo de nuevo.');
      setSavingBlocks(false);
      return;
    }
    try {
      if (isImported(ranking, updatedReg)) {
        const { ranking: updatedRanking, newConflicts } = applyRegistrationBlocks(ranking, updatedReg);
        await updateRanking(updatedRanking);
        onUpdateRanking(updatedRanking);
        if (newConflicts.length) {
          const players = Object.fromEntries((updatedRanking.guestPlayers ?? []).map(p => [p.id, p])) as any;
          const lines = newConflicts.flatMap(c => c.conflicts.map(x => `• ${pairLabel(x.pairKey, players)}: ${x.reason}`));
          alert(`Conflicto de horario en el siguiente partido:\n${lines.join('\n')}\n\nRevísalo en "Conflictos".`);
        }
      }
      setSelectedReg(null);
    } catch (err) {
      console.error('Error syncing blocked times to the tournament:', err);
      alert('Inscripción guardada, pero no se pudo actualizar el torneo. Vuelve a guardar para reintentarlo.');
    } finally {
      setSavingBlocks(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = registrations.map((r, idx) => ({
      '#': idx + 1,
      'ID Localizador': r.id.substring(0, 8).toUpperCase(),
      'Estado': r.status === 'approved' ? 'Aprobada' : r.status === 'pending' ? 'Pendiente' : r.status === 'waitlist' ? 'Lista Espera' : 'Rechazada',
      'Pago': r.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente',
      'Categoría Elegida': r.selectedCategory,
      'Categoría Asignada': r.assignedCategory || r.selectedCategory,
      'Jugador 1': r.player1.name,
      'Teléfono 1': r.player1.phone,
      'Talla 1': r.player1.shirtSize || '-',
      'Nivel 1': r.player1.level || '-',
      'Jugador 2': r.player2?.name || '-',
      'Teléfono 2': r.player2?.phone || '-',
      'Talla 2': r.player2?.shirtSize || '-',
      'Nivel 2': r.player2?.level || '-',
      'Restricciones Horarias': r.availabilityNotes || '-',
      'Fecha Registro': new Date(r.createdAt).toLocaleString('es-ES')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inscripciones');
    XLSX.writeFile(workbook, `Inscripciones_${ranking.nombre.replace(/\s+/g, '_')}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`Listado de Inscripciones - ${ranking.nombre}`, 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} • Total inscripciones: ${registrations.length} (${approvedCount} aprobadas)`, 14, 21);

    const tableRows = registrations.map((r, idx) => [
      idx + 1,
      r.assignedCategory || r.selectedCategory,
      r.player1.name,
      r.player1.phone,
      r.player1.shirtSize || '-',
      r.player2 ? r.player2.name : '-',
      r.player2 ? r.player2.phone : '-',
      r.player2?.shirtSize || '-',
      r.status === 'approved' ? 'Aprobada' : r.status === 'pending' ? 'Pendiente' : r.status === 'waitlist' ? 'Espera' : 'Rechazada',
      r.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente',
      r.availabilityNotes || '-'
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['#', 'Categoría', 'Jugador 1', 'Teléfono 1', 'Talla', 'Jugador 2', 'Teléfono 2', 'Talla', 'Estado', 'Pago', 'Disponibilidad']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 }
    });

    doc.save(`Inscripciones_${ranking.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  const isRegistrationOpen = hasDays && ranking.registrationConfig?.isOpen !== false;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1729]/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-rg-line rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-rg-line bg-white flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-rg-ink flex items-center gap-2">
                Gestión de Inscripciones
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-rg-muted border border-rg-line">
                  {ranking.nombre}
                </span>
              </h2>
              <p className="text-xs text-rg-muted">
                Revisa solicitudes, reasigna categorías por nivel y genera el cuadro con 1 clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleRegistrationOpen}
              title={hasDays ? undefined : 'Configura los días del torneo en «Disponibilidad»'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isRegistrationOpen
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border border-rose-500/30 text-[#C4242A] hover:bg-rose-500/20'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRegistrationOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
              {isRegistrationOpen ? 'Inscripciones Abiertas' : hasDays ? 'Inscripciones Cerradas' : 'Cerradas: faltan los días del torneo'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-rg-muted hover:text-rg-ink rounded-xl hover:bg-rg-raised transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Share Bar */}
        <div className="px-6 py-3.5 bg-rg-raised border-b border-rg-line flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          {/* Share Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rg-raised text-rg-ink font-semibold rounded-xl border border-rg-line transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {copySuccess ? '¡Enlace Copiado!' : 'Copiar Enlace'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 font-semibold rounded-xl border border-emerald-500/30 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartir WhatsApp
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rg-raised text-rg-ink font-semibold rounded-xl border border-rg-line transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              Código QR
            </button>

            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-rg-muted hover:text-rg-ink transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Formulario
            </a>
          </div>

          {/* Quick Operations */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Inscripción Manual
            </button>

            <button
              onClick={hasNoBracket ? handleGenerateBracketFromRegistrations : handleImportApprovedToTournament}
              disabled={importing || approvedCount < (hasNoBracket ? 2 : 1)}
              title={hasNoBracket
                ? 'Genera el cuadro o el calendario del torneo con las parejas aprobadas'
                : 'Añade las parejas aprobadas como invitados al torneo'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-md shadow-emerald-100"
            >
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : hasNoBracket ? <MoonStar className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {hasNoBracket
                ? ranking.format === 'elimination'
                  ? `Generar Cuadro con Aprobadas (${approvedCount})`
                  : ranking.format === 'hybrid'
                    ? `Generar Grupos con Aprobadas (${approvedCount})`
                    : `Generar Calendario con Aprobadas (${approvedCount})`
                : `Importar (${approvedCount}) al Torneo`}
            </button>

            <button
              onClick={handleExportExcel}
              title="Exportar a Excel"
              className="p-1.5 bg-white hover:bg-rg-raised text-rg-muted rounded-xl border border-rg-line transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={handleExportPDF}
              title="Exportar a PDF"
              className="p-1.5 bg-white hover:bg-rg-raised text-rg-muted rounded-xl border border-rg-line transition"
            >
              <FileText className="w-4 h-4 text-[#C4242A]" />
            </button>
          </div>
        </div>

        {importSuccessMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 text-xs font-medium flex items-center justify-between">
            <span>{importSuccessMessage}</span>
            <button onClick={() => setImportSuccessMessage(null)} className="text-rg-muted hover:text-rg-ink">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {hasNoBracket && (
          <div className="mx-6 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-xs leading-relaxed">
            <p className="font-semibold text-amber-600">Torneo sin cuadro/calendario todavía</p>
            <p className="mt-1 text-rg-muted">
              Este torneo se creó para llenarse con las inscripciones públicas. Aprueba las inscripciones que quieras y
              pulsa «Generar {ranking.format === 'elimination' ? 'Cuadro' : ranking.format === 'hybrid' ? 'Grupos' : 'Calendario'} con
              Aprobadas» — se crearán las divisiones y partidos respetando lo que no puedan jugar.
            </p>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 pb-2 flex-shrink-0">
          <div className="bg-rg-raised border border-rg-line rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-rg-muted">Total Inscritos</span>
            <p className="text-2xl font-black text-rg-ink mt-0.5">{totalCount}</p>
          </div>

          <div className="bg-rg-raised border border-amber-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-amber-600">Pendientes de Validar</span>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingCount}</p>
          </div>

          <div className="bg-rg-raised border border-emerald-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-emerald-600">Aprobadas</span>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{approvedCount}</p>
          </div>

          <div className="bg-rg-raised border border-blue-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-blue-400">Pagos Confirmados</span>
            <p className="text-2xl font-black text-blue-400 mt-0.5">{paidCount} / {totalCount}</p>
          </div>

          <div className="bg-rg-raised border border-rose-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-[#C4242A]">Rechazadas / Espera</span>
            <p className="text-2xl font-black text-rg-muted mt-0.5">{rejectedCount + waitlistCount}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-rg-line flex-shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: `Todos (${totalCount})` },
              { key: 'pending', label: `Pendientes (${pendingCount})` },
              { key: 'approved', label: `Aprobadas (${approvedCount})` },
              { key: 'waitlist', label: `Espera (${waitlistCount})` },
              { key: 'rejected', label: `Rechazadas (${rejectedCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterStatus === tab.key
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : 'text-rg-muted hover:text-rg-ink hover:bg-rg-raised'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-rg-line rounded-xl pl-8 pr-3 py-1.5 text-xs text-rg-ink placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-muted focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas las Categorías</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Registrations List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Cargando inscripciones...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 bg-rg-ground border border-rg-line rounded-2xl p-8 space-y-3">
              <Users className="w-10 h-10 text-rg-muted mx-auto" />
              <h3 className="text-base font-bold text-rg-muted">No hay inscripciones con los filtros seleccionados</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Comparte el enlace de inscripción para que las parejas se apunten o añade una manualmente.
              </p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const currentCategory = reg.assignedCategory || reg.selectedCategory;
              const isModifiedCategory = reg.assignedCategory && reg.assignedCategory !== reg.selectedCategory;

              return (
                <div
                  key={reg.id}
                  className={`bg-white border rounded-2xl p-4 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    reg.status === 'approved'
                      ? 'border-emerald-500/30 shadow-sm shadow-emerald-100'
                      : reg.status === 'pending'
                      ? 'border-amber-500/30'
                      : 'border-rg-line'
                  }`}
                >
                  {/* Left Column: Player & Contact Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        #{localizadorOf(reg)}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        reg.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : reg.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : reg.status === 'waitlist'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-rose-500/10 text-[#C4242A] border-rose-500/30'
                      }`}>
                        {reg.status === 'approved' ? 'Aprobada' : reg.status === 'pending' ? 'Pendiente' : reg.status === 'waitlist' ? 'Lista Espera' : 'Rechazada'}
                      </span>

                      {/* Payment Badge */}
                      <button
                        onClick={() => handlePaymentToggle(reg)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 transition ${
                          reg.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                            : 'bg-white text-rg-muted border-rg-line hover:bg-rg-raised'
                        }`}
                        title="Click para cambiar estado de pago"
                      >
                        <DollarSign className="w-3 h-3" />
                        {reg.paymentStatus === 'paid' ? 'Pagado' : 'Pago Pendiente'}
                      </button>

                      <span className="text-[11px] text-slate-500">
                        {new Date(reg.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Players Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {/* Jugador 1 */}
                      <div className="text-xs space-y-0.5">
                        <div className="font-bold text-rg-ink flex items-center gap-1.5">
                          <span>{reg.player1.name}</span>
                          {reg.player1.shirtSize && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-rg-muted">
                              Talla {reg.player1.shirtSize}
                            </span>
                          )}
                        </div>
                        <div className="text-rg-muted text-[11px] flex items-center gap-2">
                          <a href={`tel:${reg.player1.phone}`} className="hover:text-emerald-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" /> {reg.player1.phone}
                          </a>
                          {reg.player1.level && <span className="text-slate-500">({reg.player1.level})</span>}
                        </div>
                      </div>

                      {/* Jugador 2 */}
                      {reg.player2 ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-rg-ink flex items-center gap-1.5">
                            <span>{reg.player2.name}</span>
                            {reg.player2.shirtSize && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-rg-muted">
                                Talla {reg.player2.shirtSize}
                              </span>
                            )}
                          </div>
                          <div className="text-rg-muted text-[11px] flex items-center gap-2">
                            <a href={`tel:${reg.player2.phone}`} className="hover:text-emerald-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" /> {reg.player2.phone}
                            </a>
                            {reg.player2.level && <span className="text-slate-500">({reg.player2.level})</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic flex items-center">
                          Inscripción Individual
                        </div>
                      )}
                    </div>

                    {/* Blocked times */}
                    <div className="text-[11px] bg-white border border-rg-line rounded-xl px-2.5 py-1 text-rg-muted flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="flex-1">
                        <strong>Bloqueos:</strong> {notesWithSummary(summarize(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days), registrationNote(reg))}
                      </span>
                      {hasDays && (
                        <button
                          type="button"
                          onClick={() => handleOpenBlocksEditor(reg)}
                          className="text-emerald-600 hover:text-emerald-300 font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" /> Editar bloqueos
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Category Reassignment & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-rg-line">
                    
                    {/* Reassign Category Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-rg-muted">
                        Categoría Asignada
                      </label>
                      <select
                        value={currentCategory}
                        onChange={e => handleCategoryChange(reg.id, e.target.value)}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none transition ${
                          isModifiedCategory
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/40 ring-1 ring-amber-500/40'
                            : 'bg-white text-rg-ink border-rg-line'
                        }`}
                        title={isModifiedCategory ? `Originalmente eligió: ${reg.selectedCategory}` : 'Cambiar categoría por nivel'}
                      >
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {isModifiedCategory && (
                        <span className="block text-[10px] text-amber-600 font-medium">
                          ⚠️ Modificada (Eligió: {reg.selectedCategory})
                        </span>
                      )}
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex items-center gap-1.5 pt-4 sm:pt-0">
                      {reg.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(reg.id, 'approved')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1 shadow-sm"
                          title="Aprobar inscripción"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                      )}

                      <button
                        onClick={() => handleWhatsAppNotice(reg)}
                        className="px-2 py-1.5 bg-white hover:bg-rg-raised text-[#25D366] font-semibold rounded-xl text-xs border border-rg-line transition"
                        title="Avisar por WhatsApp el estado de esta inscripción"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {reg.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(reg.id, 'rejected')}
                          className="px-2 py-1.5 bg-white hover:bg-rose-50 hover:text-[#C4242A] text-rg-muted font-semibold rounded-xl text-xs border border-rg-line transition"
                          title="Rechazar inscripción"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(reg.id)}
                        className="p-1.5 text-slate-500 hover:text-[#C4242A] hover:bg-rg-raised rounded-xl transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-rg-line bg-white flex items-center justify-between text-xs text-rg-muted flex-shrink-0">
          <span>{filteredRegistrations.length} inscripciones visibles</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-rg-raised text-rg-ink font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-60 bg-[#0F1729]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-rg-line rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-rg-ink">Código QR de Inscripción</h3>
            <p className="text-xs text-rg-muted">
              Imprime o muestra este código en el club para que los jugadores se inscriban escaneando con la cámara.
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <QRCodeSVG value={registrationUrl} size={180} level="M" />
            </div>

            <p className="text-[11px] font-mono text-rg-muted break-all bg-rg-ground p-2 rounded-xl border border-rg-line">
              {registrationUrl}
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full bg-white hover:bg-rg-raised text-rg-ink font-bold py-2.5 rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Blocked Times Editor */}
      {selectedReg && (
        <div className="fixed inset-0 z-60 bg-[#0F1729]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-rg-line rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-rg-ink flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Bloqueos de {selectedReg.player1.name}{selectedReg.player2 ? ` / ${selectedReg.player2.name}` : ''}
              </h3>
              <button onClick={() => setSelectedReg(null)} className="text-rg-muted hover:text-rg-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const dropped = clipToDays(effectiveBlockedRanges(selectedReg, days, ranking.fechaInicio), days).droppedCount;
              return dropped > 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {dropped} franja{dropped > 1 ? 's' : ''} fuera de los días del torneo; no se tendrán en cuenta.
                </div>
              ) : null;
            })()}

            <BlockedTimesPicker days={days} value={editingBlocks} onChange={setEditingBlocks} />

            {isImported(ranking, selectedReg) && (
              <p className="text-[11px] text-rg-muted">
                Esta pareja ya está en el torneo: al guardar se actualizan sus restricciones y se revisan sus partidos (no se mueve ninguno).
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="w-1/2 py-2.5 bg-white hover:bg-rg-raised text-rg-ink font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBlocks}
                disabled={savingBlocks}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition"
              >
                {savingBlocks ? 'Guardando…' : 'Guardar bloqueos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Registration Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-60 bg-[#0F1729]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-rg-line rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-rg-ink flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Inscripción Manual
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-rg-muted hover:text-rg-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-rg-muted mb-1">Categoría</label>
                <select
                  value={manualData.category || availableCategories[0]}
                  onChange={e => setManualData({ ...manualData, category: e.target.value })}
                  className="w-full bg-white border border-rg-line rounded-xl px-3 py-2 text-sm text-rg-ink focus:outline-none focus:border-emerald-500"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Player 1 */}
              <div className="p-3 bg-white rounded-2xl border border-rg-line space-y-2">
                <span className="text-xs font-bold text-emerald-600">Jugador 1</span>
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellidos *"
                  value={manualData.p1Name}
                  onChange={e => setManualData({ ...manualData, p1Name: e.target.value })}
                  className="w-full bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-ink placeholder-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required
                    placeholder="Teléfono *"
                    value={manualData.p1Phone}
                    onChange={e => setManualData({ ...manualData, p1Phone: e.target.value })}
                    className="w-full bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-ink placeholder-slate-500"
                  />
                  <select
                    value={manualData.p1Shirt}
                    onChange={e => setManualData({ ...manualData, p1Shirt: e.target.value })}
                    className="w-full bg-white border border-rg-line rounded-xl px-2 py-1.5 text-xs text-rg-ink"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>Talla {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Player 2 */}
              <div className="p-3 bg-white rounded-2xl border border-rg-line space-y-2">
                <span className="text-xs font-bold text-emerald-600">Jugador 2 (Opcional)</span>
                <input
                  type="text"
                  placeholder="Nombre y Apellidos"
                  value={manualData.p2Name}
                  onChange={e => setManualData({ ...manualData, p2Name: e.target.value })}
                  className="w-full bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-ink placeholder-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={manualData.p2Phone}
                    onChange={e => setManualData({ ...manualData, p2Phone: e.target.value })}
                    className="w-full bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-ink placeholder-slate-500"
                  />
                  <select
                    value={manualData.p2Shirt}
                    onChange={e => setManualData({ ...manualData, p2Shirt: e.target.value })}
                    className="w-full bg-white border border-rg-line rounded-xl px-2 py-1.5 text-xs text-rg-ink"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>Talla {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Blocked times in Manual Modal */}
              <div className="p-3 bg-white rounded-2xl border border-rg-line space-y-3">
                <span className="text-xs font-bold text-emerald-600">¿Cuándo NO pueden jugar? (opcional)</span>
                {hasDays ? (
                  <BlockedTimesPicker days={days} value={manualBlocked} onChange={setManualBlocked} />
                ) : (
                  <p className="text-[11px] text-rg-muted">Configura los días del torneo en «Disponibilidad» para indicar bloqueos.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-rg-muted mb-1">Observaciones adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={manualData.notes}
                  onChange={e => setManualData({ ...manualData, notes: e.target.value })}
                  className="w-full bg-white border border-rg-line rounded-xl px-3 py-1.5 text-xs text-rg-ink placeholder-slate-500 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-1/2 py-2.5 bg-white hover:bg-rg-raised text-rg-ink font-bold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Guardar Inscripción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
