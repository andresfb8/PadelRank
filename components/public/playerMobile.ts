import { useCallback, useEffect, useState } from 'react';
import { Match, Player, StandingRow } from '../../types';

// Helpers shared by the player-facing mobile views (public tournament page).

/** "Laura M." */
export const shortName = (p?: Pick<Player, 'nombre' | 'apellidos'>, fallback = '?') => {
    if (!p || !p.nombre) return fallback;
    const initial = p.apellidos ? ` ${p.apellidos.charAt(0)}.` : '';
    return `${p.nombre}${initial}`;
};

/** An entry is a standings participant: a player id, or a pair key "p1::p2". */
export const entryLabel = (entry: string, players: Record<string, Player>) => {
    if (entry.includes('::')) {
        const [a, b] = entry.split('::');
        return `${shortName(players[a])} / ${shortName(players[b])}`;
    }
    return shortName(players[entry]);
};

export const pairKey = (pair: { p1Id: string; p2Id?: string }) => (pair.p2Id ? `${pair.p1Id}::${pair.p2Id}` : pair.p1Id);

export const pairText = (pair: { p1Id: string; p2Id?: string; placeholder?: string }, players: Record<string, Player>) => {
    if (!pair.p1Id && pair.placeholder) return pair.placeholder;
    if (pair.p1Id === 'BYE') return 'Exento';
    const first = shortName(players[pair.p1Id], pair.placeholder || 'Por decidir');
    return pair.p2Id ? `${first} / ${shortName(players[pair.p2Id], '?')}` : first;
};

const sameEntry = (entry: string, pair: { p1Id: string; p2Id?: string }) => {
    if (!entry.includes('::')) return pair.p1Id === entry || pair.p2Id === entry;
    const [a, b] = entry.split('::');
    return (pair.p1Id === a && pair.p2Id === b) || (pair.p1Id === b && pair.p2Id === a);
};

/** 1 or 2 when the followed entry plays this match on that side, otherwise 0. */
export const followedSide = (entry: string | null, m: Match): 0 | 1 | 2 => {
    if (!entry) return 0;
    if (sameEntry(entry, m.pair1)) return 1;
    if (sameEntry(entry, m.pair2)) return 2;
    return 0;
};

/** Winner side of a finished match, or 0 when undecided or drawn. */
export const winnerSide = (m: Match): 0 | 1 | 2 => {
    if (m.status !== 'finalizado') return 0;
    const p1 = m.points?.p1 ?? 0;
    const p2 = m.points?.p2 ?? 0;
    if (p1 === p2) return 0;
    return p1 > p2 ? 1 : 2;
};

/** Sets as columns: [[6,6],[3,4]] for pair1 and pair2; points-based formats give one column. */
export const scoreColumns = (m: Match): { p1: number[]; p2: number[] } | null => {
    if (m.status !== 'finalizado') return null;
    const sets = [m.score?.set1, m.score?.set2, m.score?.set3].filter(Boolean) as { p1: number; p2: number }[];
    if (sets.length > 0) return { p1: sets.map(s => s.p1), p2: sets.map(s => s.p2) };
    return { p1: [m.points?.p1 ?? 0], p2: [m.points?.p2 ?? 0] };
};

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export const matchTime = (m: Match) => {
    if (!m.startTime) return null;
    const d = new Date(m.startTime);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const matchDay = (m: Match) => {
    if (!m.startTime) return null;
    const d = new Date(m.startTime);
    if (isNaN(d.getTime())) return null;
    const text = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The followed entry's next match: the earliest pending one, scheduled first. */
export const nextMatchFor = (entry: string | null, matches: Match[]): Match | null => {
    if (!entry) return null;
    const pending = matches.filter(m => m.status === 'pendiente' && followedSide(entry, m) !== 0);
    pending.sort((a, b) => {
        const ta = a.startTime ? Date.parse(a.startTime) : Infinity;
        const tb = b.startTime ? Date.parse(b.startTime) : Infinity;
        if (ta !== tb) return ta - tb;
        return a.jornada - b.jornada;
    });
    return pending[0] || null;
};

export type ZoneKind = 'up' | 'down' | 'qualified' | 'consolation' | 'none';

export const zoneFor = (
    row: StandingRow,
    total: number,
    opts: { format?: string; promotionCount?: number; relegationCount?: number; qualifiersCount?: number; consolationCount?: number },
): ZoneKind => {
    const { format } = opts;
    if (format === 'americano' || format === 'mexicano' || format === 'pozo') return 'none';
    if (format === 'hybrid') {
        const q = opts.qualifiersCount ?? 2;
        const c = opts.consolationCount ?? 0;
        if (row.pos <= q) return 'qualified';
        if (row.pos <= q + c) return 'consolation';
        return 'none';
    }
    if (opts.promotionCount && row.pos <= opts.promotionCount) return 'up';
    if (opts.relegationCount && row.pos > total - opts.relegationCount) return 'down';
    return 'none';
};

/** Remembers on this phone which pair or player the visitor follows in a tournament. */
export const useFollowedEntry = (rankingId: string) => {
    const storageKey = `rg-follow-${rankingId}`;
    const read = () => {
        try { return window.localStorage.getItem(storageKey); } catch { return null; }
    };
    const [entry, setEntry] = useState<string | null>(read);

    useEffect(() => { setEntry(read()); }, [storageKey]);

    const follow = useCallback((next: string | null) => {
        setEntry(next);
        try {
            if (next) window.localStorage.setItem(storageKey, next);
            else window.localStorage.removeItem(storageKey);
        } catch { /* private mode: keep it for this visit only */ }
    }, [storageKey]);

    return [entry, follow] as const;
};
