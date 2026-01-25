import React, { useState } from 'react';
import { Modal, Button } from './ui/Components';
import { Clock, Users, Save, X } from 'lucide-react';
import { Ranking, Player } from '../types';
import { SchedulerConfig, PlayerAvailability } from '../services/SchedulerEngine';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tournament: Ranking;
    players: Record<string, Player>;
    onSave: (config: SchedulerConfig, constraints: Record<string, PlayerAvailability>) => void;
    initialConfig?: SchedulerConfig;
    initialConstraints?: Record<string, PlayerAvailability>;
}

export const SchedulerConfigModal = ({ isOpen, onClose, tournament, players, onSave, initialConfig, initialConstraints }: Props) => {
    const [activeTab, setActiveTab] = useState<'resources' | 'availability'>('resources');

    // Resources State
    const [courts, setCourts] = useState(initialConfig?.courts || 4);
    const [slotDuration, setSlotDuration] = useState(initialConfig?.slotDurationMinutes || 90);
    const [startTime, setStartTime] = useState(initialConfig?.timeWindows[0]?.start || "09:00");
    const [endTime, setEndTime] = useState(initialConfig?.timeWindows[0]?.end || "23:00");

    // Availability State (Map of PlayerID -> Unavailable Ranges)
    const [constraints, setConstraints] = useState<Record<string, PlayerAvailability>>(initialConstraints || {});
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [busyStart, setBusyStart] = useState('');
    const [busyEnd, setBusyEnd] = useState('');

    const handleAddConstraint = () => {
        if (!selectedPlayer || !busyStart || !busyEnd) return;

        // Validate dates
        // For V1 MVP: We just store ISO strings or simplistic "Day + Time" strings?
        // User requirement: "No disponible a las 12:00h" -> implies specific date or recurring?
        // Let's assume specific date for tournament days. 
        // BUT tournaments span weeks. 
        // "Jugador X no puede viernes tarde" -> Recurring logic is hard.
        // MVP: Pick a specific date from a calendar picker.

        const newConstraint = { start: busyStart, end: busyEnd };

        setConstraints(prev => {
            const playerConstraints = prev[selectedPlayer] || { unavailableRanges: [] };
            return {
                ...prev,
                [selectedPlayer]: {
                    unavailableRanges: [...playerConstraints.unavailableRanges, newConstraint]
                }
            };
        });

        setBusyStart('');
        setBusyEnd('');
    };

    const handleRemoveConstraint = (playerId: string, index: number) => {
        setConstraints(prev => {
            const current = prev[playerId];
            if (!current) return prev;
            const newRanges = [...current.unavailableRanges];
            newRanges.splice(index, 1);
            return {
                ...prev,
                [playerId]: { unavailableRanges: newRanges }
            };
        });
    };

    const handleSave = () => {
        const config: SchedulerConfig = {
            courts,
            slotDurationMinutes: slotDuration,
            restMinutes: 60,
            timeWindows: [{ start: startTime, end: endTime }]
        };

        onSave(config, constraints);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Horarios">
            <div className="flex gap-2 mb-4 border-b">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'resources' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('resources')}
                >
                    Recursos
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'availability' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('availability')}
                >
                    Disponibilidad Jugadores
                </button>
            </div>

            <div className="min-h-[300px]">
                {activeTab === 'resources' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Número de Pistas</label>
                            <input
                                type="number"
                                min="1"
                                className="mt-1 block w-full border rounded-md p-2"
                                value={courts}
                                onChange={(e) => setCourts(Number(e.target.value))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora Apertura</label>
                                <input
                                    type="time"
                                    className="mt-1 block w-full border rounded-md p-2"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora Cierre</label>
                                <input
                                    type="time"
                                    className="mt-1 block w-full border rounded-md p-2"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duración Slot (min)</label>
                            <select
                                className="mt-1 block w-full border rounded-md p-2"
                                value={slotDuration}
                                onChange={(e) => setSlotDuration(Number(e.target.value))}
                            >
                                <option value={60}>60 min</option>
                                <option value={90}>90 min (Estándar)</option>
                                <option value={120}>120 min</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'availability' && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-2">
                            Añade restricciones para jugadores específicos. El sistema no programará partidos durante estos periodos.
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                            <select
                                className="w-full p-2 border rounded-md"
                                value={selectedPlayer}
                                onChange={(e) => setSelectedPlayer(e.target.value)}
                            >
                                <option value="">Seleccionar Jugador...</option>
                                {Object.values(players)
                                    .filter(p => tournament.divisions.some(d => d.players.includes(p.id) || d.matches.some(m => m.pair1.p1Id === p.id || m.pair1.p2Id === p.id || m.pair2.p1Id === p.id || m.pair2.p2Id === p.id)))
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                                    ))}
                            </select>

                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="datetime-local"
                                    className="p-2 border rounded-md text-sm"
                                    value={busyStart}
                                    onChange={(e) => setBusyStart(e.target.value)}
                                    placeholder="Inicio No-Disp"
                                />
                                <input
                                    type="datetime-local"
                                    className="p-2 border rounded-md text-sm"
                                    value={busyEnd}
                                    onChange={(e) => setBusyEnd(e.target.value)}
                                    placeholder="Fin No-Disp"
                                />
                            </div>

                            <Button
                                onClick={handleAddConstraint}
                                disabled={!selectedPlayer || !busyStart || !busyEnd}
                                className="w-full"
                            >
                                Añadir Restricción
                            </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {Object.entries(constraints).map(([playerId, availability]) => {
                                const p = players[playerId];
                                // Ensure availability is typed correctly if Object.entries infers unknown
                                const avail = availability as PlayerAvailability;
                                if (!p || !avail.unavailableRanges || avail.unavailableRanges.length === 0) return null;

                                return (
                                    <div key={playerId} className="border rounded-md p-3 bg-white">
                                        <div className="font-bold text-sm mb-2">{p.nombre} {p.apellidos}</div>
                                        <div className="space-y-1">
                                            {avail.unavailableRanges.map((range, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs bg-gray-100 p-1 rounded">
                                                    <span>
                                                        {new Date(range.start).toLocaleString()} - {new Date(range.end).toLocaleTimeString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveConstraint(playerId, idx)}
                                                        className="text-red-500 hover:text-red-700 font-bold px-2"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save size={16} /> Guardar Configuración
                </Button>
            </div>
        </Modal>
    );
};
