import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Modal, Button } from './ui/Components';
import { Match, RankingConfig } from '../types';
import { SchedulerEngine } from '../services/SchedulerEngine';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
    onSave: (matchId: string, schedule: { startTime?: string, court?: number }) => void;
    schedulerConfig?: import('../services/SchedulerEngine').SchedulerConfig;
    occupationSlots?: { start: Date; end: Date; court: number }[];
    playerConstraints?: Record<string, import('../services/SchedulerEngine').PlayerAvailability>;
    players?: Record<string, import('../types').Player>; // Needed to show names in conflict
}

export const ScheduleModal = ({ isOpen, onClose, match, onSave, schedulerConfig, occupationSlots, playerConstraints, players }: Props) => {
    const [startTime, setStartTime] = useState('');
    const [court, setCourt] = useState('');

    useEffect(() => {
        if (match) {
            if (match.startTime) setStartTime(match.startTime);
            else setStartTime('');

            if (match.court) setCourt(match.court.toString());
            else setCourt('');
        } else {
            setStartTime('');
            setCourt('');
        }
    }, [match]);

    const handleSave = () => {
        if (!match) return;

        onSave(match.id, {
            startTime: startTime || undefined,
            court: court ? parseInt(court) : undefined
        });
        onClose();
    };

    if (!match) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Programar: Jornada ${match.jornada}`}>
            <div className="space-y-6">
                {/* Scheduling Section */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                        <Calendar size={16} /> Horario y Pista
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-sm border-blue-200 rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Pista</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Nº"
                                value={court}
                                onChange={(e) => setCourt(e.target.value)}
                                className="w-full text-sm border-blue-200 rounded p-2"
                            />
                        </div>
                    </div>
                    {/* Conflict Warning */}
                    {match.startTime && startTime !== match.startTime && (
                        <div className="text-xs text-blue-600 italic mt-1">
                            Cambiar el horario notificará a los jugadores
                        </div>
                    )}
                    {/* Real Conflict Check */}
                    {/* Real Conflict Check */}
                    {(() => {
                        if (!startTime || !schedulerConfig) return null;
                        const start = new Date(startTime);
                        const end = SchedulerEngine.addMinutes(start, schedulerConfig.slotDurationMinutes);

                        const alerts = [];

                        // 1. Check Court Conflict
                        if (court && occupationSlots) {
                            // Assuming occupationSlots handles exclusion of current match or we ignore self overlap loosely
                            const hasCourtConflict = SchedulerEngine.checkMatchConflict(start, end, parseInt(court), occupationSlots);
                            if (hasCourtConflict) {
                                alerts.push(
                                    <div key="court" className="flex items-center gap-2 p-2 bg-red-100 text-red-700 rounded text-xs font-bold animate-pulse">
                                        <AlertTriangle size={14} />
                                        <span>¡Conflicto! Pista {court} ocupada.</span>
                                    </div>
                                );
                            }
                        }

                        // 2. Check Player Availability
                        if (playerConstraints && match) {
                            const pIds = [match.pair1.p1Id, match.pair1.p2Id, match.pair2.p1Id, match.pair2.p2Id].filter(Boolean) as string[];
                            const availability = SchedulerEngine.checkPlayerAvailability(start, end, pIds, playerConstraints);

                            if (!availability.valid && availability.conflictPlayerId) {
                                const pName = players?.[availability.conflictPlayerId]?.nombre || 'Jugador';
                                alerts.push(
                                    <div key="player" className="flex items-center gap-2 p-2 bg-orange-100 text-orange-800 rounded text-xs font-bold">
                                        <Clock size={14} />
                                        <span>¡Aviso! {pName} tiene restricción horaria.</span>
                                    </div>
                                );
                            }
                        }

                        return alerts.length > 0 ? <div className="space-y-2 mt-2">{alerts}</div> : null;
                    })()}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Horario</Button>
                </div>
            </div>
        </Modal>
    );
};
