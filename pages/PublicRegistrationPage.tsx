import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Check, Clock, Phone, Share2, Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createTournamentRegistration } from '../services/db';
import { Ranking, TournamentRegistration, User as ClubUser } from '../types';
import type { DaySchedule } from '../services/scheduler/types';
import { BlockedTimesPicker } from '../components/registration/BlockedTimesPicker';
import { blocksWholeTournament, dayLabel, notesWithSummary, sortDays, summarize } from '../services/registration/blockedTimes';

interface PublicRegistrationPageProps {
  rankingId: string;
}

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const LEVEL_OPTIONS = [
  { value: '1.0 - 2.5', label: 'Iniciación (1.0 - 2.5)' },
  { value: '3.0 - 3.5', label: 'Intermedio bajo (3.0 - 3.5)' },
  { value: '4.0 - 4.5', label: 'Intermedio alto (4.0 - 4.5)' },
  { value: '5.0+', label: 'Avanzado / Primera (5.0+)' },
];
import { DEFAULT_REGISTRATION_CATEGORIES } from '../config/registrationDefaults';
const DEFAULT_CATEGORIES = DEFAULT_REGISTRATION_CATEGORIES;

type PlayerForm = { name: string; phone: string; email: string; level: string; shirtSize: string };
type Step = 'contact' | 'partner' | 'schedule' | 'confirm';

const STEP_TITLE: Record<Step, string> = {
  contact: 'Categoría y contacto',
  partner: 'Compañero o compañera',
  schedule: '¿Cuándo no podéis jugar?',
  confirm: 'Revisa y envía',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- small building blocks in the player-facing style ----------

const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label htmlFor={id} className="block text-[13px] font-medium text-rg-ink mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-rg-muted mt-1">{hint}</p>}
  </div>
);

const inputClass = 'w-full h-11 rounded-lg border border-rg-control bg-white px-3 text-[15px] text-rg-ink placeholder:text-rg-muted focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track';

