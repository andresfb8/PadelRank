import type { PairAvailability } from './types';
import { overlapMinutes, parseTimeOnDate } from './timeGrid';

export interface PairViolation {
    pairKey: string;
    minutes: number;
    date: string;
    startTime: string;
    endTime: string;
}

/** Every blocked range of the given pairs that overlaps the match [start, end]. */
export const getViolations = (
    start: Date,
    end: Date,
    pairKeys: Iterable<string>,
    constraints: Record<string, PairAvailability>
): PairViolation[] => {
    const out: PairViolation[] = [];
    for (const pairKey of pairKeys) {
        for (const r of constraints[pairKey]?.unavailableRanges ?? []) {
            const minutes = overlapMinutes(start, end, parseTimeOnDate(r.startTime, r.date), parseTimeOnDate(r.endTime, r.date));
            if (minutes > 0) out.push({ pairKey, minutes, date: r.date, startTime: r.startTime, endTime: r.endTime });
        }
    }
    return out;
};

export const violationMinutes = (violations: PairViolation[]): number =>
    violations.reduce((sum, v) => sum + v.minutes, 0);

export const violatingPairCount = (violations: PairViolation[]): number =>
    new Set(violations.map(v => v.pairKey)).size;

/** "No disponible sáb 17:00–19:00" */
export const describeViolation = (v: PairViolation): string => {
    const weekday = parseTimeOnDate('12:00', v.date).toLocaleDateString('es-ES', { weekday: 'short' });
    return `No disponible ${weekday} ${v.startTime}–${v.endTime}`;
};
