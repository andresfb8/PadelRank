import type { Division, Match, Ranking } from '../../types';
import type { FeasibilityWarning, PlayerAvailability, ScheduleConflict, SchedulerConfig } from './types';
import { normalizePairConstraints, normalizeRoundName, pairKeyOf } from './types';
import { addMinutes, localDateKey, parseTimeOnDate } from './timeGrid';
import { planRounds } from './roundPlanner';
import { assignMatches, evaluateConflicts } from './matchAssigner';

export * from './types';
export { STEP_MINUTES, localDateKey } from './timeGrid';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Pending and not blocked by a known BYE (those are never played). */
const isSchedulable = (m: Match) => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE';

export interface ResultCheck {
    divisions: Division[];
    newConflicts: { matchId: string; conflicts: ScheduleConflict[] }[];
}

export class SchedulerEngine {

    // ---- Generation ----

    /** Pre-generation check: rounds or phase windows that cannot fit. */
    static checkFeasibility(ranking: Ranking): FeasibilityWarning[] {
        if (!ranking.schedulerConfig) return [];
        return planRounds(ranking.divisions, ranking.schedulerConfig).warnings;
    }

    /**
     * Generates the schedule. Locked or played matches stay where they are unless includeLocked.
     * Mode 'full' locks everything; mode 'daily' locks the current tournament day and estimates the rest.
     * `notBefore` (the UI passes the current time) keeps every placed match from starting in the past.
     */
    static generateSchedule(
        ranking: Ranking,
        opts: { includeLocked?: boolean; now?: Date; notBefore?: Date } = {}
    ): Division[] {
        const config = ranking.schedulerConfig;
        if (!config?.dailySchedule?.length) return ranking.divisions;
        const lockUntil = (config.mode ?? 'full') === 'full' ? null : SchedulerEngine.currentDayKey(config, opts.now ?? new Date());
        return SchedulerEngine.run(ranking, !!opts.includeLocked, lockUntil, opts.notBefore);
    }

    /**
     * Mode 'daily': recomputes unlocked matches and locks the first day that still has estimates.
     * `notBefore` (the UI passes the current time) keeps every placed match from starting in the past.
     */
    static lockNextDay(ranking: Ranking, opts: { notBefore?: Date } = {}): Division[] {
        const config = ranking.schedulerConfig;
        if (!config?.dailySchedule?.length) return ranking.divisions;
        const day = SchedulerEngine.firstEstimatedDay(ranking.divisions);
        return day ? SchedulerEngine.run(ranking, false, day, opts.notBefore) : ranking.divisions;
    }

    static firstEstimatedDay(divisions: Division[]): string | null {
        const days = divisions.flatMap(d => d.matches)
            .filter(m => m.status === 'pendiente' && m.scheduleEstimated && m.startTime)
            .map(m => localDateKey(new Date(m.startTime!)))
            .sort();
        return days[0] ?? null;
    }

    /**
     * After a result: never moves anything. Re-checks availability of matches whose two pairs
     * are now known and returns the conflicts that are new.
     */
    static onResultEntered(ranking: Ranking): ResultCheck {
        const config = ranking.schedulerConfig;
        if (!config) return { divisions: ranking.divisions, newConflicts: [] };
        const divisions: Division[] = clone(ranking.divisions);
        const constraints = normalizePairConstraints(ranking.pairConstraints);
        const newConflicts: ResultCheck['newConflicts'] = [];
        divisions.forEach(d => d.matches.forEach(m => {
            if (m.status !== 'pendiente' || !m.startTime || m.scheduleEstimated) return;
            if (!pairKeyOf(m.pair1) || !pairKeyOf(m.pair2)) return;
            const before = m.scheduleConflict ?? [];
            const after = evaluateConflicts(m, config, constraints);
            if (after) m.scheduleConflict = after;
            else delete m.scheduleConflict;
            const added = (after ?? []).filter(c => !before.some(b => b.pairKey === c.pairKey && b.reason === c.reason));
            if (added.length) newConflicts.push({ matchId: m.id, conflicts: added });
        }));
        return { divisions, newConflicts };
    }

    /** Conflicts of a match at its current startTime (for manual moves). */
    static computeConflicts(match: Match, ranking: Ranking): ScheduleConflict[] | undefined {
        if (!ranking.schedulerConfig) return undefined;
        return evaluateConflicts(match, ranking.schedulerConfig, normalizePairConstraints(ranking.pairConstraints));
    }

