import React, { useMemo } from 'react';
import { Ranking, Player, Match } from '../../../types';
import { Calendar, CheckCircle, CircleDashed } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
}

export const MatchesSlide = ({ ranking, players }: Props) => {
    // Intelligently select the most relevant division for TV mode
    const division = useMemo(() => {
        if (!ranking.divisions || ranking.divisions.length === 0) return null;

        // If hybrid and in playoff phase, prefer playoff divisions
        if (ranking.format === 'hybrid' && ranking.phase === 'playoff') {
            const playoffDiv = ranking.divisions.find(d => d.stage === 'playoff' || d.type === 'main');
            if (playoffDiv) return playoffDiv;
        }

        // Default to first division
        return ranking.divisions[0];
    }, [ranking]);

    const { finishedMatches, pendingMatches } = useMemo(() => {
        if (!division || !division.matches) return { finishedMatches: [], pendingMatches: [] };

        const finished = division.matches
            .filter(m => m.status === 'finalizado')
            .slice(-5) // Last 5 matches
            .reverse(); // Newest first

        const pending = division.matches
            .filter(m => m.status === 'pendiente')
            .slice(0, 5); // Next 5 pending

        return { finishedMatches: finished, pendingMatches: pending };
    }, [division]);

    const getPlayerName = (id: string) => {
        const p = players[id];
        if (!p) return '???';
        // Return only last name for compactness if needed, or full name
        const name = p.nombre || '?';
        const lastName = p.apellidos || '';
        return `${name.charAt(0)}. ${lastName}`;
    };

    const renderMatchCard = (m: Match, isFinished: boolean) => {
        return (
            <div key={m.id} className={`flex items-center justify-between p-4 rounded-xl border ${isFinished ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700 border-dashed'}`}>
                {/* Team 1 */}
                <div className="flex flex-col items-start w-1/3">
                    <span className="text-xl font-bold text-white truncate w-full">{getPlayerName(m.pair1.p1Id)}</span>
                    <span className="text-xl font-bold text-white truncate w-full">{getPlayerName(m.pair1.p2Id)}</span>
                </div>

                {/* Score vs Status */}
                <div className="flex flex-col items-center justify-center w-1/3 px-2">
                    {isFinished ? (
                        <div className="flex items-center gap-3">
                            <div className="text-3xl font-black text-yellow-400">
                                {m.score?.set1?.p1}-{m.score?.set1?.p2}
                            </div>
                            {m.score?.set2 && (
                                <div className="text-3xl font-black text-yellow-400 opacity-70">
                                    {m.score?.set2?.p1}-{m.score?.set2?.p2}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-2xl font-bold text-slate-500">
                            VS
                        </div>
                    )}
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-end w-1/3">
                    <span className="text-xl font-bold text-white truncate w-full text-right">{getPlayerName(m.pair2.p1Id)}</span>
                    <span className="text-xl font-bold text-white truncate w-full text-right">{getPlayerName(m.pair2.p2Id)}</span>
                </div>
            </div>
        );
    };

    if (!division) return null;

    return (
        <div className="h-full grid grid-cols-2 gap-8 p-8 bg-slate-900 text-white">
            <div style={{ position: 'absolute', top: 100, left: 10, background: 'orange', color: 'black', padding: '5px', zIndex: 9999 }}>
                DEBUG: Matches. DivID: {division?.id} | Finished: {finishedMatches.length} | Pending: {pendingMatches.length}
            </div>
            {/* Column 1: Recent Results */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2 border-b border-slate-700 pb-4">
                    <CheckCircle className="text-green-500 w-8 h-8" />
                    <h2 className="text-3xl font-bold">Últimos Resultados</h2>
                </div>
                <div className="flex flex-col gap-4 overflow-y-auto">
                    {finishedMatches.length > 0 ? finishedMatches.map(m => renderMatchCard(m, true)) : <p className="text-slate-500 italic text-xl">No hay partidos finalizados aún.</p>}
                </div>
            </div>

            {/* Column 2: Upcoming */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-2 border-b border-slate-700 pb-4">
                    <Calendar className="text-blue-500 w-8 h-8" />
                    <h2 className="text-3xl font-bold">Próximos Encuentros</h2>
                </div>
                <div className="flex flex-col gap-4 overflow-y-auto">
                    {pendingMatches.length > 0 ? pendingMatches.map(m => renderMatchCard(m, false)) : <p className="text-slate-500 italic text-xl">No hay partidos pendientes.</p>}
                </div>
            </div>
        </div>
    );
};
