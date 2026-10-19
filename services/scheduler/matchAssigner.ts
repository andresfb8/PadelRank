import type { Division, Match } from '../../types';
import type { PairAvailability, ScheduleConflict, SchedulerConfig } from './types';
import { ANY_PAIR, normalizeRoundName, pairKeyOf, roundRank } from './types';
import {
    addMinutes, fitsIn, getOperatingIntervals, getRoundIntervals, getStartTimes, hasRoundWindows,
} from './timeGrid';
import { buildMatchIndex, getCandidatePairs, getDependencies } from './candidates';
import { describeViolation, getViolations, violatingPairCount, violationMinutes } from './availability';
import { RoundPlan, roundKeyOf } from './roundPlanner';

export const knownPairKeys = (match: Match): string[] =>
    [pairKeyOf(match.pair1), pairKeyOf(match.pair2)].filter((k): k is string => !!k);

/** Availability is a hard requirement for known pairs and for rounds before `strictAvailabilityUntilRound`. */
export const isStrictMatch = (match: Match, config: SchedulerConfig): boolean => {
    if (knownPairKeys(match).length === 2) return true;
    return roundRank(match.roundName) < roundRank(config.strictAvailabilityUntilRound ?? 'Cuartos');
};

/** Conflicts of a match placed at `start`. */
export const computeConflicts = (
    match: Match,
    start: Date,
    config: SchedulerConfig,
    constraints: Record<string, PairAvailability>,
    candidates: Set<string>,
    outsideWindow: boolean
): ScheduleConflict[] | undefined => {
    const end = addMinutes(start, config.slotDurationMinutes);
    const known = knownPairKeys(match);
    let keys = known;
    let prefix = '';
    if (known.length < 2 && isStrictMatch(match, config)) {
        keys = Array.from(candidates);
        prefix = 'Posible pareja: ';
    }
    const conflicts: ScheduleConflict[] = getViolations(start, end, keys, constraints)
        .map(v => ({ pairKey: v.pairKey, reason: (known.includes(v.pairKey) ? '' : prefix) + describeViolation(v) }));
    if (outsideWindow) {
        conflicts.push({ pairKey: ANY_PAIR, reason: `Fuera de franja de ${normalizeRoundName(match.roundName)}` });
    }
    return conflicts.length ? conflicts : undefined;
};

/** Re-evaluates a match at its current startTime using only its known pairs. */
export const evaluateConflicts = (
    match: Match,
    config: SchedulerConfig,
    constraints: Record<string, PairAvailability>
): ScheduleConflict[] | undefined => {
    if (!match.startTime) return undefined;
    const start = new Date(match.startTime);
    const end = addMinutes(start, config.slotDurationMinutes);
    const outside = hasRoundWindows(match.roundName, config) && !fitsIn(start, end, getRoundIntervals(match.roundName, config));
    return computeConflicts(match, start, config, constraints, new Set(knownPairKeys(match)), outside);
};

export interface AssignInput {
    divisions: Division[];                       // mutated in place
    config: SchedulerConfig;
    constraints: Record<string, PairAvailability>;
    plans: Map<string, RoundPlan>;
    toSchedule: Set<string>;                     // ids of matches to place (their startTime must be cleared)
}

interface Booking { start: Date; end: Date; }

interface Info {
    match: Match;
    plan?: RoundPlan;
    starts: Date[];               // allowed starts for its round
    startSet: Set<number>;
    keys: string[];               // pairs whose availability matters (known or candidates)
    candidates: Set<string>;
    strict: boolean;
    compatible: Date[];           // allowed starts with zero violations
    compatibleSet: Set<number>;
    lastStart: Date | null;       // last start that ends before the round deadline
    deps: Match[];
    order: number;
}

/**
 * Phase 2: chronological list scheduling. At each grid instant every free court takes the
 * most urgent ready match (least round slack, then fewest compatible slots left, then bracket order).
 * A match that can no longer find a compatible slot before its deadline is placed in the
 * least-violating slot and flagged with scheduleConflict.
 */
