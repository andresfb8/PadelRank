import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Settings, Grid, CheckCircle, Info, X, UserPlus, Shield, Wand2, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button, Input } from './ui/Components';
import * as PozoEngine from '../services/PozoEngine';
import { SearchableSelect } from './SearchableSelect';
import { MatchGenerator } from '../services/matchGenerator';
import { TournamentEngine } from '../services/TournamentEngine';
import { User, Player, Ranking, RankingFormat, RankingConfig, ScoringMode, Division, TieBreakCriterion, DEFAULT_TIE_BREAK_ORDER } from '../types';
import { SUBSCRIPTION_PLANS, canUseFormat, canCreateTournament } from '../config/subscriptionPlans';

import { generateDivisions } from '../services/wizardGenerators';
import { configForFormat, goldenPointApplies } from '../config/formatSettings';
import { DEFAULT_REGISTRATION_CATEGORIES } from '../config/registrationDefaults';
import { AmericanoConfig } from './ranking-wizard/AmericanoConfig';
import { AmericanoAssignments } from './ranking-wizard/AmericanoAssignments';
import { EliminationConfig } from './ranking-wizard/EliminationConfig';
import { EliminationAssignments } from './ranking-wizard/EliminationAssignments';
import { HybridConfig } from './ranking-wizard/HybridConfig';
import { LeagueConfig } from './ranking-wizard/LeagueConfig';
import { LeagueAssignments } from './ranking-wizard/LeagueAssignments';
import { PozoConfig } from './ranking-wizard/PozoConfig';
import { TieBreakConfig } from './ranking-wizard/TieBreakConfig';
import { SponsorsEditor, LogoPicker, Sponsor } from './ranking-settings/PresentationFields';

interface Props {
    players: Record<string, Player>;
    currentUser?: User;
    activeRankingsCount?: number;
    onCancel: () => void;
    onSave: (ranking: Ranking) => void;
}

const STEPS = [
    { number: 1, title: 'Formato', icon: Trophy },
    { number: 2, title: 'Configuración', icon: Settings },
    { number: 3, title: 'Jugadores', icon: Users },
    { number: 4, title: 'Presentación', icon: Grid },
];

/** Formats where the draw or schedule can be filled later from the public registrations. */
const REG_FILL_FORMATS: RankingFormat[] = ['elimination', 'pairs', 'hybrid'];

