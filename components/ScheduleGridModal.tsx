import React, { useMemo } from 'react';
import { Modal, Button, Badge } from './ui/Components';
import { Match, Player, Division } from '../types';
import { SchedulerConfig, SchedulerEngine } from '../services/SchedulerEngine';
import { Calendar, Clock, MapPin, Trophy } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    matches: Match[];
    players: Record<string, Player>;
    divisions: Division[];
    config?: SchedulerConfig;
}

export const ScheduleGridModal = ({ isOpen, onClose, matches, players, divisions, config }: Props) => {

    // 1. Generate Time Slots
    // Base on config (start time -> end time)
    // If no config, derive from matches min/max or defaults
    const { sortedDates, numCourts } = useMemo(() => {
        const slots: Date[] = [];
        let numCourts = config?.courts || 4;
        let slotDuration = config?.slotDurationMinutes || 90;

        let startHour = 9; // Default 09:00
        let endHour = 23;  // Default 23:00

        if (config?.timeWindows?.[0]) {
            const [sh] = config.timeWindows[0].start.split(':').map(Number);
            const [eh] = config.timeWindows[0].end.split(':').map(Number);
            startHour = sh;
            endHour = eh;
        }

        // Create base date (today) for visualization
        // In reality, matches might span multiple days.
        // V1: We will Group by Day first? Or just show a long list?
        // Match.startTime has full date. Let's group by Unique Dates.

        // Find unique dates from matches
        const dates = new Set<string>();
        matches.forEach(m => {
            if (m.startTime) dates.add(new Date(m.startTime).toDateString());
        });

        // If no matches with dates, use today
        if (dates.size === 0) dates.add(new Date().toDateString());

        const sortedDates = Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        return { sortedDates, numCourts, slotDuration };
    }, [matches, config]);

    const getPlayerName = (id?: string) => {
        if (!id) return '???';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos.charAt(0)}.` : '???';
    };

    const getPairName = (pair: { p1Id: string; p2Id?: string }) => {
        return `${getPlayerName(pair.p1Id)}${pair.p2Id ? '/' + getPlayerName(pair.p2Id) : ''}`;
    };

    const getCategoryName = (match: Match): string => {
        // Find the division this match belongs to
        const division = divisions.find(d => d.matches.some(m => m.id === match.id));
        if (!division) return '';

        // Priority: category > cleaned name > fallback
        if (division.category) return division.category;

        if (division.name) {
            const cleaned = division.name
                .replace(/Cuadro Principal/gi, '')
                .replace(/Cuadro Consolación/gi, '')
                .replace(/\s*-\s*Principal/gi, '')
                .replace(/\s*-\s*Consolación/gi, '')
                .trim();
            if (cleaned) return cleaned;
        }

        return `División ${division.numero}`;
    };

    const hasScheduledMatches = useMemo(() => matches.some(m => !!m.startTime), [matches]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Parrilla de Horarios" maxWidth="max-w-[95vw]">
            {!hasScheduledMatches ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-4">
                    <div className="bg-gray-100 p-4 rounded-full">
                        <Calendar size={48} className="text-gray-400" />
                    </div>
                    <p className="font-medium text-lg">No hay partidos con horario asignado.</p>
                    <p className="text-sm">Asigna horarios a los partidos para verlos aquí.</p>
                </div>
            ) : (
                <div className="space-y-8 overflow-y-auto max-h-[70vh] p-2">
                    {sortedDates.map(dateStr => {
                        const dateMatches = matches.filter(m => m.startTime && new Date(m.startTime).toDateString() === dateStr);
                        if (dateMatches.length === 0) return null; // Should not happen based on logic

                        // Generate distinct time slots for this day based on matches or standard intervals
                        // To make it look like a grid, we need fixed intervals.
                        // Let's create slots from First Match Time to Last Match Time + duration

                        const dayStart = dateMatches.reduce((min, m) => m.startTime! < min ? m.startTime! : min, dateMatches[0].startTime!);
                        const dayEnd = dateMatches.reduce((max, m) => m.startTime! > max ? m.startTime! : max, dateMatches[0].startTime!); // Approximate

                        // Create slots starting from earliest match, every 30 or 60 or 90 mins?
                        // Better: Use the configured 'slotDuration' from config.

                        const slots: Date[] = [];
                        const slotsMap = new Set<number>();

                        // 1. Add Configured Slots (if any)
                        if (config) {
                            const [sh, sm] = config.timeWindows?.[0]?.start.split(':').map(Number) || [9, 0];
                            const [eh, em] = config.timeWindows?.[0]?.end.split(':').map(Number) || [23, 0];

                            let current = new Date(dateStr);
                            current.setHours(sh, sm, 0, 0);
                            const end = new Date(dateStr);
                            end.setHours(eh, em, 0, 0);

                            while (current < end) {
                                slotsMap.add(current.getTime());
                                current = SchedulerEngine.addMinutes(current, config.slotDurationMinutes);
                            }
                        }

                        // 2. Add Actual Match Times (Reviewing all matches to ensure none are lost)
                        dateMatches.forEach(m => {
                            if (m.startTime) {
                                // normalize to minute precision to avoid second-mismatches
                                const t = new Date(m.startTime);
                                t.setSeconds(0, 0);
                                slotsMap.add(t.getTime());
                            }
                        });

                        // 3. Convert back to Dates and Sort
                        Array.from(slotsMap).sort((a, b) => a - b).forEach(t => slots.push(new Date(t)));

                        return (
                            <div key={dateStr} className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-700 sticky left-0 flex items-center gap-2">
                                    <Calendar className="text-primary" />
                                    {new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>

                                <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                                    <div className="min-w-max">
                                        {/* Header Row: Courts */}
                                        <div className="flex border-b bg-gray-50">
                                            <div className="w-24 p-3 font-bold text-gray-500 text-center sticky left-0 bg-gray-50 z-10 border-r">Hora</div>
                                            {Array.from({ length: numCourts }).map((_, i) => (
                                                <div key={i} className="flex-1 min-w-[200px] p-3 font-bold text-gray-700 text-center border-r last:border-0 border-gray-100">
                                                    Pista {i + 1}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Grid Rows */}
                                        {slots.map(slotTime => {
                                            // Find matches starting at this slot (approximated to minute?)
                                            // Or overlapping this slot?
                                            // Visual Grid usually puts match in the start slot.

                                            const slotMatches = dateMatches.filter(m => {
                                                const mTime = new Date(m.startTime!);
                                                // Relaxed equality: same hour and minute
                                                return mTime.getHours() === slotTime.getHours() && mTime.getMinutes() === slotTime.getMinutes();
                                            });

                                            return (
                                                <div key={slotTime.toISOString()} className="flex border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                    <div className="w-24 p-4 text-sm font-bold text-gray-500 flex items-center justify-center sticky left-0 bg-white border-r border-gray-100 z-10">
                                                        {slotTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>

                                                    {Array.from({ length: numCourts }).map((_, i) => {
                                                        const courtNum = i + 1;
                                                        const match = slotMatches.find(m => m.court === courtNum);

                                                        return (
                                                            <div key={courtNum} className="flex-1 min-w-[200px] p-2 border-r border-gray-100 last:border-0 relative">
                                                                {match ? (
                                                                    <div className={`
                                                                    rounded-lg p-3 text-sm border shadow-sm h-full
                                                                    ${match.roundName?.includes('(Cons.)')
                                                                            ? 'bg-orange-50 border-orange-100 text-orange-800' // Consolacion
                                                                            : 'bg-blue-50 border-blue-100 text-blue-900'} // Principal
                                                                `}>
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <div className="flex-1">
                                                                                <div className="text-[10px] font-bold uppercase opacity-70 tracking-wider">
                                                                                    {match.roundName || `Ronda ${match.jornada}`}
                                                                                </div>
                                                                                {getCategoryName(match) && (
                                                                                    <div className="text-[9px] font-semibold opacity-60 mt-0.5">
                                                                                        {getCategoryName(match)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {match.status === 'finalizado' && <span className="text-green-600 font-bold text-xs" title="Finalizado">✓</span>}
                                                                        </div>

                                                                        <div className="font-semibold truncate" title={getPairName(match.pair1)}>
                                                                            {getPairName(match.pair1)}
                                                                        </div>
                                                                        <div className="font-semibold truncate" title={getPairName(match.pair2)}>
                                                                            {getPairName(match.pair2)}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center">
                                                                        <span className="text-xs text-gray-300 font-medium">Libre</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-end pt-4 border-t mt-4">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            </div>
        </Modal>
    );
};
