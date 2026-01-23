
import React from 'react';
import { Match, Division, Player } from '../types';
import { Trophy } from 'lucide-react';

interface BracketViewProps {
    division: Division;
    players: Record<string, Player>;
    onMatchClick: (match: Match) => void;
}

export const BracketView = ({ division, players, onMatchClick }: BracketViewProps) => {
    // 1. Group matches by Round (Jornada)
    // In our Engine, Jornada 1 = Final? No, wait.
    // Engine: 
    // totalRounds = log2(size).
    // Loop r=1 to totalRounds.
    // Round 1 = First Round (e.g. R16).
    // Round N = Final.

    // So we sort rounds 1..N
    const rounds = Array.from(new Set(division.matches.map(m => m.jornada))).sort((a, b) => a - b);

    // Group matches
    const matchesByRound: Record<number, Match[]> = {};
    rounds.forEach(r => {
        matchesByRound[r] = division.matches.filter(m => m.jornada === r)
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
                                        bg-white rounded-lg border shadow-sm p-3 w-full cursor-pointer hover:border-primary transition-all relative group
                                        ${match.status === 'finalizado' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}
                                    `}
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
