import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Calendar, 
  Phone, 
  Mail, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Share2, 
  Clock, 
  Gift, 
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createTournamentRegistration } from '../services/db';
import { Ranking, TournamentRegistration, User as ClubUser } from '../types';

interface PublicRegistrationPageProps {
  rankingId: string;
}

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const LEVEL_OPTIONS = [
  { value: '1.0 - 2.5', label: 'Iniciación (1.0 - 2.5)' },
  { value: '3.0 - 3.5', label: 'Intermedio Bajo (3.0 - 3.5)' },
  { value: '4.0 - 4.5', label: 'Intermedio Alto (4.0 - 4.5)' },
  { value: '5.0+', label: 'Avanzado / Primera (5.0+)' },
];

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({ rankingId }) => {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [club, setClub] = useState<ClubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRegId, setSubmittedRegId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [player1, setPlayer1] = useState({
    name: '',
    phone: '',
    email: '',
    level: '3.0 - 3.5',
    shirtSize: 'M'
  });
  const [player2, setPlayer2] = useState({
    name: '',
    phone: '',
    email: '',
    level: '3.0 - 3.5',
    shirtSize: 'L'
  });

  // Weekend Availability State
  const [fridayStatus, setFridayStatus] = useState<'available' | 'from_time' | 'unavailable'>('available');
  const [fridayFromTime, setFridayFromTime] = useState<string>('19:00');
  const [saturdayStatus, setSaturdayStatus] = useState<'all_day' | 'morning_only' | 'afternoon_only' | 'custom' | 'unavailable'>('all_day');
  const [saturdayFromTime, setSaturdayFromTime] = useState<string>('10:00');
  const [saturdayUntilTime, setSaturdayUntilTime] = useState<string>('20:00');
  const [sundayStatus, setSundayStatus] = useState<'all_day' | 'morning_only' | 'afternoon_only' | 'unavailable'>('all_day');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const rankDoc = await getDoc(doc(db, 'rankings', rankingId));
        if (rankDoc.exists()) {
          const rankData = { id: rankDoc.id, ...rankDoc.data() } as Ranking;
          setRanking(rankData);

          // Default categories
          const categories = rankData.registrationConfig?.categories || [
            '1ª Masculina',
            '2ª Masculina',
            '3ª Masculina',
            '1ª Femenina',
            '2ª Femenina',
            '3ª Femenina',
            'Mixto A',
            'Mixto B'
          ];
          if (categories.length > 0) {
            setSelectedCategory(categories[0]);
          }

          // Fetch Club Details if ownerId exists
          if (rankData.ownerId) {
            const clubDoc = await getDoc(doc(db, 'users', rankData.ownerId));
            if (clubDoc.exists()) {
              setClub({ id: clubDoc.id, ...clubDoc.data() } as ClubUser);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setErrorMessage('No se pudo cargar la información del torneo.');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [rankingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ranking) return;

    if (!player1.name.trim() || !player1.phone.trim()) {
      setErrorMessage('Por favor completa el nombre y teléfono del Jugador 1.');
      return;
    }

    const isIndividual = ranking.format === 'individual';
    if (!isIndividual && (!player2.name.trim() || !player2.phone.trim())) {
      setErrorMessage('Por favor completa el nombre y teléfono del Jugador 2.');
      return;
    }

    if (!acceptTerms) {
      setErrorMessage('Debes aceptar las condiciones de participación.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // Build structured availability
      const availability: import('../types').TournamentRegistrationAvailability = {
        friday: {
          status: fridayStatus,
          fromTime: fridayStatus === 'from_time' ? fridayFromTime : undefined
        },
        saturday: {
          status: saturdayStatus,
          fromTime: saturdayStatus === 'custom' ? saturdayFromTime : undefined,
          untilTime: saturdayStatus === 'custom' ? saturdayUntilTime : undefined
        },
        sunday: {
          status: sundayStatus
        },
        notes: availabilityNotes.trim() || undefined
      };

      // Build readable summary for quick glance & exports
      const parts: string[] = [];
      if (fridayStatus === 'available') parts.push('Viernes: Disponible');
      else if (fridayStatus === 'from_time') parts.push(`Viernes: Desde ${fridayFromTime}`);
      else parts.push('Viernes: No disponible');

      if (saturdayStatus === 'all_day') parts.push('Sábado: Todo el día');
      else if (saturdayStatus === 'morning_only') parts.push('Sábado: Solo Mañana');
      else if (saturdayStatus === 'afternoon_only') parts.push('Sábado: Solo Tarde');
      else if (saturdayStatus === 'custom') parts.push(`Sábado: ${saturdayFromTime} a ${saturdayUntilTime}`);
      else parts.push('Sábado: No disponible');

      if (sundayStatus === 'all_day') parts.push('Domingo: Todo el día');
      else if (sundayStatus === 'morning_only') parts.push('Domingo: Solo Mañana');
      else if (sundayStatus === 'afternoon_only') parts.push('Domingo: Solo Tarde');
      else parts.push('Domingo: No disponible');

      if (availabilityNotes.trim()) parts.push(`Nota: ${availabilityNotes.trim()}`);

      const readableSummary = parts.join(' • ');

      const registrationData: Omit<TournamentRegistration, 'id'> = {
        rankingId: ranking.id,
        ownerId: ranking.ownerId || '',
        player1: {
          name: player1.name.trim(),
          phone: player1.phone.trim(),
          email: player1.email.trim() || undefined,
          level: player1.level,
          shirtSize: player1.shirtSize
        },
        player2: isIndividual ? undefined : {
          name: player2.name.trim(),
          phone: player2.phone.trim(),
          email: player2.email.trim() || undefined,
          level: player2.level,
          shirtSize: player2.shirtSize
        },
        selectedCategory,
        assignedCategory: selectedCategory,
        status: 'pending',
        paymentStatus: 'pending',
        availability,
        availabilityNotes: readableSummary,
        createdAt: new Date().toISOString()
      };

      const docId = await createTournamentRegistration(ranking.id, registrationData);
      setSubmittedRegId(docId);
    } catch (err: any) {
      console.error('Error submitting registration:', err);
      setErrorMessage('Error al enviar la inscripción: ' + (err.message || 'Inténtalo de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!ranking) return;
    const isIndividual = ranking.format === 'individual';
    const text = isIndividual
      ? `🎾 ¡Me he inscrito al torneo "${ranking.nombre}" en la categoría ${selectedCategory}! Localizador: #${submittedRegId?.substring(0, 6).toUpperCase()}`
      : `🎾 ¡Pareja inscrita al torneo "${ranking.nombre}"!\n🏆 Categoría: ${selectedCategory}\n👥 ${player1.name} y ${player2.name}\n🔖 Localizador: #${submittedRegId?.substring(0, 6).toUpperCase()}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Cargando formulario de inscripción...</p>
        </div>
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Torneo no encontrado</h2>
          <p className="text-slate-400 text-sm">El enlace proporcionado no es válido o el torneo ha sido archivado.</p>
        </div>
      </div>
    );
  }

  const isRegistrationOpen = ranking.registrationConfig?.isOpen !== false;
  const categories = ranking.registrationConfig?.categories?.length 
    ? ranking.registrationConfig.categories 
    : ['1ª Masculina', '2ª Masculina', '3ª Masculina', '1ª Femenina', '2ª Femenina', '3ª Femenina', 'Mixto A', 'Mixto B'];

  const isIndividual = ranking.format === 'individual';

  // Pantalla de Confirmación
  if (submittedRegId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Inscripción Recibida
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">¡Inscripción Confirmada!</h2>
            <p className="text-slate-400 text-sm">
              Tu solicitud para <strong className="text-slate-200">{ranking.nombre}</strong> ha sido registrada con éxito.
            </p>
          </div>

          {/* Resumen Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs text-slate-400">Localizador:</span>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                #{submittedRegId.substring(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Categoría:</span>
              <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {selectedCategory}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-slate-400">Participante(s):</span>
              <span className="text-xs font-semibold text-slate-200 text-right">
                {player1.name} {isIndividual ? '' : `& ${player2.name}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 block mb-1">Disponibilidad declarada:</span>
              <span className="text-slate-300 font-medium text-[11px] block bg-slate-900 p-2 rounded-xl border border-slate-800">
                {fridayStatus === 'from_time' ? `Viernes desde ${fridayFromTime}` : fridayStatus === 'available' ? 'Viernes disponible' : 'Viernes no'} • {saturdayStatus === 'all_day' ? 'Sábado todo el día' : saturdayStatus === 'morning_only' ? 'Sábado mañana' : saturdayStatus === 'afternoon_only' ? 'Sábado tarde' : saturdayStatus === 'custom' ? `Sábado ${saturdayFromTime}-${saturdayUntilTime}` : 'Sábado no'} • {sundayStatus === 'all_day' ? 'Domingo todo el día' : sundayStatus === 'morning_only' ? 'Domingo mañana' : 'Domingo tarde'}
              </span>
            </div>
            {ranking.registrationConfig?.pricePerPlayer && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">Precio inscripción:</span>
                <span className="text-xs font-bold text-emerald-400">
                  {ranking.registrationConfig.pricePerPlayer}€ / jugador
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            El club organizador revisará tu inscripción. Si necesitas comunicar algún cambio, contacta directamente con el club.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-900/30"
            >
              <Share2 className="w-4 h-4" />
              Compartir Confirmación por WhatsApp
            </button>

            <button
              onClick={() => {
                setSubmittedRegId(null);
                setPlayer1({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'M' });
                setPlayer2({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'L' });
                setFridayStatus('available');
                setFridayFromTime('19:00');
                setSaturdayStatus('all_day');
                setSaturdayFromTime('10:00');
                setSaturdayUntilTime('20:00');
                setSundayStatus('all_day');
                setAvailabilityNotes('');
                setAcceptTerms(false);
              }}
              className="w-full text-slate-400 hover:text-slate-200 text-xs font-medium py-2 transition"
            >
              Inscribir otra pareja
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inscripciones Cerradas
  if (!isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold">Inscripciones Cerradas</h2>
          <p className="text-slate-400 text-sm">
            El plazo de inscripción para <strong className="text-white">{ranking.nombre}</strong> ha finalizado o se encuentra pausado temporalmente.
          </p>
          {ranking.registrationConfig?.contactPhone && (
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400">
              Para consultas de última hora o lista de espera:<br />
              <a href={`tel:${ranking.registrationConfig.contactPhone}`} className="text-emerald-400 font-bold inline-flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {ranking.registrationConfig.contactPhone}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 flex flex-col justify-center items-center">
      {/* Container */}
      <div className="max-w-2xl w-full space-y-6">

        {/* Tournament Header Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <Trophy className="w-3.5 h-3.5" /> Inscripción Abierta
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {ranking.nombre}
              </h1>
              {club?.clubName && (
                <p className="text-slate-400 font-medium text-sm mt-1">
                  Organizado por <span className="text-emerald-400 font-semibold">{club.clubName}</span>
                </p>
              )}
            </div>

            {club?.branding?.logoUrl && (
              <img
                src={club.branding.logoUrl}
                alt={club.clubName || 'Club Logo'}
                className="w-16 h-16 rounded-2xl object-cover bg-slate-950 border border-slate-800 shadow-md flex-shrink-0"
              />
            )}
          </div>

          {/* Key Info Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{ranking.fechaInicio ? new Date(ranking.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Próximamente'}</span>
            </div>

            {ranking.registrationConfig?.pricePerPlayer && (
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <span className="font-bold text-emerald-400">€</span>
                <span>{ranking.registrationConfig.pricePerPlayer}€ / jugador</span>
              </div>
            )}

            {ranking.registrationConfig?.welcomePackInfo && (
              <div className="flex items-center gap-2.5 text-xs text-slate-300 col-span-2 sm:col-span-1">
                <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate" title={ranking.registrationConfig.welcomePackInfo}>{ranking.registrationConfig.welcomePackInfo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">

          {errorMessage && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Section 1: Category Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Selecciona la Categoría
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-between ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {selectedCategory === cat && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Player 1 Data */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-400" />
              <span>2. Datos del Jugador 1 (Capitán / Contacto)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Alejandro Galán"
                  value={player1.name}
                  onChange={e => setPlayer1({ ...player1, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Teléfono Móvil (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 612 345 678"
                  value={player1.phone}
                  onChange={e => setPlayer1({ ...player1, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Email (Opcional)</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={player1.email}
                  onChange={e => setPlayer1({ ...player1, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Talla Camiseta</label>
                  <select
                    value={player1.shirtSize}
                    onChange={e => setPlayer1({ ...player1, shirtSize: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Nivel</label>
                  <select
                    value={player1.level}
                    onChange={e => setPlayer1({ ...player1, level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {LEVEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Player 2 Data (Pairs format) */}
          {!isIndividual && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>3. Datos del Jugador 2 (Compañero/a)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Nombre y Apellidos *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Federico Chingotto"
                    value={player2.name}
                    onChange={e => setPlayer2({ ...player2, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Teléfono Móvil *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 689 012 345"
                    value={player2.phone}
                    onChange={e => setPlayer2({ ...player2, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Email (Opcional)</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={player2.email}
                    onChange={e => setPlayer2({ ...player2, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Talla Camiseta</label>
                    <select
                      value={player2.shirtSize}
                      onChange={e => setPlayer2({ ...player2, shirtSize: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Nivel</label>
                    <select
                      value={player2.level}
                      onChange={e => setPlayer2({ ...player2, level: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LEVEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Weekend Schedule Availability */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{isIndividual ? '3' : '4'}. Disponibilidad para el Torneo (Fin de Semana)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Selecciona la franja horaria en la que podéis jugar cada día para que la organización organice los cuadros sin solapamientos.
              </p>
            </div>

            <div className="space-y-3">
              {/* Viernes */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">📅 Viernes (Tarde / Noche)</span>
                  <span className="text-[10px] text-slate-400">Primera ronda / Dieciseisavos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFridayStatus('available')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      fridayStatus === 'available'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟢 Toda la tarde (17:00+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFridayStatus('from_time')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      fridayStatus === 'from_time'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟡 A partir de las...
                  </button>

                  <button
                    type="button"
                    onClick={() => setFridayStatus('unavailable')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      fridayStatus === 'unavailable'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm ring-1 ring-rose-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔴 No disponible viernes
                  </button>
                </div>

                {fridayStatus === 'from_time' && (
                  <div className="pt-2 flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-300">Podemos jugar a partir de las:</span>
                    <select
                      value={fridayFromTime}
                      onChange={e => setFridayFromTime(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-amber-400 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                    >
                      {['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(t => (
                        <option key={t} value={t}>{t} h</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sábado */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">📅 Sábado (Jornada Principal)</span>
                  <span className="text-[10px] text-slate-400">Octavos / Cuartos / Consolación</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaturdayStatus('all_day')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                      saturdayStatus === 'all_day'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟢 Todo el día
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaturdayStatus('morning_only')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                      saturdayStatus === 'morning_only'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟡 Solo Mañana
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaturdayStatus('afternoon_only')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                      saturdayStatus === 'afternoon_only'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟡 Solo Tarde
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaturdayStatus('custom')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition text-center ${
                      saturdayStatus === 'custom'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-sm ring-1 ring-blue-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔵 Franja específica
                  </button>
                </div>

                {saturdayStatus === 'custom' && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-300">Disponible desde:</span>
                    <select
                      value={saturdayFromTime}
                      onChange={e => setSaturdayFromTime(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-blue-400 font-bold text-xs rounded-lg px-2 py-1"
                    >
                      {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                        <option key={t} value={t}>{t} h</option>
                      ))}
                    </select>

                    <span className="text-xs text-slate-300">hasta:</span>
                    <select
                      value={saturdayUntilTime}
                      onChange={e => setSaturdayUntilTime(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-blue-400 font-bold text-xs rounded-lg px-2 py-1"
                    >
                      {['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                        <option key={t} value={t}>{t} h</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Domingo */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">📅 Domingo (Fases Finales)</span>
                  <span className="text-[10px] text-slate-400">Semis, Finales y Final Consolación</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSundayStatus('all_day')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      sundayStatus === 'all_day'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟢 Todo el día (Recomendado)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSundayStatus('morning_only')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      sundayStatus === 'morning_only'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟡 Solo Mañana (hasta 15:00)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSundayStatus('afternoon_only')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left sm:text-center ${
                      sundayStatus === 'afternoon_only'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟡 Solo Tarde (desde 15:00)
                  </button>
                </div>
              </div>

              {/* Textarea for additional comments */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Observaciones adicionales de horario (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Salgo de trabajar a las 19h, o mi compañero viene de viaje el sábado por la mañana..."
                  value={availabilityNotes}
                  onChange={e => setAvailabilityNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  * El juez árbitro y la organización tendrán en cuenta estas franjas para programar los partidos oficiales.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Terms & Submit */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-950 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 leading-relaxed">
                Acepto el reglamento del torneo y autorizo al club a contactarme por teléfono o WhatsApp para la coordinación de horarios y partidos.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-950/40 transition duration-150 transform active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando inscripción...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirmar Inscripción</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>Potenciado por <strong className="text-slate-300">PadelRank Pro</strong></p>
        </div>

      </div>
    </div>
  );
};