    private static run(ranking: Ranking, includeLocked: boolean, lockUntil: string | null, notBefore?: Date): Division[] {
        const config = ranking.schedulerConfig!;
        const divisions: Division[] = clone(ranking.divisions);
        const constraints = normalizePairConstraints(ranking.pairConstraints);
        const tournamentDays = new Set((config.dailySchedule ?? []).map(d => d.date));
        const toSchedule = new Set<string>();

        divisions.forEach(d => d.matches.forEach(m => {
            const pending = m.status === 'pendiente';
            // Legacy data: a confirmed (non-estimated) slot counts as locked
            if (pending && m.startTime && m.scheduleLocked === undefined && !m.scheduleEstimated) m.scheduleLocked = true;
            // A locked match on a day that is no longer part of the tournament has to move
            if (pending && m.scheduleLocked && m.startTime && !tournamentDays.has(localDateKey(new Date(m.startTime)))) m.scheduleLocked = false;
            // A stale estimate on a match that will never be played is dropped
            if (m.scheduleEstimated && !isSchedulable(m)) {
                delete m.startTime;
                delete m.court;
                m.scheduleEstimated = false;
            }
            if (!isSchedulable(m) || (m.scheduleLocked && !includeLocked)) return;
            delete m.startTime;
            delete m.court;
            delete m.scheduleConflict;
            m.scheduleEstimated = false;
            m.scheduleLocked = false;
            toSchedule.add(m.id);
        }));

        const { plans } = planRounds(divisions, config);
        assignMatches({ divisions, config, constraints, plans, toSchedule, notBefore });

        divisions.forEach(d => d.matches.forEach(m => {
            if (!toSchedule.has(m.id) || !m.startTime) return;
            const lock = lockUntil === null || localDateKey(new Date(m.startTime)) <= lockUntil;
            m.scheduleLocked = lock;
            m.scheduleEstimated = !lock;
        }));
        return divisions;
    }

    /** Today if it is a tournament day, else the next tournament day, else the last one. */
    private static currentDayKey(config: SchedulerConfig, now: Date): string {
        const days = (config.dailySchedule ?? []).map(d => d.date).sort();
        const today = localDateKey(now);
        return days.find(d => d >= today) ?? days[days.length - 1];
    }

    // ---- Helpers used by the UI ----

    static addMinutes(date: Date, minutes: number): Date {
        return addMinutes(date, minutes);
    }

    static parseTimeOnDate(timeStr: string, dateStr: string): Date {
        return parseTimeOnDate(timeStr, dateStr);
    }

    static normalizeRoundName(name?: string): string {
        return normalizeRoundName(name);
    }

    static doRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
        return start1 < end2 && start2 < end1;
    }

    static checkMatchConflict(
        startTime: Date,
        endTime: Date,
        court: number,
        occupiedSlots: { start: Date; end: Date; court: number }[]
    ): boolean {
        return occupiedSlots.some(slot =>
            slot.court === court && SchedulerEngine.doRangesOverlap(startTime, endTime, slot.start, slot.end));
    }

    /** @deprecated legacy per-player constraints */
    static checkPlayerAvailability(
        startTime: Date,
        endTime: Date,
        playerIds: string[],
        allConstraints: Record<string, PlayerAvailability>
    ): { valid: boolean; conflictPlayerId?: string; conflictRange?: { start: string; end: string } } {
        if (!allConstraints) return { valid: true };
        for (const pid of playerIds) {
            for (const range of allConstraints[pid]?.unavailableRanges ?? []) {
                if (SchedulerEngine.doRangesOverlap(startTime, endTime, new Date(range.start), new Date(range.end))) {
                    return { valid: false, conflictPlayerId: pid, conflictRange: range };
                }
            }
        }
        return { valid: true };
    }

    static getAllOccupiedSlots(ranking: Ranking, excludeMatchId?: string): { start: Date; end: Date; court: number }[] {
        const duration = ranking.schedulerConfig?.slotDurationMinutes || 90;
        return ranking.divisions.flatMap(div => div.matches)
            .filter(m => m.startTime && m.court && m.id !== excludeMatchId)
            .map(m => ({
                start: new Date(m.startTime!),
                end: addMinutes(new Date(m.startTime!), duration),
                court: m.court!,
            }));
    }
}