export const RankingWizard = ({ players, currentUser, activeRankingsCount = 0, onCancel, onSave }: Props) => {
    const userPlan = currentUser?.plan || 'pro';
    const planLimits = SUBSCRIPTION_PLANS[userPlan];
    const [step, setStep] = useState(1);

    // --- State ---
    const [format, setFormat] = useState<RankingFormat>('classic');
    const [name, setName] = useState('');
    const [category, setCategory] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Mixto');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isOfficial, setIsOfficial] = useState(true); // Default true, but will update based on format
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    // Config
    const [config, setConfig] = useState<RankingConfig>(() =>
        configForFormat('classic', { branding: { logoUrl: currentUser?.branding?.logoUrl } }));

    // Reactively update branding if user profile changes (e.g. logo upload)
    React.useEffect(() => {
        if (currentUser?.branding?.logoUrl) {
            setConfig(prev => ({
                ...prev,
                branding: {
                    ...prev.branding,
                    logoUrl: currentUser.branding.logoUrl
                }
            }));
        }
    }, [currentUser?.branding?.logoUrl]);


    // Players
    // For Classic & Individual: We use Divisions logic.
    // For Others: We just need a pool of players.
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [numDivisions, setNumDivisions] = useState(1);
    const [categories, setCategories] = useState<string[]>([]); // Start empty to prevent default duplicates
    const [individualMaxPlayers, setIndividualMaxPlayers] = useState(12); // Default for individual
    const [categorySizes, setCategorySizes] = useState<Record<number, number>>({});
    const [assignments, setAssignments] = useState<Record<number, string[]>>({});
    const [drawSeed, setDrawSeed] = useState<number | undefined>(undefined);
    // Guest Players (stored as full objects temporarily)
    const [guestPlayers, setGuestPlayers] = useState<{ id: string; nombre: string; apellidos?: string }[]>([]);
    const [newGuestName, setNewGuestName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    /** Public-registration mode: skip manual pair assignment; the tournament fills in from approved registrations. */
    const [fillFromRegistrations, setFillFromRegistrations] = useState(false);

    // --- Helpers ---
    const availablePlayers = [...Object.values(players), ...guestPlayers];

    /** Creates a guest player (tournament-only) and returns the new ID */
    const handleCreateGuest = (nombre: string, apellidos?: string): string => {
        const id = `guest-${crypto.randomUUID()}`;
        setGuestPlayers(prev => [...prev, { id, nombre, apellidos }]);
        return id;
    };

    // --- Steps Renderers ---

    const renderStep1 = () => (
        <div className="grid md:grid-cols-2 gap-3" role="radiogroup" aria-label="Formato del torneo">
            {[
                {
                    id: 'classic',
                    label: 'Liga clásica (CPSJ)',
                    desc: 'Grupos de 4 jugadores. Todos contra todos en cada división. Ascensos y descensos.',
                    color: 'blue'
                },
                {
                    id: 'individual',
                    label: 'Liga individual',
                    desc: 'Liga individual con divisiones. Partidos con parejas rotatorias o aleatorias.',
                    color: 'purple'
                },
                {
                    id: 'pairs',
                    label: 'Liga por parejas',
                    desc: 'Parejas fijas que juegan todas contra todas, por divisiones.',
                    color: 'indigo'
                },
                {
                    id: 'americano',
                    label: 'Americano',
                    desc: 'Todos juegan con todos. Puntuación individual por juegos ganados.',
                    color: 'green'
                },
                {
                    id: 'mexicano',
                    label: 'Mexicano',
                    desc: 'Partidos nivelados: en cada ronda los que van ganando juegan entre sí.',
                    color: 'orange' // Mexicano usually relates to fun/dynamic
                },
                {
                    id: 'elimination',
                    label: 'Eliminatoria',
                    beta: true,
                    desc: 'Cuadro principal y de consolación, con cabezas de serie y avance por rondas.',
                    color: 'red'
                },
                {
                    id: 'hybrid',
                    label: 'Liga + playoff',
                    desc: 'Fase de grupos y después un cuadro final. Ideal para un «mundialito».',
                    color: 'pink'
                },
                {
                    id: 'pozo',
                    label: 'Pozo',
                    desc: 'Los que ganan suben de pista y los que pierden bajan. Individual o por parejas.',
                    color: 'yellow'
                }
            ]
                .map((f) => {
                    const formatCheck = canUseFormat(f.id, userPlan, currentUser?.role === 'superadmin');
                    const isDisabled = !formatCheck.allowed;

                    return (
                        <button
                            key={f.id}
                            type="button"
                            role="radio"
                            aria-checked={format === f.id && !isDisabled}
                            aria-disabled={isDisabled}
                            className={`text-left p-4 rounded-lg transition-colors ${isDisabled
                                ? 'border border-rg-line bg-rg-raised cursor-not-allowed'
                                : format === f.id ? 'border-2 border-court bg-court-soft' : 'border border-rg-control bg-white hover:bg-rg-ground'
                                }`}
                            onClick={() => {
                                if (isDisabled) {
                                    alert(formatCheck.message);
                                    return;
                                }
                                setFormat(f.id as RankingFormat);
                                // Reset all step-3 state when changing format to prevent cross-format contamination
                                setAssignments({});
                                setNumDivisions(1);
                                setCategories([]);
                                setCategorySizes({});
                                setFillFromRegistrations(false);

                                setConfig(prev => configForFormat(f.id as RankingFormat, prev));
                                // How many players or pairs go in each division by default
                                const MAX_PER_DIVISION: Partial<Record<RankingFormat, number>> = { pairs: 6, classic: 4, elimination: 8, hybrid: 4 };
                                if (MAX_PER_DIVISION[f.id as RankingFormat]) setIndividualMaxPlayers(MAX_PER_DIVISION[f.id as RankingFormat]!);

                                // Default Official Status
                                if (f.id === 'americano' || f.id === 'mexicano') {
                                    setIsOfficial(false);
                                } else {
                                    setIsOfficial(true);
                                }
                            }}
                        >
                            <span className="flex items-start justify-between gap-3">
                                <span className={`text-[16px] font-semibold ${format === f.id && !isDisabled ? 'text-court-ink' : isDisabled ? 'text-rg-muted' : ''}`}>
                                    {f.label}
                                    {(f as any).beta && <span className="pill bg-[#fffbeb] text-[#92400e] ml-2 align-middle">En pruebas</span>}
                                </span>
                                <span className={`mt-0.5 w-5 h-5 rounded-full flex-none grid place-items-center ${format === f.id && !isDisabled ? 'bg-court' : 'border border-rg-control bg-white'}`} aria-hidden="true">
                                    {format === f.id && !isDisabled && <span className="w-2 h-2 rounded-full bg-white" />}
                                </span>
                            </span>
                            <span className="block text-[14px] text-rg-muted mt-1 leading-snug">{f.desc}</span>
                            {isDisabled && (
                                <span className="block mt-2 text-[13px] text-[#92400e]">Disponible en un plan superior</span>
                            )}
                        </button>
                    );
                })
            }
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h2 className="text-[17px] font-semibold">Datos del torneo</h2>
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                    <Input label="Nombre del torneo" placeholder="Por ejemplo: Liga de Otoño 2026" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="wizard-category" className="block text-[13px] font-medium mb-1.5">Categoría</label>
                    <select id="wizard-category" className="w-full h-10 px-3 rounded-md border border-rg-control bg-white text-[15px] focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                        <option value="Mixto">Mixto</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="wizard-start" className="block text-[13px] font-medium mb-1.5">Empieza el</label>
                    <input id="wizard-start" type="date" className="w-full h-10 px-3 rounded-md border border-rg-control bg-white text-[15px] num focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
            </div>

            {/* Official switch */}
            <label className="flex items-start gap-4 p-4 rounded-lg bg-rg-raised cursor-pointer">
                <span className="flex-1">
                    <span className="block text-[15px] font-semibold">Cuenta para las estadísticas de los jugadores</span>
                    <span className="block text-[14px] text-rg-muted mt-0.5">
                        {isOfficial
                            ? 'Los partidos suman a los partidos jugados, ganados y al porcentaje de victorias de cada jugador.'
                            : 'Torneo amistoso: no cambia las estadísticas de nadie. Es lo recomendado para americanos y mexicanos.'}
                    </span>
                </span>
                <input type="checkbox" role="switch" checked={isOfficial} onChange={() => setIsOfficial(!isOfficial)} className="sr-only peer" />
                <span aria-hidden="true" className={`mt-1 w-10 h-6 rounded-full flex-none relative transition-colors ${isOfficial ? 'bg-court' : 'bg-rg-control'} peer-focus-visible:ring-2 peer-focus-visible:ring-court-track`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isOfficial ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </span>
            </label>

            {goldenPointApplies(format, config) && (
                <label className="flex items-start gap-4 p-4 rounded-lg bg-rg-raised cursor-pointer">
                    <span className="flex-1">
                        <span className="block text-[15px] font-semibold">Se juega con punto de oro</span>
                        <span className="block text-[14px] text-rg-muted mt-0.5">Solo informativo: los jugadores lo verán en la vista pública y en la TV.</span>
                    </span>
                    <input type="checkbox" role="switch" checked={!!config.goldenPoint} onChange={(e) => setConfig(prev => ({ ...prev, goldenPoint: e.target.checked }))} className="sr-only peer" />
                    <span aria-hidden="true" className={`mt-1 w-10 h-6 rounded-full flex-none relative transition-colors ${config.goldenPoint ? 'bg-court' : 'bg-rg-control'} peer-focus-visible:ring-2 peer-focus-visible:ring-court-track`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.goldenPoint ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </span>
                </label>
            )}

            {/* Format-specific config */}
            {(format === 'americano' || format === 'mexicano') && (
                <AmericanoConfig
                    format={format}
                    config={config} setConfig={setConfig}
                    numDivisions={numDivisions} setNumDivisions={setNumDivisions}
                    individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers}
                />
            )}
            {format === 'hybrid' && <HybridConfig config={config} setConfig={setConfig} numDivisions={numDivisions} />}
            {format === 'pozo' && <PozoConfig config={config} setConfig={setConfig} />}
            {format === 'elimination' && (
                <EliminationConfig
                    config={config} setConfig={setConfig}
                    numDivisions={numDivisions} setNumDivisions={setNumDivisions}
                    individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers}
                    categories={categories} setCategories={setCategories}
                    newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName}
                />
            )}
            {(format === 'individual' || format === 'pairs') && (
                <LeagueConfig
                    format={format}
                    config={config} setConfig={setConfig}
                    numDivisions={numDivisions} setNumDivisions={setNumDivisions}
                    individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers}
                />
            )}

            {format !== 'pozo' && format !== 'elimination' && (
                <TieBreakConfig config={config} setConfig={setConfig} pointBased={format === 'americano' || format === 'mexicano'} />
            )}
        </div>
    );

    const supportsRegFill = REG_FILL_FORMATS.includes(format);

    const renderStep3 = () => (
        <div className="space-y-6">
            <h2 className="text-[17px] font-semibold">Jugadores y divisiones</h2>
            {supportsRegFill && (
                <label className="flex items-start gap-4 p-4 rounded-lg bg-court-soft border border-court-track cursor-pointer">
                    <span className="flex-1">
                        <span className="block text-[15px] font-semibold text-court-ink">
                            Llenar el torneo con las inscripciones públicas
                        </span>
                        <span className="block text-[14px] text-rg-muted mt-0.5">
                            {fillFromRegistrations
                                ? 'Se crea el torneo sin parejas y con la inscripción abierta. Comparte el enlace, aprueba las inscripciones y genera el cuadro o el calendario con un clic en «Inscripciones».'
                                : 'Los jugadores se inscriben desde el enlace público y tú los apruebas: el cuadro o el calendario se genera con las parejas aprobadas.'}
                        </span>
                        {!fillFromRegistrations && (
                            <span className="block text-[13px] text-rg-muted mt-1">
                                Después de crearlo, configura los días del torneo en «Disponibilidad» para abrir la inscripción.
                            </span>
                        )}
                    </span>
                    <input
                        type="checkbox"
                        role="switch"
                        checked={fillFromRegistrations}
                        onChange={() => setFillFromRegistrations(!fillFromRegistrations)}
                        className="sr-only peer"
                    />
                    <span aria-hidden="true" className={`mt-1 w-10 h-6 rounded-full flex-none relative transition-colors ${fillFromRegistrations ? 'bg-court' : 'bg-rg-control'} peer-focus-visible:ring-2 peer-focus-visible:ring-court-track`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${fillFromRegistrations ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </span>
                </label>
            )}
            {!fillFromRegistrations && (
                <>
                    {(format === 'americano' || format === 'mexicano') && <AmericanoAssignments format={format} config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} />}
                    {format === 'elimination' && <EliminationAssignments config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} categories={categories} categorySizes={categorySizes} setCategorySizes={setCategorySizes} onCreateGuest={handleCreateGuest} />}
                    {(format === 'classic' || format === 'individual' || format === 'pairs' || format === 'hybrid' || format === 'pozo') && <LeagueAssignments format={format} config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} setDrawSeed={setDrawSeed} />}
                </>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-7">
            <div>
                <h2 className="text-[17px] font-semibold">Presentación</h2>
                <p className="text-[14px] text-rg-muted mt-0.5">Opcional. Puedes cambiarlo cuando quieras en los ajustes del torneo, en «Presentación».</p>
            </div>
            <section className="space-y-3">
                <div>
                    <h3 className="text-[15px] font-semibold">Logo del torneo</h3>
                    <p className="text-[13px] text-rg-muted mt-0.5">Sale en la vista pública y en el modo TV. Si no subes uno, se usa el del club.</p>
                </div>
                <LogoPicker logoUrl={config.branding?.logoUrl} allowed={['pro', 'star', 'weekend', 'trial'].includes(userPlan)}
                    onChange={(logoUrl) => setConfig(prev => ({ ...prev, branding: { ...prev.branding, logoUrl } }))} />
            </section>
            <section className="space-y-3">
                <div>
                    <h3 className="text-[15px] font-semibold">Patrocinadores</h3>
                    <p className="text-[13px] text-rg-muted mt-0.5">Salen en el modo TV, en la pantalla del club. Mejor en PNG con fondo transparente.</p>
                </div>
                <SponsorsEditor sponsors={sponsors} onChange={setSponsors} />
            </section>
        </div>
    );

    const handleSaveRanking = () => {
        const userPlan = currentUser?.plan || 'free';
        const tournamentCheck = canCreateTournament(activeRankingsCount, userPlan, currentUser?.role === 'superadmin');
        if (!tournamentCheck.allowed) return alert(tournamentCheck.message);
        if (!name) return alert('Falta el nombre del torneo');

        // In registration mode the tournament is created empty: the divisions are generated
        // later from the approved public registrations (gestor de inscripciones).
        const registrationMode = supportsRegFill && fillFromRegistrations;

        let divisions: Division[] = [];
        if (!registrationMode) {
            try {
                divisions = generateDivisions({
                    format,
                    assignments,
                    config,
                    numDivisions,
                    individualMaxPlayers,
                    categories,
                    categorySizes: {},
                    selectedPlayerIds,
                    availablePlayers: [...Object.values(players), ...guestPlayers],
                });
            } catch (err) {
                return alert(err.message);
            }
        }

        const activeGuestPlayers = guestPlayers.filter(g => {
            const manualIds = Object.values(assignments)
                .flat()
                .map((pair) => typeof pair === 'string' && pair.includes('::') ? pair.split('::') : pair)
                .flat();
            return manualIds.includes(g.id) || selectedPlayerIds.includes(g.id);
        });

        const registrationCategories = format === 'elimination' && categories.length
            ? categories
            : DEFAULT_REGISTRATION_CATEGORIES;

        const newRanking = {
            id: `r-${crypto.randomUUID()}`,
            nombre: name,
            categoria: category,
            fechaInicio: startDate,
            status: 'activo',
            divisions,
            format,
            config: { ...config, maxPlayersPerDivision: format === 'individual' ? individualMaxPlayers : undefined },
            isOfficial,
            guestPlayers: activeGuestPlayers,
            ...(registrationMode ? { registrationConfig: { isOpen: true, categories: registrationCategories } } : {}),
            ...(format === 'hybrid' && drawSeed !== undefined ? { drawSeed } : {}),
            ...(sponsors.length ? { tvConfig: { enabled: true, slideDuration: 15, showStandings: true, showMatches: true, showQR: true, showSponsors: true, sponsors } } : {}),
        };

        onSave(newRanking);
    };

    const goTo = (n: number) => { setStep(n); window.scrollTo({ top: 0 }); };
    // A format the plan does not include can be the initial value: it never counts as chosen
    const formatAllowed = canUseFormat(format, userPlan, currentUser?.role === 'superadmin').allowed;

    return (
        <div className="rg max-w-5xl mx-auto space-y-5">
            {/* Title row */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold tracking-[-0.015em]">Nuevo torneo</h1>
                    <p className="text-[15px] text-rg-muted mt-0.5 num">Paso {step} de {STEPS.length}: {STEPS[step - 1].title.toLowerCase()}</p>
                </div>
                <button type="button" onClick={onCancel} className="h-9 px-3 rounded-md text-[14px] font-medium text-rg-muted hover:text-rg-ink hover:bg-rg-raised">Cancelar</button>
            </div>

            {/* Steps */}
            <ol className="grid grid-cols-4 gap-2" aria-label="Pasos">
                {STEPS.map(st => (
                    <li key={st.number}>
                        <button
                            type="button"
                            onClick={() => st.number < step && goTo(st.number)}
                            disabled={st.number >= step}
                            aria-current={st.number === step ? 'step' : undefined}
                            className="w-full text-left disabled:cursor-default"
                        >
                            <span className={`block h-1 rounded-full ${st.number <= step ? 'bg-court' : 'bg-court-track'}`} />
                            <span className={`block mt-1.5 text-[13px] ${st.number === step ? 'font-semibold text-rg-ink' : st.number < step ? 'text-court hover:text-court-ink' : 'text-rg-muted'}`}>{st.title}</span>
                        </button>
                    </li>
                ))}
            </ol>

            {/* Content */}
            <div className="bg-white border border-rg-line rounded-lg p-4 md:p-6">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </div>

            {/* Footer actions, kept in view at the bottom of the page */}
            <div className="sticky bottom-20 lg:bottom-0 z-20 -mx-4 lg:mx-0 px-4 lg:px-0 py-3 bg-rg-ground flex justify-between items-center">
                <Button disabled={step === 1} variant="secondary" onClick={() => goTo(step - 1)}>Atrás</Button>
                {step < STEPS.length ? (
                    <span className="flex items-center gap-3">
                        {step === 1 && !formatAllowed && <span className="text-[13px] text-rg-muted">Elige un formato para seguir</span>}
                        <Button disabled={step === 1 && !formatAllowed} onClick={() => goTo(step + 1)}>Siguiente <ArrowRight size={16} /></Button>
                    </span>
                ) : (
                    <Button onClick={handleSaveRanking}>Crear torneo <CheckCircle size={16} /></Button>
                )}
            </div>
        </div>
    );
};
