import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Settings, Grid, CheckCircle, Info } from 'lucide-react';
import { Button, Card, Input } from './ui/Components';
import { Player, Ranking, RankingFormat, RankingConfig, Division } from '../types';
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
        maxPoints: 24
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

            {format !== 'classic' && (
                <>
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} /> Reglas de Puntuación</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Input type="number" label="Pts Victoria 2-0" value={config.pointsPerWin2_0} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_0: parseInt(e.target.value) })} />
                            <Input type="number" label="Pts Victoria 2-1" value={config.pointsPerWin2_1} onChange={(e: any) => setConfig({ ...config, pointsPerWin2_1: parseInt(e.target.value) })} />
                            <Input type="number" label="Pts Empate" value={config.pointsDraw} onChange={(e: any) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) })} />
                            <Input type="number" label="Pts Derrota 1-2" value={config.pointsPerLoss2_1} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_1: parseInt(e.target.value) })} />
                            <Input type="number" label="Pts Derrota 0-2" value={config.pointsPerLoss2_0} onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_0: parseInt(e.target.value) })} />
                        </div>
                    </div>

                    {format === 'individual' && (
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración de Liga</h3>
                            <div className="grid md:grid-cols-4 gap-4">
                                <Input type="number" label="Nº Divisiones" value={numDivisions} onChange={(e: any) => setNumDivisions(Math.max(1, parseInt(e.target.value) || 1))} />
                                <Input type="number" label="Max Jugadores/Div" value={individualMaxPlayers} onChange={(e: any) => setIndividualMaxPlayers(Math.max(2, parseInt(e.target.value) || 2))} />
                                <Input type="number" label="Ascienden" value={config.promotionCount} onChange={(e: any) => setConfig({ ...config, promotionCount: parseInt(e.target.value) })} />
                                <Input type="number" label="Descienden" value={config.relegationCount} onChange={(e: any) => setConfig({ ...config, relegationCount: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    )}
                </>
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

        // For Americano/Mexicano: Select Pool from List
        return (
            <div className="space-y-4">
                <div className="flex justify-between">
                    <h3 className="font-bold text-gray-800">Seleccionar Jugadores ({selectedPlayerIds.length})</h3>
                    <span className="text-sm text-gray-500">Mínimo 4 jugadores recomendados</span>
                </div>
                <div className="bg-white border rounded-lg h-96 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availablePlayers.map(p => {
                        const isSelected = selectedPlayerIds.includes(p.id);
                        return (
                            <div
                                key={p.id}
                                onClick={() => {
                                    if (isSelected) setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== p.id));
                                    else setSelectedPlayerIds([...selectedPlayerIds, p.id]);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${isSelected ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'}`}
                            >
                                <div className={`w-4 h-4 rounded-full border border-current flex items-center justify-center`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{p.nombre} {p.apellidos}</div>
                                    <div className="text-xs opacity-75">Nivel: {p.stats.winrate}%</div>
                                </div>
                            </div>
                        )
                    })}
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
            }
            // Americano generated later or different logic

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
