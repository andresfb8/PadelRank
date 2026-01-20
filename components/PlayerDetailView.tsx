import React, { useMemo } from 'react';
import { Player, Ranking, Match } from '../types';
import { ArrowLeft, Trophy, Calendar, User, TrendingUp, TrendingDown, Activity, Medal } from 'lucide-react';
import { Card, Badge, Button } from './ui/Components';

interface Props {
    player: Player;
    players: Record<string, Player>; // Added prop
    rankings: Ranking[];
    onBack: () => void;
}

export const PlayerDetailView = ({ player, players, rankings, onBack }: Props) => {
    const getPlayerName = (id: string) => {
        if (!id) return 'Desconocido';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : 'Jugador Eliminado';
    };

    // --- Derived Data & Stats Calculation ---
    const { history, enhancedStats } = useMemo(() => {
        const history: Array<{
            match: Match;
            rankingName: string;
            divisionName: number;
            result: 'Win' | 'Loss' | 'Draw' | 'Pending';
            partner?: string;
            opponents?: string[];
            scoreStr?: string;
        }> = [];

        const partnerStats: Record<string, { wins: number; matches: number }> = {};
        const nemesisStats: Record<string, { losses: number; matches: number }> = {};
        const recentForm: string[] = []; // 'W', 'L', 'D'

        rankings.forEach(ranking => {
            ranking.divisions.forEach(division => {
                division.matches.forEach(match => {
                    // Check if player is in this match
                    const p1 = match.pair1.p1Id === player.id;
                    const p2 = match.pair1.p2Id === player.id;
                    const p3 = match.pair2.p1Id === player.id;
                    const p4 = match.pair2.p2Id === player.id;

                    if (p1 || p2 || p3 || p4) {
                        // Determine Role
                        const myPair = (p1 || p2) ? match.pair1 : match.pair2;
                        const oppPair = (p1 || p2) ? match.pair2 : match.pair1;

                        // Identify Partner (if any)
                        let partnerId = '';
                        if (p1) partnerId = match.pair1.p2Id;
                        else if (p2) partnerId = match.pair1.p1Id;
                        else if (p3) partnerId = match.pair2.p2Id;
                        else if (p4) partnerId = match.pair2.p1Id;

                        // Identify Opponents
                        const opponents = [oppPair.p1Id, oppPair.p2Id].filter(Boolean);

                        // Determine Result
                        let result: 'Win' | 'Loss' | 'Draw' | 'Pending' = 'Pending';
                        let scoreStr = '';

                        if (match.status === 'finalizado') {
                            // Check Score Logic
                            // Assumes classic Set scoring or points
                            const myPoints = (p1 || p2) ? match.points.p1 : match.points.p2;
                            const oppPoints = (p1 || p2) ? match.points.p2 : match.points.p1;

                            if (myPoints > oppPoints) result = 'Win';
                            else if (myPoints < oppPoints) result = 'Loss';
                            else result = 'Draw';

                            // Format Score string
                            if (match.score) {
                                const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                                if (sets.length > 0) {
                                    scoreStr = sets.map(s => {
                                        if (!s) return '';
                                        if ((p1 || p2)) return `${s.p1}-${s.p2}`;
                                        else return `${s.p2}-${s.p1}`; // Flip for my perspective
                                    }).join(', ');
                                } else if (match.score.pointsScored) {
                                    // Americano/Mexicano points
                                    const myGamePoints = (p1 || p2) ? match.score.pointsScored.p1 : match.score.pointsScored.p2;
                                    const oppGamePoints = (p1 || p2) ? match.score.pointsScored.p2 : match.score.pointsScored.p1;
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
                            partner: partnerId,
                            opponents,
                            scoreStr: scoreStr || '-'
                        });

                        // Update Advanced Stats if Finished
                        if (result !== 'Pending') {
                            // Partner Stats
                            if (partnerId && partnerId.trim() !== '') {
                                if (!partnerStats[partnerId]) partnerStats[partnerId] = { wins: 0, matches: 0 };
                                partnerStats[partnerId].matches++;
                                if (result === 'Win') partnerStats[partnerId].wins++;
                            }

                            // Nemesis Stats (Opponents)
                            opponents.forEach(oppId => {
                                if (oppId && oppId.trim() !== '') {
                                    if (!nemesisStats[oppId]) nemesisStats[oppId] = { losses: 0, matches: 0 };
                                    nemesisStats[oppId].matches++;
                                    if (result === 'Loss') nemesisStats[oppId].losses++;
                                }
                            });

                            // Recent Form
                            recentForm.push(result === 'Win' ? 'W' : result === 'Loss' ? 'L' : 'D');
                        }
                    }
                });
            });
        });

        // Compute "Best" from maps
        let bestPartner = { id: '', winrate: -1, matches: 0 };
        Object.entries(partnerStats).forEach(([id, s]) => {
            if (s.matches >= 2) { // Min 2 matches to count
                const wr = s.wins / s.matches;
                if (wr > bestPartner.winrate || (wr === bestPartner.winrate && s.matches > bestPartner.matches)) {
                    bestPartner = { id, winrate: wr, matches: s.matches };
                }
            }
        });

        let biggestNemesis = { id: '', losses: -1, matches: 0 };
        Object.entries(nemesisStats).forEach(([id, s]) => {
            if (s.matches >= 2) {
                if (s.losses > biggestNemesis.losses) {
                    biggestNemesis = { id, losses: s.losses, matches: s.matches };
                }
            }
        });

        return { history: history.reverse(), enhancedStats: { bestPartner, biggestNemesis, recentForm: recentForm.slice(-5).reverse() } }; // Most recent first
    }, [player, rankings]);

    return (
        <div className="space-y-6 container mx-auto max-w-5xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Perfil del Jugador</h2>
            </div>

            {/* Hero Card */}
            <Card className="p-0 overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center text-4xl font-bold border-4 border-white/20">
                        {player.nombre.charAt(0)}{player.apellidos.charAt(0)}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{player.nombre} {player.apellidos}</h1>
                    </div>

                    {/* Key Stats Pill */}
                    <div className="flex gap-4">
                        <div className="text-center px-4 md:border-r border-white/10">
                            <div className="text-3xl font-bold text-emerald-400">{player.stats?.winrate ?? 0}%</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Win Rate</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-3xl font-bold text-white">{player.stats?.pj ?? 0}</div>
                            <div className="text-xs uppercase tracking-wider text-slate-400">Partidos</div>
                        </div>
                    </div>
                </div>

                {/* Recent Form Strip */}
                <div className="bg-black/20 px-8 py-3 flex items-center justify-between">
                    <span className="text-xs uppercase font-semibold text-slate-400">Racha Reciente</span>
                    <div className="flex gap-1">
                        {enhancedStats.recentForm.map((r, i) => (
                            <span key={i} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${r === 'W' ? 'bg-emerald-500 text-white' : r === 'L' ? 'bg-rose-500 text-white' : 'bg-gray-500 text-white'
                                }`}>
                                {r}
                            </span>
                        ))}
                        {enhancedStats.recentForm.length === 0 && <span className="text-slate-500 text-sm">Sin partidos recientes</span>}
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
                            <span className="font-bold text-emerald-600">{player.stats?.pg ?? 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Derrotas</span>
                            <span className="font-bold text-rose-600">{player.stats?.pp ?? 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">Total Sets Diferencia</span>
                            {/* We don't have this in player.stats yet, would need recalc. Skipping for now */}
                            <span className="font-bold text-gray-400">-</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Medal size={18} className="text-amber-500" /> Mejor Compañero (min 2p)
                    </h3>
                    {enhancedStats.bestPartner.id ? (
                        <div className="text-center py-4">
                            <div className="font-bold text-gray-800 mb-1 lg:text-lg">
                                {getPlayerName(enhancedStats.bestPartner.id)}
                            </div>
                            <div className="text-emerald-500 font-bold text-xl">{Math.round(enhancedStats.bestPartner.winrate * 100)}% WinRate</div>
                            <div className="text-gray-400 text-sm">{enhancedStats.bestPartner.matches} Partidos Juntos</div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 italic">Datos insuficientes</div>
                    )}
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingDown size={18} className="text-rose-500" /> Némesis (Más Derrotas)
                    </h3>
                    {enhancedStats.biggestNemesis.id ? (
                        <div className="text-center py-4">
                            <div className="text-3xl font-bold text-gray-800 mb-1">{enhancedStats.biggestNemesis.losses}</div>
                            <div className="text-gray-500 text-sm">Derrotas contra</div>
                            <div className="font-medium text-gray-900 mt-1">{getPlayerName(enhancedStats.biggestNemesis.id)}</div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 italic">¡Imparable! (Sin datos)</div>
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
                                <th className="px-4 py-3">Compañero</th>
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
                                        {h.partner ? (
                                            <span className="flex items-center gap-1"><User size={14} /> {getPlayerName(h.partner)}</span>
                                        ) : <span className="italic text-gray-400">Individual</span>}
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
                                    <td colSpan={5} className="text-center py-8 text-gray-400 italic">No hay partidos registrados</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
