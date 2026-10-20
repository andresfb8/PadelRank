import React, { useMemo } from 'react';
import { Player, Ranking, Match } from '../types';
import { ArrowLeft } from 'lucide-react';

interface Props {
    player: Player;
    players: Record<string, Player>; // Added prop
    rankings: Ranking[];
    onBack: () => void;
    /** Inside the players drawer (organiser): no back button, a smaller title, contact details shown */
    embedded?: boolean;
}

export const PlayerDetailView = ({ player, players, rankings, onBack, embedded = false }: Props) => {
    const getPlayerName = (id: string) => {
        if (!id) return 'Desconocido';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : 'Jugador Eliminado';
    };

    // --- Derived Data & Stats Calculation ---
    const { history, enhancedStats, manualAdj } = useMemo(() => {
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

        // --- Manual Adjustments (God Mode) ---
        // Accumulate adjustments from all rankings for this player
        const manualAdj = { wins: 0, losses: 0, setsWon: 0, setsLost: 0, setsDiff: 0, gamesWon: 0, gamesLost: 0, gamesDiff: 0 };

        rankings.forEach(r => {
            const adj = r.manualStatsAdjustments?.[player.id];
            if (adj) {
                if (adj.pg) manualAdj.wins += adj.pg;
                if (adj.pp) manualAdj.losses += adj.pp;
                if (adj.setsWon) manualAdj.setsWon += adj.setsWon;
                if (adj.setsLost) manualAdj.setsLost += adj.setsLost; // Although we don't display setsLost explicitly in summary, might be good for net
                if (adj.setsDiff) manualAdj.setsDiff += adj.setsDiff;
                if (adj.gamesWon) manualAdj.gamesWon += adj.gamesWon;
                if (adj.gamesLost) manualAdj.gamesLost += adj.gamesLost;
                if (adj.gamesDiff) manualAdj.gamesDiff += adj.gamesDiff;
            }
        });

        // --- New Stats: Sets/Games & Streaks ---
        let totalSetsWon = 0;
        let totalSetsPlayed = 0;
        let totalGamesWon = 0;
        let totalGamesPlayed = 0;
        let netSets = 0;
        let netGames = 0;

        // Iterate history for detailed stats
        history.forEach(h => {
            const { match, result } = h;
            if (match.status !== 'finalizado') return;

            // Check for Sets/Games if Classic/Individual
            if (match.score) {
                const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                if (sets.length > 0) {
                    // It's a set-based match
                    sets.forEach(s => {
                        if (!s) return;
                        // Determine my side
                        const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                        const myG = p1InPair1 ? s.p1 : s.p2;
                        const oppG = p1InPair1 ? s.p2 : s.p1;

                        totalGamesPlayed += (myG + oppG);
                        totalGamesWon += myG;

                        totalSetsPlayed++;
                        if (myG > oppG) totalSetsWon++;
                    });
                } else if (match.score.pointsScored) {
                    // For now, let's treat them as Games to have a unified "Scoring Efficiency"
                    const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                    const myPts = p1InPair1 ? match.score.pointsScored.p1 : match.score.pointsScored.p2;
                    const oppPts = p1InPair1 ? match.score.pointsScored.p2 : match.score.pointsScored.p1;

                    totalGamesPlayed += (myPts + oppPts);
                    totalGamesWon += myPts;
                    // These formats don't really have "Sets", usually 1 set.
                    totalSetsPlayed++;
                    if (myPts > oppPts) totalSetsWon++;
                }

                // Calculate Net Differences
                if (match.score) {
                    const sets = [match.score.set1, match.score.set2, match.score.set3].filter(Boolean);
                    if (sets.length > 0) {
                        sets.forEach(s => {
                            if (!s) return;
                            const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                            const myG = p1InPair1 ? s.p1 : s.p2;
                            const oppG = p1InPair1 ? s.p2 : s.p1;
                            netGames += (myG - oppG);
                        });
                        // Sets Diff
                        const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                        // Score Logic at Match Level to determine Sets Won/Lost for Difference
                        // This is tricky as we already looped sets above, let's simplify:
                        // We already track totalSetsWon. We need totalSetsLost.
                        // Wait, netGames is easy (accumulate myG - oppG).
                        // NetSets needs to know how many sets I lost in this match.
                        sets.forEach(s => {
                            if (!s) return;
                            const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                            const myG = p1InPair1 ? s.p1 : s.p2;
                            const oppG = p1InPair1 ? s.p2 : s.p1;
                            if (myG > oppG) netSets++;
                            else if (oppG > myG) netSets--;
                        });
                    } else if (match.score.pointsScored) {
                        const p1InPair1 = match.pair1.p1Id === player.id || match.pair1.p2Id === player.id;
                        const myPts = p1InPair1 ? match.score.pointsScored.p1 : match.score.pointsScored.p2;
                        const oppPts = p1InPair1 ? match.score.pointsScored.p2 : match.score.pointsScored.p1;
                        netGames += (myPts - oppPts);
                        if (myPts > oppPts) netSets++;
                        else if (oppPts > myPts) netSets--;
                    }
                }
            }
        });

        // Streaks
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // History is Oldest -> Newest (based on push order)
        // Check streaks
        history.forEach(h => {
            if (h.result === 'Win') {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else if (h.result === 'Loss' || h.result === 'Draw') {
                tempStreak = 0;
            }
        });

        // Current streak is the streak at the end
        // BUT we need to be careful if the last match was Pending (ignored in the loop above? No, result is based on status)
        // Let's re-calculate current from the end backwards to be safe or just use tempStreak if we are sure history is ordered
        // Using tempStreak is correct if history is ordered.
        currentStreak = tempStreak;

        return {
            history: history.reverse(),
            enhancedStats: {
                bestPartner,
                biggestNemesis,
                recentForm: recentForm.slice(-5).reverse(),
                sets: { won: totalSetsWon, total: totalSetsPlayed, diff: netSets },
                games: { won: totalGamesWon, total: totalGamesPlayed, diff: netGames },
                streaks: { current: currentStreak, best: bestStreak }
            },
            manualAdj
        }; // Most recent first
    }, [player, rankings]);

    // Headline figures come from the matches listed below plus the organiser's manual adjustments
    const finished = history.filter(h => h.result !== 'Pending');
    const wins = finished.filter(h => h.result === 'Win').length + manualAdj.wins;
    const losses = finished.filter(h => h.result === 'Loss').length + manualAdj.losses;
    const draws = finished.filter(h => h.result === 'Draw').length;
    const played = wins + losses + draws;
    const winPct = played > 0 ? Math.round((wins / played) * 100) : null;
    const setsDiff = enhancedStats.sets.diff + manualAdj.setsDiff;
    const gamesDiff = enhancedStats.games.diff + manualAdj.gamesDiff;
    const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
    const pct = (won: number, total: number) => (total > 0 ? `${Math.round((won / total) * 100)} %` : '—');
    const Title = embedded ? 'h2' : 'h1';
    const shortName = (id?: string) => {
        if (!id) return '';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos ? p.apellidos.charAt(0) + '.' : ''}`.trim() : 'Jugador eliminado';
    };

    return (
        <div className={`rg space-y-5 ${embedded ? '' : 'max-w-5xl mx-auto'}`}>
            {/* Header: the player */}
            <div className="flex items-center gap-3">
                {!embedded && (
                    <button type="button" onClick={onBack} className="w-9 h-9 -ml-1 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised" aria-label="Volver">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <span className="w-12 h-12 rounded-full bg-court-soft text-court-ink grid place-items-center text-[16px] font-semibold flex-none" aria-hidden="true">
                    {player.nombre.charAt(0)}{player.apellidos.charAt(0)}
                </span>
                <div className="min-w-0">
                    <Title className="text-[22px] font-bold tracking-[-0.015em] leading-tight truncate">{player.nombre} {player.apellidos}</Title>
                    <p className="text-[14px] text-rg-muted num truncate">
                        {embedded && (player.email || player.telefono)
                            ? [player.email, player.telefono].filter(Boolean).join(' · ')
                            : `${played} ${played === 1 ? 'partido jugado' : 'partidos jugados'}`}
                    </p>
                </div>
            </div>

            {/* Figures in one strip */}
            <div className="bg-white border border-rg-line rounded-lg grid grid-cols-2 md:grid-cols-4 num">
                {[
                    { label: 'Partidos', value: String(played), note: draws ? `${wins} G · ${losses} P · ${draws} E` : `${wins} ganados · ${losses} perdidos` },
                    { label: 'Victorias', value: winPct === null ? '—' : `${winPct} %`, note: played ? `de ${played} jugados` : 'sin partidos aún' },
                    { label: 'Sets ganados', value: pct(enhancedStats.sets.won, enhancedStats.sets.total), note: `diferencia ${signed(setsDiff)}` },
                    { label: 'Juegos ganados', value: pct(enhancedStats.games.won, enhancedStats.games.total), note: `diferencia ${signed(gamesDiff)}` },
                ].map((k, i) => (
                    <div key={k.label} className={`px-4 py-3.5 ${i % 2 === 1 ? 'border-l border-rg-rule' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-rg-rule' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
                        <span className="block text-[14px] text-rg-muted">{k.label}</span>
                        <span className="block text-[24px] font-semibold mt-0.5">{k.value}</span>
                        <span className="block text-[12px] text-rg-muted">{k.note}</span>
                    </div>
                ))}
            </div>

            {/* Form, partner and toughest rival */}
            <div className="grid gap-4 md:grid-cols-3">
                <section className="bg-white border border-rg-line rounded-lg px-4 py-3.5" aria-labelledby="forma">
                    <h3 id="forma" className="text-[15px] font-semibold">Forma reciente</h3>
                    {enhancedStats.recentForm.length > 0 ? (
                        <>
                            <div className="flex gap-1.5 mt-2.5" aria-label="Últimos resultados, del más reciente al más antiguo">
                                {enhancedStats.recentForm.map((r, i) => (
                                    <span key={i} title={r === 'W' ? 'Victoria' : r === 'L' ? 'Derrota' : 'Empate'} className={`w-8 h-8 rounded-md grid place-items-center text-[13px] font-semibold ${r === 'W' ? 'bg-[#dcfce7] text-[#14532d]' : r === 'L' ? 'bg-[#ffedea] text-[#831c1e]' : 'bg-rg-raised text-rg-muted'}`}>
                                        {r === 'W' ? 'G' : r === 'L' ? 'P' : 'E'}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[13px] text-rg-muted mt-2 num">
                                Racha actual: {enhancedStats.streaks.current} {enhancedStats.streaks.current === 1 ? 'victoria' : 'victorias'} · mejor: {enhancedStats.streaks.best}
                            </p>
                        </>
                    ) : <p className="text-[14px] text-rg-muted mt-2">Todavía no hay partidos jugados.</p>}
                </section>
                <section className="bg-white border border-rg-line rounded-lg px-4 py-3.5" aria-labelledby="companero">
                    <h3 id="companero" className="text-[15px] font-semibold">Mejor compañero</h3>
                    {enhancedStats.bestPartner.id ? (
                        <>
                            <p className="text-[16px] font-semibold mt-2 truncate">{getPlayerName(enhancedStats.bestPartner.id)}</p>
                            <p className="text-[13px] text-rg-muted num">{Math.round(enhancedStats.bestPartner.winrate * 100)} % de victorias en {enhancedStats.bestPartner.matches} partidos juntos</p>
                        </>
                    ) : <p className="text-[14px] text-rg-muted mt-2">Hace falta jugar al menos 2 partidos con la misma pareja.</p>}
                </section>
                <section className="bg-white border border-rg-line rounded-lg px-4 py-3.5" aria-labelledby="rival">
                    <h3 id="rival" className="text-[15px] font-semibold">Rival más difícil</h3>
                    {enhancedStats.biggestNemesis.id && enhancedStats.biggestNemesis.losses > 0 ? (
                        <>
                            <p className="text-[16px] font-semibold mt-2 truncate">{getPlayerName(enhancedStats.biggestNemesis.id)}</p>
                            <p className="text-[13px] text-rg-muted num">{enhancedStats.biggestNemesis.losses} {enhancedStats.biggestNemesis.losses === 1 ? 'derrota' : 'derrotas'} en {enhancedStats.biggestNemesis.matches} partidos</p>
                        </>
                    ) : <p className="text-[14px] text-rg-muted mt-2">Ningún rival le ha ganado dos veces.</p>}
                </section>
            </div>

            {/* Match history */}
            <section className="bg-white border border-rg-line rounded-lg" aria-labelledby="historial">
                <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
                    <h3 id="historial" className="text-[15px] font-semibold">Partidos</h3>
                    <span className="text-[13px] text-rg-muted num">{history.length}</span>
                </div>
                {history.length === 0 ? (
                    <p className="px-4 pb-4 text-[14px] text-rg-muted">No hay partidos registrados.</p>
                ) : (
                    <ul className="num">
                        {history.map((h, i) => {
                            const tone = h.result === 'Win' ? 'bg-[#dcfce7] text-[#14532d]' : h.result === 'Loss' ? 'bg-[#ffedea] text-[#831c1e]' : 'bg-rg-raised text-rg-muted';
                            const label = h.result === 'Win' ? 'Victoria' : h.result === 'Loss' ? 'Derrota' : h.result === 'Draw' ? 'Empate' : 'Pendiente';
                            const rivals = (h.opponents || []).map(shortName).join(' y ');
                            return (
                                <li key={h.match.id + i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 border-t border-rg-rule">
                                    <span className="min-w-0">
                                        <span className="block text-[14px] truncate">
                                            {h.partner ? <>Con <b className="font-semibold">{shortName(h.partner)}</b> contra {rivals}</> : <>Contra {rivals}</>}
                                        </span>
                                        <span className="block text-[13px] text-rg-muted truncate">{h.rankingName} · División {h.divisionName} · Jornada {h.match.jornada}</span>
                                    </span>
                                    <span className="text-right">
                                        <span className="block text-[14px] font-semibold">{h.scoreStr !== '-' ? h.scoreStr.replace(/, /g, ' ').replace(/-/g, '–') : '—'}</span>
                                        <span className={`pill mt-0.5 ${tone}`}>{label}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
};
