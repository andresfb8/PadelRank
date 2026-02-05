import React, { useMemo } from 'react';
import { Ranking, Player, Match } from '../../../types';
import { Calendar } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
}

export const ScheduleSlide = ({ ranking, players }: Props) => {
    // Collect all matches from all divisions
    const matches = useMemo(() => ranking.divisions.flatMap(d => d.matches), [ranking]);
    const config = ranking.schedulerConfig;

    // Filter matches that are scheduled or active? 
    // Usually we want to see the schedule. Matches WITHOUT time might not be relevant for a "Schedule Grid".
    // But let's stick to showing matches with `startTime`.
    const scheduledMatches = useMemo(() => matches.filter(m => !!m.startTime), [matches]);

    const { sortedDates, numCourts } = useMemo(() => {
        const slots: Date[] = [];
        let numCourts = config?.courts || 4;

        // Find unique dates from matches
        const dates = new Set<string>();
        scheduledMatches.forEach(m => {
            if (m.startTime) dates.add(new Date(m.startTime).toDateString());
        });

        // Use configured windows dates if no matches? No, relies on matches.
        if (dates.size === 0 && config?.timeWindows?.[0]) {
            // Maybe show today if nothing scheduled?
            dates.add(new Date().toDateString());
        }

        const sortedDates = Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        return { sortedDates, numCourts };
    }, [scheduledMatches, config]);

    const getPlayerName = (id?: string) => {
        if (!id) return '???';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : '...';
    };

    const getPairName = (pair: { p1Id: string; p2Id?: string }) => {
        const n1 = getPlayerName(pair.p1Id);
        const n2 = pair.p2Id ? getPlayerName(pair.p2Id) : '';
        return n2 ? `${n1} / ${n2}` : n1;
    };

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 border-b border-slate-700 pb-4">
                <div className="p-4 rounded-xl bg-blue-600/20 text-blue-400">
                    <Calendar size={40} />
                </div>
                <div>
                    <h2 className="text-4xl font-bold">Horarios de Partidos</h2>
                    <p className="text-slate-400 text-lg">Programación Oficial</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-2">
                {scheduledMatches.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                        <Calendar size={64} className="opacity-50" />
                        <p className="text-2xl">No hay partidos programados</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {sortedDates.map(dateStr => {
                            const dateMatches = scheduledMatches.filter(m => m.startTime && new Date(m.startTime).toDateString() === dateStr);

                            // Generate slots for this day 
                            // Using simplified approach: Sort matches by time, then group by time slot?
                            // Or strict grid? Let's use strict grid row logic like the modal.

                            // Determine time range
                            const dayTimes = dateMatches.map(m => new Date(m.startTime!).getTime());
                            const minTime = Math.min(...dayTimes);
                            const maxTime = Math.max(...dayTimes);

                            // Align to slots? Default 90m or just list unique times?
                            // Listing unique start times is safer for visual compactness in TV
                            const uniqueTimes = Array.from(new Set(dayTimes)).sort((a, b) => a - b);

                            return (
                                <div key={dateStr} className="animate-fade-in">
                                    <h3 className="text-2xl font-bold py-4 text-blue-400 border-b border-slate-800 mb-6 sticky top-0 bg-slate-900 z-10">
                                        {new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>

                                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
                                        {/* Header Row */}
                                        <div className="flex divide-x divide-slate-700 bg-slate-800 font-bold text-slate-300">
                                            <div className="w-24 p-4 text-center">Hora</div>
                                            {Array.from({ length: numCourts }).map((_, i) => (
                                                <div key={i} className="flex-1 p-4 text-center">Pista {i + 1}</div>
                                            ))}
                                        </div>

                                        {/* Rows */}
                                        {uniqueTimes.map(timeMs => {
                                            const time = new Date(timeMs);
                                            const matchesAtTime = dateMatches.filter(m => new Date(m.startTime!).getTime() === timeMs);

                                            return (
                                                <div key={timeMs} className="flex divide-x divide-slate-700 border-t border-slate-700 bg-slate-800/30 hover:bg-slate-800/80 transition-colors">
                                                    <div className="w-24 p-4 flex items-center justify-center font-bold text-slate-400 text-xl">
                                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>

                                                    {Array.from({ length: numCourts }).map((_, i) => {
                                                        const court = i + 1;
                                                        const match = matchesAtTime.find(m => m.court === court);

                                                        return (
                                                            <div key={court} className="flex-1 min-h-[100px] relative">
                                                                {match ? (
                                                                    <div className={`
                                                                        absolute inset-1 rounded-lg p-3 flex flex-col justify-between
                                                                        ${match.status === 'finalizado' ? 'bg-green-900/30 border border-green-700/50' : 'bg-blue-600/20 border border-blue-500/30'}
                                                                    `}>
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="text-[10px] uppercase font-bold text-blue-300/80 tracking-wider">
                                                                                {match.roundName || `Ronda ${match.jornada}`}
                                                                            </span>
                                                                            {match.status === 'finalizado' && <span className="text-green-400 text-xs">Finalizado</span>}
                                                                        </div>

                                                                        <div className="flex flex-col gap-1 mt-1">
                                                                            <div className="flex justify-between font-medium text-white text-sm">
                                                                                <span className="truncate">{getPairName(match.pair1)}</span>
                                                                                {/* Score if needed? Maybe too cluttered */}
                                                                            </div>
                                                                            <div className="h-px bg-white/10 w-full" />
                                                                            <div className="flex justify-between font-medium text-white text-sm">
                                                                                <span className="truncate">{getPairName(match.pair2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                                                                        -
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
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="absolute bottom-8 right-8 text-slate-500 text-sm">
                * Parrilla actualizada en tiempo real
            </div>
        </div>
    );
};
