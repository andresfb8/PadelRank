import { describe, it, expect } from 'vitest';
import { planRounds, roundKeyOf } from '../roundPlanner';
import { at, makeCategory, makeConfig } from './fixtures';

const weekend = makeConfig({
    courts: 4,
    dailySchedule: [
        { date: '2026-06-05', startTime: '17:00', endTime: '22:00' },
        { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
        { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
    ],
    roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
});

describe('roundPlanner', () => {
    it('a category with more rounds has less slack in its first round', () => {
        const big = makeCategory('A', 32);
        const small = makeCategory('B', 4);
        const { plans } = planRounds([...big, ...small], weekend);
        const bigR1 = plans.get(roundKeyOf(big[0].id, 1))!;
        const smallR1 = plans.get(roundKeyOf(small[0].id, 1))!;
        expect(bigR1.latestStart!.getTime()).toBeLessThan(smallR1.latestStart!.getTime());
    });

    it('the deadline of a final is the end of its window', () => {
        const cat = makeCategory('A', 8);
        const { plans } = planRounds(cat, weekend);
        const final = plans.get(roundKeyOf(cat[0].id, 3))!;
        expect(final.deadline!.getTime()).toBe(at('2026-06-07', '14:00').getTime());
        expect(final.windowed).toBe(true);
    });

    it('warns when a phase window is too small', () => {
        const cat = makeCategory('A', 8);
        const config = makeConfig({
            courts: 1,
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
            roundWindows: [{ roundName: 'Semifinales', date: '2026-06-06', startTime: '16:00', endTime: '17:30' }],
        });
        const { warnings } = planRounds(cat, config);
        expect(warnings.some(w => /partidos no caben en sus franjas/.test(w.message))).toBe(true);
    });

    it('a round that cannot be placed blocks later rounds and warns once', () => {
        const cat = makeCategory('A', 8);
        const config = makeConfig({
            courts: 1,
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
            roundWindows: [{ roundName: 'Semifinales', date: '2026-06-06', startTime: '16:00', endTime: '17:30' }],
        });
        const { plans, warnings } = planRounds(cat, config);
        const final = plans.get(roundKeyOf(cat[0].id, 3))!;
        expect(final.earliestStart).toBeNull();
        const divWarnings = warnings.filter(w => w.roundKey?.startsWith(cat[0].id));
        expect(divWarnings).toHaveLength(1);
    });

    it('no warnings for a comfortable weekend', () => {
        const { warnings } = planRounds([...makeCategory('A', 8), ...makeCategory('B', 8)], weekend);
        expect(warnings).toEqual([]);
    });
});
