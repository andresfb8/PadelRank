import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Settings, Grid, CheckCircle, Info, X, UserPlus, Shield, Wand2, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button, Card, Input } from './ui/Components';
import * as PozoEngine from '../services/PozoEngine';
import { SearchableSelect } from './SearchableSelect';
import { MatchGenerator } from '../services/matchGenerator';
import { TournamentEngine } from '../services/TournamentEngine';
import { User, Player, Ranking, RankingFormat, RankingConfig, ScoringMode, Division, TieBreakCriterion, DEFAULT_TIE_BREAK_ORDER } from '../types';
import { SUBSCRIPTION_PLANS, canUseFormat, canCreateTournament } from '../config/subscriptionPlans';

import { generateDivisions } from '../services/wizardGenerators';
import { AmericanoConfig } from './ranking-wizard/AmericanoConfig';
import { AmericanoAssignments } from './ranking-wizard/AmericanoAssignments';
import { EliminationConfig } from './ranking-wizard/EliminationConfig';
import { EliminationAssignments } from './ranking-wizard/EliminationAssignments';
import { HybridConfig } from './ranking-wizard/HybridConfig';
import { LeagueConfig } from './ranking-wizard/LeagueConfig';
import { LeagueAssignments } from './ranking-wizard/LeagueAssignments';
import { PozoConfig } from './ranking-wizard/PozoConfig';
import { TieBreakConfig } from './ranking-wizard/TieBreakConfig';

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
];

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

    // Config
    const [config, setConfig] = useState<RankingConfig>({
        pointsPerWin2_0: 4,
        pointsPerWin2_1: 3,
        pointsDraw: 2,
        pointsPerLoss2_1: 1,
        pointsPerLoss2_0: 0,
        promotionCount: 2,
        relegationCount: 2,
        courts: 2,
        scoringMode: '24', // Default for Mexicano/Americano
        eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' },
        hybridConfig: {
            qualifiersPerGroup: 2,
            pairsPerGroup: 4,
            consolationQualifiersPerGroup: 0,
            pointsPerWin2_0: 3,
            pointsPerWin2_1: 2,
            pointsDraw: 1,
            pointsPerLoss2_1: 1,
            pointsPerLoss2_0: 0
        },
        branding: {
            logoUrl: currentUser?.branding?.logoUrl
        },
        tieBreakCriteria: DEFAULT_TIE_BREAK_ORDER
    });

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

    // --- Helpers ---
    const availablePlayers = [...Object.values(players), ...guestPlayers];

    // --- Steps Renderers ---

    const renderStep1 = () => (
        <div className="grid md:grid-cols-2 gap-4">
            {[
                {
                    id: 'classic',
                    label: 'Ranking clásica CPSJ',
                    desc: 'Grupos de 4 jugadores. Todos contra todos en cada división. Ascensos y descensos.',
                    color: 'blue'
                },
                {
                    id: 'individual',
                    label: 'Ranking Individual',
                    desc: 'Liga individual con divisiones. Partidos con parejas rotatorias o aleatorias.',
                    color: 'purple'
                },
                {
                    id: 'pairs',
                    label: 'Ranking por Parejas',
                    desc: 'Liga de Parejas Fijas. 2 vs 2. Partidos Round Robin.',
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
                    desc: 'Partidos nivelados. Los ganadores juegan entre sí. El mejor sistema competitvo rápido.',
                    color: 'orange' // Mexicano usually relates to fun/dynamic
                },
                {
                    id: 'elimination',
                    label: 'Eliminación Directa (Torneo) (BETA)',
                    desc: 'Cuadro principal y de consolación. Cabezas de serie y avance por rondas.',
                    color: 'red'
                },
                {
                    id: 'hybrid',
                    label: 'Híbrido (Liga + Playoff)',
                    desc: 'Fase de Grupos (Liga) seguida de Fase Final (Eliminatoria). Ideal para "Mundialitos" o "Champions".',
                    color: 'pink'
                },
                {
                    id: 'pozo',
                    label: 'Pozo / King of the Court',
                    desc: 'Sube y baja de pista. Ganadores suben, Perdedores bajan. Individual o Parejas.',
                    color: 'yellow'
                }
            ]
                .map((f) => {
                    const formatCheck = canUseFormat(f.id, userPlan, currentUser?.role === 'superadmin');
                    const isDisabled = !formatCheck.allowed;

                    return (
                        <div
                            key={f.id}
                            className={`p-6 rounded-xl border-2 transition-all ${isDisabled
                                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                : `cursor-pointer hover:scale-[1.02] ${format === f.id ? `border-${f.color}-500 bg-${f.color}-50 ring-2 ring-${f.color}-200` : 'border-gray-200 hover:border-gray-300 bg-white'}`
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

                                // Pairs Defaults
                                if (f.id === 'pairs') {
                                    setIndividualMaxPlayers(6);
                                    setConfig(prev => ({
                                        ...prev,
                                        promotionCount: 0,
                                        relegationCount: 0,
                                        pointsPerWin2_0: 3,
                                        pointsPerWin2_1: 2,
                                        pointsDraw: 1,
                                        pointsPerLoss2_1: 1,
                                        pointsPerLoss2_0: 0
                                    }));
                                }
                                // Update Config Points if Classic
                                else if (f.id === 'classic') {
                                    setIndividualMaxPlayers(4); // Reset if coming from pairs
                                    setConfig(prev => ({
                                        ...prev,
                                        pointsPerWin2_0: 4,
                                        pointsPerWin2_1: 3,
                                        pointsDraw: 2,
                                        pointsPerLoss2_1: 1,
                                        pointsPerLoss2_0: 0
                                    }));
                                    // Reset to defaults for other formats
                                    setIndividualMaxPlayers(12); // Default
                                    setConfig(prev => ({
                                        ...prev,
                                        pointsPerWin2_0: 3,
                                        pointsPerWin2_1: 2,
                                        pointsDraw: 1,
                                        pointsPerLoss2_1: 1,
                                        pointsPerLoss2_0: 0
                                    }));
                                } else if (f.id === 'elimination') {
                                    setNumDivisions(1); // Default to 1 category
                                    setIndividualMaxPlayers(8); // Default pairs per category
                                    setConfig(prev => ({
                                        ...prev,
                                        eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' }
                                    }));
                                } else if (f.id === 'hybrid') {
                                    setNumDivisions(1);
                                    setIndividualMaxPlayers(4); // Groups of 4 usually
                                    setConfig(prev => ({
                                        ...prev,
                                        pointsPerWin2_0: 3,
                                        pointsPerWin2_1: 2,
                                        pointsDraw: 1,
                                        pointsPerLoss2_1: 1,
                                        pointsPerLoss2_0: 0,
                                        hybridConfig: {
                                            qualifiersPerGroup: 2,
                                            pairsPerGroup: 4,
                                            consolationQualifiersPerGroup: 0,
                                            pointsPerWin2_0: 3,
                                            pointsPerWin2_1: 2,
                                            pointsDraw: 1,
                                            pointsPerLoss2_1: 1,
                                            pointsPerLoss2_0: 0
                                        }
                                    }));
                                } else if (f.id === 'pozo') {
                                    setNumDivisions(1);
                                    setConfig(prev => ({
                                        ...prev,
                                        pozoConfig: {
                                            variant: 'individual',
                                            numCourts: 2,
                                            scoringMode: 'per-game',
                                            goldenPoint: true
                                        }
                                    }));
                                }

                                // Default Official Status
                                if (f.id === 'americano' || f.id === 'mexicano') {
                                    setIsOfficial(false);
                                } else {
                                    setIsOfficial(true);
                                }
                            }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`text-lg font-bold text-gray-900`}>{f.label}</h3>
                                {format === f.id && <CheckCircle className={`text-${f.color}-500`} size={24} />}
                            </div>
                            <p className="text-gray-500 text-sm">{f.desc}</p>
                            {isDisabled && (
                                <div className="mt-2 text-xs text-orange-600 font-medium">
                                    🔒 Mejora tu plan para acceder
                                </div>
                            )}
                        </div>
                    );
                })
            }
        </div >
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Datos Generales</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <Input label="Nombre del Torneo" placeholder="Ej: Super Cup 2025" value={name} onChange={(e) => setName(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select className="input-field w-full border p-2 rounded-lg" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="Mixto">Mixto</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input type="date" className="input-field w-full border p-2 rounded-lg" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
            </div>

            {/* Official Toggle */}
            <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${isOfficial ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setIsOfficial(!isOfficial)}>
                <div className={`mt-1 p-1 rounded-full ${isOfficial ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Shield size={16} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-800">{isOfficial ? 'Torneo Oficial (Cuenta para Ranking)' : 'Torneo NO Oficial'}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">Click para cambiar</span>
                            {isOfficial ? <CheckCircle size={18} className="text-blue-600" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300" />}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {isOfficial
                            ? 'Los partidos afectarán a las estadísticas globales (PJ, PG, Winrate) de los jugadores registrados.'
                            : 'Torneo AMISTOSO. Los resultados NO contarán para el historial ni estadísticas globales de los jugadores. Opcion RECOMENDADA para torneos rápidos (Americano/Mexicano) para no desvirtuar estadisticas.'}
                    </p>
                </div>
            </div>

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
                <TieBreakConfig config={config} setConfig={setConfig} />
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Jugadores y Asignaciones</h3>
            {(format === 'americano' || format === 'mexicano') && <AmericanoAssignments format={format} config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} />}
            {format === 'elimination' && <EliminationAssignments format={format} config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} categories={categories} categorySizes={categorySizes} setCategorySizes={setCategorySizes} />}
            {(format === 'classic' || format === 'individual' || format === 'pairs' || format === 'hybrid' || format === 'pozo') && <LeagueAssignments format={format} config={config} setConfig={setConfig} assignments={assignments} setAssignments={setAssignments} selectedPlayerIds={selectedPlayerIds} availablePlayers={availablePlayers} numDivisions={numDivisions} setNumDivisions={setNumDivisions} individualMaxPlayers={individualMaxPlayers} setIndividualMaxPlayers={setIndividualMaxPlayers} setDrawSeed={setDrawSeed} />}
        </div>
    );

    const handleSaveRanking = () => {
        const userPlan = currentUser?.plan || 'free';
        const tournamentCheck = canCreateTournament(activeRankingsCount, userPlan, currentUser?.role === 'superadmin');
        if (!tournamentCheck.allowed) return alert(tournamentCheck.message);
        if (!name) return alert('Falta el nombre del torneo');

        let divisions = [];
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

        const activeGuestPlayers = guestPlayers.filter(g => {
            const manualIds = Object.values(assignments)
                .flat()
                .map((pair) => typeof pair === 'string' && pair.includes('::') ? pair.split('::') : pair)
                .flat();
            return manualIds.includes(g.id) || selectedPlayerIds.includes(g.id);
        });

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
            ...(format === 'hybrid' && drawSeed !== undefined ? { drawSeed } : {}),
        };

        onSave(newRanking);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in text-gray-800">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-primary" /> Nuevo Torneo</h2>
                <Button variant="secondary" onClick={onCancel}><X size={20} /></Button>
            </div>

            {/* Stepper */}
            <div className="flex justify-center mb-6 md:mb-8 overflow-x-auto px-2">
                {STEPS.map((s, idx) => (
                    <div key={s.number} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1 md:gap-2 relative z-10 ${step >= s.number ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all ${step >= s.number ? 'bg-primary text-white shadow-lg scale-110' : 'bg-gray-100'}`}>
                                {s.number}
                            </div>
                            <span className="text-[10px] md:text-xs font-bold uppercase whitespace-nowrap">{s.title}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`w-8 md:w-24 h-1 -mt-5 mx-1 md:mx-2 transition-colors ${step > s.number ? 'bg-primary' : 'bg-gray-100'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Content */}
            <Card className="min-h-[400px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </Card>

            {/* Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-[60] flex justify-between max-w-5xl mx-auto items-center pb-safe">
                <Button disabled={step === 1} variant="secondary" onClick={() => setStep(step - 1)}>Atrás</Button>

                <div className="flex gap-2">
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1)}>Siguiente <ArrowRight size={16} className="ml-2" /></Button>
                    ) : (
                        <Button onClick={handleSaveRanking} className="bg-green-600 hover:bg-green-700 text-white">Crear Torneo <CheckCircle size={16} className="ml-2" /></Button>
                    )}
                </div>
            </div>
        </div>
    );
};


// Missing X definition