export const assignMatches = ({ divisions, config, constraints, plans, toSchedule }: AssignInput): void => {
    const D = config.slotDurationMinutes;
    const rest = config.restMinutes;
    const index = buildMatchIndex(divisions);
    const candidateMemo = new Map<string, Set<string>>();
    const courts: Booking[][] = Array.from({ length: Math.max(1, config.courts) }, () => []);

    index.byId.forEach(m => {
        if (toSchedule.has(m.id) || !m.startTime || !m.court || m.court > courts.length) return;
        const start = new Date(m.startTime);
        courts[m.court - 1].push({ start, end: addMinutes(start, D) });
    });

    const isFree = (court: number, start: Date) => {
        const end = addMinutes(start, D);
        return courts[court].every(b => b.end <= start || b.start >= end);
    };
    const anyCourtFree = (start: Date) => courts.some((_, c) => isFree(c, start));
    /** Free court at `start`, preferring the one that became free most recently (back-to-back). */
    const pickCourt = (start: Date): number | null => {
        let best: number | null = null;
        let bestLastEnd = -Infinity;
        for (let c = 0; c < courts.length; c++) {
            if (!isFree(c, start)) continue;
            const lastEnd = Math.max(-Infinity, ...courts[c].filter(b => b.end <= start).map(b => b.end.getTime()));
            if (best === null || lastEnd > bestLastEnd) {
                best = c;
                bestLastEnd = lastEnd;
            }
        }
        return best;
    };

    const infos = new Map<string, Info>();
    toSchedule.forEach(id => {
        const match = index.byId.get(id);
        const div = index.divisionOf.get(id);
        if (!match || !div) return;
        const plan = plans.get(roundKeyOf(div.id, match.jornada));
        const starts = getStartTimes(plan?.intervals ?? getRoundIntervals(match.roundName, config), D);
        const known = knownPairKeys(match);
        const candidates = getCandidatePairs(match, index, candidateMemo);
        const keys = known.length === 2 ? known : Array.from(candidates);
        const compatible = starts.filter(s => getViolations(s, addMinutes(s, D), keys, constraints).length === 0);
        const deadline = plan?.deadline ?? null;
        const inDeadline = deadline ? starts.filter(s => addMinutes(s, D) <= deadline) : starts;
        infos.set(id, {
            match, plan, starts, startSet: new Set(starts.map(s => s.getTime())),
            keys, candidates, strict: isStrictMatch(match, config),
            compatible, compatibleSet: new Set(compatible.map(s => s.getTime())),
            lastStart: inDeadline.length ? inDeadline[inDeadline.length - 1] : null,
            deps: getDependencies(match, index),
            order: index.order.get(id) ?? 0,
        });
    });

    const pending = new Set<string>();
    infos.forEach((_, id) => pending.add(id));

    /** undefined = a dependency is still unplaced; otherwise the earliest start allowed by dependencies. */
    const readyTime = (info: Info): Date | undefined => {
        let ready = new Date(0);
        for (const dep of info.deps) {
            if (!dep.startTime) {
                if (toSchedule.has(dep.id)) return undefined;
                continue; // BYE / resolved without a slot
            }
            const t = addMinutes(new Date(dep.startTime), D + rest);
            if (t > ready) ready = t;
        }
        return ready;
    };

    const cost = (info: Info, s: Date): [number, number] => {
        const v = getViolations(s, addMinutes(s, D), info.keys, constraints);
        return info.strict ? [violationMinutes(v), 0] : [violatingPairCount(v), violationMinutes(v)];
    };

    const place = (info: Info, start: Date, court: number, outsideWindow: boolean) => {
        const m = info.match;
        m.startTime = start.toISOString();
        m.court = court + 1;
        courts[court].push({ start, end: addMinutes(start, D) });
        const conflicts = computeConflicts(m, start, config, constraints, info.candidates, outsideWindow);
        if (conflicts) m.scheduleConflict = conflicts;
        else delete m.scheduleConflict;
    };

    const placeFallback = (info: Info, from: Date) => {
        const ready = readyTime(info) ?? from;
        const t0 = ready > from ? ready : from;
        const free = (s: Date) => s >= t0 && anyCourtFree(s);
        const within = info.starts.filter(s => free(s) && (!info.lastStart || s <= info.lastStart));
        const pool = within.length ? within : info.starts.filter(free);
        if (pool.length) {
            // Slots that overlap the only/any compatible slot of another pending match rank last.
            const reserved: number[] = [];
            pending.forEach(id => {
                if (id === info.match.id) return;
                infos.get(id)!.compatible.forEach(s => reserved.push(s.getTime()));
            });
            const rank = (s: Date): [number, number, number] => {
                const c = cost(info, s);
                const overlaps = reserved.some(r => Math.abs(r - s.getTime()) < D * 60000);
                return [overlaps ? 1 : 0, c[0], c[1]];
            };
            const better = (x: [number, number, number], y: [number, number, number]) =>
                x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2];
            let best = pool[0];
            let bestRank = rank(best);
            for (const s of pool.slice(1)) {
                const r = rank(s);
                if (better(r, bestRank)) {
                    best = s;
                    bestRank = r;
                }
            }
            place(info, best, pickCourt(best)!, false);
            return;
        }
        const anyOperating = getStartTimes(getOperatingIntervals(config), D).find(free);
        if (anyOperating) {
            place(info, anyOperating, pickCourt(anyOperating)!, true);
            return;
        }
        info.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
    };

    const remainingCompatible = (info: Info, t: Date) =>
        info.compatible.filter(s => s >= t && (!info.lastStart || s <= info.lastStart)).length;

    const hasFutureCompatible = (info: Info, t: Date) =>
        info.compatible.some(s => s > t && (!info.lastStart || s <= info.lastStart) && anyCourtFree(s));

    const isEligible = (info: Info, t: Date) =>
        info.startSet.has(t.getTime()) && info.compatibleSet.has(t.getTime());

    const byPriority = (infosAtT: Info[], t: Date): Info[] => {
        const remaining = new Map(infosAtT.map(i => [i, remainingCompatible(i, t)]));
        return infosAtT.sort((a, b) =>
            (a.plan?.latestStart?.getTime() ?? -Infinity) - (b.plan?.latestStart?.getTime() ?? -Infinity) ||
            remaining.get(a)! - remaining.get(b)! ||
            a.order - b.order);
    };

    const grid = Array.from(new Set(Array.from(infos.values()).flatMap(i => i.starts.map(s => s.getTime()))))
        .sort((a, b) => a - b)
        .map(ms => new Date(ms));

    for (const t of grid) {
        if (!pending.size) break;
        const ready = byPriority(Array.from(pending)
            .map(id => infos.get(id)!)
            .filter(info => {
                const r = readyTime(info);
                return r !== undefined && r <= t;
            }), t);
        if (!ready.length) continue;

        // 1) Fill the free courts at t with the most urgent eligible matches
        for (const info of ready) {
            if (!pending.has(info.match.id) || !isEligible(info, t)) continue;
            const court = pickCourt(t);
            if (court === null) break;
            place(info, t, court, false);
            pending.delete(info.match.id);
        }

        // 2) Matches that can no longer get a compatible slot before their deadline
        for (const info of ready) {
            if (!pending.has(info.match.id)) continue;
            if (isEligible(info, t) && anyCourtFree(t)) continue;
            if (hasFutureCompatible(info, t)) continue;
            placeFallback(info, t);
            pending.delete(info.match.id);
        }
    }

    // Leftovers (dependencies resolved after the last grid instant)
    let progress = true;
    while (pending.size && progress) {
        progress = false;
        for (const id of Array.from(pending).sort((a, b) => infos.get(a)!.order - infos.get(b)!.order)) {
            const info = infos.get(id)!;
            const r = readyTime(info);
            if (r === undefined) continue;
            placeFallback(info, r);
            pending.delete(id);
            progress = true;
        }
    }
    pending.forEach(id => {
        infos.get(id)!.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
    });
};
