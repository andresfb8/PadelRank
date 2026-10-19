import type { Division, Match } from '../../types';
import type { DaySchedule, PairAvailability, ScheduleConflict, SchedulerConfig } from './types';
import { ANY_PAIR, normalizeRoundName, pairKeyOf, roundRank } from './types';
import {
    STEP_MINUTES, addMinutes, fitsIn, getOperatingIntervals, getRoundIntervals, getStartTimes, hasRoundWindows,
    parseTimeOnDate,
} from './timeGrid';
import { buildMatchIndex, getCandidatePairs, getDependencies } from './candidates';
import {
    PairViolation, describeViolation, getViolations, violatingPairCount, violationMinutes,
} from './availability';
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
    notBefore?: Date;                            // no match may start before this instant (e.g. now)
}

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
    deps: Info[];                 // dependencies that are also being scheduled
    fixedDeps: Match[];           // dependencies that are not (already placed, or BYE-resolved)
    dependents: Info[];
    depth: number;                // longest chain of scheduled dependencies before this match
    latest: number;               // latest start (ms) that still leaves room for every later match
    reservedCourt: number | null; // court held for it at `latest` while it is pending
    cover: Set<number>;           // grid instants a court-overlapping compatible start of this match covers
    order: number;
}

/**
 * Phase 2: chronological list scheduling.
 * First a backward pass packs every match as late as possible on the real courts: each match gets
 * the latest start that still leaves room for the rounds after it (and the final), and that court is
 * held for it. Then, at each grid instant, matches that reached their latest start take their held
 * court (with a scheduleConflict if needed) and every remaining free court takes the most urgent
 * ready match that is compatible there (least round slack, then fewest compatible slots left, then
 * bracket order). No placement may take a court held for another pending match, unless that hold can
 * move to another free court, so whenever the backward pass fits everything, every match gets a slot.
 * A match that has no compatible slot left before its latest start is placed in the least-violating
 * slot up to that point and flagged with scheduleConflict.
 */
