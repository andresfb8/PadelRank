import React from 'react';
import { Match, Player } from '../../types';
import { followedSide, matchDay, matchTime, nextMatchFor, pairText, scoreColumns, winnerSide } from './playerMobile';

interface Props {
    matches: Match[];
    players: Record<string, Player>;
    followed?: string | null;
    /** Only the followed entry's matches */
    onlyFollowed?: boolean;
    /** Ida / vuelta headings for double round robins */
    firstSecondLegRound?: number;
    /** Players resting in a round (americano, mexicano) */
    restingFor?: (round: number) => string[];
    onMatchClick?: (m: Match) => void;
    /** Lay the rounds out in two columns from the tablet up */
    twoColumns?: boolean;
}

const byTimeThenCourt = (a: Match, b: Match) => {
    const ta = a.startTime ? Date.parse(a.startTime) : Infinity;
    const tb = b.startTime ? Date.parse(b.startTime) : Infinity;
    if (ta !== tb) return ta - tb;
    return (a.court ?? 99) - (b.court ?? 99);
};

/** Matches as a scoreboard grouped by round: time and court on the left, sets aligned on the right. */
export const MobileMatchList = ({ matches, players, followed, onlyFollowed, firstSecondLegRound, restingFor, onMatchClick, twoColumns }: Props) => {
    const next = nextMatchFor(followed ?? null, matches);
    const visible = onlyFollowed && followed ? matches.filter(m => followedSide(followed, m) !== 0) : matches;

    const rounds = new Map<number, Match[]>();
    visible.forEach(m => {
        const r = Number(m.jornada);
        if (!rounds.has(r)) rounds.set(r, []);
        rounds.get(r)!.push(m);
    });
    const ordered = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

    if (ordered.length === 0) {
        return (
            <p className="rg bg-white border border-rg-line rounded-xl px-4 py-6 text-sm text-rg-muted">
                {onlyFollowed ? 'No tienes partidos en esta división.' : 'Todavía no hay partidos en esta división.'}
            </p>
        );
    }

    return (
        <div className={`rg ${twoColumns ? 'space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-6 md:items-start' : 'space-y-5'}`}>
            {ordered.map(([round, list]) => {
                const sorted = list.slice().sort(byTimeThenCourt);
                const days = Array.from(new Set(sorted.map(matchDay).filter(Boolean)));
                const resting = restingFor ? restingFor(round) : [];
                return (
                    <section key={round}>
                        {firstSecondLegRound !== undefined && (round === 1 || round === firstSecondLegRound) && (
                            <p className="text-xs font-medium text-court-ink mb-1 px-0.5">{round === 1 ? 'Ida' : 'Vuelta'}</p>
                        )}
                        <h3 className="flex justify-between items-baseline text-[13px] font-semibold mb-2 px-0.5">
                            <span>Jornada {round}</span>
                            <span className="font-normal text-rg-muted num">{days.length === 1 ? days[0] : days.length > 1 ? `${days[0]} – ${days[days.length - 1]}` : ''}</span>
                        </h3>
                        <ul className="bg-white border border-rg-line rounded-xl overflow-hidden">
                            {sorted.map((m, i) => (
                                <MatchRow
                                    key={m.id}
                                    match={m}
                                    players={players}
                                    first={i === 0}
                                    mine={followedSide(followed ?? null, m) !== 0}
                                    isNext={next?.id === m.id}
                                    onClick={onMatchClick}
                                />
                            ))}
                        </ul>
                        {resting.length > 0 && (
                            <p className="text-[13px] text-rg-muted mt-2 px-0.5">
                                Descansan: {resting.map(id => pairText({ p1Id: id }, players)).join(', ')}
                            </p>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

const MatchRow = ({ match: m, players, first, mine, isNext, onClick }: {
    match: Match; players: Record<string, Player>; first: boolean; mine: boolean; isNext: boolean; onClick?: (m: Match) => void;
}) => {
    const border = first ? '' : 'border-t border-rg-rule';

    if (m.status === 'descanso') {
        return (
            <li className={`px-4 py-3 text-[13px] text-rg-muted ${border}`}>
                Descansa {pairText(m.pair1, players)}
            </li>
        );
    }

    const time = matchTime(m);
    const won = winnerSide(m);
    const score = scoreColumns(m);
    const statusPill = isNext
        ? <span className="pill bg-court text-white">Siguiente</span>
        : m.status === 'no_disputado'
            ? <span className="pill bg-rg-raised text-rg-muted">No disputado</span>
            : m.score?.isIncomplete
                ? <span className="pill bg-rg-raised text-rg-muted">Incompleto</span>
                : null;

    const line = (side: 1 | 2) => {
        const isWinner = won === side;
        const tone = m.status === 'finalizado' ? (isWinner ? 'text-rg-ink font-semibold' : 'text-rg-muted') : 'text-rg-ink';
        const values = score ? (side === 1 ? score.p1 : score.p2) : null;
        return (
            <>
                <span className={`truncate ${tone}`}>{pairText(side === 1 ? m.pair1 : m.pair2, players)}</span>
                <span className={`flex justify-end gap-3 num ${tone}`}>
                    {values ? values.map((v, k) => <span key={k} className="w-4 text-center">{v}</span>) : side === 1 ? statusPill : null}
                </span>
            </>
        );
    };

    const Wrapper = onClick ? 'button' : 'div';
    return (
        <li className={`${border} ${mine ? 'bg-court-soft' : ''}`}>
            <Wrapper
                {...(onClick ? { type: 'button', onClick: () => onClick(m) } : {})}
                className="w-full text-left grid grid-cols-[52px_1fr_auto] gap-x-3 gap-y-1 px-4 py-3"
            >
                <span className="row-span-2 text-[13px] font-semibold num leading-tight">
                    {time || (m.status === 'finalizado' ? 'Jugado' : 'Sin hora')}
                    <span className="block font-normal text-xs text-rg-muted mt-0.5">{m.court ? `Pista ${m.court}` : ''}</span>
                </span>
                {line(1)}
                {line(2)}
            </Wrapper>
            {score && statusPill && (
                <div className="px-4 pb-2 -mt-1 pl-[80px]">{statusPill}</div>
            )}
        </li>
    );
};
