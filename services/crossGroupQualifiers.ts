import { StandingRow } from '../types';

/** Returns the next power of two ≥ n, clamped to a minimum of 2. */
export function nextPowerOf2(n: number): number {
    if (n <= 2) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Compute the bracket size to use given a configured size and an "auto" fallback
 * (the next power of two from `qualifiersPerGroup × groupCount`).
 */
export function computeBracketSize(
    configuredSize: number | undefined,
    qualifiersPerGroup: number,
    groupCount: number,
): number {
    if (configuredSize && configuredSize > 0) return configuredSize;
    const total = Math.max(0, qualifiersPerGroup * groupCount);
    return nextPowerOf2(total);
}

/**
 * Cross-group qualifier selection.
 *
 * Walks position by position (1st of each group, then 2nd of each, then 3rd…),
 * sorting candidates at each position across groups by points and tie-breakers,
 * and accumulating until `size` players are selected.
 *
 * This naturally honors the "top of each group always passes first" rule —
 * a 2nd-placed pair cannot bypass a 1st-placed pair because they belong to
 * different position pools.
 *
 * @param standingsByGroup One sorted-by-position standings array per group.
 * @param size            How many players to select.
 * @param excludeIds      Players already claimed (e.g., by the main bracket).
 */
export function selectByCrossGroupPosition(
    standingsByGroup: StandingRow[][],
    size: number,
    excludeIds: Set<string> = new Set(),
): string[] {
    if (size <= 0) return [];
    const selected: string[] = [];
    const maxPos = standingsByGroup.reduce((m, s) => Math.max(m, s.length), 0);

    for (let pos = 0; pos < maxPos && selected.length < size; pos++) {
        const candidates = standingsByGroup
            .map(s => s[pos])
            .filter((r): r is StandingRow => !!r && !excludeIds.has(r.playerId));

        candidates.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
            if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
            return b.winRate - a.winRate;
        });

        for (const row of candidates) {
            if (selected.length >= size) break;
            selected.push(row.playerId);
        }
    }

    return selected;
}

/**
 * Describes how a bracket gets filled: for each position (1st, 2nd, ...),
 * how many slots come from that position pool. Used to render preview text
 * in the wizard config UI.
 */
export interface BracketBreakdown {
    bracketSize: number;
    perPositionTaken: { position: number; taken: number; available: number }[];
}

export function computeBracketBreakdown(
    standingsByGroup: StandingRow[][],
    size: number,
    excludeIds: Set<string> = new Set(),
): BracketBreakdown {
    const result: BracketBreakdown = { bracketSize: size, perPositionTaken: [] };
    if (size <= 0) return result;
    const maxPos = standingsByGroup.reduce((m, s) => Math.max(m, s.length), 0);
    let remaining = size;
    for (let pos = 0; pos < maxPos && remaining > 0; pos++) {
        const available = standingsByGroup
            .map(s => s[pos])
            .filter((r): r is StandingRow => !!r && !excludeIds.has(r.playerId)).length;
        const taken = Math.min(remaining, available);
        result.perPositionTaken.push({ position: pos + 1, taken, available });
        remaining -= taken;
    }
    return result;
}

/**
 * Same as computeBracketBreakdown but works with synthetic group sizes
 * (no real standings). Useful in the wizard config UI before any matches
 * have been played — it assumes every group has `pairsPerGroup` participants.
 */
export function previewBracketBreakdown(
    groupCount: number,
    pairsPerGroup: number,
    size: number,
    startPosition: number = 0,
): BracketBreakdown {
    const result: BracketBreakdown = { bracketSize: size, perPositionTaken: [] };
    if (size <= 0) return result;
    let remaining = size;
    for (let pos = startPosition; pos < pairsPerGroup && remaining > 0; pos++) {
        const available = groupCount;
        const taken = Math.min(remaining, available);
        result.perPositionTaken.push({ position: pos + 1, taken, available });
        remaining -= taken;
    }
    return result;
}

const ORDINAL_ES: Record<number, string> = {
    1: 'primeros', 2: 'segundos', 3: 'terceros', 4: 'cuartos',
    5: 'quintos', 6: 'sextos', 7: 'séptimos', 8: 'octavos',
};

export function formatBreakdown(breakdown: BracketBreakdown): string {
    if (breakdown.perPositionTaken.length === 0) return 'Sin clasificados.';
    const parts = breakdown.perPositionTaken.map(({ position, taken, available }) => {
        const label = ORDINAL_ES[position] || `${position}.ºs`;
        if (taken === available) return `los ${taken} ${label}`;
        return `los mejores ${taken} ${label} cruzados`;
    });
    return parts.join(' + ');
}
