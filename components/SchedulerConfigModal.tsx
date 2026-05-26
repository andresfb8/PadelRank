import React, { useState, useMemo } from 'react';
import { Modal, Button } from './ui/Components';
import { Save, Plus, Trash2, Calendar, Clock, Users, Layers } from 'lucide-react';
import { Ranking, Player } from '../types';
import { SchedulerConfig, PairAvailability, makePairKey, SchedulerEngine } from '../services/SchedulerEngine';

interface RoundWindow {
    roundName: string;
    date: string;
    startTime: string;
    endTime: string;
}

interface TournamentDay {
    date: string;      // "YYYY-MM-DD"
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tournament: Ranking;
    players: Record<string, Player>;
    onSave: (config: SchedulerConfig, pairConstraints: Record<string, PairAvailability>) => void;
    initialConfig?: SchedulerConfig;
    initialPairConstraints?: Record<string, PairAvailability>;
}

export const SchedulerConfigModal = ({
    isOpen, onClose, tournament, players, onSave, initialConfig, initialPairConstraints
}: Props) => {
    const [activeTab, setActiveTab] = useState<'resources' | 'days' | 'phases' | 'availability'>('resources');

    // Resources
    const [courts, setCourts] = useState(initialConfig?.courts || 4);
    const [slotDuration, setSlotDuration] = useState(initialConfig?.slotDurationMinutes || 90);
    const [restMinutes, setRestMinutes] = useState(initialConfig?.restMinutes || 60);

    // Tournament days
    const [days, setDays] = useState<TournamentDay[]>(
        initialConfig?.dailySchedule ?? []
    );
    const [newDate, setNewDate] = useState('');
    const [newDayStart, setNewDayStart] = useState('09:00');
    const [newDayEnd, setNewDayEnd] = useState('22:00');

    // Per-round time windows (phase scheduling)
    const [roundWindows, setRoundWindows] = useState<Record<string, RoundWindow>>(() => {
        const map: Record<string, RoundWindow> = {};
        (initialConfig?.roundWindows ?? []).forEach(rw => {
            map[SchedulerEngine.normalizeRoundName(rw.roundName)] = rw;
        });
        return map;
    });

    // Pair availability
    const [pairConstraints, setPairConstraints] = useState<Record<string, PairAvailability>>(
        initialPairConstraints ?? {}
    );
    const [selectedPairKey, setSelectedPairKey] = useState('');
    const [blockDate, setBlockDate] = useState('');
    const [blockStart, setBlockStart] = useState('');
    const [blockEnd, setBlockEnd] = useState('');

    // Extract unique pairs from tournament matches
    const pairs = useMemo(() => {
        const map = new Map<string, { key: string; label: string }>();
        tournament.divisions.forEach(div => {
            div.matches.forEach(m => {
                const addPair = (p1Id: string, p2Id: string) => {
                    if (!p1Id || p1Id === 'BYE') return;
                    const key = makePairKey(p1Id, p2Id || undefined);
                    if (!map.has(key)) {
                        const p1 = players[p1Id];
                        const p2 = p2Id ? players[p2Id] : null;
                        const name1 = p1 ? `${p1.nombre} ${p1.apellidos.charAt(0)}.` : p1Id;
                        const name2 = p2 ? `${p2.nombre} ${p2.apellidos.charAt(0)}.` : p2Id || '';
                        map.set(key, { key, label: p2Id ? `${name1} / ${name2}` : name1 });
                    }
                };
                addPair(m.pair1.p1Id, m.pair1.p2Id);
                addPair(m.pair2.p1Id, m.pair2.p2Id);
            });
        });
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [tournament, players]);

    // Distinct round names present in the tournament, ordered from first-played to final
    const roundNames = useMemo(() => {
        const set = new Set<string>();
        tournament.divisions.forEach(div => div.matches.forEach(m => {
            const name = SchedulerEngine.normalizeRoundName(m.roundName);
            if (name) set.add(name);
        }));
        const rank = (name: string): number => {
            if (name === 'Final') return 5000;
            if (name === 'Semifinales') return 4000;
            if (name === 'Cuartos') return 3000;
            if (name === 'Octavos') return 2000;
            const m = name.match(/Ronda de (\d+)/);
            if (m) return 1000 - Number(m[1]); // larger bracket plays earlier
            return 0;
        };
        return Array.from(set).sort((a, b) => rank(a) - rank(b));
    }, [tournament]);

    const setRoundWindowField = (roundName: string, field: keyof RoundWindow, value: string) => {
        setRoundWindows(prev => {
            const existing = prev[roundName] ?? { roundName, date: '', startTime: '', endTime: '' };
            return { ...prev, [roundName]: { ...existing, roundName, [field]: value } };
        });
    };

    const clearRoundWindow = (roundName: string) => {
        setRoundWindows(prev => {
            const { [roundName]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleAddDay = () => {
        if (!newDate || !newDayStart || !newDayEnd) return;
        if (days.some(d => d.date === newDate)) return; // No duplicates
        setDays(prev => [...prev, { date: newDate, startTime: newDayStart, endTime: newDayEnd }]
            .sort((a, b) => a.date.localeCompare(b.date)));
        setNewDate('');
    };

    const handleRemoveDay = (date: string) => {
        setDays(prev => prev.filter(d => d.date !== date));
        // Also remove blocked intervals for that day
        setPairConstraints(prev => {
            const updated: Record<string, PairAvailability> = {};
            for (const [key, avail] of Object.entries(prev) as [string, PairAvailability][]) {
                const filtered = avail.unavailableRanges.filter(r => r.date !== date);
                if (filtered.length > 0) updated[key] = { unavailableRanges: filtered };
            }
            return updated;
        });
    };

    const handleAddBlock = () => {
        if (!selectedPairKey || !blockDate || !blockStart || !blockEnd) return;
        if (blockEnd <= blockStart) return;
        setPairConstraints(prev => {
            const existing = prev[selectedPairKey] ?? { unavailableRanges: [] };
            return {
                ...prev,
                [selectedPairKey]: {
                    unavailableRanges: [...existing.unavailableRanges, { date: blockDate, startTime: blockStart, endTime: blockEnd }]
                }
            };
        });
        setBlockStart('');
        setBlockEnd('');
    };

    const handleRemoveBlock = (pairKey: string, index: number) => {
        setPairConstraints(prev => {
            const existing = prev[pairKey];
            if (!existing) return prev;
            const updated = existing.unavailableRanges.filter((_, i) => i !== index);
            if (updated.length === 0) {
                const { [pairKey]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [pairKey]: { unavailableRanges: updated } };
        });
    };

    const handleSave = () => {
        const config: SchedulerConfig = {
            courts,
            slotDurationMinutes: slotDuration,
            restMinutes,
            timeWindows: days.length > 0
                ? [{ start: days[0]?.startTime ?? '09:00', end: days[0]?.endTime ?? '22:00' }]
                : [{ start: '09:00', end: '22:00' }],
            dailySchedule: days.length > 0 ? days : undefined,
            roundWindows: Object.values(roundWindows)
                .filter(rw => rw.date && rw.startTime && rw.endTime && rw.endTime > rw.startTime),
        };
        if (!config.roundWindows?.length) delete config.roundWindows;
        onSave(config, pairConstraints);
        onClose();
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const selectedPairBlocks = selectedPairKey
        ? (pairConstraints[selectedPairKey]?.unavailableRanges ?? [])
        : [];

    const tabs = [
        { id: 'resources', label: 'Recursos', icon: <Users size={14} /> },
        { id: 'days', label: 'Días', icon: <Calendar size={14} /> },
        { id: 'phases', label: 'Fases', icon: <Layers size={14} /> },
        { id: 'availability', label: 'Disponibilidad', icon: <Clock size={14} /> },
    ] as const;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Horarios">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[320px]">
                {/* Tab 1: Resources */}
                {activeTab === 'resources' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Número de Pistas</label>
                            <input type="number" min="1" max="20"
                                className="mt-1 block w-full border rounded-md p-2"
                                value={courts} onChange={e => setCourts(Number(e.target.value))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duración partido (min)</label>
                                <select className="mt-1 block w-full border rounded-md p-2"
                                    value={slotDuration} onChange={e => setSlotDuration(Number(e.target.value))}>
                                    <option value={60}>60 min</option>
                                    <option value={90}>90 min (Estándar)</option>
                                    <option value={120}>120 min</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Descanso mínimo entre partidos (min)</label>
                                <select className="mt-1 block w-full border rounded-md p-2"
                                    value={restMinutes} onChange={e => setRestMinutes(Number(e.target.value))}>
                                    <option value={30}>30 min</option>
                                    <option value={60}>60 min (Estándar)</option>
                                    <option value={90}>90 min</option>
                                    <option value={120}>120 min</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Tournament days */}
                {activeTab === 'days' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Añade cada día del torneo con su franja horaria disponible.
                        </p>
                        {/* Add day form */}
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2 border">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                                    <input type="date" className="w-full text-sm border rounded p-1.5"
                                        value={newDate} onChange={e => setNewDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Apertura</label>
                                    <input type="time" className="w-full text-sm border rounded p-1.5"
                                        value={newDayStart} onChange={e => setNewDayStart(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Cierre</label>
                                    <input type="time" className="w-full text-sm border rounded p-1.5"
                                        value={newDayEnd} onChange={e => setNewDayEnd(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleAddDay} disabled={!newDate}
                                className="w-full flex items-center justify-center gap-1">
                                <Plus size={14} /> Añadir día
                            </Button>
                        </div>

                        {/* Day list */}
                        {days.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No hay días configurados</p>
                        ) : (
                            <div className="space-y-2">
                                {days.map(day => (
                                    <div key={day.date}
                                        className="flex items-center justify-between border rounded-lg p-3 bg-white">
                                        <div>
                                            <div className="font-medium text-sm capitalize">{formatDate(day.date)}</div>
                                            <div className="text-xs text-gray-500">{day.startTime} – {day.endTime}</div>
                                        </div>
                                        <button onClick={() => handleRemoveDay(day.date)}
                                            className="text-red-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Round phases */}
                {activeTab === 'phases' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Asigna cada fase a una franja horaria (ej. domingo mañana = Semifinales,
                            domingo tarde = Final). Se aplica a <strong>todas las categorías</strong> por
                            igual, así las rondas avanzan equilibradas. Las fases sin asignar se programan
                            automáticamente. Luego puedes ajustar partidos sueltos a mano.
                        </p>

                        {days.length === 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                Configura primero los días del torneo en la pestaña "Días".
                            </div>
                        )}

                        {roundNames.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">
                                No hay rondas en este torneo todavía.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {roundNames.map(name => {
                                    const rw = roundWindows[name];
                                    return (
                                        <div key={name} className="border rounded-lg p-3 bg-white">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">{name}</span>
                                                {rw && (
                                                    <button onClick={() => clearRoundWindow(name)}
                                                        className="text-red-400 hover:text-red-600 p-1" title="Quitar franja">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Día</label>
                                                    <select className="w-full text-sm border rounded p-1.5"
                                                        value={rw?.date ?? ''}
                                                        onChange={e => setRoundWindowField(name, 'date', e.target.value)}>
                                                        <option value="">Automático</option>
                                                        {days.map(d => (
                                                            <option key={d.date} value={d.date}>{formatDate(d.date)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                                    <input type="time" className="w-full text-sm border rounded p-1.5"
                                                        value={rw?.startTime ?? ''}
                                                        onChange={e => setRoundWindowField(name, 'startTime', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                                    <input type="time" className="w-full text-sm border rounded p-1.5"
                                                        value={rw?.endTime ?? ''}
                                                        onChange={e => setRoundWindowField(name, 'endTime', e.target.value)} />
                                                </div>
                                            </div>
                                            {rw && rw.date && rw.startTime && rw.endTime && rw.endTime <= rw.startTime && (
                                                <p className="text-xs text-red-500 mt-1">La hora de fin debe ser posterior al inicio.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Pair availability */}
                {activeTab === 'availability' && (
                    <div className="space-y-4">
                        {days.length === 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                Configura primero los días del torneo en la pestaña "Días".
                            </div>
                        )}

                        {/* Pair selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pareja</label>
                            <select className="w-full border rounded-md p-2 text-sm"
                                value={selectedPairKey} onChange={e => setSelectedPairKey(e.target.value)}>
                                <option value="">Seleccionar pareja...</option>
                                {pairs.map(p => (
                                    <option key={p.key} value={p.key}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {selectedPairKey && (
                            <>
                                {/* Add block form */}
                                <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                                    <p className="text-xs font-medium text-gray-600">Añadir franja bloqueada</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Día</label>
                                            <select className="w-full text-sm border rounded p-1.5"
                                                value={blockDate} onChange={e => setBlockDate(e.target.value)}>
                                                <option value="">Día...</option>
                                                {days.map(d => (
                                                    <option key={d.date} value={d.date}>{formatDate(d.date)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                            <input type="time" className="w-full text-sm border rounded p-1.5"
                                                value={blockStart} onChange={e => setBlockStart(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                            <input type="time" className="w-full text-sm border rounded p-1.5"
                                                value={blockEnd} onChange={e => setBlockEnd(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button onClick={handleAddBlock}
                                        disabled={!blockDate || !blockStart || !blockEnd || blockEnd <= blockStart}
                                        className="w-full flex items-center justify-center gap-1">
                                        <Plus size={14} /> Añadir restricción
                                    </Button>
                                </div>

                                {/* Existing blocks */}
                                {selectedPairBlocks.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-2">Sin restricciones para esta pareja</p>
                                ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {selectedPairBlocks.map((block, idx) => (
                                            <div key={idx}
                                                className="flex items-center justify-between bg-red-50 border border-red-100 rounded p-2 text-sm">
                                                <span className="text-red-800 capitalize">
                                                    {formatDate(block.date)}: {block.startTime} – {block.endTime}
                                                </span>
                                                <button onClick={() => handleRemoveBlock(selectedPairKey, idx)}
                                                    className="text-red-400 hover:text-red-600 ml-2">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save size={16} /> Guardar Configuración
                </Button>
            </div>
        </Modal>
    );
};
