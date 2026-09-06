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
import { Ranking, TournamentRegistration, TournamentRegistrationAvailability } from '../../types';
import { makePairKey, PairAvailability } from '../../services/SchedulerEngine';

interface RegistrationManagerModalProps {
  ranking: Ranking;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRanking: (updated: Ranking) => void;
}

export const RegistrationManagerModal: React.FC<RegistrationManagerModalProps> = ({
  ranking,
  isOpen,
  onClose,
  onUpdateRanking
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

  // Manual Form State
  const [manualData, setManualData] = useState({
    p1Name: '',
    p1Phone: '',
    p1Email: '',
    p1Level: '3.0 - 3.5',
    p1Shirt: 'M',
    p2Name: '',
    p2Phone: '',
    p2Email: '',
    p2Level: '3.0 - 3.5',
    p2Shirt: 'L',
    category: '',
    fridayStatus: 'available' as 'available' | 'from_time' | 'unavailable',
    fridayFromTime: '19:00',
    saturdayStatus: 'all_day' as 'all_day' | 'morning_only' | 'afternoon_only' | 'custom' | 'unavailable',
    saturdayFromTime: '10:00',
    saturdayUntilTime: '20:00',
    sundayStatus: 'all_day' as 'all_day' | 'morning_only' | 'afternoon_only' | 'unavailable',
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

  const handleShareWhatsApp = () => {
    const text = `🎾 ¡Inscripciones abiertas para el torneo "${ranking.nombre}"!\n\n📲 Inscríbete online en el siguiente enlace:\n${registrationUrl}\n\n¡Plazas limitadas!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.p1Name.trim() || !manualData.p1Phone.trim()) return;

    const cat = manualData.category || availableCategories[0];

    // Structured availability
    const availability: TournamentRegistrationAvailability = {
      friday: {
        status: manualData.fridayStatus,
        fromTime: manualData.fridayStatus === 'from_time' ? manualData.fridayFromTime : undefined
      },
      saturday: {
        status: manualData.saturdayStatus,
        fromTime: manualData.saturdayStatus === 'custom' ? manualData.saturdayFromTime : undefined,
        untilTime: manualData.saturdayStatus === 'custom' ? manualData.saturdayUntilTime : undefined
      },
      sunday: {
        status: manualData.sundayStatus
      },
      notes: manualData.notes.trim() || undefined
    };

    // Readable summary
    const parts: string[] = [];
    if (manualData.fridayStatus === 'available') parts.push('Viernes: Disponible');
    else if (manualData.fridayStatus === 'from_time') parts.push(`Viernes: Desde ${manualData.fridayFromTime}`);
    else parts.push('Viernes: No disponible');

    if (manualData.saturdayStatus === 'all_day') parts.push('Sábado: Todo el día');
    else if (manualData.saturdayStatus === 'morning_only') parts.push('Sábado: Solo Mañana');
    else if (manualData.saturdayStatus === 'afternoon_only') parts.push('Sábado: Solo Tarde');
    else if (manualData.saturdayStatus === 'custom') parts.push(`Sábado: ${manualData.saturdayFromTime} a ${manualData.saturdayUntilTime}`);
    else parts.push('Sábado: No disponible');

    if (manualData.sundayStatus === 'all_day') parts.push('Domingo: Todo el día');
    else if (manualData.sundayStatus === 'morning_only') parts.push('Domingo: Solo Mañana');
    else if (manualData.sundayStatus === 'afternoon_only') parts.push('Domingo: Solo Tarde');
    else parts.push('Domingo: No disponible');

    if (manualData.notes.trim()) parts.push(`Nota: ${manualData.notes.trim()}`);

    const readableSummary = parts.join(' • ');

    const newReg: Omit<TournamentRegistration, 'id'> = {
      rankingId: ranking.id,
      ownerId: ranking.ownerId || '',
      player1: {
        name: manualData.p1Name.trim(),
        phone: manualData.p1Phone.trim(),
        email: manualData.p1Email.trim() || undefined,
        level: manualData.p1Level,
        shirtSize: manualData.p1Shirt
      },
      player2: manualData.p2Name.trim() ? {
        name: manualData.p2Name.trim(),
        phone: manualData.p2Phone.trim(),
        email: manualData.p2Email.trim() || undefined,
        level: manualData.p2Level,
        shirtSize: manualData.p2Shirt
      } : undefined,
      selectedCategory: cat,
      assignedCategory: cat,
      status: manualData.status,
      paymentStatus: manualData.paymentStatus,
      availability,
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
        p1Level: '3.0 - 3.5',
        p1Shirt: 'M',
        p2Name: '',
        p2Phone: '',
        p2Email: '',
        p2Level: '3.0 - 3.5',
        p2Shirt: 'L',
        category: '',
        fridayStatus: 'available',
        fridayFromTime: '19:00',
        saturdayStatus: 'all_day',
        saturdayFromTime: '10:00',
        saturdayUntilTime: '20:00',
        sundayStatus: 'all_day',
        notes: '',
        status: 'approved',
        paymentStatus: 'paid'
      });
    } catch (err) {
      console.error('Error creating manual registration:', err);
    }
  };

  // Helper to map availability to pairConstraints
  const buildPairConstraintsForRegistration = (
    reg: TournamentRegistration,
    p1Id: string,
    p2Id?: string
  ): { pairKey: string; constraint: PairAvailability } | null => {
    if (!reg.availability) return null;
    const pairKey = makePairKey(p1Id, p2Id);
    const unavailableRanges: { date: string; startTime: string; endTime: string }[] = [];

    // Determine dates for Friday, Saturday, Sunday
    let fridayDate = '';
    let saturdayDate = '';
    let sundayDate = '';

    if (ranking.schedulerConfig?.dailySchedule?.length) {
      ranking.schedulerConfig.dailySchedule.forEach(day => {
        const d = new Date(day.date + 'T12:00:00');
        const dayOfWeek = d.getDay(); // 5 = Friday, 6 = Saturday, 0 = Sunday
        if (dayOfWeek === 5) fridayDate = day.date;
        else if (dayOfWeek === 6) saturdayDate = day.date;
        else if (dayOfWeek === 0) sundayDate = day.date;
      });
    }

    if (!fridayDate && ranking.fechaInicio) {
      const start = new Date(ranking.fechaInicio + 'T12:00:00');
      const dayOfWeek = start.getDay();
      const diffToFriday = (5 - dayOfWeek + 7) % 7;
      const fri = new Date(start);
      fri.setDate(start.getDate() + (diffToFriday > 3 ? diffToFriday - 7 : diffToFriday));

      const sat = new Date(fri);
      sat.setDate(fri.getDate() + 1);

      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);

      const fmt = (d: Date) => d.toISOString().split('T')[0];
      fridayDate = fmt(fri);
      saturdayDate = fmt(sat);
      sundayDate = fmt(sun);
    }

    const { friday, saturday, sunday } = reg.availability;

    // Friday constraints
    if (fridayDate && friday) {
      if (friday.status === 'unavailable') {
        unavailableRanges.push({ date: fridayDate, startTime: '00:00', endTime: '23:59' });
      } else if (friday.status === 'from_time' && friday.fromTime) {
        unavailableRanges.push({ date: fridayDate, startTime: '00:00', endTime: friday.fromTime });
      }
    }

    // Saturday constraints
    if (saturdayDate && saturday) {
      if (saturday.status === 'unavailable') {
        unavailableRanges.push({ date: saturdayDate, startTime: '00:00', endTime: '23:59' });
      } else if (saturday.status === 'morning_only') {
        unavailableRanges.push({ date: saturdayDate, startTime: '15:00', endTime: '23:59' });
      } else if (saturday.status === 'afternoon_only') {
        unavailableRanges.push({ date: saturdayDate, startTime: '00:00', endTime: '15:00' });
      } else if (saturday.status === 'custom') {
        if (saturday.fromTime) {
          unavailableRanges.push({ date: saturdayDate, startTime: '00:00', endTime: saturday.fromTime });
        }
        if (saturday.untilTime) {
          unavailableRanges.push({ date: saturdayDate, startTime: saturday.untilTime, endTime: '23:59' });
        }
      }
    }

    // Sunday constraints
    if (sundayDate && sunday) {
      if (sunday.status === 'unavailable') {
        unavailableRanges.push({ date: sundayDate, startTime: '00:00', endTime: '23:59' });
      } else if (sunday.status === 'morning_only') {
        unavailableRanges.push({ date: sundayDate, startTime: '15:00', endTime: '23:59' });
      } else if (sunday.status === 'afternoon_only') {
        unavailableRanges.push({ date: sundayDate, startTime: '00:00', endTime: '15:00' });
      }
    }

    if (unavailableRanges.length > 0) {
      return { pairKey, constraint: { unavailableRanges } };
    }
    return null;
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
      const existingGuestPlayers = [...(ranking.guestPlayers || [])];
      const newGuestPlayers = [...existingGuestPlayers];
      const pairConstraints = { ...(ranking.pairConstraints || {}) };

      approvedList.forEach(reg => {
        // Player 1
        const p1Id = `guest_reg_${reg.id}_1`;
        if (!newGuestPlayers.some(p => p.id === p1Id)) {
          newGuestPlayers.push({
            id: p1Id,
            nombre: reg.player1.name,
            apellidos: `(${reg.assignedCategory || reg.selectedCategory})`
          });
        }

        // Player 2
        let p2Id: string | undefined = undefined;
        if (reg.player2) {
          p2Id = `guest_reg_${reg.id}_2`;
          if (!newGuestPlayers.some(p => p.id === p2Id)) {
            newGuestPlayers.push({
              id: p2Id,
              nombre: reg.player2.name,
              apellidos: `(${reg.assignedCategory || reg.selectedCategory})`
            });
          }
        }

        // Map Pair Availability Constraints for Automatic Scheduling
        const constraintData = buildPairConstraintsForRegistration(reg, p1Id, p2Id);
        if (constraintData) {
          pairConstraints[constraintData.pairKey] = constraintData.constraint;
        }
      });

      const updatedRanking: Ranking = {
        ...ranking,
        guestPlayers: newGuestPlayers,
        pairConstraints
      };

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

  const isRegistrationOpen = ranking.registrationConfig?.isOpen !== false;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Gestión de Inscripciones
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {ranking.nombre}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Revisa solicitudes, reasigna categorías por nivel y genera el cuadro con 1 clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleRegistrationOpen}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isRegistrationOpen
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRegistrationOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
              {isRegistrationOpen ? 'Inscripciones Abiertas' : 'Inscripciones Cerradas'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Share Bar */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          {/* Share Links */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {copySuccess ? '¡Enlace Copiado!' : 'Copiar Enlace'}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold rounded-xl border border-emerald-500/30 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartir WhatsApp
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
              Código QR
            </button>

            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 transition"
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
              onClick={handleImportApprovedToTournament}
              disabled={importing || approvedCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-emerald-950/40"
            >
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Importar ({approvedCount}) al Torneo
            </button>

            <button
              onClick={handleExportExcel}
              title="Exportar a Excel"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={handleExportPDF}
              title="Exportar a PDF"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            >
              <FileText className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>

        {importSuccessMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>{importSuccessMessage}</span>
            <button onClick={() => setImportSuccessMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 pb-2 flex-shrink-0">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-slate-400">Total Inscritos</span>
            <p className="text-2xl font-black text-white mt-0.5">{totalCount}</p>
          </div>

          <div className="bg-slate-950/60 border border-amber-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-amber-400">Pendientes de Validar</span>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{pendingCount}</p>
          </div>

          <div className="bg-slate-950/60 border border-emerald-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-emerald-400">Aprobadas</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{approvedCount}</p>
          </div>

          <div className="bg-slate-950/60 border border-blue-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-blue-400">Pagos Confirmados</span>
            <p className="text-2xl font-black text-blue-400 mt-0.5">{paidCount} / {totalCount}</p>
          </div>

          <div className="bg-slate-950/60 border border-rose-500/20 rounded-2xl p-3">
            <span className="text-[11px] font-semibold text-rose-400">Rechazadas / Espera</span>
            <p className="text-2xl font-black text-slate-400 mt-0.5">{rejectedCount + waitlistCount}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 flex-shrink-0">
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
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
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
            <div className="text-center py-12 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-8 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No hay inscripciones con los filtros seleccionados</h3>
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
                  className={`bg-slate-950/70 border rounded-2xl p-4 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    reg.status === 'approved'
                      ? 'border-emerald-500/30 shadow-sm shadow-emerald-950/20'
                      : reg.status === 'pending'
                      ? 'border-amber-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Left Column: Player & Contact Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        #{reg.id.substring(0, 6).toUpperCase()}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        reg.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : reg.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : reg.status === 'waitlist'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {reg.status === 'approved' ? 'Aprobada' : reg.status === 'pending' ? 'Pendiente' : reg.status === 'waitlist' ? 'Lista Espera' : 'Rechazada'}
                      </span>

                      {/* Payment Badge */}
                      <button
                        onClick={() => handlePaymentToggle(reg)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 transition ${
                          reg.paymentStatus === 'paid'
                            ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
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
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{reg.player1.name}</span>
                          {reg.player1.shirtSize && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              Talla {reg.player1.shirtSize}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-2">
                          <a href={`tel:${reg.player1.phone}`} className="hover:text-emerald-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" /> {reg.player1.phone}
                          </a>
                          {reg.player1.level && <span className="text-slate-500">({reg.player1.level})</span>}
                        </div>
                      </div>

                      {/* Jugador 2 */}
                      {reg.player2 ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{reg.player2.name}</span>
                            {reg.player2.shirtSize && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                Talla {reg.player2.shirtSize}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] flex items-center gap-2">
                            <a href={`tel:${reg.player2.phone}`} className="hover:text-emerald-400 flex items-center gap-1">
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

                    {/* Schedule availability badges & notes */}
                    {reg.availability ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {/* Friday */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${
                          reg.availability.friday?.status === 'available'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                            : reg.availability.friday?.status === 'from_time'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                            : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                        }`}>
                          <span>V:</span>
                          <span>{reg.availability.friday?.status === 'available' ? 'Tarde' : reg.availability.friday?.status === 'from_time' ? `>${reg.availability.friday.fromTime}` : 'No'}</span>
                        </span>

                        {/* Saturday */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${
                          reg.availability.saturday?.status === 'all_day'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                            : reg.availability.saturday?.status === 'unavailable'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                            : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                        }`}>
                          <span>S:</span>
                          <span>
                            {reg.availability.saturday?.status === 'all_day'
                              ? 'Todo el día'
                              : reg.availability.saturday?.status === 'morning_only'
                              ? 'Mañana'
                              : reg.availability.saturday?.status === 'afternoon_only'
                              ? 'Tarde'
                              : reg.availability.saturday?.status === 'custom'
                              ? `${reg.availability.saturday.fromTime}-${reg.availability.saturday.untilTime}`
                              : 'No'}
                          </span>
                        </span>

                        {/* Sunday */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${
                          reg.availability.sunday?.status === 'all_day'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                            : reg.availability.sunday?.status === 'unavailable'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                            : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                        }`}>
                          <span>D:</span>
                          <span>
                            {reg.availability.sunday?.status === 'all_day'
                              ? 'Todo el día'
                              : reg.availability.sunday?.status === 'morning_only'
                              ? 'Mañana'
                              : reg.availability.sunday?.status === 'afternoon_only'
                              ? 'Tarde'
                              : 'No'}
                          </span>
                        </span>

                        {reg.availability.notes && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-xs" title={reg.availability.notes}>
                            💬 {reg.availability.notes}
                          </span>
                        )}
                      </div>
                    ) : reg.availabilityNotes ? (
                      <div className="text-[11px] bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1 text-slate-300 flex items-start gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Disponibilidad:</strong> {reg.availabilityNotes}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Right Column: Category Reassignment & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    
                    {/* Reassign Category Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400">
                        Categoría Asignada
                      </label>
                      <select
                        value={currentCategory}
                        onChange={e => handleCategoryChange(reg.id, e.target.value)}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none transition ${
                          isModifiedCategory
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/40'
                            : 'bg-slate-900 text-white border-slate-700'
                        }`}
                        title={isModifiedCategory ? `Originalmente eligió: ${reg.selectedCategory}` : 'Cambiar categoría por nivel'}
                      >
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {isModifiedCategory && (
                        <span className="block text-[10px] text-amber-400 font-medium">
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

                      {reg.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(reg.id, 'rejected')}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 font-semibold rounded-xl text-xs border border-slate-700 transition"
                          title="Rechazar inscripción"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(reg.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
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
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <span>{filteredRegistrations.length} inscripciones visibles</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Código QR de Inscripción</h3>
            <p className="text-xs text-slate-400">
              Imprime o muestra este código en el club para que los jugadores se inscriban escaneando con la cámara.
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              <QRCodeSVG value={registrationUrl} size={180} level="M" />
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all bg-slate-950 p-2 rounded-xl border border-slate-800">
              {registrationUrl}
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Manual Registration Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Inscripción Manual
              </h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Categoría</label>
                <select
                  value={manualData.category || availableCategories[0]}
                  onChange={e => setManualData({ ...manualData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Player 1 */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400">Jugador 1</span>
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellidos *"
                  value={manualData.p1Name}
                  onChange={e => setManualData({ ...manualData, p1Name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required
                    placeholder="Teléfono *"
                    value={manualData.p1Phone}
                    onChange={e => setManualData({ ...manualData, p1Phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <select
                    value={manualData.p1Shirt}
                    onChange={e => setManualData({ ...manualData, p1Shirt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>Talla {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Player 2 */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400">Jugador 2 (Opcional)</span>
                <input
                  type="text"
                  placeholder="Nombre y Apellidos"
                  value={manualData.p2Name}
                  onChange={e => setManualData({ ...manualData, p2Name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={manualData.p2Phone}
                    onChange={e => setManualData({ ...manualData, p2Phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <select
                    value={manualData.p2Shirt}
                    onChange={e => setManualData({ ...manualData, p2Shirt: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>Talla {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Weekend Availability in Manual Modal */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-emerald-400">Disponibilidad Fin de Semana</span>
                
                {/* Viernes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Viernes:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, fridayStatus: 'available' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.fridayStatus === 'available' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Disponible (17h+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, fridayStatus: 'from_time' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.fridayStatus === 'from_time' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      A partir de...
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, fridayStatus: 'unavailable' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.fridayStatus === 'unavailable' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      No disponible
                    </button>
                  </div>
                  {manualData.fridayStatus === 'from_time' && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Desde las:</span>
                      <select
                        value={manualData.fridayFromTime}
                        onChange={e => setManualData({ ...manualData, fridayFromTime: e.target.value })}
                        className="bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold rounded px-2 py-0.5"
                      >
                        {['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map(t => (
                          <option key={t} value={t}>{t} h</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Sábado */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Sábado:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, saturdayStatus: 'all_day' })}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.saturdayStatus === 'all_day' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Todo el día
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, saturdayStatus: 'morning_only' })}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.saturdayStatus === 'morning_only' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Solo Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, saturdayStatus: 'afternoon_only' })}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.saturdayStatus === 'afternoon_only' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Solo Tarde
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, saturdayStatus: 'unavailable' })}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.saturdayStatus === 'unavailable' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      No disp.
                    </button>
                  </div>
                </div>

                {/* Domingo */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Domingo:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, sundayStatus: 'all_day' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.sundayStatus === 'all_day' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Todo el día
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, sundayStatus: 'morning_only' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.sundayStatus === 'morning_only' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Solo Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualData({ ...manualData, sundayStatus: 'afternoon_only' })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        manualData.sundayStatus === 'afternoon_only' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Solo Tarde
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Observaciones adicionales</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={manualData.notes}
                  onChange={e => setManualData({ ...manualData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
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
