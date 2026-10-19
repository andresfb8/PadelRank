process.env.TZ = 'Europe/Madrid';

import { describe, it, expect } from 'vitest';
import { alignUp, getRoundIntervals, getStartTimes, localDateKey, mergeIntervals, parseTimeOnDate, STEP_MINUTES } from '../timeGrid';
import { makeConfig } from './fixtures';

describe('timeGrid', () => {
    it('uses a 15-minute grid and only returns starts where the whole match fits', () => {
        const starts = getStartTimes([{ start: parseTimeOnDate('09:00', '2026-06-06'), end: parseTimeOnDate('12:00', '2026-06-06') }], 75);
        expect(STEP_MINUTES).toBe(15);
        expect(starts[0].getHours()).toBe(9);
        expect(starts[1].getMinutes()).toBe(15);
        const last = starts[starts.length - 1];
        expect(`${last.getHours()}:${last.getMinutes()}`).toBe('10:45'); // 10:45 + 75 = 12:00
    });

    it('localDateKey uses local time (00:30 Madrid is still the local day, not the UTC one)', () => {
        const d = new Date(2026, 5, 7, 0, 30);
        expect(localDateKey(d)).toBe('2026-06-07');
        expect(d.toISOString().startsWith('2026-06-06')).toBe(true); // the old bug
    });

    it('handles the October DST change day', () => {
        const starts = getStartTimes([{ start: parseTimeOnDate('09:00', '2026-10-25'), end: parseTimeOnDate('12:00', '2026-10-25') }], 90);
        expect(starts.map(s => `${s.getHours()}:${String(s.getMinutes()).padStart(2, '0')}`))
            .toEqual(['9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30']);
        expect(starts.every(s => localDateKey(s) === '2026-10-25')).toBe(true);
    });

    it('alignUp rounds to the next 15-minute boundary', () => {
        expect(alignUp(new Date(2026, 5, 6, 9, 1)).getMinutes()).toBe(15);
        expect(alignUp(new Date(2026, 5, 6, 9, 15)).getMinutes()).toBe(15);
    });

    it('round intervals = phase windows ∩ operating hours', () => {
        const config = makeConfig({
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '21:00' }],
            roundWindows: [{ roundName: 'Final', date: '2026-06-06', startTime: '19:00', endTime: '23:00' }],
        });
        const iv = getRoundIntervals('Final (Cons.)', config);
        expect(iv).toHaveLength(1);
        expect(iv[0].start.getHours()).toBe(19);
        expect(iv[0].end.getHours()).toBe(21);
        expect(getRoundIntervals('Semifinales', config)[0].start.getHours()).toBe(9);
    });

    it('overlapping phase windows do not duplicate start times', () => {
        const config = makeConfig({
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
            roundWindows: [
                { roundName: 'Final', date: '2026-06-06', startTime: '10:00', endTime: '12:00' },
                { roundName: 'Final', date: '2026-06-06', startTime: '11:00', endTime: '13:00' },
            ],
        });
        const iv = getRoundIntervals('Final', config);
        expect(iv).toHaveLength(1);
        expect(iv[0].start.getHours()).toBe(10);
        expect(iv[0].end.getHours()).toBe(13);
        const starts = getStartTimes(iv, 60);
        expect(new Set(starts.map(s => s.getTime())).size).toBe(starts.length);
        const last = starts[starts.length - 1];
        expect(last.getHours()).toBe(12);
        expect(last.getMinutes()).toBe(0);
    });

    it('mergeIntervals fuses touching and overlapping intervals', () => {
        const merged = mergeIntervals([
            { start: parseTimeOnDate('11:00', '2026-06-06'), end: parseTimeOnDate('12:00', '2026-06-06') },
            { start: parseTimeOnDate('10:00', '2026-06-06'), end: parseTimeOnDate('11:00', '2026-06-06') },
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0].start.getHours()).toBe(10);
        expect(merged[0].end.getHours()).toBe(12);
        expect(mergeIntervals([])).toEqual([]);
    });
});
