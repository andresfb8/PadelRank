import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Settings, Grid, CheckCircle, Info, X, UserPlus, Shield, Wand2, Trash2, Plus } from 'lucide-react';
import { Button, Card, Input } from './ui/Components';
import { Player, Ranking, RankingFormat, RankingConfig, Division, ScoringMode } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { MatchGenerator } from '../services/matchGenerator';
import { TournamentEngine } from '../services/TournamentEngine';
import { User } from '../types';
import { SUBSCRIPTION_PLANS, canUseFormat, canCreateTournament } from '../config/subscriptionPlans';

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
        scoringMode: '24',  // Default for Mexicano/Americano
        scorignMode: '24', // Default for Mexicano/Americano
        eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' },
        hybridConfig: { qualifiersPerGroup: 2, pairsPerGroup: 4 }
    });

    // Players
    // For Classic & Individual: We use Divisions logic.
    // For Others: We just need a pool of players.
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [numDivisions, setNumDivisions] = useState(1);
    const [categories, setCategories] = useState<string[]>([]); // Start empty to prevent default duplicates
    const [individualMaxPlayers, setIndividualMaxPlayers] = useState(12); // Default for individual
    const [categorySizes, setCategorySizes] = useState<Record<number, number>>({});
    const [assignments, setAssignments] = useState<Record<number, string[]>>({});
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
                    label: 'Eliminación Directa (Torneo)',
                    desc: 'Cuadro principal y de consolación. Cabezas de serie y avance por rondas.',
                    color: 'red'
                },
                {
                    id: 'hybrid',
                    label: 'Híbrido (Liga + Playoff) (BETA)',
                    desc: 'Fase de Grupos (Liga) seguida de Fase Final (Eliminatoria). Ideal para "Mundialitos" o "Champions".',
                    color: 'pink'
                }
            ].filter(f => f.id !== 'classic' || currentUser?.email?.toLowerCase().includes('info@clubdepadelsanjavier') || currentUser?.role === 'superadmin')
                .map((f) => {
                    const formatCheck = canUseFormat(f.id, userPlan, currentUser?.email, currentUser?.role === 'superadmin');
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
                                // Reset assignments when changing format
                                setAssignments({});
                                setNumDivisions(1);

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
                                        hybridConfig: { qualifiersPerGroup: 2 }
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
                <Input label="Nombre del Torneo" placeholder="Ej: Super Cup 2025" value={name} onChange={(e: any) => setName(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select className="input-field w-full border p-2 rounded-lg" value={category} onChange={(e: any) => setCategory(e.target.value)}>
                        <option value="Mixto">Mixto</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input type="date" className="input-field w-full border p-2 rounded-lg" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
                </div>
            </div>

            {/* Official Tournament Toggle */}
            <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${isOfficial ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setIsOfficial(!isOfficial)}>
                <div className={`mt-1 p-1 rounded-full ${isOfficial ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Shield size={16} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-800">
                            {isOfficial ? "Torneo Oficial (Cuenta para Ranking)" : "Torneo NO Oficial"}
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">Click para cambiar</span>
                            {isOfficial ? <CheckCircle size={18} className="text-blue-600" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300"></div>}
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        {isOfficial
                            ? "Los partidos afectarán a las estadísticas globales (PJ, PG, Winrate) de los jugadores registrados."
                            : "Torneo AMISTOSO. Los resultados NO contarán para el historial ni estadísticas globales de los jugadores. Opcion RECOMENDADA para torneos rápidos (Americano/Mexicano) para no desvirtuar estadisticas."}
                    </p>
                </div>
            </div>

            {/* Mexicano/Americano Configuration */}
            {(format === 'mexicano' || format === 'americano') && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} /> Configuración del Torneo</h3>

                    {/* Courts */}
                    <div className="mb-4">
                        <Input
                            type="number"
                            label="Número de Pistas"
                            value={config.courts || 2}
                            onChange={(e: any) => setConfig({ ...config, courts: parseInt(e.target.value) || 2 })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Determina cuántos partidos simultáneos se pueden jugar por ronda
                        </p>
                    </div>

                    {/* Scoring Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sistema de Puntuación</label>
                        <select
                            className="input-field w-full border p-2 rounded-lg mb-2"
                            value={config.scoringMode || '24'}
                            onChange={(e: any) => setConfig({ ...config, scoringMode: e.target.value as ScoringMode })}
                        >
                            <option value="16">16 Puntos</option>
                            <option value="21">21 Puntos</option>
                            <option value="24">24 Puntos</option>
                            <option value="31">31 Puntos</option>
                            <option value="32">32 Puntos</option>
                            <option value="custom">Puntos Personalizados</option>
                            <option value="per-game">Por Juego (Tradicional)</option>
                        </select>

                        {/* Custom Points Input */}
                        {/* Custom Points Input REMOVED - Free Text Mode now enabled */}

                        <p className="text-xs text-gray-500 mt-1">
                            {config.scoringMode === 'per-game'
                                ? 'Sistema tradicional: 6 juegos por set, mejor de 3 sets'
                                : 'Los equipos acumulan puntos hasta alcanzar el total. El sistema autorellena la puntuación del rival.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Hybrid Configuration */}
            {format === 'hybrid' && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} /> Configuración de Fase de Grupos</h3>

                    <div className="bg-pink-50 border border-pink-100 p-4 rounded-lg mb-4 text-sm text-pink-800">
                        <Info size={16} className="inline mr-2 mb-1" />
                        En este formato, los jugadores competirán primero en grupos (ligas pequeñas) y los mejores de cada grupo pasarán a una fase final eliminatoria.
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Input
                            type="number"
                            label="Clasifican por Grupo"
                            value={config.hybridConfig?.qualifiersPerGroup || 2}
                            onChange={(e: any) => setConfig({ ...config, hybridConfig: { ...config.hybridConfig!, qualifiersPerGroup: parseInt(e.target.value) || 1 } })}
                        />
                        <Input
                            type="number"
                            label="Parejas por Grupo"
                            value={config.hybridConfig?.pairsPerGroup || 4}
                            onChange={(e: any) => setConfig({ ...config, hybridConfig: { ...config.hybridConfig!, pairsPerGroup: parseInt(e.target.value) || 2 } })}
                        />
                        <div className="text-xs text-gray-500 mt-2 md:col-span-2">
                            Número de jugadores/parejas de cada grupo que pasarán al Playoff (Cuadro Final).
                            <br />Por ejemplo, si hay 4 grupos y clasifican 2, se creará un cuadro de Cuartos de Final (8 participantes).
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        <Input type="number" label="Victoria 2-0" value={config.pointsPerWin2_0} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_0: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Victoria 2-1" value={config.pointsPerWin2_1} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_1: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Empate" value={config.pointsDraw} onChange={(e: any) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Derrota 1-2" value={config.pointsPerLoss2_1} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_1: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Derrota 0-2" value={config.pointsPerLoss2_0} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_0: parseInt(e.target.value) || 0 })} />
                    </div>
                </div>
            )}

            {/* Individual/Pairs Configuration */}
            {(format === 'individual' || format === 'pairs') && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Sistema de Puntuación</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <Input type="number" label="Victoria 2-0" value={config.pointsPerWin2_0} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_0: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Victoria 2-1" value={config.pointsPerWin2_1} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_1: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Empate" value={config.pointsDraw} onChange={(e: any) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Derrota 1-2" value={config.pointsPerLoss2_1} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_1: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Derrota 0-2" value={config.pointsPerLoss2_0} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_0: parseInt(e.target.value) || 0 })} />
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <Input type="number" label="Nº Divisiones" value={numDivisions} onChange={(e: any) => setNumDivisions(Math.max(1, parseInt(e.target.value) || 1))} />
                        <Input type="number" label={format === 'pairs' ? "Parejas/Div" : "Jugadores/Div"} value={individualMaxPlayers} onChange={(e: any) => { const newValue = Math.max(0, parseInt(e.target.value) || 0); setIndividualMaxPlayers(newValue); setConfig({ ...config, maxPlayersPerDivision: newValue }); }} />
                        <Input type="number" label="Ascienden" value={config.promotionCount} onChange={(e: any) => setConfig({ ...config, promotionCount: parseInt(e.target.value) || 0 })} />
                        <Input type="number" label="Descienden" value={config.relegationCount} onChange={(e: any) => setConfig({ ...config, relegationCount: parseInt(e.target.value) || 0 })} />
                    </div>
                </div>
            )}
            {/* Elimination Configuration */}
            {format === 'elimination' && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Trophy size={18} /> Configuración del Torneo</h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad</label>
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, type: 'individual' } })}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${config.eliminationConfig?.type === 'individual' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Individual
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, type: 'pairs' } })}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${config.eliminationConfig?.type === 'pairs' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Parejas
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.eliminationConfig?.consolation}
                                    onChange={(e) => setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, consolation: e.target.checked } })}
                                    className="w-5 h-5 text-primary rounded"
                                />
                                <span className="text-sm font-medium text-gray-700 font-bold">Cuadro de Consolación</span>
                            </label>
                            <p className="text-xs text-gray-500 ml-7">
                                Los perdedores de la primera ronda juegan un torneo paralelo.
                            </p>
                        </div>
                    </div>
                </div>
            )}



            {
                format === 'elimination' && (
                    <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categorías del Torneo</label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="Nueva Categoría (ej: 1ª Masculina)"
                                value={newCategoryName}
                                onChange={(e: any) => setNewCategoryName(e.target.value)}
                            />
                            <Button onClick={() => {
                                if (newCategoryName.trim()) {
                                    if (categories.some(c => c.toLowerCase() === newCategoryName.trim().toLowerCase())) {
                                        alert("La categoría ya existe");
                                        return;
                                    }
                                    setCategories([...categories, newCategoryName]);
                                    setNewCategoryName('');
                                }
                            }}><Plus size={16} /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="bg-white border px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    {cat}
                                    <button onClick={() => setCategories(categories.filter((_, i) => i !== idx))} className="text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                        {categories.length === 0 && <p className="text-xs text-red-500 mt-1">Debes añadir al menos una categoría.</p>}
                    </div>
                )
            }
        </div>
    );



    const handleAssignment = (divIdx: number, pIdx: number, pId: string, maxP: number) => {
        const newA = { ...assignments };
        if (!newA[divIdx]) newA[divIdx] = Array(maxP).fill('');
        // Resize if needed (e.g. if maxPlayers increased)
        if (newA[divIdx].length < maxP) {
            newA[divIdx] = [...newA[divIdx], ...Array(maxP - newA[divIdx].length).fill('')];
        }
        newA[divIdx][pIdx] = pId;
        setAssignments(newA);
    };



    const renderStep3 = () => {
        // Unified Step 3: Select Pool First (for all formats or at least optional for Classic/Pairs)
        // Actually, to support "Random Distribute", we need the pool for everyone.

        const handleAutoDistribute = () => {
            if (selectedPlayerIds.length === 0) return alert("Selecciona jugadores primero");

            // Randomize
            const shuffled = [...selectedPlayerIds].sort(() => Math.random() - 0.5);

            // Distribute based on Format
            if (format === 'classic') {
                const playersPerDiv = 4;
                const neededDivs = Math.ceil(shuffled.length / playersPerDiv);

                // Warn if mismatch
                if (shuffled.length % playersPerDiv !== 0) {
                    alert(`Advertencia: Tienes ${shuffled.length} jugadores. En formato Clásico se necesitan grupos de 4 exactos. Los últimos ${shuffled.length % playersPerDiv} quedarán fuera o incompletos.`);
                }

                // Update Config
                setNumDivisions(neededDivs || 1);

                const newAssignments: Record<number, string[]> = {};
                for (let i = 0; i < neededDivs; i++) {
                    // Take 4 players
                    const slice = shuffled.slice(i * playersPerDiv, (i + 1) * playersPerDiv);
                    // Fill up to 4 with empty strings if not enough
                    while (slice.length < playersPerDiv) slice.push('');
                    newAssignments[i] = slice;
                }
                setAssignments(newAssignments);
            }
            else if (format === 'pairs' || format === 'hybrid') {
                // For Pairs, we need to create pairs random? Or just fill slots?
                // User request says "Mezcle entre divisiones".
                // Assuming randomized pairs too? Or just randomized players into pair slots?
                // Let's pair them 1-2, 3-4, etc.
                // For Hybrid: Use Configured Pairs Per Group. For Pairs League: Default 4 (2 pairs)? Or reuse same logic?
                // The user only asked for Hybrid. Assuming Pairs standard is 4 players (2 pairs) for small leagues? Or maybe more.
                // Let's rely on individualMaxPlayers for Pure Pairs format if needed, but for Hybrid use hybridConfig.
                // Actually, let's stick to 'playersPerDiv' variable logic.
                const targetPairsPerGroup = format === 'hybrid' ? (config.hybridConfig?.pairsPerGroup || 4) : 2; // Default 2 pairs (4 players) for standard pairs if not specified
                const playersPerDiv = targetPairsPerGroup * 2;
                const neededDivs = Math.ceil(shuffled.length / playersPerDiv);

                if (shuffled.length % 2 !== 0) {
                    alert("Advertencia: Número impar de jugadores. Alguien se quedará sin pareja.");
                }

                setNumDivisions(neededDivs || 1);

                const newAssignments: Record<number, string[]> = {};
                for (let i = 0; i < neededDivs; i++) {
                    const divPlayers = shuffled.slice(i * playersPerDiv, (i + 1) * playersPerDiv);
                    const pairStrings: string[] = [];

                    // Create pairs
                    for (let k = 0; k < divPlayers.length; k += 2) {
                        const p1 = divPlayers[k];
                        const p2 = divPlayers[k + 1];
                        if (p1 && p2) pairStrings.push(`${p1}::${p2}`);
                        else if (p1) pairStrings.push(`${p1}::`);
                    }
                    // Fill assignments (RankingWizard expects "p1-p2" strings in array)
                    newAssignments[i] = pairStrings;
                }
                setAssignments(newAssignments);
            }
            else if (format === 'individual') {
                // Distribute across N divisions
                // Default to config.maxPlayersPerDivision if set?
                // Or just spread evenly?
                // Let's use the current numDivisions set by user OR calc based on capacity (e.g. 12 per div)
                const cap = individualMaxPlayers || 12;
                const neededDivs = Math.ceil(shuffled.length / cap);
                setNumDivisions(neededDivs || 1);

                const newAssignments: Record<number, string[]> = {};
                for (let i = 0; i < neededDivs; i++) {
                    const slice = shuffled.slice(i * cap, (i + 1) * cap);
                    newAssignments[i] = slice;
                }
                setAssignments(newAssignments);
            }
        };

        const handleClearAssignments = () => {
            if (confirm("¿Borrar todas las asignaciones de las divisiones?")) {
                setAssignments({});
            }
        };

        return (
            <div className="space-y-6">
                {/* 1. Pool Selection (Always visible now) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800">1. Seleccionar Bolsa de Jugadores ({selectedPlayerIds.length})</h3>
                            <p className="text-sm text-gray-500">Selecciona todos los participantes para distribuirlos o añádelos manualmente abajo.</p>
                        </div>
                        {/* Auto Distribute Actions */}
                        {(format === 'classic' || format === 'individual' || format === 'pairs' || format === 'hybrid') && (
                            <div className="flex gap-2">
                                <Button onClick={handleAutoDistribute} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                                    <Wand2 size={16} className="mr-2" />
                                    Distribución Aleatoria
                                </Button>
                                <Button onClick={handleClearAssignments} variant="secondary" className="text-sm">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Search and Add Player Component (Reused logic) */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Buscar Jugador</label>
                                <SearchableSelect
                                    options={availablePlayers
                                        .filter(p => !selectedPlayerIds.includes(p.id))
                                        .map(p => ({
                                            id: p.id,
                                            label: `${p.nombre} ${p.apellidos || ''}`,
                                            subLabel: p.id.startsWith('guest-') ? 'Invitado' : `Nivel: ${p.stats.winrate}%`
                                        }))}
                                    value=""
                                    onChange={(id) => {
                                        if (id) setSelectedPlayerIds([...selectedPlayerIds, id]);
                                    }}
                                    placeholder="Buscar..."
                                />
                            </div>
                            {/* Guest Add */}
                            <div className="flex-1 flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Añadir Invitado(s)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="input-field flex-1 border p-2 rounded-lg text-sm h-[38px]"
                                            placeholder="Nombre Jugador"
                                            value={newGuestName}
                                            onChange={(e) => setNewGuestName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newGuestName.trim()) {
                                                    const guest = { id: `guest-${Date.now()}`, nombre: newGuestName.trim(), apellidos: '' };
                                                    setGuestPlayers([...guestPlayers, guest]);
                                                    setSelectedPlayerIds([...selectedPlayerIds, guest.id]);
                                                    setNewGuestName('');
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={() => {
                                                if (newGuestName.trim()) {
                                                    const guest = { id: `guest-${Date.now()}`, nombre: newGuestName.trim(), apellidos: '' };
                                                    setGuestPlayers([...guestPlayers, guest]);
                                                    setSelectedPlayerIds([...selectedPlayerIds, guest.id]);
                                                    setNewGuestName('');
                                                }
                                            }}
                                            className="h-[38px] px-3"
                                            title="Añadir Jugador Individual"
                                        ><Plus size={16} /></Button>
                                    </div>
                                    {/* Add Pair Shortcut */}
                                    <div className="mt-2 text-xs text-blue-600 underline cursor-pointer flex items-center gap-1" onClick={() => {
                                        const p1 = prompt("Nombre Jugador 1 de la Pareja:");
                                        if (!p1) return;
                                        const p2 = prompt("Nombre Jugador 2 de la Pareja:");
                                        if (!p2) return;

                                        const g1 = { id: `guest-${Date.now()}-1`, nombre: p1, apellidos: '' };
                                        const g2 = { id: `guest-${Date.now()}-2`, nombre: p2, apellidos: '' };

                                        const newGuests = [...guestPlayers, g1, g2];
                                        setGuestPlayers(newGuests);
                                        setSelectedPlayerIds([...selectedPlayerIds, g1.id, g2.id]);
                                    }}>
                                        <Users size={12} /> Añadir Pareja Rápida
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Tags */}
                        {selectedPlayerIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4 max-h-32 overflow-y-auto">
                                {selectedPlayerIds.map(id => {
                                    const p = availablePlayers.find(ap => ap.id === id);
                                    if (!p) return null;
                                    return (
                                        <div key={id} className="bg-white border rounded-full px-3 py-1 text-xs flex items-center gap-2 shadow-sm">
                                            <span>{p.nombre} {p.apellidos}</span>
                                            <button onClick={() => setSelectedPlayerIds(selectedPlayerIds.filter(x => x !== id))} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t pt-6"></div>

                {/* 2. Manual Assignments / View (Conditional per format) */}
                {(format === 'classic' || format === 'individual') && (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="font-bold text-gray-800">2. Grupos / Divisiones (Manual)</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Num. Divisiones:</span>
                                <input type="number" min="1" max="20" value={numDivisions} onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)} className="border p-1 w-16 text-center rounded" />
                            </div>
                        </div>

                        {/* Classic/Individual Rendering Logic (Simplified as before) */}
                        {Array.from({ length: numDivisions }).map((_, divIdx) => (
                            <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                                <h4 className="font-bold mb-2">División {divIdx + 1}</h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {Array.from({ length: format === 'classic' ? 4 : individualMaxPlayers }).map((_, pIdx) => {
                                        const currentList = assignments[divIdx] || [];
                                        const val = currentList[pIdx] || '';
                                        const used = new Set<string>();
                                        Object.values(assignments).forEach((arr: string[]) => arr?.forEach(id => { if (id && id !== val) used.add(id) }));
                                        const options = availablePlayers.filter(p => !used.has(p.id)).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));

                                        return (
                                            <div key={pIdx}>
                                                <label className="text-xs text-gray-500">Jugador {pIdx + 1}</label>
                                                <SearchableSelect options={options} value={val} onChange={(v) => handleAssignment(divIdx, pIdx, v, format === 'classic' ? 4 : individualMaxPlayers)} placeholder="Seleccionar..." />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}


                {(format === 'pairs' || format === 'hybrid') && (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="font-bold text-gray-800">2. {format === 'hybrid' ? 'Grupos (Parejas Fijas)' : 'Divisiones (Parejas)'}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{format === 'hybrid' ? 'Num. Grupos:' : 'Num. Divisiones:'}</span>
                                <input type="number" min="1" max="20" value={numDivisions} onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)} className="border p-1 w-16 text-center rounded" />
                            </div>
                        </div>
                        {Array.from({ length: numDivisions }).map((_, divIdx) => (
                            <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                                <h4 className="font-bold mb-2">{format === 'hybrid' ? `Grupo ${String.fromCharCode(65 + divIdx)}` : `División ${divIdx + 1}`}</h4>
                                <div className="grid gap-4">
                                    {Array.from({ length: format === 'hybrid' ? (config.hybridConfig?.pairsPerGroup || 4) : Math.max(2, individualMaxPlayers) }).map((_, pairIdx) => {
                                        const currentList = assignments[divIdx] || [];
                                        const val = currentList[pairIdx] || '';
                                        const [p1Id, p2Id] = val ? val.split('::') : ['', ''];

                                        const used = new Set<string>();
                                        Object.values(assignments).forEach((arr: string[]) => arr?.forEach(pairStr => {
                                            if (pairStr && pairStr !== val) { const [u1, u2] = pairStr.split('::'); if (u1) used.add(u1); if (u2) used.add(u2); }
                                        }));
                                        if (p1Id) used.add(p1Id);
                                        if (p2Id) used.add(p2Id);
                                        const getOpts = (excludeId: string) => availablePlayers.filter(p => !used.has(p.id) || p.id === excludeId).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));


                                        return (
                                            <div key={pairIdx} className="flex gap-2 items-center bg-white p-2 rounded border">
                                                <span className="text-xs font-bold text-gray-400 w-16">Pareja {pairIdx + 1}</span>
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <SearchableSelect options={getOpts(p1Id)} value={p1Id} onChange={(v) => {
                                                        const currentP1 = v; const currentP2 = p2Id; const finalVal = (currentP1 || currentP2) ? `${currentP1 || ''}::${currentP2 || ''}` : '';
                                                        handleAssignment(divIdx, pairIdx, finalVal, format === 'hybrid' ? (config.hybridConfig?.pairsPerGroup || 4) : Math.max(2, individualMaxPlayers));
                                                    }} placeholder="A" />
                                                    <SearchableSelect options={getOpts(p2Id)} value={p2Id} onChange={(v) => {
                                                        const currentP1 = p1Id; const currentP2 = v; const finalVal = (currentP1 || currentP2) ? `${currentP1 || ''}::${currentP2 || ''}` : '';
                                                        handleAssignment(divIdx, pairIdx, finalVal, format === 'hybrid' ? (config.hybridConfig?.pairsPerGroup || 4) : Math.max(2, individualMaxPlayers));
                                                    }} placeholder="B" />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(format === 'elimination' && config.eliminationConfig?.type === 'pairs') && (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="font-bold text-gray-800">2. Inscripción de Parejas por Categoría</h3>
                        </div>



                        {categories.map((catName, catIdx) => (
                            <div key={catIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-primary">{catName}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Parejas:</span>
                                        <input
                                            type="number"
                                            min="2"
                                            max="64"
                                            value={categorySizes[catIdx] || 8}
                                            onChange={(e) => setCategorySizes({ ...categorySizes, [catIdx]: parseInt(e.target.value) || 8 })}
                                            className="border p-1 w-12 text-center rounded text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {Array.from({ length: categorySizes[catIdx] || 8 }).map((_, pairIdx) => {
                                        // Specific assignment key for categories: use negative index logic or string key?
                                        // assignments is Record<number, string[]>. 
                                        // Let's map categories to indices: 0 = cat[0], 1 = cat[1]...
                                        // This works fine as long as we don't mix with Division logic which also uses indices but that's fine as formats are exclusive.

                                        // Use catIdx as the key in assignments
                                        const currentList = assignments[catIdx] || [];
                                        const val = currentList[pairIdx] || '';
                                        const [p1Id, p2Id] = val ? val.split('::') : ['', ''];

                                        const used = new Set<string>();
                                        // Check usage across ALL categories
                                        Object.values(assignments).forEach((list: string[]) => list?.forEach(pairStr => {
                                            if (pairStr && pairStr !== val) { const [u1, u2] = pairStr.split('::'); if (u1) used.add(u1); if (u2) used.add(u2); }
                                        }));

                                        if (p1Id) used.add(p1Id);
                                        if (p2Id) used.add(p2Id);
                                        const getOpts = (excludeId: string) => {
                                            const opts = availablePlayers.filter(p => !used.has(p.id) || p.id === excludeId);
                                            return opts.sort((a, b) => {
                                                const aSelected = selectedPlayerIds.includes(a.id);
                                                const bSelected = selectedPlayerIds.includes(b.id);
                                                if (aSelected && !bSelected) return -1;
                                                if (!aSelected && bSelected) return 1;
                                                return a.nombre.localeCompare(b.nombre);
                                            }).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
                                        };

                                        return (
                                            <div key={pairIdx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                                <span className="text-xs font-bold text-gray-400 w-16">Pareja {pairIdx + 1}</span>
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <SearchableSelect options={getOpts(p1Id)} value={p1Id} onChange={(v) => {
                                                        const currentP1 = v; const currentP2 = p2Id; const finalVal = (currentP1 || currentP2) ? `${currentP1 || ''}::${currentP2 || ''}` : '';
                                                        handleAssignment(catIdx, pairIdx, finalVal, categorySizes[catIdx] || 8);
                                                    }} placeholder="Jugador A" />
                                                    <SearchableSelect options={getOpts(p2Id)} value={p2Id} onChange={(v) => {
                                                        const currentP1 = p1Id; const currentP2 = v; const finalVal = (currentP1 || currentP2) ? `${currentP1 || ''}::${currentP2 || ''}` : '';
                                                        handleAssignment(catIdx, pairIdx, finalVal, categorySizes[catIdx] || 8);
                                                    }} placeholder="Jugador B" />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };


    // --- Actions ---

    const handleSaveRanking = () => {
        // Check tournament limit
        const tournamentCheck = canCreateTournament(activeRankingsCount, userPlan, currentUser?.role === 'superadmin');
        if (!tournamentCheck.allowed) {
            return alert(tournamentCheck.message);
        }

        // Validation
        if (!name) return alert("Falta el nombre");

        const divisions: Division[] = [];

        if (format === 'classic' || format === 'individual' || format === 'pairs' || format === 'elimination' || format === 'hybrid') {

            if (format === 'elimination') {
                // Loop through configured categories
                if (categories.length === 0) return alert("Debes configurar al menos una categoría");

                for (let i = 0; i < categories.length; i++) {
                    const catName = categories[i];
                    let playersList: string[] = [];

                    if (config.eliminationConfig?.type === 'pairs') {
                        // Get pairs for this category (index i)
                        const p = assignments[i] || [];
                        // Replace split('-') with split('::') and rejoin with '-' for consistency if Bracket expects it? 
                        // Verify format needed by Bracket.
                        // generateBracket expects strings. 
                        // If it expects "p1-p2", we should normalize it here OR change bracket engine.
                        // TournamentEngine line 26: const [p1id, p2id] = p.split('-');
                        // So TournamentEngine EXPECTS '-'. 
                        // We should convert back to '-' here for compatibility, BUT safeguard against IDs having hyphens???
                        // TournamentEngine uses split('-'). If ID has hyphen, TournamentEngine will fail too.
                        // We should fix TournamentEngine or Normalize here.
                        // For now, let's normalize to "::" if we update TournamentEngine, OR we assume IDs don't have hyphens is broken assumption.
                        // Let's replace '::' with '-' is risky if ID has hyphen.
                        // Hack: TournamentEngine uses just IDs.
                        // Actually, generateBracket takes just LIST of string IDs if Type is Individual?
                        // But for Pairs...
                        // If type=pairs, the LIST is strings of "id1-id2".
                        // I should Fix TournamentEngine to support '::' or Robust split?
                        // Let's verify TournamentEngine Logic.
                        // Assuming TournamentEngine is fragile, I better pass "p1::p2" and update TournamentEngine next.
                        // For now, verify this file logic first.

                        // Let's pass '::' separated strings to TournamentEngine and I will update TournamentEngine next.
                        playersList = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
                        if (playersList.length < 2) return alert(`Se necesitan al menos 2 parejas completas para la categoría ${catName}`);
                    } else {
                        // Individual not fully implemented for categories yet based on plan, using simple assignment?
                        // Assuming assignments[i] contains individual IDs too if we updated the render logic.
                        // But Step 3 render for Individual Elimination wasn't updated in this chunk.
                        // Let's assume Pairs mostly as per user request.
                        const p = assignments[i] || [];
                        playersList = p.filter(x => x);
                        if (playersList.length < 2) return alert(`Mínimo 2 jugadores para ${catName}`);
                    }

                    const bracketDivisions = TournamentEngine.generateBracket(playersList, config.eliminationConfig?.consolation || false);

                    // Assign Category Name to these divisions
                    bracketDivisions.forEach(d => {
                        d.category = catName;
                        d.name = `${catName} - ${d.type === 'main' ? 'Principal' : 'Consolación'}`;
                    });

                    divisions.push(...bracketDivisions);
                }

                // Skip the loop below
            } else {
                for (let i = 0; i < numDivisions; i++) {
                    const p = assignments[i] || [];
                    const activePlayers = p.filter(x => x);

                    // Check limits
                    if (format === 'pairs' || format === 'hybrid') {
                        const pairStrings = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
                        if (pairStrings.length < 2) return alert(`Mínimo 2 Parejas completas en Div ${i + 1}`);
                    } else {
                        const minP = 4;
                        if (activePlayers.length < minP) return alert(`Mínimo 4 jugadores en Div ${i + 1}`);
                    }

                    let matches: any[] = [];
                    if (format === 'classic') {
                        if (activePlayers.length !== 4) return alert(`La División ${i + 1} debe tener exactamente 4 jugadores en liga clásica`);
                        matches = MatchGenerator.generateClassic4(activePlayers, i);
                    } else if (format === 'pairs' || format === 'hybrid') {
                        // Pairs Generation
                        const pairStrings = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
                        const pairs = pairStrings.map(s => s.split('::'));
                        // Flatten players for division.players
                        const flatPlayers = pairs.flat();

                        // RE-assign activePlayers to flatPlayers so the division object is correct? 
                        // NO, 'activePlayers' variable above is used? 
                        // Let's override the 'activePlayers' usage or just create division object with it.
                        // Actually, 'activePlayers' calculated earlier was just filtering 'p'. 
                        // For pairs, 'p' contains "id-id".
                        // So 'activePlayers' (the var) contains ["id-id", "id-id"].
                        // Division expects FLAT list of IDs.

                        matches = MatchGenerator.generatePairsLeague(pairs, i);

                        divisions.push({
                            id: `div-${crypto.randomUUID()}`,
                            numero: i + 1,
                            status: 'activa',
                            players: flatPlayers, // Store flat list of IDs
                            stage: format === 'hybrid' ? 'group' : undefined, // Mark as group stage for hybrid
                            name: format === 'hybrid' ? `Grupo ${String.fromCharCode(65 + i)}` : undefined, // Group A, B, etc.
                            matches: matches
                        });
                        continue;
                    } else {
                        // Individual matches (League generation)
                        matches = MatchGenerator.generateIndividualLeague(activePlayers, i);
                    }

                    divisions.push({
                        id: `div-${crypto.randomUUID()}`,
                        numero: i + 1,
                        status: 'activa',
                        players: activePlayers,
                        matches: matches
                    });
                }
            }
        } else {
            // Americano/Mexicano
            if (selectedPlayerIds.length < 4) return alert("Selecciona al menos 4 jugadores");

            let matches: any[] = [];
            if (format === 'mexicano') {
                matches = MatchGenerator.generateIndividualRound(selectedPlayerIds, 0, 1);
            } else if (format === 'americano') {
                const selectedPlayers = selectedPlayerIds.map(id => players[id]).filter(p => !!p);
                matches = MatchGenerator.generateAmericano(selectedPlayers, config.courts || 2);
            }

            divisions.push({
                id: `div-${crypto.randomUUID()}`,
                numero: 1,
                status: 'activa',
                players: selectedPlayerIds,
                matches: matches
            });
        }

        // Filter valid Guest Players (only those selected)
        const activeGuestPlayers = guestPlayers.filter(g =>
            format === 'classic' || format === 'individual' || format === 'pairs' || format === 'hybrid'
                ? Object.values(assignments).flat().map((pair: unknown) => (pair as string).includes('::') ? (pair as string).split('::') : (pair as string)).flat().includes(g.id)
                : selectedPlayerIds.includes(g.id)
        );

        const newRanking: Ranking = {
            id: `r-${crypto.randomUUID()}`,
            nombre: name,
            categoria: category,
            fechaInicio: startDate,
            status: 'activo',
            divisions,
            format,
            config: {
                ...config,
                maxPlayersPerDivision: format === 'individual' ? individualMaxPlayers : undefined
            },
            isOfficial,
            guestPlayers: activeGuestPlayers
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

