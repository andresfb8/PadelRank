
import React from 'react';
import { Match, Division, Player } from '../types';
import { Trophy, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { SchedulerEngine } from '../services/SchedulerEngine';
import { Ranking } from '../types';

interface BracketViewProps {
    divisions: Division[]; // Changed from single division to array
    players: Record<string, Player>;
    onMatchClick: (match: Match) => void;
    onScheduleClick?: (match: Match) => void; // New Prop
    bracketType?: 'main' | 'consolation';
    ranking: Ranking; // Need full ranking for scheduler config
}

export const BracketView = ({ divisions, players, onMatchClick, onScheduleClick, bracketType = 'main', ranking }: BracketViewProps) => {
    // Merge all matches from all divisions (main + consolation)
    const allMatches = divisions.flatMap(d => d.matches);

    // Filter matches based on bracket type
    // Main bracket: matches whose roundName doesn't contain "(Cons.)"
    // Consolation bracket: matches whose roundName contains "(Cons.)"
    const filteredMatches = bracketType === 'main'
        ? allMatches.filter(m => !m.roundName?.includes('(Cons.)'))
        : allMatches.filter(m => m.roundName?.includes('(Cons.)'));

    // 1. Group matches by Round (Jornada)
    // Force convert to Number to avoid "1" vs 1 duplication
    const rounds = Array.from(new Set(filteredMatches.map(m => Number(m.jornada)))).sort((a, b) => a - b);

    // Group matches
    const matchesByRound: Record<number, Match[]> = {};
    rounds.forEach(r => {
        matchesByRound[r] = filteredMatches.filter(m => Number(m.jornada) === r)
            .sort((a, b) => {
                // Determine vertical order? 
                // We don't have explicit order index in Match yet.
                // But we created them in loops 0..N.
                // If we assume the array order is consistent, we use array index?
                // Or maybe we can trust the 'id' creation order if we haven't shuffled.
                // Best effort: sort by creation time (implicitly array order).
                return 0;
            });
    });

    const getPlayerName = (id?: string, placeholder?: string) => {
        if (!id) return placeholder || 'TBD';
        if (id === 'BYE') return 'BYE';
        return players[id] ? `${players[id].nombre} ${players[id].apellidos.charAt(0)}.` : 'Jugador Desconocido';
    };

    const getPairName = (pair: { p1Id: string; p2Id?: string; placeholder?: string }) => {
        const n1 = getPlayerName(pair.p1Id, pair.placeholder);
        const n2 = pair.p2Id ? getPlayerName(pair.p2Id) : '';
        if (n1 === 'BYE') return 'BYE';
        return n2 ? `${n1} / ${n2}` : n1;
    };

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max p-4">
                {rounds.map(round => (
                    <div key={round} className="flex flex-col justify-around gap-4 min-w-[220px]">
                        <h3 className="text-center font-bold text-gray-500 mb-4 uppercase text-xs tracking-wider">
                            {matchesByRound[round][0]?.roundName || `Ronda ${round}`}
                        </h3>

                        <div className="flex flex-col justify-around bg-opacity-50 h-full gap-8">
                            {matchesByRound[round].map(match => (
                                <div
                                    key={match.id}
                                    className={`
                                        bg-white rounded-lg border shadow-sm w-full transition-all relative group flex flex-col
                                        ${match.status === 'finalizado' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}
                                    `}
                                >
                                    {/* Score Area - Opens MatchModal */}
                                    <div
                                        className="p-3 cursor-pointer hover:bg-gray-50 rounded-t-lg"
                                        onClick={() => onMatchClick(match)}
                                    >
                                        <div className="flex flex-col gap-3">
                                            {/* Pair 1 */}
                                            <div className={`text-sm flex justify-between items-center transition-colors ${match.points?.p1 > match.points?.p2 && match.status === 'finalizado' ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                                                <span className="truncate font-medium">{getPairName(match.pair1)}</span>
                                                {match.status === 'finalizado' && (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs ml-2 font-mono ring-1 ring-gray-200">
                                                        {renderScore(match, 'p1')}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="h-px bg-gray-100" />

                                            {/* Pair 2 */}
                                            <div className={`text-sm flex justify-between items-center transition-colors ${match.points?.p2 > match.points?.p1 && match.status === 'finalizado' ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                                                <span className="truncate font-medium">{getPairName(match.pair2)}</span>
                                                {match.status === 'finalizado' && (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs ml-2 font-mono ring-1 ring-gray-200">
                                                        {renderScore(match, 'p2')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule Bar - Opens ScheduleModal */}
                                    {/* Schedule Bar - Visible if Scheduled OR if Admin */}
                                    {((match.startTime || match.court) || onScheduleClick) && (
                                        <div
                                            className={`
                                                border-t border-gray-100 py-1.5 px-3 bg-gray-50 flex items-center justify-between rounded-b-lg transition-colors
                                                ${onScheduleClick ? 'cursor-pointer hover:bg-blue-50 group' : ''}
                                            `}
                                            onClick={(e) => {
                                                if (onScheduleClick) {
                                                    e.stopPropagation();
                                                    onScheduleClick(match);
                                                }
                                            }}
                                        >
                                            {(match.startTime || match.court) ? (
                                                <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-700 w-full">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {match.startTime ? new Date(match.startTime).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </div>
                                                    {match.court && <div className="ml-auto border-l border-blue-200 pl-2">Pista {match.court}</div>}

                                                    {/* Conflict Indicator (Admin Only) */}
                                                    {onScheduleClick && ranking.schedulerConfig && ranking.playerConstraints && (() => {
                                                        const start = new Date(match.startTime!);
                                                        const end = SchedulerEngine.addMinutes(start, ranking.schedulerConfig!.slotDurationMinutes || 90);
                                                        const occupied = SchedulerEngine.getAllOccupiedSlots(ranking, match.id);

                                                        const courtConflict = match.court && SchedulerEngine.checkMatchConflict(start, end, match.court, occupied);

                                                        const pIds = [match.pair1.p1Id, match.pair1.p2Id, match.pair2.p1Id, match.pair2.p2Id].filter(Boolean) as string[];
                                                        const playerConflict = SchedulerEngine.checkPlayerAvailability(start, end, pIds, ranking.playerConstraints || {});

                                                        if (courtConflict || !playerConflict.valid) {
                                                            return (
                                                                <div className="ml-2 text-red-500 animate-pulse" title="Conflicto de horario detectado">
                                                                    <AlertTriangle size={14} />
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center w-full text-[10px] font-medium text-gray-400 group-hover:text-blue-600 gap-1">
                                                    <Calendar size={12} /> Programar
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const renderScore = (m: Match, player: 'p1' | 'p2') => {
    // Basic set score renderer
    if (!m.score) return '-';
    let s = '';
    if (m.score.set1) s += m.score.set1[player] + " ";
    if (m.score.set2) s += m.score.set2[player] + " ";
    if (m.score.set3) s += m.score.set3[player] + " ";
    return s.trim();
};
