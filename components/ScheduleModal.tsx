import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Modal, Button } from './ui/Components';
import { Match, Ranking } from '../types';
import { SchedulerEngine, ANY_PAIR } from '../services/SchedulerEngine';
import { pairLabel } from './scheduler/pairLabel';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
    onSave: (matchId: string, schedule: { startTime?: string, court?: number }) => void;
    schedulerConfig?: import('../services/SchedulerEngine').SchedulerConfig;
    occupationSlots?: { start: Date; end: Date; court: number }[];
    ranking?: Ranking; // Needed to check pair availability and phase windows
    players?: Record<string, import('../types').Player>; // Needed to show names in conflict
}

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO string → value for <input type="datetime-local"> in local time. */
const toLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ScheduleModal = ({ isOpen, onClose, match, onSave, schedulerConfig, occupationSlots, ranking, players }: Props) => {
    const [startTime, setStartTime] = useState('');
    const [court, setCourt] = useState('');

    useEffect(() => {
        setStartTime(toLocalInput(match?.startTime));
        setCourt(match?.court ? match.court.toString() : '');
    }, [match]);

    const handleSave = () => {
        if (!match) return;

        onSave(match.id, {
            startTime: startTime ? new Date(startTime).toISOString() : undefined,
            court: court ? parseInt(court) : undefined
        });
        onClose();
    };

    if (!match) return null;

    const pairText = (pair: { p1Id: string; p2Id?: string; placeholder?: string }) =>
        pair.p1Id ? pairLabel(pair.p2Id ? `${pair.p1Id}::${pair.p2Id}` : pair.p1Id, players ?? {}) : (pair.placeholder || 'Por decidir');
    const courtCount = schedulerConfig?.courts || 0;
    const timeChanged = !!match.startTime && startTime !== toLocalInput(match.startTime);

    // Conflicts of the slot being chosen: a court booked twice, a pair that cannot play, a time outside the phase
    const alerts: { key: string; text: string; tone: 'negative' | 'warning' }[] = [];
    if (startTime && schedulerConfig) {
        const start = new Date(startTime);
        const end = SchedulerEngine.addMinutes(start, schedulerConfig.slotDurationMinutes);
        if (court && occupationSlots && SchedulerEngine.checkMatchConflict(start, end, parseInt(court), occupationSlots)) {
            alerts.push({ key: 'court', text: `La pista ${court} ya está ocupada a esa hora.`, tone: 'negative' });
        }
        if (ranking) {
            (SchedulerEngine.computeConflicts({ ...match, startTime: start.toISOString() }, ranking) ?? []).forEach((c, i) => alerts.push({
                key: `c${i}`,
                text: c.pairKey === ANY_PAIR ? c.reason : `${pairLabel(c.pairKey, players ?? {})}: ${c.reason}`,
                tone: 'warning',
            }));
        }
    }

    const fieldClass = 'w-full h-10 px-3 rounded-md border border-rg-control bg-white text-[15px] num focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Programar · ${match.roundName || `Jornada ${match.jornada}`}`}>
            <div className="rg space-y-5">
                {/* Which match */}
                <div className="rounded-lg bg-rg-raised px-4 py-3 text-[14px] leading-snug">
                    <p className="font-semibold truncate">{pairText(match.pair1)}</p>
                    <p className="font-semibold truncate">{pairText(match.pair2)}</p>
                    {match.scheduleEstimated && <p className="text-[13px] text-rg-muted mt-1">La hora actual es una estimación: la fijas al guardar.</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                    <div>
                        <label htmlFor="schedule-time" className="block text-[13px] font-medium mb-1.5">Día y hora</label>
                        <input id="schedule-time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} />
                        {schedulerConfig?.slotDurationMinutes && (
                            <p className="text-[12px] text-rg-muted mt-1 num">Cada partido ocupa {schedulerConfig.slotDurationMinutes} minutos.</p>
                        )}
                    </div>
                    <div>
                        <span id="schedule-court" className="block text-[13px] font-medium mb-1.5">Pista</span>
                        {courtCount > 0 && courtCount <= 8 ? (
                            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="schedule-court">
                                {Array.from({ length: courtCount }, (_, i) => String(i + 1)).map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        role="radio"
                                        aria-checked={court === c}
                                        onClick={() => setCourt(court === c ? '' : c)}
                                        className={`w-10 h-10 rounded-md text-[15px] font-semibold num transition-colors ${court === c ? 'bg-court text-white' : 'bg-white border border-rg-control hover:bg-rg-raised'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input type="number" min="1" placeholder="Nº" aria-labelledby="schedule-court" value={court} onChange={(e) => setCourt(e.target.value)} className={`${fieldClass} sm:w-24`} />
                        )}
                    </div>
                </div>

                {(alerts.length > 0 || timeChanged) && (
                    <ul className="space-y-2" aria-live="polite">
                        {alerts.map(a => (
                            <li key={a.key} className={`flex items-start gap-2 rounded-md px-3 py-2 text-[14px] ${a.tone === 'negative' ? 'bg-[#ffedea] text-[#831c1e]' : 'bg-[#fffbeb] text-[#92400e]'}`}>
                                {a.tone === 'negative' ? <AlertTriangle size={16} className="flex-none mt-0.5" /> : <Clock size={16} className="flex-none mt-0.5" />}
                                <span>{a.text}</span>
                            </li>
                        ))}
                        {timeChanged && <li className="text-[13px] text-rg-muted">Al cambiar la hora, los jugadores la verán actualizada en su vista del torneo.</li>}
                    </ul>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-rg-line">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar horario</Button>
                </div>
            </div>
        </Modal>
    );
};
