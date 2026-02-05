import React, { useMemo } from 'react';
import { Ranking, Player } from '../../../types';
import { generateStandings } from '../../../services/logic';
import { Trophy, ArrowUp, ArrowDown, Activity } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
    divisionId?: string;
}

export const StandingsSlide = ({ ranking, players, divisionId }: Props) => {
    // Use provided divisionId, or fallback to default logic
    const division = useMemo(() => {
        if (!ranking.divisions || ranking.divisions.length === 0) return null;

        if (divisionId) {
            return ranking.divisions.find(d => d.id === divisionId) || ranking.divisions[0];
        }

        // If hybrid and in playoff phase, prefer playoff divisions
        if (ranking.format === 'hybrid' && ranking.phase === 'playoff') {
            const playoffDiv = ranking.divisions.find(d => d.stage === 'playoff' || d.type === 'main');
            if (playoffDiv) return playoffDiv;
        }

        // Default to first division
        return ranking.divisions[0];
    }, [ranking, divisionId]);

    const standings = useMemo(() => {
        if (!division) return [];
        return generateStandings(division.id, division.matches || [], division.players || [], ranking.format as any);
    }, [division, ranking.format]);

    const isPointsBased = ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo';

    if (!division) return <div className="p-8 text-white">No hay divisiones activas</div>;

    return (
        <div className="h-full flex flex-col p-8 bg-slate-900 text-white">
            <div className="flex items-center gap-4 mb-6">
                {ranking.config?.branding?.logoUrl ? (
                    <img src={ranking.config.branding.logoUrl} className="w-16 h-16 object-contain bg-white/10 rounded-lg p-1" alt="Logo" />
                ) : (
                    <Trophy className="text-yellow-400 w-12 h-12" />
                )}
                <h2 className="text-4xl font-bold tracking-tight">Clasificación - {division.name || `División ${division.numero}`}</h2>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 bg-slate-800 p-4 rounded-t-xl font-bold text-lg text-slate-300">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5 pl-4">Jugador</div>
                    <div className="col-span-1 text-center text-yellow-500 font-black">{isPointsBased ? 'PUNTOS' : 'PTS'}</div>
                    <div className="col-span-1 text-center text-blue-400">PJ</div>
                    <div className="col-span-1 text-center text-green-400">PG</div>
                    <div className="col-span-1 text-center text-red-400">PP</div>
                    <div className="col-span-1 text-center text-gray-400 text-base">{isPointsBased ? 'JF' : 'DS'}</div>
                    <div className="col-span-1 text-center text-purple-400 text-base">%</div>
                </div>

                {/* Table Body - Auto Scroll Container would go here */}
                <div className="bg-slate-800/50 rounded-b-xl overflow-y-auto max-h-[calc(100vh-250px)]">
                    {standings.map((row, idx) => {
                        const displayName = (() => {
                            try {
                                if (row.playerId.includes('::')) {
                                    const parts = row.playerId.split('::');
                                    // Handle cases with empty parts
                                    const p1Id = parts[0];
                                    const p2Id = parts[1];

                                    const n1 = players[p1Id] ? `${players[p1Id].nombre} ${players[p1Id].apellidos || ''}` : '???';
                                    const n2 = players[p2Id] ? `${players[p2Id].nombre} ${players[p2Id].apellidos || ''}` : '???';
                                    return `${n1} / ${n2}`;
                                }
                                const p = players[row.playerId];
                                return p ? `${p.nombre} ${p.apellidos || ''}` : (row.playerId.includes('bye') ? 'BYE' : 'ID: ' + row.playerId.substring(0, 5));
                            } catch (e) {
                                return 'Error';
                            }
                        })();

                        // For PointsBased formats, 'pts' usually means game points or similar, depends on logic.ts
                        // In Americano/Mexicano: pts = total score.
                        // In Classic: pts = match wins * points_per_win.

                        return (
                            <div
                                key={row.playerId}
                                className={`grid grid-cols-12 gap-2 p-3 items-center border-b border-slate-700/50 text-lg font-medium ${idx < (ranking.config?.promotionCount || 0) ? 'bg-green-500/10' :
                                    idx >= standings.length - (ranking.config?.relegationCount || 0) ? 'bg-red-500/10' : ''
                                    }`}
                            >
                                <div className="col-span-1 flex justify-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' :
                                        idx === 1 ? 'bg-gray-300 text-black' :
                                            idx === 2 ? 'bg-amber-600 text-white' :
                                                'bg-slate-700 text-slate-300'
                                        }`}>
                                        {row.pos}
                                    </div>
                                </div>

                                <div className="col-span-5 pl-4 flex items-center gap-2">
                                    {row.trend === 'up' && <ArrowUp className="text-green-500 w-4 h-4" />}
                                    {row.trend === 'down' && <ArrowDown className="text-red-500 w-4 h-4" />}
                                    {row.trend === 'same' && <Activity className="text-slate-600 w-4 h-4" />}
                                    <span className="truncate" title={displayName}>{displayName}</span>
                                </div>

                                <div className="col-span-1 text-center text-yellow-400 font-bold text-xl">{row.pts}</div>
                                <div className="col-span-1 text-center text-blue-300">{row.pj}</div>
                                <div className="col-span-1 text-center text-green-400">{row.pg}</div>
                                <div className="col-span-1 text-center text-red-400">{row.pj - row.pg}</div>
                                <div className="col-span-1 text-center text-gray-400 text-base">
                                    {isPointsBased ?
                                        (row.gamesWon !== undefined && row.gamesLost !== undefined ? (row.gamesWon - row.gamesLost) : 0) :
                                        (row.setsDiff !== undefined ? row.setsDiff : 0)
                                    }
                                </div>
                                <div className="col-span-1 text-center text-purple-400 text-base">
                                    {Math.round(row.winRate || 0)}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
