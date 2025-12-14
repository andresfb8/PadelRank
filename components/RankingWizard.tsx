import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Settings, Grid, CheckCircle, Info } from 'lucide-react';
import { Button, Card, Input } from './ui/Components';
import { Player, Ranking, RankingFormat, RankingConfig, Division, ScoringMode } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { MatchGenerator } from '../services/matchGenerator';

interface Props {
    players: Record<string, Player>;
    onCancel: () => void;
    onSave: (ranking: Ranking) => void;
}

const STEPS = [
    { number: 1, title: 'Formato', icon: Trophy },
    { number: 2, title: 'Configuración', icon: Settings },
    { number: 3, title: 'Jugadores', icon: Users },
];

export const RankingWizard = ({ players, onCancel, onSave }: Props) => {
    const [step, setStep] = useState(1);

    // --- State ---
    const [format, setFormat] = useState<RankingFormat>('classic');
    const [name, setName] = useState('');
    const [category, setCategory] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Mixto');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Config
    const [config, setConfig] = useState<RankingConfig>({
        pointsPerWin2_0: 3,
        pointsPerWin2_1: 2,
        pointsDraw: 1,
        pointsPerLoss2_1: 1,
        pointsPerLoss2_0: 0,
        promotionCount: 2,
        relegationCount: 2,
        courts: 2,
        scoringMode: '24'  // Default for Mexicano/Americano
    });

    // Players
    // For Classic & Individual: We use Divisions logic.
    // For Others: We just need a pool of players.
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [numDivisions, setNumDivisions] = useState(1);
    const [individualMaxPlayers, setIndividualMaxPlayers] = useState(12); // Default for individual
    const [assignments, setAssignments] = useState<Record<number, string[]>>({});

    // --- Helpers ---
    const availablePlayers = Object.values(players);

    // --- Steps Renderers ---

    const renderStep1 = () => (
        <div className="grid md:grid-cols-2 gap-4">
            {[
                {
                    id: 'classic',
                    label: 'Liga Clásica (Parejas Fijas)',
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
                }
            ].map((f) => (
                <div
                    key={f.id}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${format === f.id ? `border-${f.color}-500 bg-${f.color}-50 ring-2 ring-${f.color}-200` : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    onClick={() => {
                        setFormat(f.id as RankingFormat);
                        // Reset assignments when changing format
                        setAssignments({});
                        setNumDivisions(1);
                    }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-lg font-bold text-gray-900`}>{f.label}</h3>
                        {format === f.id && <CheckCircle className={`text-${f.color}-500`} size={24} />}
                    </div>
                    <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
            ))}
        </div>
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
                        {config.scoringMode === 'custom' && (
                            <Input
                                type="number"
                                label="Puntos Totales"
                                value={config.customPoints || 24}
                                onChange={(e: any) => setConfig({ ...config, customPoints: parseInt(e.target.value) || 24 })}
                            />
                        )}

                        <p className="text-xs text-gray-500 mt-1">
                            {config.scoringMode === 'per-game'
                                ? 'Sistema tradicional: 6 juegos por set, mejor de 3 sets'
                                : 'Los equipos acumulan puntos hasta alcanzar el total. El sistema autorellena la puntuación del rival.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Individual Configuration */}
            {format === 'individual' && (
                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración de Liga</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                        <Input type="number" label="Nº Divisiones" value={numDivisions} onChange={(e: any) => setNumDivisions(Math.max(1, parseInt(e.target.value) || 1))} />
                        <Input type="number" label="Max Jugadores/Div" value={individualMaxPlayers} onChange={(e: any) => setIndividualMaxPlayers(Math.max(2, parseInt(e.target.value) || 2))} />
                        <Input type="number" label="Ascienden" value={config.promotionCount || 2} onChange={(e: any) => setConfig({ ...config, promotionCount: parseInt(e.target.value) })} />
                        <Input type="number" label="Descienden" value={config.relegationCount || 2} onChange={(e: any) => setConfig({ ...config, relegationCount: parseInt(e.target.value) })} />
                    </div>
                </div>
            )}
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
        if (format === 'classic' || format === 'individual') {
            const maxP = format === 'classic' ? 4 : individualMaxPlayers;

            // Generate assignments structure if missing
            const ensureAssignments = () => {
                const newA = { ...assignments };
                let changed = false;
                for (let i = 0; i < numDivisions; i++) {
                    if (!newA[i] || newA[i].length !== maxP) {
                        const current = newA[i] || [];
                        if (current.length < maxP) {
                            newA[i] = [...current, ...Array(maxP - current.length).fill('')];
                        } else {
                            newA[i] = current.slice(0, maxP);
                        }
                        changed = true;
                    }
                }
                if (changed) setAssignments(newA);
            };

            // Run once on render? safer to do it in useEffect or just render what we have and fill on interaction?
            // React render needs to be pure. We can iterate on the fly.

            return (
                <div className="space-y-6">
                    {format === 'classic' && (
                        <div className="flex items-center gap-4 mb-4">
                            <span className="font-bold">Número de Divisiones (Mesas de 4):</span>
                            <input type="number" min="1" max="20" value={numDivisions} onChange={(e) => {
                                const n = parseInt(e.target.value) || 1;
                                setNumDivisions(n);
                            }} className="border p-1 w-16 text-center rounded" />
                        </div>
                    )}

                    {Array.from({ length: numDivisions }).map((_, divIdx) => (
                        <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-bold mb-2">División {divIdx + 1}</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                                {Array.from({ length: maxP }).map((_, pIdx) => {
                                    // Safe access
                                    const currentList = assignments[divIdx] || [];
                                    const val = currentList[pIdx] || '';

                                    // Filter used
                                    const used = new Set<string>();
                                    Object.values(assignments).forEach((arr: string[]) => arr?.forEach(id => { if (id && id !== val) used.add(id) }));
                                    const options = availablePlayers.filter(p => !used.has(p.id)).map(p => ({
                                        id: p.id, label: `${p.nombre} ${p.apellidos}`
                                    }));

                                    return (
                                        <div key={pIdx}>
                                            <label className="text-xs text-gray-500">Jugador {pIdx + 1}</label>
                                            <SearchableSelect options={options} value={val} onChange={(v) => handleAssignment(divIdx, pIdx, v, maxP)} placeholder="Seleccionar..." />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        // For Americano/Mexicano: Select Pool from List with Search
        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <h3 className="font-bold text-gray-800">Seleccionar Jugadores ({selectedPlayerIds.length})</h3>
                    <span className="text-sm text-gray-500">Mínimo 4 jugadores · Múltiplo de 4 recomendado</span>
                </div>

                {/* Search and Add Player */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar y Añadir Jugador</label>
                    <SearchableSelect
                        options={availablePlayers
                            .filter(p => !selectedPlayerIds.includes(p.id))
                            .map(p => ({
                                id: p.id,
                                label: `${p.nombre} ${p.apellidos}`,
                                subLabel: `Nivel: ${p.stats.winrate}%`
                            }))}
                        value=""
                        onChange={(id) => {
                            if (id) setSelectedPlayerIds([...selectedPlayerIds, id]);
                        }}
                        placeholder="Buscar jugador..."
                    />
                </div>

                {/* Selected Players List */}
                <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Jugadores Seleccionados</h4>
                    {selectedPlayerIds.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No hay jugadores seleccionados</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {selectedPlayerIds.map(id => {
                                const player = players[id];
                                if (!player) return null;
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{player.nombre} {player.apellidos}</div>
                                            <div className="text-xs text-gray-500">Nivel: {player.stats.winrate}%</div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id))}
                                            className="ml-2 p-1 hover:bg-red-100 rounded text-red-500"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- Actions ---

    const handleSaveRanking = () => {
        // Validation
        if (!name) return alert("Falta el nombre");

        const divisions: Division[] = [];

        if (format === 'classic' || format === 'individual') {
            for (let i = 0; i < numDivisions; i++) {
                const p = assignments[i] || [];
                // Filter empty players
                const activePlayers = p.filter(x => x);

                const minP = 4;
                if (activePlayers.length < minP) return alert(`Mínimo ${minP} jugadores en Div ${i + 1}`);

                let matches: any[] = [];
                if (format === 'classic') {
                    if (activePlayers.length !== 4) return alert(`La División ${i + 1} debe tener exactamente 4 jugadores en liga clásica`);
                    matches = MatchGenerator.generateClassic4(activePlayers, i);
                } else {
                    // Individual matches (League generation)
                    matches = MatchGenerator.generateIndividualLeague(activePlayers, i);
                }

                divisions.push({
                    id: `div-${Date.now()}-${i}`,
                    numero: i + 1,
                    status: 'activa',
                    players: activePlayers,
                    matches: matches
                });
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
                id: `div-${Date.now()}-0`,
                numero: 1,
                status: 'activa',
                players: selectedPlayerIds,
                matches: matches
            });
        }

        const newRanking: Ranking = {
            id: `r-${Date.now()}`,
            nombre: name,
            categoria: category,
            fechaInicio: startDate,
            status: 'activo',
            divisions,
            format,
            config: {
                ...config,
                maxPlayersPerDivision: format === 'individual' ? individualMaxPlayers : undefined
            }
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
            <div className="flex justify-center mb-8">
                {STEPS.map((s, idx) => (
                    <div key={s.number} className="flex items-center">
                        <div className={`flex flex-col items-center gap-2 relative z-10 ${step >= s.number ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s.number ? 'bg-primary text-white shadow-lg scale-110' : 'bg-gray-100'}`}>
                                {s.number}
                            </div>
                            <span className="text-xs font-bold uppercase">{s.title}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`w-24 h-1 -mt-6 mx-2 transition-colors ${step > s.number ? 'bg-primary' : 'bg-gray-100'}`} />
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
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 flex justify-between max-w-5xl mx-auto items-center">
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
const X = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
