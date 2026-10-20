import React, { useMemo } from 'react';
import { Player, Ranking, Match } from '../types';
import { ArrowLeft } from 'lucide-react';

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
    const { history, stats, manualAdj } = useMemo(() => {
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

        // --- Manual Adjustments (God Mode) ---
        // Accumulate adjustments from all rankings for this pair
        const manualAdj = { wins: 0, losses: 0, setsWon: 0, setsLost: 0, setsDiff: 0, gamesWon: 0, gamesLost: 0, gamesDiff: 0 };

        rankings.forEach(r => {
            const adj = r.manualStatsAdjustments?.[pairId];
            if (adj) {
                if (adj.pg) manualAdj.wins += adj.pg;
                if (adj.pp) manualAdj.losses += adj.pp;
                if (adj.setsWon) manualAdj.setsWon += adj.setsWon;
                if (adj.setsLost) manualAdj.setsLost += adj.setsLost;
                if (adj.setsDiff) manualAdj.setsDiff += adj.setsDiff;
                if (adj.gamesWon) manualAdj.gamesWon += adj.gamesWon;
                if (adj.gamesLost) manualAdj.gamesLost += adj.gamesLost;
                if (adj.gamesDiff) manualAdj.gamesDiff += adj.gamesDiff;
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
            },
            manualAdj
        };
    }, [p1Id, p2Id, rankings]);

    // Headline figures: the matches listed below plus the organiser's manual adjustments
    const wins = stats.pg + manualAdj.wins;
    const losses = stats.pp + manualAdj.losses;
    const played = wins + losses + stats.pe;
    const winPct = played > 0 ? Math.round((wins / played) * 100) : null;
    const setsDiff = stats.sets.diff + manualAdj.setsDiff;
    const gamesDiff = stats.games.diff + manualAdj.gamesDiff;
    const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
    const pct = (won: number, total: number) => (total > 0 ? `${Math.round((won / total) * 100)} %` : '—');
    const shortName = (id?: string) => {
        if (!id) return '';
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos ? p.apellidos.charAt(0) + '.' : ''}`.trim() : 'Jugador eliminado';
    };
    const initials = (p?: Player) => (p ? `${p.nombre.charAt(0)}${p.apellidos.charAt(0)}` : '?');

    return (
        <div className="rg space-y-5 max-w-5xl mx-auto">
            {/* Header: the pair */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={onBack} className="w-9 h-9 -ml-1 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised" aria-label="Volver">
                    <ArrowLeft size={20} />
                </button>
                <span className="flex -space-x-2 flex-none" aria-hidden="true">
                    <span className="w-11 h-11 rounded-full bg-court-soft text-court-ink grid place-items-center text-[15px] font-semibold ring-2 ring-rg-ground">{initials(p1)}</span>
                    <span className="w-11 h-11 rounded-full bg-[#def3e8] text-[#14532d] grid place-items-center text-[15px] font-semibold ring-2 ring-rg-ground">{initials(p2)}</span>
                </span>
                <div className="min-w-0">
                    <h1 className="text-[22px] font-bold tracking-[-0.015em] leading-tight truncate">{getPlayerName(p1Id)} y {getPlayerName(p2Id)}</h1>
                    <p className="text-[14px] text-rg-muted num">{played} {played === 1 ? 'partido jugado' : 'partidos jugados'} juntos</p>
                </div>
            </div>

            {/* Figures in one strip */}
            <div className="bg-white border border-rg-line rounded-lg grid grid-cols-2 md:grid-cols-4 num">
                {[
                    { label: 'Partidos', value: String(played), note: stats.pe ? `${wins} G · ${losses} P · ${stats.pe} E` : `${wins} ganados · ${losses} perdidos` },
                    { label: 'Victorias', value: winPct === null ? '—' : `${winPct} %`, note: played ? `de ${played} jugados` : 'sin partidos aún' },
                    { label: 'Sets ganados', value: pct(stats.sets.won, stats.sets.total), note: `diferencia ${signed(setsDiff)}` },
                    { label: 'Juegos ganados', value: pct(stats.games.won, stats.games.total), note: `diferencia ${signed(gamesDiff)}` },
                ].map((k, i) => (
                    <div key={k.label} className={`px-4 py-3.5 ${i % 2 === 1 ? 'border-l border-rg-rule' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-rg-rule' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
                        <span className="block text-[14px] text-rg-muted">{k.label}</span>
                        <span className="block text-[24px] font-semibold mt-0.5">{k.value}</span>
                        <span className="block text-[12px] text-rg-muted">{k.note}</span>
                    </div>
                ))}
            </div>

            {/* Form and toughest rival */}
            <div className="grid gap-4 md:grid-cols-2">
                <section className="bg-white border border-rg-line rounded-lg px-4 py-3.5" aria-labelledby="forma-pareja">
                    <h2 id="forma-pareja" className="text-[15px] font-semibold">Forma reciente</h2>
                    {stats.recentForm.length > 0 ? (
                        <>
                            <div className="flex gap-1.5 mt-2.5" aria-label="Últimos resultados, del más reciente al más antiguo">
                                {stats.recentForm.map((r, i) => (
                                    <span key={i} title={r === 'W' ? 'Victoria' : r === 'L' ? 'Derrota' : 'Empate'} className={`w-8 h-8 rounded-md grid place-items-center text-[13px] font-semibold ${r === 'W' ? 'bg-[#dcfce7] text-[#14532d]' : r === 'L' ? 'bg-[#ffedea] text-[#831c1e]' : 'bg-rg-raised text-rg-muted'}`}>
                                        {r === 'W' ? 'G' : r === 'L' ? 'P' : 'E'}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[13px] text-rg-muted mt-2 num">
                                Racha actual: {stats.streaks.current} {stats.streaks.current === 1 ? 'victoria' : 'victorias'} · mejor: {stats.streaks.best}
                            </p>
                        </>
                    ) : <p className="text-[14px] text-rg-muted mt-2">Todavía no han jugado juntos.</p>}
                </section>
                <section className="bg-white border border-rg-line rounded-lg px-4 py-3.5" aria-labelledby="rival-pareja">
                    <h2 id="rival-pareja" className="text-[15px] font-semibold">Rival más difícil</h2>
                    {stats.biggestNemesis.id && stats.biggestNemesis.losses > 0 ? (
                        <>
                            <p className="text-[16px] font-semibold mt-2 truncate">{getPlayerName(stats.biggestNemesis.id)}</p>
                            <p className="text-[13px] text-rg-muted num">{stats.biggestNemesis.losses} {stats.biggestNemesis.losses === 1 ? 'derrota' : 'derrotas'} en {stats.biggestNemesis.matches} partidos</p>
                        </>
                    ) : <p className="text-[14px] text-rg-muted mt-2">Ningún rival les ha ganado dos veces.</p>}
                </section>
            </div>

            {/* Match history */}
            <section className="bg-white border border-rg-line rounded-lg" aria-labelledby="partidos-pareja">
                <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
                    <h2 id="partidos-pareja" className="text-[15px] font-semibold">Partidos</h2>
                    <span className="text-[13px] text-rg-muted num">{history.length}</span>
                </div>
                {history.length === 0 ? (
                    <p className="px-4 pb-4 text-[14px] text-rg-muted">No hay partidos registrados como pareja.</p>
                ) : (
                    <ul className="num">
                        {history.map((h, i) => {
                            const tone = h.result === 'Win' ? 'bg-[#dcfce7] text-[#14532d]' : h.result === 'Loss' ? 'bg-[#ffedea] text-[#831c1e]' : 'bg-rg-raised text-rg-muted';
                            const label = h.result === 'Win' ? 'Victoria' : h.result === 'Loss' ? 'Derrota' : h.result === 'Draw' ? 'Empate' : 'Pendiente';
                            return (
                                <li key={h.match.id + i} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 border-t border-rg-rule">
                                    <span className="min-w-0">
                                        <span className="block text-[14px] truncate">Contra {(h.opponents || []).map(shortName).join(' y ')}</span>
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
