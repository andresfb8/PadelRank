import React, { useMemo } from 'react';
import { Player, Ranking, Match } from '../types';
import { ArrowLeft, Trophy, Calendar, User, TrendingUp, TrendingDown, Activity, Medal, Users } from 'lucide-react';
import { Card, Badge, Button } from './ui/Components';

interface Props {
    pairId: string; // Format: "p1Id-p2Id"
    players: Record<string, Player>;
    rankings: Ranking[];
    onBack: () => void;
}

export const PairDetailView = ({ pairId, players, rankings, onBack }: Props) => {
    const [p1Id, p2Id] = pairId.split('-');

    const getPlayerName = (id: string) => {
        if (!id) return 'Desconocido';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : 'Jugador Eliminado';
    };

    const getPairName = (id1: string, id2: string) => {
        return `${getPlayerName(id1)} / ${getPlayerName(id2)}`;
    }

    // --- Derived Data & Stats Calculation ---
    const { history, stats } = useMemo(() => {
        const history: Array<{
            match: Match;
            rankingName: string;
            divisionName: number;
            result: 'Win' | 'Loss' | 'Draw' | 'Pending';
            opponents?: string[];
            scoreStr?: string;
        }> = [];

        const nemesisStats: Record<string, { losses: number; matches: number }> = {}; // Key: "opp1Id-opp2Id"
        const recentForm: string[] = []; // 'W', 'L', 'D'

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let totalMatches = 0;

        let totalSetsWon = 0;
        let totalSetsPlayed = 0;
        let totalGamesWon = 0;
        let totalGamesPlayed = 0;

        // Helper to check if a pair object matches our target pair
        const isMyPair = (p: { p1Id: string, p2Id: string }) => {
            return (p.p1Id === p1Id && p.p2Id === p2Id) || (p.p1Id === p2Id && p.p2Id === p1Id);
        };

        const getPairKey = (p: { p1Id: string, p2Id: string }) => {
            return [p.p1Id, p.p2Id].sort().join('-');
        };

        rankings.forEach(ranking => {
            // Only care about ONE ranking format? Or all? 
            // Pair stats usually only make sense in 'pairs' ranking context or if we just look for match occurrences.
            // We'll search EVERYWHERE.
            ranking.divisions.forEach(division => {
                division.matches.forEach(match => {
                    const isPair1 = isMyPair(match.pair1);
                    const isPair2 = isMyPair(match.pair2);

                    if (isPair1 || isPair2) {
                        const myPairObj = isPair1 ? match.pair1 : match.pair2;
                        const oppPairObj = isPair1 ? match.pair2 : match.pair1;
                        const opponents = [oppPairObj.p1Id, oppPairObj.p2Id];
                        const oppKey = getPairKey(oppPairObj);

                        let result: 'Win' | 'Loss' | 'Draw' | 'Pending' = 'Pending';
                        let scoreStr = '';

                        if (match.status === 'finalizado') {
                            totalMatches++;
                            const myPoints = isPair1 ? match.points.p1 : match.points.p2;
                            const oppPoints = isPair1 ? match.points.p2 : match.points.p1;

                            if (myPoints > oppPoints) { result = 'Win'; wins++; }
                            else if (myPoints < oppPoints) { result = 'Loss'; losses++; }
                            else { result = 'Draw'; draws++; }


                            // Score Parsing
                            if (match.score) {
                                const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                                if (sets.length > 0) {
                                    scoreStr = sets.map(s => {
                                        if (!s) return '';
                                        const myG = isPair1 ? s.p1 : s.p2;
                                        const oppG = isPair1 ? s.p2 : s.p1;

                                        // Stats
                                        totalGamesPlayed += (myG + oppG);
                                        totalGamesWon += myG;
                                        totalSetsPlayed++;
                                        if (myG > oppG) totalSetsWon++;

                                        return `${myG}-${oppG}`;
                                    }).join(', ');
                                }
                            }
                        }

                        history.push({
                            match,
                            rankingName: ranking.nombre,
                            divisionName: division.numero,
                            result,
                            opponents,
                            scoreStr: scoreStr || '-'
                        });

                        // Advanced Stats
                        if (result !== 'Pending') {
                            // Nemesis
                            if (!nemesisStats[oppKey]) nemesisStats[oppKey] = { losses: 0, matches: 0 };
                            nemesisStats[oppKey].matches++;
                            if (result === 'Loss') nemesisStats[oppKey].losses++;

                            recentForm.push(result === 'Win' ? 'W' : result === 'Loss' ? 'L' : 'D');
                        }
                    }
                });
            });
        });

        // Calc Nemesis
        let biggestNemesis = { ids: [] as string[], losses: -1, matches: 0 };
        Object.entries(nemesisStats).forEach(([key, s]) => {
            if (s.losses > biggestNemesis.losses) {
                biggestNemesis = { ids: key.split('-'), losses: s.losses, matches: s.matches };
            }
        });

        // Streaks
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        // History is Oldest -> Newest implicitly by push order? 
        // Logic above iterates: Rankings -> Divs -> Matches. 
        // Order depends on structure. Let's assume matches are roughly chronological or we trust array order.
        history.forEach(h => {
            if (h.result === 'Win') {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else if (h.result === 'Loss' || h.result === 'Draw') {
                tempStreak = 0;
            }
        });
        currentStreak = tempStreak;

        return {
            history: history.reverse(),
            stats: {
                totalMatches,
                wins, losses, draws,
                winrate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
                sets: { won: totalSetsWon, total: totalSetsPlayed },
                games: { won: totalGamesWon, total: totalGamesPlayed },
                recentForm: recentForm.slice(-5).reverse(),
                streaks: { current: currentStreak, best: bestStreak },
                biggestNemesis
            }
        };

    }, [pairId, rankings]);


    return (
        <div className="space-y-6 container mx-auto max-w-5xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Estadísticas de Pareja</h2>
            </div>

            {/* Hero Card */}
            <Card className="p-0 overflow-hidden bg-gradient-to-r from-indigo-800 to-violet-900 text-white">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex -space-x-4">
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold border-4 border-white/20 z-10">
                            {players[p1Id]?.nombre.charAt(0)}{players[p1Id]?.apellidos.charAt(0)}
                        </div>
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold border-4 border-white/20 z-0">
                            {players[p2Id]?.nombre.charAt(0)}{players[p2Id]?.apellidos.charAt(0)}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-1">{getPlayerName(p1Id)}</h1>
                        <h1 className="text-2xl font-bold text-indigo-200">&</h1>
                        <h1 className="text-3xl font-bold mt-1">{getPlayerName(p2Id)}</h1>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-center px-4 md:border-r border-white/10">
                            <div className="text-3xl font-bold text-emerald-400">{stats.winrate}%</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Win Rate</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-3xl font-bold text-white">{stats.totalMatches}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Partidos</div>
                        </div>
                    </div>
                </div>

                {/* Recent Form Strip */}
                <div className="bg-black/20 px-8 py-3 flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-slate-400">Racha Conjunta</span>
                    <div className="flex gap-1">
                        {stats.recentForm.map((r, i) => (
                            <span key={i} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${r === 'W' ? 'bg-emerald-500 text-white' : r === 'L' ? 'bg-rose-500 text-white' : 'bg-gray-500 text-white'
                                }`}>
                                {r}
                            </span>
                        ))}
                        {stats.recentForm.length === 0 && <span className="text-slate-500 text-sm">Sin partidos recientes</span>}
                    </div>
                </div>
            </Card>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" /> Balance
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Victorias</span>
                            <span className="font-bold text-emerald-600">{stats.wins}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Derrotas</span>
                            <span className="font-bold text-rose-600">{stats.losses}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Empates</span>
                            <span className="font-bold text-gray-600">{stats.draws}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" /> Eficiencia
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.sets.total > 0 ? Math.round((stats.sets.won / stats.sets.total) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Sets Ganados</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.games.total > 0 ? Math.round((stats.games.won / stats.games.total) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Juegos Ganados</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingDown size={18} className="text-rose-500" /> Némesis
                    </h3>
                    {stats.biggestNemesis.ids.length > 0 ? (
                        <div className="text-center py-4">
                            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.biggestNemesis.losses}</div>
                            <div className="text-gray-500 text-sm">Derrotas contra</div>
                            <div className="font-medium text-gray-900 mt-1 text-sm">
                                {getPairName(stats.biggestNemesis.ids[0], stats.biggestNemesis.ids[1])}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 italic">Invictos</div>
                    )}
                </Card>
            </div>

            {/* Match History */}
            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Activity size={18} className="text-primary" /> Historial de Partidos ({history.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Fecha/Torneo</th>
                                <th className="px-4 py-3 text-center">Res.</th>
                                <th className="px-4 py-3 text-center">Marcador</th>
                                <th className="px-4 py-3">Rivales</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.map((h, i) => (
                                <tr key={h.match.id + i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-gray-900">{h.rankingName}</div>
                                        <div className="text-xs text-gray-500">División {h.divisionName} • Jornada {h.match.jornada}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge type={h.result === 'Win' ? 'success' : h.result === 'Loss' ? 'danger' : h.result === 'Draw' ? 'warning' : 'neutral'}>
                                            {h.result === 'Win' ? 'Victoria' : h.result === 'Loss' ? 'Derrota' : h.result === 'Draw' ? 'Empate' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono font-medium">
                                        {h.scoreStr}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            {h.opponents?.map(op => (
                                                <span key={op} className="text-xs">{getPlayerName(op)}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-400 italic">No hay partidos registrados para esta pareja</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
};
