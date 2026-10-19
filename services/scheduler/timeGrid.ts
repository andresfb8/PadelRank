import type { SchedulerConfig } from './types';
import { normalizeRoundName } from './types';

/** Resolution of the scheduling grid in minutes. */
export const STEP_MINUTES = 15;

export interface Interval {
    start: Date;
    end: Date;
}

export const addMinutes = (date: Date, minutes: number): Date =>
    new Date(date.getTime() + minutes * 60000);

/** Parses "HH:MM" on a "YYYY-MM-DD" date as LOCAL time. */
export const parseTimeOnDate = (time: string, date: string): Date => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of a date in LOCAL time (never use toISOString for this). */
export const localDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const overlapMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number =>
    Math.max(0, (Math.min(aEnd.getTime(), bEnd.getTime()) - Math.max(aStart.getTime(), bStart.getTime())) / 60000);

export const fitsIn = (start: Date, end: Date, intervals: Interval[]): boolean =>
    intervals.some(iv => start >= iv.start && end <= iv.end);

/** Rounds up to the next grid boundary (multiples of STEP_MINUTES past the hour). */
export const alignUp = (date: Date): Date => {
    const d = new Date(date);
    if (d.getSeconds() || d.getMilliseconds()) {
        d.setSeconds(0, 0);
        d.setMinutes(d.getMinutes() + 1);
    }
    const rem = d.getMinutes() % STEP_MINUTES;
    return rem ? addMinutes(d, STEP_MINUTES - rem) : d;
};

/** Operating hours of every tournament day, sorted chronologically. */
export const getOperatingIntervals = (config: SchedulerConfig): Interval[] =>
    [...(config.dailySchedule ?? [])]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({ start: parseTimeOnDate(d.startTime, d.date), end: parseTimeOnDate(d.endTime, d.date) }))
        .filter(iv => iv.end > iv.start);

export const intersectIntervals = (a: Interval[], b: Interval[]): Interval[] => {
    const out: Interval[] = [];
    a.forEach(x => b.forEach(y => {
        const start = x.start > y.start ? x.start : y.start;
        const end = x.end < y.end ? x.end : y.end;
        if (end > start) out.push({ start, end });
    }));
    return out.sort((p, q) => p.start.getTime() - q.start.getTime());
};

const roundWindowIntervals = (roundName: string | undefined, config: SchedulerConfig): Interval[] => {
    const target = normalizeRoundName(roundName);
    if (!target) return [];
    return (config.roundWindows ?? [])
        .filter(rw => normalizeRoundName(rw.roundName) === target)
        .map(rw => ({ start: parseTimeOnDate(rw.startTime, rw.date), end: parseTimeOnDate(rw.endTime, rw.date) }));
};

export const hasRoundWindows = (roundName: string | undefined, config: SchedulerConfig): boolean =>
    roundWindowIntervals(roundName, config).length > 0;

/** Where a round may be played: its phase windows ∩ operating hours, or just operating hours. */
export const getRoundIntervals = (roundName: string | undefined, config: SchedulerConfig): Interval[] => {
    const operating = getOperatingIntervals(config);
    const windows = roundWindowIntervals(roundName, config);
    return windows.length ? intersectIntervals(windows, operating) : operating;
};

/** Every grid start such that the whole match [start, start + duration] fits in one interval. Sorted. */
export const getStartTimes = (intervals: Interval[], durationMinutes: number): Date[] => {
    const out: Date[] = [];
    intervals.forEach(iv => {
        let t = alignUp(iv.start);
        while (addMinutes(t, durationMinutes) <= iv.end) {
            out.push(t);
            t = addMinutes(t, STEP_MINUTES);
        }
    });
    return out.sort((a, b) => a.getTime() - b.getTime());
};