export const assignMatches = ({ divisions, config, constraints, plans, toSchedule, notBefore }: AssignInput): void => {
    const D = config.slotDurationMinutes;
    const rest = config.restMinutes;
    const stepMs = STEP_MINUTES * 60000;
    const span = Math.ceil(D / STEP_MINUTES);    // grid steps a match occupies
    const gap = (D + rest) * 60000;              // dependency start → dependent start
    const index = buildMatchIndex(divisions);
    const candidateMemo = new Map<string, Set<string>>();
    const nCourts = Math.max(1, config.courts);

    // ---- Court occupancy: per court, the grid steps it is busy ----
    const occupied: Set<number>[] = Array.from({ length: nCourts }, () => new Set());
    const lastEnds: number[][] = Array.from({ length: nCourts }, () => []);
    const occupy = (occ: Set<number>[], court: number, startMs: number, endMs: number) => {
        for (let k = Math.floor(startMs / stepMs); k < Math.ceil(endMs / stepMs); k++) occ[court].add(k);
    };
    const book = (court: number, start: Date) => {
        const end = start.getTime() + D * 60000;
        occupy(occupied, court, start.getTime(), end);
        lastEnds[court].push(end);
    };
    index.byId.forEach(m => {
        if (toSchedule.has(m.id) || !m.startTime || !m.court || m.court > nCourts) return;
        book(m.court - 1, new Date(m.startTime));
    });

    /** Starts are grid-aligned, so step overlap is exactly time overlap. */
    const freeIn = (occ: Set<number>[], court: number, startMs: number) => {
        const k0 = Math.floor(startMs / stepMs);
        for (let k = k0; k < k0 + span; k++) if (occ[court].has(k)) return false;
        return true;
    };

    // ---- Courts held for pending matches (from the backward pass) ----
    const held: Map<number, Info>[] = Array.from({ length: nCourts }, () => new Map());
    const hold = (info: Info, court: number) => {
        const k0 = Math.floor(info.latest / stepMs);
        for (let k = k0; k < k0 + span; k++) held[court].set(k, info);
        info.reservedCourt = court;
    };
    const release = (info: Info) => {
        if (info.reservedCourt === null) return;
        const k0 = Math.floor(info.latest / stepMs);
        for (let k = k0; k < k0 + span; k++) held[info.reservedCourt].delete(k);
        info.reservedCourt = null;
    };
    const notHeldIn = (court: number, startMs: number, except: Info) => {
        const k0 = Math.floor(startMs / stepMs);
        for (let k = k0; k < k0 + span; k++) {
            const owner = held[court].get(k);
            if (owner && owner !== except) return false;
        }
        return true;
    };
    /** Holds of other matches that block `court` at `ms`, each with a free court it can move to; null if one cannot move. */
    const movesFor = (info: Info, court: number, ms: number): [Info, number][] | null => {
        const owners = new Set<Info>();
        const k0 = Math.floor(ms / stepMs);
        for (let k = k0; k < k0 + span; k++) {
            const owner = held[court].get(k);
            if (owner && owner !== info) owners.add(owner);
        }
        const moves: [Info, number][] = [];
        for (const owner of owners) {
            let to = -1;
            for (let c = 0; c < nCourts && to < 0; c++) {
                if (c !== court && freeIn(occupied, c, owner.latest) && notHeldIn(c, owner.latest, owner)) to = c;
            }
            if (to < 0) return null;
            moves.push([owner, to]);
        }
        return moves;
    };
    const usable = (info: Info, court: number, ms: number) =>
        freeIn(occupied, court, ms) && movesFor(info, court, ms) !== null;
    const courtsFor = (info: Info, ms: number): number => {
        let n = 0;
        for (let c = 0; c < nCourts; c++) if (usable(info, c, ms)) n++;
        return n;
    };
    const canPlace = (info: Info, s: Date) => {
        for (let c = 0; c < nCourts; c++) if (usable(info, c, s.getTime())) return true;
        return false;
    };
    /** Usable court at `start`: no hold to move first, then the one that became free most recently (back-to-back). */
    const pickCourt = (info: Info, start: Date): number | null => {
        const ms = start.getTime();
        let best: number | null = null;
        let bestKey: [number, number] = [Infinity, Infinity];
        for (let c = 0; c < nCourts; c++) {
            if (!freeIn(occupied, c, ms)) continue;
            const moves = movesFor(info, c, ms);
            if (!moves) continue;
            const lastEnd = lastEnds[c].reduce((max, e) => (e <= ms && e > max ? e : max), -Infinity);
            const key: [number, number] = [moves.length, -lastEnd];
            if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
                best = c;
                bestKey = key;
            }
        }
        return best;
    };

    // ---- Availability: blocked ranges parsed once per pair ----
    const parsedRanges = new Map<string, { start: number; end: number; range: DaySchedule }[]>();
    const rangesOf = (key: string) => {
        let ranges = parsedRanges.get(key);
        if (!ranges) {
            ranges = (constraints[key]?.unavailableRanges ?? []).map(range => ({
                start: parseTimeOnDate(range.startTime, range.date).getTime(),
                end: parseTimeOnDate(range.endTime, range.date).getTime(),
                range,
            }));
            parsedRanges.set(key, ranges);
        }
        return ranges;
    };
    /** Same as getViolations for a match starting at `s`. */
    const violationsAt = (keys: string[], s: Date): PairViolation[] => {
        const out: PairViolation[] = [];
        const start = s.getTime();
        const end = start + D * 60000;
        for (const pairKey of keys) {
            for (const { start: from, end: to, range } of rangesOf(pairKey)) {
                const overlap = Math.min(end, to) - Math.max(start, from);
                if (overlap > 0) {
                    out.push({ pairKey, minutes: overlap / 60000, date: range.date, startTime: range.startTime, endTime: range.endTime });
                }
            }
        }
        return out;
    };

    // ---- Matches to place ----
    const infos = new Map<string, Info>();
    toSchedule.forEach(id => {
        const match = index.byId.get(id);
        const div = index.divisionOf.get(id);
        if (!match || !div) return;
        const plan = plans.get(roundKeyOf(div.id, match.jornada));
        const starts = getStartTimes(plan?.intervals ?? getRoundIntervals(match.roundName, config), D)
            .filter(s => !notBefore || s >= notBefore);
        const known = knownPairKeys(match);
        const candidates = getCandidatePairs(match, index, candidateMemo);
        const keys = known.length === 2 ? known : Array.from(candidates);
        const compatible = starts.filter(s => violationsAt(keys, s).length === 0);
        const deadline = plan?.deadline ?? null;
        const inDeadline = deadline ? starts.filter(s => addMinutes(s, D) <= deadline) : starts;
        const cover = new Set<number>();
        compatible.forEach(c => {
            for (let k = 1 - span; k < span; k++) cover.add(c.getTime() + k * stepMs);
        });
        infos.set(id, {
            match, plan, starts, startSet: new Set(starts.map(s => s.getTime())),
            keys, candidates, strict: isStrictMatch(match, config),
            compatible, compatibleSet: new Set(compatible.map(s => s.getTime())),
            lastStart: inDeadline.length ? inDeadline[inDeadline.length - 1] : null,
            deps: [], fixedDeps: [], dependents: [], depth: 0, latest: Infinity, reservedCourt: null, cover,
            order: index.order.get(id) ?? 0,
        });
    });
    infos.forEach(info => getDependencies(info.match, index).forEach(dep => {
        const depInfo = infos.get(dep.id);
        if (depInfo) {
            info.deps.push(depInfo);
            depInfo.dependents.push(info);
        } else if (!toSchedule.has(dep.id)) {
            info.fixedDeps.push(dep);
        }
    }));
    const depthOf = (info: Info): number => {
        if (!info.depth && info.deps.length) info.depth = 1 + Math.max(...info.deps.map(depthOf));
        return info.depth;
    };
    infos.forEach(info => depthOf(info));

    const grid = Array.from(new Set(Array.from(infos.values()).flatMap(i => i.starts.map(s => s.getTime()))))
        .sort((a, b) => a - b)
        .map(ms => new Date(ms));

    // ---- Backward pass: latest start and held court of every match ----
    {
        const unplaced = new Set(infos.values());
        for (let g = grid.length - 1; g >= 0 && unplaced.size; g--) {
            const ms = grid[g].getTime();
            const fits = Array.from(unplaced)
                .filter(i => i.startSet.has(ms) && (!i.lastStart || ms <= i.lastStart.getTime()) &&
                    i.dependents.every(d => d.latest !== Infinity && d.latest >= ms + gap))
                // Deep matches cannot move earlier, so they get the late slots first
                .sort((a, b) => b.depth - a.depth || b.order - a.order);
            for (const info of fits) {
                let court = -1;
                for (let c = 0; c < nCourts && court < 0; c++) {
                    if (freeIn(occupied, c, ms) && notHeldIn(c, ms, info)) court = c;
                }
                if (court < 0) break;
                info.latest = ms;
                hold(info, court);
                unplaced.delete(info);
            }
        }
        // No room even packing backwards: bound by dependents' latest starts (no court held), or as soon as possible
        const bound = (info: Info): number => {
            if (!unplaced.has(info)) return info.latest;
            unplaced.delete(info);
            let limit = info.lastStart?.getTime() ?? Infinity;
            info.dependents.forEach(d => { limit = Math.min(limit, bound(d) - gap); });
            const fit = [...info.starts].reverse().find(s => s.getTime() <= limit);
            info.latest = fit ? fit.getTime() : -Infinity;
            return info.latest;
        };
        Array.from(unplaced).forEach(bound);
    }

    const pending = new Set<string>();
    infos.forEach((_, id) => pending.add(id));

    // Pending matches whose compatible starts overlap each grid instant (for the fallback's reservation penalty)
    const demand = new Map<number, number>();
    infos.forEach(info => info.cover.forEach(ms => demand.set(ms, (demand.get(ms) ?? 0) + 1)));
    const settle = (info: Info) => {
        pending.delete(info.match.id);
        release(info);
        info.cover.forEach(ms => demand.set(ms, demand.get(ms)! - 1));
    };

    /** undefined = a dependency is still unplaced; otherwise the earliest start allowed by dependencies. */
    const readyTime = (info: Info): Date | undefined => {
        let ready = 0;
        for (const dep of info.deps) {
            if (!dep.match.startTime) return undefined;
            ready = Math.max(ready, new Date(dep.match.startTime).getTime() + gap);
        }
        for (const dep of info.fixedDeps) {
            if (dep.startTime) ready = Math.max(ready, new Date(dep.startTime).getTime() + gap);
        }
        return new Date(ready);
    };

    const costMemo = new Map<string, [number, number]>();
    const cost = (info: Info, s: Date): [number, number] => {
        const memoKey = `${info.match.id}|${s.getTime()}`;
        let c = costMemo.get(memoKey);
        if (!c) {
            const v = violationsAt(info.keys, s);
            c = info.strict ? [violationMinutes(v), 0] : [violatingPairCount(v), violationMinutes(v)];
            costMemo.set(memoKey, c);
        }
        return c;
    };

    /** Places the match, moving first any hold of another match on that court. */
    const place = (info: Info, start: Date, court: number, outsideWindow: boolean) => {
        (movesFor(info, court, start.getTime()) ?? []).forEach(([owner, to]) => {
            release(owner);
            hold(owner, to);
        });
        const m = info.match;
        m.startTime = start.toISOString();
        m.court = court + 1;
        book(court, start);
        const conflicts = computeConflicts(m, start, config, constraints, info.candidates, outsideWindow);
        if (conflicts) m.scheduleConflict = conflicts;
        else delete m.scheduleConflict;
        settle(info);
    };

    /** Takes a physically free court even if it is held for another match, whose hold is then dropped. */
    const placeOverHold = (info: Info, start: Date, outsideWindow: boolean) => {
        const ms = start.getTime();
        const court = Array.from({ length: nCourts }, (_, c) => c).find(c => freeIn(occupied, c, ms))!;
        const k0 = Math.floor(ms / stepMs);
        for (let k = k0; k < k0 + span; k++) {
            const owner = held[court].get(k);
            if (owner && owner !== info) release(owner);
        }
        place(info, start, court, outsideWindow);
    };

    /**
     * Earliest allowed start from `t0` (first without taking another match's held court), else the
     * earliest free operating slot (flagged), else no capacity.
     */
    const placeAsap = (info: Info, t0: Date) => {
        const inRound = info.starts.find(s => s >= t0 && canPlace(info, s));
        if (inRound) return place(info, inRound, pickCourt(info, inRound)!, false);
        const physicallyFree = (s: Date) => s >= t0 && Array.from({ length: nCourts }, (_, c) => c).some(c => freeIn(occupied, c, s.getTime()));
        const overHold = info.starts.find(physicallyFree);
        if (overHold) return placeOverHold(info, overHold, false);
        const anyOperating = getStartTimes(getOperatingIntervals(config), D).find(physicallyFree);
        if (anyOperating) return placeOverHold(info, anyOperating, true);
        info.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
        settle(info);
    };

    /**
     * Least-violating usable slot between the moment the match is ready and its latest start. Instants
     * the sweep already passed count too: a court left idle there is better than a late final.
     */
    const placeFallback = (info: Info, from: Date) => {
        let t0 = readyTime(info) ?? from;
        if (notBefore && notBefore > t0) t0 = notBefore;
        const pool = info.starts.filter(s => s >= t0 && s.getTime() <= info.latest && canPlace(info, s));
        if (!pool.length) return placeAsap(info, t0 > from ? t0 : from);
        // Slots overlapping the compatible slots of other pending matches rank last, but only when
        // that overlapping demand would use up the courts still free at the slot.
        const rank = (s: Date): [number, number, number] => {
            const ms = s.getTime();
            const others = (demand.get(ms) ?? 0) - (info.cover.has(ms) ? 1 : 0);
            const c = cost(info, s);
            return [others >= courtsFor(info, ms) ? 1 : 0, c[0], c[1]];
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
        place(info, best, pickCourt(info, best)!, false);
    };

    const remainingCompatible = (info: Info, t: Date) =>
        info.compatible.filter(s => s >= t && s.getTime() <= info.latest).length;

    const hasFutureCompatible = (info: Info, t: Date) =>
        info.compatible.some(s => s > t && s.getTime() <= info.latest && canPlace(info, s));

    const isEligible = (info: Info, t: Date) =>
        info.startSet.has(t.getTime()) && info.compatibleSet.has(t.getTime());

    const byPriority = (infosAtT: Info[], t: Date): Info[] => {
        const remaining = new Map(infosAtT.map(i => [i, remainingCompatible(i, t)]));
        return infosAtT.sort((a, b) =>
            (a.plan?.latestStart?.getTime() ?? -Infinity) - (b.plan?.latestStart?.getTime() ?? -Infinity) ||
            remaining.get(a)! - remaining.get(b)! ||
            a.latest - b.latest ||
            a.order - b.order);
    };

    for (const t of grid) {
        if (!pending.size) break;
        const ms = t.getTime();
        const ready = byPriority(Array.from(pending)
            .map(id => infos.get(id)!)
            .filter(info => {
                const r = readyTime(info);
                return r !== undefined && r <= t;
            }), t);
        if (!ready.length) continue;

        // 1) Matches that reached their latest start go now, compatible or not: waiting longer
        //    would leave a later round (or the final) without a slot.
        ready.filter(info => info.latest <= ms)
            .sort((a, b) => a.latest - b.latest || a.order - b.order)
            .forEach(info => {
                const court = info.startSet.has(ms) ? pickCourt(info, t) : null;
                if (court !== null) place(info, t, court, false);
                else placeFallback(info, t);
            });

        // 2) Fill the free courts at t with the most urgent eligible matches
        for (const info of ready) {
            if (!pending.has(info.match.id) || !isEligible(info, t)) continue;
            const court = pickCourt(info, t);
            if (court !== null) place(info, t, court, false);
        }

        // 3) Matches that can no longer get a compatible slot before their latest start
        for (const info of ready) {
            if (!pending.has(info.match.id)) continue;
            if (isEligible(info, t) && canPlace(info, t)) continue;
            if (hasFutureCompatible(info, t)) continue;
            placeFallback(info, t);
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
            progress = true;
        }
    }
    pending.forEach(id => {
        infos.get(id)!.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
    });
};
