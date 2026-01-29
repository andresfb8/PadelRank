import React, { useMemo } from 'react';
import { Ranking, Player } from '../../../types';
import { generateStandings } from '../../../services/logic';
import { Trophy, ArrowUp, ArrowDown, Activity } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
}

export const StandingsSlide = ({ ranking, players }: Props) => {
    // Always get the first active division for TV mode (simplified for MVP)
    // TODO: Support cycling through divisions if multiple exist
    const division = ranking.divisions[0];

    const standings = useMemo(() => {
        if (!division) return [];
        return generateStandings(division.id, division.matches || [], division.players || [], ranking.format as any);
    }, [division, ranking.format]);

    if (!division) return <div className="p-8 text-white">No hay divisiones activas</div>;

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900 text-white">
            <div className="flex items-center gap-4 mb-6">
                <Trophy className="text-yellow-400 w-12 h-12" />
                <h2 className="text-4xl font-bold tracking-tight">Clasificación - {division.name || `División ${division.numero}`}</h2>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 bg-slate-800 p-4 rounded-t-xl font-bold text-xl text-slate-300">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-1 border-r border-slate-700"></div>
                    <div className="col-span-6 pl-4">Jugador</div>
                    <div className="col-span-1 text-center text-blue-400">PJ</div>
                    <div className="col-span-1 text-center text-green-400">PG</div>
                    <div className="col-span-1 text-center text-yellow-500">PTS</div>
                    <div className="col-span-1 text-center text-gray-400">DS</div>
                </div>

                {/* Table Body - Auto Scroll Container would go here */}
                <div className="bg-slate-800/50 rounded-b-xl overflow-y-auto max-h-[calc(100vh-250px)]">
                    {standings.map((row, idx) => {
                        const player = players[row.playerId];
                        if (!player) return null;

                        return (
                            <div
                                key={row.playerId}
                                className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-slate-700/50 text-xl font-medium ${idx < (ranking.config?.promotionCount || 0) ? 'bg-green-500/10' :
                                    idx >= standings.length - (ranking.config?.relegationCount || 0) ? 'bg-red-500/10' : ''
                                    }`}
                            >
                                <div className="col-span-1 flex justify-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' :
                                        idx === 1 ? 'bg-gray-300 text-black' :
                                            idx === 2 ? 'bg-amber-600 text-white' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {row.pos}
                                    </div>
                                </div>

                                <div className="col-span-1 flex justify-center text-slate-400">
                                    {row.trend === 'up' && <ArrowUp className="text-green-500 w-6 h-6" />}
                                    {row.trend === 'down' && <ArrowDown className="text-red-500 w-6 h-6" />}
                                    {row.trend === 'same' && <Activity className="text-slate-600 w-5 h-5" />}
                                </div>

                                <div className="col-span-6 pl-4 flex items-center gap-3">
                                    <span className="truncate">{player.nombre} {player.apellidos}</span>
                                </div>

                                <div className="col-span-1 text-center text-blue-300 font-bold">{row.pj}</div>
                                <div className="col-span-1 text-center text-green-400 font-bold">{row.stats.pg}</div>
                                <div className="col-span-1 text-center text-yellow-400 font-bold text-2xl">{row.pts}</div>
                                <div className="col-span-1 text-center text-gray-400 font-mono text-lg">
                                    {row.stats.setsWon - (row.pj * 2 - row.stats.setsWon)} {/* Simple Diff Est. */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
