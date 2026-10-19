import { describe, it, expect } from 'vitest';
import { describeViolation, getViolations, violatingPairCount, violationMinutes } from '../availability';
import { at } from './fixtures';

const constraints = { 'a::b': { unavailableRanges: [{ date: '2026-06-06', startTime: '17:00', endTime: '19:00' }] } };
const check = (time: string) => {
    const start = at('2026-06-06', time);
    return getViolations(start, new Date(start.getTime() + 90 * 60000), ['a::b'], constraints);
};

describe('availability', () => {
    it('counts the overlap of the whole match, not only its start', () => {
        expect(violationMinutes(check('16:45'))).toBe(75); // 16:45–18:15 overlaps 17:00–18:15
        expect(violationMinutes(check('15:30'))).toBe(0);  // ends exactly at 17:00
        expect(violationMinutes(check('19:00'))).toBe(0);
    });

    it('counts distinct violating pairs', () => {
        const start = at('2026-06-06', '17:00');
        const v = getViolations(start, new Date(start.getTime() + 90 * 60000), ['a::b', 'c::d'], {
            ...constraints,
            'c::d': { unavailableRanges: [{ date: '2026-06-06', startTime: '18:00', endTime: '20:00' }] },
        });
        expect(violatingPairCount(v)).toBe(2);
    });

    it('describes a violation in Spanish', () => {
        expect(describeViolation(check('16:45')[0])).toBe('No disponible sáb 17:00–19:00');
    });
});
