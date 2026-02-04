import React, { useMemo } from 'react';
import { Player, Ranking, Match } from '../types';
import { ArrowLeft, TrendingUp, Activity, Users } from 'lucide-react';
import { Card, Badge } from './ui/Components';

interface Props {
    pairId: string; // "p1::p2"
    players: Record<string, Player>;
    rankings: Ranking[];
    onBack: () => void;
}

export const PairDetailView = ({ pairId, players, rankings, onBack }: Props) => {
    const [p1Id, p2Id] = pairId.split('::');
    const p1 = players[p1Id];
    const p2 = players[p2Id];

    const getPlayerName = (id: string) => {
        if (!id) return 'Desconocido';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : 'Jugador Eliminado';
    };

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

        const nemesisStats: Record<string, { losses: number; matches: number }> = {};
        const recentForm: string[] = []; // 'W', 'L', 'D'

        rankings.forEach(ranking => {
            ranking.divisions.forEach(division => {
                division.matches.forEach(match => {
                    // Check if BOTH players are in this match as a pair
                    const isPair1 = (match.pair1.p1Id === p1Id && match.pair1.p2Id === p2Id) || (match.pair1.p1Id === p2Id && match.pair1.p2Id === p1Id);
                    const isPair2 = (match.pair2.p1Id === p1Id && match.pair2.p2Id === p2Id) || (match.pair2.p1Id === p2Id && match.pair2.p2Id === p1Id);

                    if (isPair1 || isPair2) {
                        // Determine Role
                        const myPair = isPair1 ? match.pair1 : match.pair2;
                        const oppPair = isPair1 ? match.pair2 : match.pair1;

                        // Identify Opponents
                        const opponents = [oppPair.p1Id, oppPair.p2Id].filter(Boolean);

                        // Determine Result
                        let result: 'Win' | 'Loss' | 'Draw' | 'Pending' = 'Pending';
                        let scoreStr = '';

                        if (match.status === 'finalizado') {
                            const myPoints = isPair1 ? match.points.p1 : match.points.p2;
                            const oppPoints = isPair1 ? match.points.p2 : match.points.p1;

                            if (myPoints > oppPoints) result = 'Win';
                            else if (myPoints < oppPoints) result = 'Loss';
                            else result = 'Draw';

                            // Format Score string
                            if (match.score) {
                                const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                                if (sets.length > 0) {
                                    scoreStr = sets.map(s => {
                                        if (!s) return '';
                                        if (isPair1) return `${s.p1}-${s.p2}`;
                                        else return `${s.p2}-${s.p1}`;
                                    }).join(', ');
                                } else if (match.score.pointsScored) {
                                    const myGamePoints = isPair1 ? match.score.pointsScored.p1 : match.score.pointsScored.p2;
                                    const oppGamePoints = isPair1 ? match.score.pointsScored.p2 : match.score.pointsScored.p1;
                                    scoreStr = `${myGamePoints}-${oppGamePoints}`;
                                }
                            }
                        }

                        // Push to history
                        history.push({
                            match,
                            rankingName: ranking.nombre,
                            divisionName: division.numero,
                            result,
                            opponents,
                            scoreStr: scoreStr || '-'
                        });

                        // Update Stats
                        if (result !== 'Pending') {
                            opponents.forEach(oppId => {
                                if (oppId && oppId.trim() !== '') {
                                    if (!nemesisStats[oppId]) nemesisStats[oppId] = { losses: 0, matches: 0 };
                                    nemesisStats[oppId].matches++;
                                    if (result === 'Loss') nemesisStats[oppId].losses++;
                                }
                            });
                            recentForm.push(result === 'Win' ? 'W' : result === 'Loss' ? 'L' : 'D');
                        }
                    }
                });
            });
        });

        // Nemesis
        let biggestNemesis = { id: '', losses: -1, matches: 0 };
        Object.entries(nemesisStats).forEach(([id, s]) => {
            if (s.matches >= 2) {
                if (s.losses > biggestNemesis.losses) {
                    biggestNemesis = { id, losses: s.losses, matches: s.matches };
                }
            }
        });

        // Basic Aggregation
        let pj = 0, pg = 0, pp = 0, pe = 0;
        let setsWon = 0, setsTotal = 0, gamesWon = 0, gamesTotal = 0;
        let netSets = 0, netGames = 0;

        history.forEach(h => {
            if (h.result === 'Pending') return;
            pj++;
            if (h.result === 'Win') pg++;
            else if (h.result === 'Loss') pp++;
            else pe++;

            const match = h.match;
            if (match.status === 'finalizado') {
                // Check for Sets/Games
                if (match.score) {
                    // Check local boolean again for safety inside loop (or rely on helper)
                    const isPair1 = (match.pair1.p1Id === p1Id && match.pair1.p2Id === p2Id) || (match.pair1.p1Id === p2Id && match.pair1.p2Id === p1Id);

                    const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                    if (sets.length > 0) {
                        sets.forEach(s => {
                            if (!s) return;
                            const myG = isPair1 ? s.p1 : s.p2;
                            const oppG = isPair1 ? s.p2 : s.p1;
                            gamesTotal += (myG + oppG);
                            gamesWon += myG;
                            netGames += (myG - oppG);

                            setsTotal++;
                            if (myG > oppG) { setsWon++; netSets++; }
                            else if (oppG > myG) { netSets--; }
                        });
                    }
                }
            }
        });

        const winrate = pj > 0 ? Math.round((pg / pj) * 100) : 0;

        // Streaks
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

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
                pj, pg, pp, pe, winrate,
                sets: { won: setsWon, total: setsTotal, diff: netSets },
                games: { won: gamesWon, total: gamesTotal, diff: netGames },
                streaks: { current: currentStreak, best: bestStreak },
                recentForm: recentForm.slice(-5).reverse(),
                biggestNemesis
            }
        };
    }, [p1Id, p2Id, rankings]);

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
            <Card className="p-0 overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex -space-x-4">
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold border-4 border-white/20 z-10">
                            {p1?.nombre.charAt(0)}{p1?.apellidos.charAt(0)}
                        </div>
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold border-4 border-white/20">
                            {p2?.nombre.charAt(0)}{p2?.apellidos.charAt(0)}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-1">{p1?.nombre} & {p2?.nombre}</h1>
                        <div className="text-blue-200 text-sm">Pareja Oficial</div>
                    </div>

                    {/* Key Stats Pill */}
                    <div className="flex gap-4">
                        <div className="text-center px-4 md:border-r border-white/10">
                            <div className="text-3xl font-bold text-emerald-400">{stats.winrate}%</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Win Rate</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-3xl font-bold text-white">{stats.pj}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Partidos</div>
                        </div>
                    </div>
                </div>

                {/* Recent Form Strip */}
                <div className="bg-black/20 px-8 py-3 flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-slate-400">Racha Reciente</span>
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
                        <TrendingUp size={18} className="text-emerald-500" /> Estadísticas Totales
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Victorias</span>
                            <span className="font-bold text-emerald-600">{stats.pg}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Derrotas</span>
                            <span className="font-bold text-rose-600">{stats.pp}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Dif. Sets</span>
                            <span className={`font-bold ${stats.sets.diff > 0 ? 'text-emerald-600' : stats.sets.diff < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                                {stats.sets.diff > 0 ? `+${stats.sets.diff}` : stats.sets.diff}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Dif. Juegos</span>
                            <span className={`font-bold ${stats.games.diff > 0 ? 'text-emerald-600' : stats.games.diff < 0 ? 'text-rose-600' : 'text-gray-600'}`}>
                                {stats.games.diff > 0 ? `+${stats.games.diff}` : stats.games.diff}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" /> Eficiencia
                    </h3>
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.sets.total > 0 ? Math.round((stats.sets.won / stats.sets.total) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-500">Sets Ganados</div>
                            <div className="text-xs text-gray-400">({stats.sets.won}/{stats.sets.total})</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.games.total > 0 ? Math.round((stats.games.won / stats.games.total) * 100) : 0}%
                            </div>
                            <div className="text-xs text-gray-500">Juegos Ganados</div>
                            <div className="text-xs text-gray-400">({stats.games.won}/{stats.games.total})</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-orange-500" /> Rachas
                    </h3>
                    <div className="flex justify-between text-center pt-4">
                        <div>
                            <div className="text-xl font-bold text-gray-800 flex items-center justify-center gap-1">
                                {stats.streaks.current} <span className="text-lg">🔥</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Actual</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-gray-800 flex items-center justify-center gap-1">
                                {stats.streaks.best} <span className="text-lg">🏆</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Mejor</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Match History */}
            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Users size={18} className="text-primary" /> Historial de Partidos ({history.length})</h3>
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
                                    <td colSpan={4} className="text-center py-8 text-gray-400 italic">No hay partidos registrados como pareja</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
