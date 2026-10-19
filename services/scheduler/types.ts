import type { MatchPair } from '../../types';

export interface DaySchedule {
    date: string;      // "YYYY-MM-DD"
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
}

export interface RoundWindow extends DaySchedule {
    roundName: string; // normalized round name, e.g. "Final", "Semifinales"
}

export interface SchedulerConfig {
    courts: number;
    slotDurationMinutes: number; // 60 | 75 | 90 | 120
    restMinutes: number;
    /** 'full': everything is locked on generation. 'daily': only the current day is locked. Default 'full'. */
    mode?: 'full' | 'daily';
    /** From this round on (inclusive), availability of not-yet-known pairs is a preference. Default 'Cuartos'. */
    strictAvailabilityUntilRound?: string;
    /** Multi-day schedule: one entry per tournament day with operating hours */
    dailySchedule?: DaySchedule[];
    /** Legacy: single daily time window (kept for backward compat) */
    timeWindows: { start: string; end: string }[];
    /** Per-round time windows; several entries with the same roundName are allowed. */
    roundWindows?: RoundWindow[];
}

/** @deprecated Use PairAvailability with pairConstraints on Ranking */
export interface PlayerAvailability {
    unavailableRanges: { start: string; end: string }[];
}

/** Per-pair blocked intervals, keyed by makePairKey() */
export interface PairAvailability {
    unavailableRanges: DaySchedule[];
}

export interface ScheduleConflict {
    pairKey: string; // a pair key, or ANY_PAIR for window/capacity problems
    reason: string;
}

export interface FeasibilityWarning {
    roundKey?: string;
    message: string;
}

export const ANY_PAIR = '*';

/** Order-independent pair key: the two IDs are sorted before joining. */
export const makePairKey = (p1Id: string, p2Id?: string): string => {
    if (!p2Id) return p1Id;
    return p1Id <= p2Id ? `${p1Id}::${p2Id}` : `${p2Id}::${p1Id}`;
};

export const pairKeyOf = (pair: MatchPair): string | null =>
    !pair.p1Id || pair.p1Id === 'BYE' ? null : makePairKey(pair.p1Id, pair.p2Id || undefined);

/** Rewrites legacy order-dependent keys and merges duplicates. */
export const normalizePairConstraints = (
    constraints?: Record<string, PairAvailability>
): Record<string, PairAvailability> => {
    const result: Record<string, PairAvailability> = {};
    Object.entries(constraints ?? {}).forEach(([key, avail]) => {
        const [a, b] = key.split('::');
        const normalized = makePairKey(a, b || undefined);
        result[normalized] = {
            unavailableRanges: [...(result[normalized]?.unavailableRanges ?? []), ...(avail?.unavailableRanges ?? [])],
        };
    });
    return result;
};

/** Strips the consolation suffix so round names align across brackets. */
export const normalizeRoundName = (name?: string): string =>
    (name || '').replace(/\s*\(Cons\.\)\s*$/i, '').trim();

/** Play order of a round name: higher = later in the bracket. */
export const roundRank = (name?: string): number => {
    const n = normalizeRoundName(name);
    if (n === 'Final') return 5000;
    if (n === 'Semifinales') return 4000;
    if (n === 'Cuartos') return 3000;
    if (n === 'Octavos') return 2000;
    const m = n.match(/Ronda de (\d+)/);
    if (m) return 1000 - Number(m[1]);
    return 0;
};