const PlayerFields = ({ prefix, value, onChange, namePlaceholder, phonePlaceholder }: {
  prefix: string; value: PlayerForm; onChange: (v: PlayerForm) => void; namePlaceholder: string; phonePlaceholder: string;
}) => (
  <div className="space-y-4">
    <Field id={`${prefix}-name`} label="Nombre y apellidos">
      <input id={`${prefix}-name`} type="text" autoComplete="name" required placeholder={namePlaceholder}
        value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} className={inputClass} />
    </Field>
    <Field id={`${prefix}-phone`} label="Móvil (WhatsApp)">
      <input id={`${prefix}-phone`} type="tel" inputMode="tel" autoComplete="tel" required placeholder={phonePlaceholder}
        value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value })} className={`${inputClass} num`} />
    </Field>
    <Field id={`${prefix}-email`} label="Email (opcional)">
      <input id={`${prefix}-email`} type="email" inputMode="email" autoComplete="email" placeholder="nombre@correo.com"
        value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} className={inputClass} />
    </Field>
    <div className="grid grid-cols-[1fr_2fr] gap-3">
      <Field id={`${prefix}-shirt`} label="Talla">
        <select id={`${prefix}-shirt`} value={value.shirtSize} onChange={e => onChange({ ...value, shirtSize: e.target.value })} className={inputClass}>
          {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field id={`${prefix}-level`} label="Nivel">
        <select id={`${prefix}-level`} value={value.level} onChange={e => onChange({ ...value, level: e.target.value })} className={inputClass}>
          {LEVEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </Field>
    </div>
  </div>
);

const Shell = ({ clubName, logoUrl, onBack, children, dock }: {
  clubName?: string; logoUrl?: string; onBack?: () => void; children: React.ReactNode; dock?: React.ReactNode;
}) => (
  <div className="rg min-h-screen bg-rg-ground flex flex-col">
    <header className="bg-white border-b border-rg-line h-14 flex items-center gap-3 px-4 sticky top-0 z-30">
      {onBack ? (
        <button type="button" onClick={onBack} className="w-10 h-10 -ml-2 grid place-items-center text-rg-muted" aria-label="Paso anterior">
          <ArrowLeft size={20} />
        </button>
      ) : logoUrl ? (
        <img src={logoUrl} alt={clubName || 'Logo del club'} className="h-8 max-w-[120px] object-contain" />
      ) : (
        <span className="w-7 h-7 rounded-lg bg-court text-white grid place-items-center flex-none"><Trophy size={15} /></span>
      )}
      <span className="font-semibold text-[15px] truncate">{clubName || 'Inscripción'}</span>
    </header>
    <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-5 pb-6">{children}</main>
    {dock && (
      <div className="sticky bottom-0 z-30 bg-white border-t border-rg-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-xl mx-auto px-4 py-3">{dock}</div>
      </div>
    )}
  </div>
);

const Notice = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rg min-h-screen bg-rg-ground flex items-center justify-center p-4">
    <div className="bg-white border border-rg-line rounded-xl p-6 max-w-md w-full space-y-3">
      <div className="text-rg-muted">{icon}</div>
      <h1 className="text-xl font-bold tracking-[-0.01em]">{title}</h1>
      <div className="text-[15px] text-rg-muted space-y-3">{children}</div>
    </div>
  </div>
);

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({ rankingId }) => {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [club, setClub] = useState<ClubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRegId, setSubmittedRegId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [player1, setPlayer1] = useState<PlayerForm>({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'M' });
  const [player2, setPlayer2] = useState<PlayerForm>({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'L' });

  // Availability: ranges in which the pair can NOT play
  const [blockedRanges, setBlockedRanges] = useState<DaySchedule[]>([]);
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

          const categories = rankData.registrationConfig?.categories || DEFAULT_CATEGORIES;
          if (categories.length > 0) {
            setSelectedCategory(categories[0]);
          }

          // The club's name and logo are a nicety: a failed read must not block the form
          if (rankData.ownerId) {
            try {
              const clubDoc = await getDoc(doc(db, 'users', rankData.ownerId));
              if (clubDoc.exists()) {
                setClub({ id: clubDoc.id, ...clubDoc.data() } as ClubUser);
              }
            } catch (clubErr) {
              console.warn('Club details unavailable for the registration page:', clubErr);
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

  const isIndividual = ranking?.format === 'individual';
  const steps: Step[] = isIndividual ? ['contact', 'schedule', 'confirm'] : ['contact', 'partner', 'schedule', 'confirm'];
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const goTo = (i: number) => {
    setErrorMessage(null);
    setStepIndex(i);
    window.scrollTo({ top: 0 });
  };

  // Validates the visible step; returns the problem in words, or null
  const stepProblem = (s: Step): string | null => {
    if (s === 'contact' && (!player1.name.trim() || !player1.phone.trim())) return 'Escribe tu nombre y tu móvil para seguir.';
    if (s === 'partner' && (!player2.name.trim() || !player2.phone.trim())) return 'Escribe el nombre y el móvil de tu pareja para seguir.';
    if (s === 'confirm' && !acceptTerms) return 'Acepta las condiciones para enviar la inscripción.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ranking) return;

    const problem = stepProblem(step);
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    if (step !== 'confirm') {
      goTo(stepIndex + 1);
      return;
    }

    if (!player1.name.trim() || !player1.phone.trim()) {
      setErrorMessage('Por favor completa el nombre y teléfono del Jugador 1.');
      return;
    }
    if (!isIndividual && (!player2.name.trim() || !player2.phone.trim())) {
      setErrorMessage('Por favor completa el nombre y teléfono del Jugador 2.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);
      const readableSummary = notesWithSummary(summarize(blockedRanges, days), availabilityNotes);

      const registrationData: Omit<TournamentRegistration, 'id'> = {
        rankingId: ranking.id,
        ownerId: ranking.ownerId || '',
        // Firestore rejects undefined fields: an empty email is left out, not sent as undefined
        player1: {
          name: player1.name.trim(),
          phone: player1.phone.trim(),
          ...(player1.email.trim() ? { email: player1.email.trim() } : {}),
          level: player1.level,
          shirtSize: player1.shirtSize
        },
        ...(isIndividual ? {} : {
          player2: {
            name: player2.name.trim(),
            phone: player2.phone.trim(),
            ...(player2.email.trim() ? { email: player2.email.trim() } : {}),
            level: player2.level,
            shirtSize: player2.shirtSize
          }
        }),
        selectedCategory,
        assignedCategory: selectedCategory,
        status: 'pending',
        paymentStatus: 'pending',
        blockedRanges,
        availabilityNotes: readableSummary,
        createdAt: new Date().toISOString()
      };

      const docId = await createTournamentRegistration(ranking.id, registrationData);
      setSubmittedRegId(docId);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      console.error('Error submitting registration:', err);
      setErrorMessage('Error al enviar la inscripción: ' + (err.message || 'Inténtalo de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!ranking) return;
    const text = isIndividual
      ? `🎾 ¡Me he inscrito al torneo "${ranking.nombre}" en la categoría ${selectedCategory}! Localizador: #${submittedRegId?.substring(0, 6).toUpperCase()}`
      : `🎾 ¡Pareja inscrita al torneo "${ranking.nombre}"!\n🏆 Categoría: ${selectedCategory}\n👥 ${player1.name} y ${player2.name}\n🔖 Localizador: #${submittedRegId?.substring(0, 6).toUpperCase()}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="rg min-h-screen bg-rg-ground flex items-center justify-center text-rg-muted">Cargando la inscripción…</div>;
  }

  if (!ranking) {
    return (
      <Notice icon={<AlertCircle size={28} />} title="Torneo no encontrado">
        <p>El enlace no es válido o el torneo se ha archivado. Pide al club el enlace correcto.</p>
      </Notice>
    );
  }

  const config = ranking.registrationConfig;
  const isRegistrationOpen = config?.isOpen !== false;
  const categories = config?.categories?.length ? config.categories : DEFAULT_CATEGORIES;
  const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);
  const datesText = days.length
    ? days.length === 1 ? capitalize(dayLabel(days[0].date)) : `${capitalize(dayLabel(days[0].date))} – ${dayLabel(days[days.length - 1].date)}`
    : ranking.fechaInicio ? new Date(ranking.fechaInicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Por anunciar';
  const monthText = (days[0]?.date || ranking.fechaInicio)
    ? new Date(`${days[0]?.date || ranking.fechaInicio}T12:00:00`).toLocaleDateString('es-ES', { month: 'long' })
    : '';
  const clubName = club?.clubName;
  const logoUrl = club?.branding?.logoUrl;

  if (submittedRegId) {
    return (
      <Shell clubName={clubName} logoUrl={logoUrl}>
        <div className="space-y-5">
          <div>
            <span className="w-10 h-10 rounded-full bg-[#dcfce7] text-rg-positive grid place-items-center mb-3"><Check size={22} /></span>
            <h1 className="text-[22px] font-bold tracking-[-0.015em] leading-tight">Inscripción enviada</h1>
            <p className="text-[15px] text-rg-muted mt-1">
              {ranking.nombre}. El club revisará la inscripción y os contactará por WhatsApp.
            </p>
          </div>
          <dl className="bg-white border border-rg-line rounded-xl divide-y divide-rg-rule text-[14px]">
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-rg-muted">Localizador</dt><dd className="font-semibold num">#{submittedRegId.substring(0, 8).toUpperCase()}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-rg-muted">Categoría</dt><dd className="font-semibold text-right">{selectedCategory}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-rg-muted">{isIndividual ? 'Jugador' : 'Pareja'}</dt><dd className="font-semibold text-right">{player1.name}{isIndividual ? '' : ` y ${player2.name}`}</dd></div>
            <div className="px-4 py-3"><dt className="text-rg-muted">Horario</dt><dd className="mt-0.5">{summarize(blockedRanges, days)}</dd></div>
            {config?.pricePerPlayer ? (
              <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-rg-muted">Precio</dt><dd className="font-semibold num">{config.pricePerPlayer} € por jugador</dd></div>
            ) : null}
          </dl>
          <div className="space-y-2">
            <button type="button" onClick={handleShareWhatsApp} className="w-full h-12 rounded-lg bg-court text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:opacity-90">
              <Share2 size={18} /> Compartir por WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmittedRegId(null);
                setPlayer1({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'M' });
                setPlayer2({ name: '', phone: '', email: '', level: '3.0 - 3.5', shirtSize: 'L' });
                setBlockedRanges([]);
                setAvailabilityNotes('');
                setAcceptTerms(false);
                setStepIndex(0);
              }}
              className="w-full h-11 text-[15px] font-medium text-court"
            >
              {isIndividual ? 'Inscribir a otra persona' : 'Inscribir otra pareja'}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!isRegistrationOpen) {
    return (
      <Notice icon={<Clock size={28} />} title="Inscripciones cerradas">
        <p>El plazo para <strong className="text-rg-ink font-semibold">{ranking.nombre}</strong> ha terminado o está en pausa.</p>
        {config?.contactPhone && (
          <p>
            Para la lista de espera llama al club:{' '}
            <a href={`tel:${config.contactPhone}`} className="text-court font-semibold inline-flex items-center gap-1 num">
              <Phone size={14} /> {config.contactPhone}
            </a>
          </p>
        )}
      </Notice>
    );
  }

  // Without tournament days there is no blocked-times grid: registration is not ready yet
  if (days.length === 0) {
    return (
      <Notice icon={<Clock size={28} />} title="La inscripción aún no está disponible">
        <p>El club todavía está preparando los horarios de <strong className="text-rg-ink font-semibold">{ranking.nombre}</strong>. Vuelve a intentarlo más tarde.</p>
      </Notice>
    );
  }

  const isLast = step === 'confirm';
  const nextLabel = step === 'contact'
    ? (isIndividual ? 'Continuar con el horario' : 'Continuar con tu pareja')
    : step === 'partner' ? 'Continuar con el horario'
      : step === 'schedule' ? 'Revisar la inscripción'
        : submitting ? 'Enviando…' : 'Enviar inscripción';

  const facts: { label: string; value: string }[] = [
    { label: 'Fechas', value: `${datesText}${monthText ? ` ${monthText}` : ''}` },
    ...(config?.pricePerPlayer ? [{ label: 'Precio', value: `${config.pricePerPlayer} € por jugador` }] : []),
    ...(config?.closeDate ? [{ label: 'Cierre', value: new Date(config.closeDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) }] : []),
    { label: 'Categorías', value: categories.join(', ') },
    ...(config?.welcomePackInfo ? [{ label: 'Regalo', value: config.welcomePackInfo }] : []),
  ];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Shell
        clubName={clubName}
        logoUrl={logoUrl}
        onBack={stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined}
        dock={
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-lg bg-court text-white font-semibold text-[15px] disabled:opacity-60 active:opacity-90"
          >
            {nextLabel}
          </button>
        }
      >
        <div className="mb-4">
          <h1 className="text-[22px] font-bold tracking-[-0.015em] leading-tight">{ranking.nombre}</h1>
          <p className="text-[13px] text-rg-muted mt-1 num">
            Inscripción abierta{clubName ? ` · ${clubName}` : ''}
          </p>
        </div>

        {stepIndex === 0 && (
          <dl className="bg-white border border-rg-line rounded-xl grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 mb-5">
            {facts.map(f => (
              <div key={f.label} className={f.label === 'Precio' || f.label === 'Cierre' ? '' : 'col-span-2'}>
                <dt className="text-xs text-rg-muted">{f.label}</dt>
                <dd className="text-[14px] font-semibold num">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex gap-1.5 mb-1" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-court' : 'bg-court-track'}`} />
          ))}
        </div>
        <p className="text-xs text-rg-muted mb-4 num">Paso {stepIndex + 1} de {steps.length}</p>
        <h2 className="text-[17px] font-semibold mb-4">{STEP_TITLE[step]}</h2>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-[#ffedea] text-[#831c1e] text-[14px]">
            <AlertCircle size={18} className="flex-none mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {step === 'contact' && (
          <div className="space-y-5">
            <fieldset>
              <legend className="text-[13px] font-medium mb-1.5">Categoría</legend>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={selectedCategory === cat}
                    className={`min-h-11 px-3 py-2 rounded-lg text-[14px] font-medium text-left transition-colors ${selectedCategory === cat
                      ? 'border-2 border-court bg-court-soft text-court-ink'
                      : 'border border-rg-control bg-white text-rg-ink'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <p className="text-[15px] font-semibold mb-3">{isIndividual ? 'Tus datos' : 'Tus datos (contacto de la pareja)'}</p>
              <PlayerFields prefix="p1" value={player1} onChange={setPlayer1} namePlaceholder="Nombre y apellidos" phonePlaceholder="612 345 678" />
            </div>
          </div>
        )}

        {step === 'partner' && (
          <PlayerFields prefix="p2" value={player2} onChange={setPlayer2} namePlaceholder="Nombre y apellidos" phonePlaceholder="689 012 345" />
        )}

        {step === 'schedule' && (
          <div className="space-y-4">
            <p className="text-[14px] text-rg-muted">
              Toca las medias horas en las que no podéis jugar. Si podéis a cualquier hora, no marquéis nada.
            </p>
            <BlockedTimesPicker days={days} value={blockedRanges} onChange={setBlockedRanges} tone="light" />
            {blocksWholeTournament(blockedRanges, days) && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-[14px]">
                <AlertCircle size={18} className="flex-none mt-0.5" />
                Habéis bloqueado todo el torneo y no podremos daros hora.
              </div>
            )}
            <Field id="notes" label="Algo más sobre el horario (opcional)" hint="La organización lo tendrá en cuenta al programar los partidos.">
              <textarea
                id="notes"
                rows={3}
                placeholder="Por ejemplo: salgo de trabajar a las 19:00"
                value={availabilityNotes}
                onChange={e => setAvailabilityNotes(e.target.value)}
                className="w-full rounded-lg border border-rg-control bg-white px-3 py-2.5 text-[15px] text-rg-ink placeholder:text-rg-muted focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track resize-none"
              />
            </Field>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <dl className="bg-white border border-rg-line rounded-xl divide-y divide-rg-rule text-[14px]">
              {[
                { label: 'Categoría', value: selectedCategory, edit: 0 },
                { label: isIndividual ? 'Jugador' : 'Jugador 1', value: `${player1.name} · ${player1.phone}`, edit: 0 },
                ...(isIndividual ? [] : [{ label: 'Jugador 2', value: `${player2.name} · ${player2.phone}`, edit: 1 }]),
                { label: 'Horario', value: summarize(blockedRanges, days), edit: steps.indexOf('schedule') },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <dt className="text-xs text-rg-muted">{row.label}</dt>
                    <dd className="font-medium break-words num">{row.value}</dd>
                  </div>
                  <button type="button" onClick={() => goTo(row.edit)} className="text-court text-[14px] font-medium py-1 flex-none">Cambiar</button>
                </div>
              ))}
            </dl>
            <label className="flex items-start gap-3 p-3 bg-white border border-rg-line rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 flex-none accent-[#1F5FD6]"
              />
              <span className="text-[14px] leading-relaxed">
                Acepto el reglamento del torneo y que el club me contacte por teléfono o WhatsApp para coordinar horarios y partidos.
              </span>
            </label>
          </div>
        )}

        {isLast && config?.contactPhone && (
          <p className="text-[13px] text-rg-muted mt-5">
            ¿Dudas? Llama al club: <a href={`tel:${config.contactPhone}`} className="text-court font-medium num">{config.contactPhone}</a>
          </p>
        )}
      </Shell>
    </form>
  );
};
