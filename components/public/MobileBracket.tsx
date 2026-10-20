import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Division, Match, Player } from '../../types';
import { followedSide, matchDay, matchTime, nextMatchFor, pairKey, pairText, scoreColumns, winnerSide } from './playerMobile';

interface Props {
    divisions: Division[];
    players: Record<string, Player>;
    bracketType?: 'main' | 'consolation';
    followed?: string | null;
    /** Group of origin per pair key ("Grupo A"), for hybrid playoffs */
    groupOf?: Map<string, string>;
    onMatchClick?: (m: Match) => void;
}

/**
 * The one view that scrolls sideways: a column per round that snaps into place,
 * with the rounds as shortcuts above it.
 */
export const MobileBracket = ({ divisions, players, bracketType = 'main', followed, groupOf, onMatchClick }: Props) => {
    const all = divisions.flatMap(d => d.matches);
    const matches = bracketType === 'main'
        ? all.filter(m => !m.roundName?.includes('(Cons.)'))
        : all.filter(m => m.roundName?.includes('(Cons.)'));

    const rounds = useMemo(() => {
        const byRound = new Map<number, Match[]>();
        matches.forEach(m => {
            const r = Number(m.jornada);
            if (!byRound.has(r)) byRound.set(r, []);
            byRound.get(r)!.push(m);
        });
        return Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]).map(([round, list]) => ({
            round,
            name: (list[0]?.roundName || `Ronda ${round}`).replace(' (Cons.)', ''),
            list,
        }));
    }, [matches]);

    const next = nextMatchFor(followed ?? null, matches);
    const scroller = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    // Open on the round being played: the first one with a match still to play
    const firstOpen = Math.max(0, rounds.findIndex(r => r.list.some(m => m.status === 'pendiente')));
    useEffect(() => {
        const el = scroller.current;
        const col = el?.children[firstOpen] as HTMLElement | undefined;
        if (el && col) el.scrollLeft += col.getBoundingClientRect().left - el.getBoundingClientRect().left - 16;
        setActive(firstOpen);
    }, [firstOpen, rounds.length]);

    const goTo = (i: number) => {
        const el = scroller.current;
        const col = el?.children[i] as HTMLElement | undefined;
        if (el && col) el.scrollBy({ left: col.getBoundingClientRect().left - el.getBoundingClientRect().left - 16, behavior: 'smooth' });
        setActive(i);
    };

    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;
        // The round whose column starts closest to the scroller's left padding
        const edge = el.getBoundingClientRect().left + 16;
        const cols = Array.from(el.children) as HTMLElement[];
        let best = 0;
        cols.forEach((c, k) => {
            if (Math.abs(c.getBoundingClientRect().left - edge) < Math.abs(cols[best].getBoundingClientRect().left - edge)) best = k;
        });
        setActive(best);
    };

    if (rounds.length === 0) {
        return <p className="rg bg-white border border-rg-line rounded-xl px-4 py-6 text-sm text-rg-muted">El cuadro todavía no está generado.</p>;
    }

    return (
        <div className="rg">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3 md:hidden" role="tablist" aria-label="Rondas">
                {rounds.map((r, i) => (
                    <button
                        key={r.round}
                        type="button"
                        role="tab"
                        aria-selected={active === i}
                        onClick={() => goTo(i)}
                        className={`flex-none h-8 px-3.5 rounded-full text-[13px] font-medium border transition-colors ${active === i ? 'bg-rg-ink border-rg-ink text-white' : 'bg-white border-rg-line text-rg-muted'}`}
                    >
                        {r.name}
                    </button>
                ))}
            </div>

            <div
                ref={scroller}
                onScroll={onScroll}
                className="flex items-start gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-2 scroll-px-4 md:mx-0 md:px-0 md:gap-4 md:items-stretch"
            >
                {rounds.map(r => {
                    const days = Array.from(new Set(r.list.map(matchDay).filter(Boolean)));
                    return (
                        <section key={r.round} className="snap-start flex-none w-[78vw] max-w-[300px] md:flex-1 md:w-auto md:max-w-[380px] md:min-w-[240px] grid grid-rows-[auto_1fr] gap-2.5">
                            <h3 className="text-[13px] font-semibold text-rg-muted">
                                {r.name}{days.length === 1 ? ` · ${days[0]}` : ''}
                            </h3>
                            <div className="flex flex-col gap-3 md:justify-around">
                                {r.list.map(m => (
                                    <BracketMatch
                                        key={m.id}
                                        match={m}
                                        players={players}
                                        mine={followedSide(followed ?? null, m) !== 0}
                                        isNext={next?.id === m.id}
                                        groupOf={groupOf}
                                        onClick={onMatchClick}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
            {rounds.length > 1 && active < rounds.length - 1 && (
                <p className="text-xs text-rg-muted mt-2 md:hidden">Desliza para ver {rounds[active + 1].name.toLowerCase()}</p>
            )}
        </div>
    );
};

const BracketMatch = ({ match: m, players, mine, isNext, groupOf, onClick }: {
    match: Match; players: Record<string, Player>; mine: boolean; isNext: boolean; groupOf?: Map<string, string>; onClick?: (m: Match) => void;
}) => {
    const won = winnerSide(m);
    const score = scoreColumns(m);
    const time = matchTime(m);
    const meta = m.status === 'finalizado'
        ? ['Finalizado', m.court ? `Pista ${m.court}` : null]
        : [time || 'Sin hora', m.court ? `Pista ${m.court}` : null];

    const row = (side: 1 | 2) => {
        const pair = side === 1 ? m.pair1 : m.pair2;
        const tone = m.status === 'finalizado' ? (won === side ? 'font-semibold text-rg-ink' : 'text-rg-muted') : (pair.p1Id ? 'text-rg-ink' : 'text-rg-muted');
        const group = pair.p1Id && groupOf ? groupOf.get(pairKey(pair)) : undefined;
        const values = score ? (side === 1 ? score.p1 : score.p2) : null;
        return (
            <div className={`flex items-center justify-between gap-2 px-3 py-2 ${side === 2 ? 'border-t border-rg-rule' : ''}`}>
                <span className="min-w-0">
                    <span className={`block truncate text-[13.5px] ${tone}`}>{pairText(pair, players)}</span>
                    {group && <span className="block text-xs text-rg-muted">{group}</span>}
                </span>
                {values && (
                    <span className={`flex gap-2.5 num text-[13.5px] ${tone}`}>
                        {values.map((v, k) => <span key={k} className="w-3.5 text-center">{v}</span>)}
                    </span>
                )}
            </div>
        );
    };

    const Wrapper = onClick ? 'button' : 'div';
    return (
        <Wrapper
            {...(onClick ? { type: 'button', onClick: () => onClick(m) } : {})}
            className={`block w-full text-left bg-white rounded-xl overflow-hidden border ${mine ? 'border-court' : 'border-rg-line'}`}
        >
            {row(1)}
            {row(2)}
            <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs num ${mine ? 'bg-court-soft text-court-ink' : 'bg-rg-raised text-rg-muted'}`}>
                <span>{meta.filter(Boolean).join(' · ')}</span>
                {isNext && <span className="pill bg-court text-white">Siguiente</span>}
            </div>
        </Wrapper>
    );
};
