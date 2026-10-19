import type { Division, Match } from '../../types';
import { pairKeyOf } from './types';

export interface MatchIndex {
    byId: Map<string, Match>;
    divisionOf: Map<string, Division>;
    /** nextMatchId → matches whose winner goes there */
    winnerFeeders: Map<string, Match[]>;
    /** consolationMatchId → main matches whose loser goes there */
    loserFeeders: Map<string, Match[]>;
    /** Stable bracket order (division order, then match order) */
    order: Map<string, number>;
}

export const buildMatchIndex = (divisions: Division[]): MatchIndex => {
    const index: MatchIndex = {
        byId: new Map(), divisionOf: new Map(), winnerFeeders: new Map(), loserFeeders: new Map(), order: new Map(),
    };
    const push = (map: Map<string, Match[]>, key: string, m: Match) => map.set(key, [...(map.get(key) ?? []), m]);
    divisions.forEach(div => div.matches.forEach(m => {
        index.byId.set(m.id, m);
        index.divisionOf.set(m.id, div);
        index.order.set(m.id, index.order.size);
        if (m.nextMatchId) push(index.winnerFeeders, m.nextMatchId, m);
        if (m.consolationMatchId) push(index.loserFeeders, m.consolationMatchId, m);
    }));
    return index;
};

const isByeResolved = (m: Match) => m.score?.description === 'BYE';

const slotEmpty = (m: Match, slot?: 1 | 2) =>
    slot === 1 ? !m.pair1.p1Id : slot === 2 ? !m.pair2.p1Id : (!m.pair1.p1Id || !m.pair2.p1Id);

/** Every pair that could end up playing this match (known pairs + whoever can come from its feeders). */
export const getCandidatePairs = (
    match: Match,
    index: MatchIndex,
    memo: Map<string, Set<string>> = new Map()
): Set<string> => {
    const cached = memo.get(match.id);
    if (cached) return cached;
    const result = new Set<string>();
    [match.pair1, match.pair2].forEach(p => {
        const key = pairKeyOf(p);
        if (key) result.add(key);
    });
    for (const f of index.winnerFeeders.get(match.id) ?? []) {
        if (!slotEmpty(match, f.nextMatchSlot)) continue;
        getCandidatePairs(f, index, memo).forEach(k => result.add(k));
    }
    for (const f of index.loserFeeders.get(match.id) ?? []) {
        if (!slotEmpty(match, f.consolationSlot) || f.status === 'no_disputado') continue;
        if (isByeResolved(f)) {
            // Bye-seed: its first real match is in round 2; if it loses there it drops here
            const seed = f.pair1.p1Id === 'BYE' ? f.pair2 : f.pair1;
            const key = pairKeyOf(seed);
            if (key) result.add(key);
        } else {
            getCandidatePairs(f, index, memo).forEach(k => result.add(k));
        }
    }
    memo.set(match.id, result);
    return result;
};

/** Matches that must be finished (plus rest) before this one can start. */
export const getDependencies = (match: Match, index: MatchIndex): Match[] => {
    const deps: Match[] = [...(index.winnerFeeders.get(match.id) ?? [])];
    for (const f of index.loserFeeders.get(match.id) ?? []) {
        if (f.status === 'no_disputado') continue;
        if (isByeResolved(f)) {
            const seedMatch = f.nextMatchId ? index.byId.get(f.nextMatchId) : undefined;
            if (seedMatch) deps.push(seedMatch);
        } else {
            deps.push(f);
        }
    }
    return deps;
};
