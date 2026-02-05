import React from 'react';
import { Ranking, Player, Match } from '../../../types';
import { Trophy, Medal, MapPin } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
    bracketType: 'main' | 'consolation';
    title?: string;
    divisionId?: string;
}

export const BracketsSlide = ({ ranking, players, bracketType, title, divisionId }: Props) => {
    // Filter appropriate divisions for the bracket
    const divisions = ranking.divisions.filter(d => {
        // If divisionId is provided, strict filter
        if (divisionId && d.id !== divisionId) return false;

        if (bracketType === 'main') {
            // Main bracket usually includes 'main' type and internal 'consolation' (if any)
            // or just standard elimination divisions
            return (d.type === 'main' || d.type === 'consolation' || !d.type) && (d.stage === 'playoff' || ranking.format === 'elimination');
        } else {
            // "League" Consolation (bracket parallel to main)
            return d.type === 'league-consolation-main';
        }
    });

    const allMatches = divisions.flatMap(d => d.matches);

    // Filter matches further if needed (e.g. internal consolation in main view)
    // If bracketType is 'main', we exclude explicit "(Cons.)" rounds if we want to split them?
    // Actually BracketView separates them by roundName includes "(Cons.)"
    const filteredMatches = bracketType === 'main'
        ? allMatches.filter(m => !m.roundName?.includes('(Cons.)'))
        : allMatches.filter(m => m.roundName?.includes('(Cons.)') || divisions.some(d => d.type === 'league-consolation-main'));


    // Group by Round
    const rounds = Array.from(new Set(filteredMatches.map(m => Number(m.jornada)))).sort((a, b) => a - b);
    const matchesByRound: Record<number, Match[]> = {};
    rounds.forEach(r => {
        matchesByRound[r] = filteredMatches.filter(m => Number(m.jornada) === r);
    });

    const getPlayerName = (id?: string) => {
        if (!id) return 'TBD';
        if (id === 'BYE') return 'BYE';
        return players[id] ? `${players[id].nombre} ${players[id].apellidos}` : '...';
    };

    const getPairName = (pair: { p1Id: string; p2Id?: string }) => {
        const n1 = getPlayerName(pair.p1Id);
        const n2 = pair.p2Id ? getPlayerName(pair.p2Id) : '';
        if (n1 === 'BYE') return 'BYE';
        // Check for TBD
        if (n1 === 'TBD' && !n2) return 'Pendiente';
        return n2 ? `${n1} / ${n2}` : n1;
    };

    const getRoundLabel = (roundNum: number, totalRounds: number) => {
        // Logic to name rounds: Final, Semis, Quarters... based on total rounds?
        // Or just use the roundName from the first match
        const defaultName = matchesByRound[roundNum]?.[0]?.roundName || `Ronda ${roundNum}`;
        return defaultName;
    };

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${bracketType === 'main' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-700/50 text-slate-400'}`}>
                        {bracketType === 'main' ? <Trophy size={40} /> : <Medal size={40} />}
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold">{title || (bracketType === 'main' ? 'Cuadro Principal' : 'Cuadro de Consolación')}</h2>
                        <p className="text-slate-400 text-lg">Fase Eliminatoria</p>
                    </div>
                </div>
                {/* Logo or Extra Info */}
            </div>

            {/* Bracket Container */}
            <div className="flex-1 flex items-center justify-center w-full overflow-x-auto overflow-y-auto">
                {rounds.length === 0 ? (
                    <div className="text-center opacity-50">
                        <Trophy size={64} className="mx-auto mb-4" />
                        <p className="text-2xl">Cuadro no disponible</p>
                    </div>
                ) : (
                    <div className="flex gap-16 min-w-max px-8">
                        {rounds.map((round) => (
                            <div key={round} className="flex flex-col justify-around gap-8 min-w-[300px]">
                                <div className="text-center uppercase tracking-widest font-bold text-slate-500 mb-4 border-b border-slate-700 pb-2">
                                    {getRoundLabel(round, rounds.length)}
                                </div>
                                <div className="flex flex-col justify-around h-full gap-6">
                                    {matchesByRound[round].map(match => (
                                        <div
                                            key={match.id}
                                            className={`
                                                relative bg-slate-800 rounded-xl border-l-4 overflow-hidden shadow-lg transition-all
                                                ${match.status === 'finalizado' ? 'border-l-green-500' : 'border-l-slate-600'}
                                            `}
                                        >
                                            {/* Match Info Header */}
                                            {(match.startTime || match.court) && (
                                                <div className="bg-slate-900/50 px-3 py-1 text-xs flex justify-between text-slate-400">
                                                    <span>{match.startTime ? new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</span>
                                                    <span>{match.court ? `Pista ${match.court}` : ''}</span>
                                                </div>
                                            )}

                                            <div className="p-4 flex flex-col gap-3">
                                                {/* Pair 1 */}
                                                <div className={`flex justify-between items-center ${match.points?.p1 > match.points?.p2 && match.status === 'finalizado' ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                                                    <span className="truncate max-w-[200px] text-lg">{getPairName(match.pair1)}</span>
                                                    {match.status === 'finalizado' && (
                                                        <span className="bg-slate-900 px-2 py-1 rounded text-sm font-mono ml-3">
                                                            {match.score?.set1?.p1} {match.score?.set2?.p1} {match.score?.set3?.p1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* VS line */}
                                                <div className="h-px bg-slate-700 w-full relative">
                                                </div>

                                                {/* Pair 2 */}
                                                <div className={`flex justify-between items-center ${match.points?.p2 > match.points?.p1 && match.status === 'finalizado' ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                                                    <span className="truncate max-w-[200px] text-lg">{getPairName(match.pair2)}</span>
                                                    {match.status === 'finalizado' && (
                                                        <span className="bg-slate-900 px-2 py-1 rounded text-sm font-mono ml-3">
                                                            {match.score?.set1?.p2} {match.score?.set2?.p2} {match.score?.set3?.p2}
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
                )}
            </div>
        </div>
    );
};
