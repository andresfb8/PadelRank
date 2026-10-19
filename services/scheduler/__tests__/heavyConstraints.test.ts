import { describe, it, expect } from 'vitest';
import type { Division } from '../../../types';
import { buildMatchIndex, getDependencies } from '../candidates';
import type { PairAvailability, SchedulerConfig } from '../types';
import { SchedulerEngine } from '../index';
import { allMatches, at, endOf, makeCategory, makeConfig, makeRanking, pairIds } from './fixtures';

/** Deterministic PRNG (mulberry32) so the generated restrictions are always the same. */
const rng = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 3 days, 24 waves of 90 min per court: 8 courts → 192 slots. */
const DAYS = [
    { date: '2026-06-05', startTime: '17:00', endTime: '23:00' },
    { date: '2026-06-06', startTime: '08:00', endTime: '23:00' },
    { date: '2026-06-07', startTime: '08:00', endTime: '23:00' },
];

const config = (courts: number): SchedulerConfig => makeConfig({
    courts,
    dailySchedule: DAYS,
    roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '17:00', endTime: '23:00' }],
});

/** A share `ratio` of the pairs gets one 4 h block per tournament day, at a random hour. */
const restrictions = (keys: string[], ratio: number, seed: number): Record<string, PairAvailability> => {
    const rand = rng(seed);
    const out: Record<string, PairAvailability> = {};
    keys.forEach(key => {
        if (rand() >= ratio) return;
        out[key] = {
            unavailableRanges: DAYS.map(d => {
                const from = Number(d.startTime.slice(0, 2));
                const to = Number(d.endTime.slice(0, 2)) - 4;
                const h = from + Math.floor(rand() * (to - from + 1));
                return { date: d.date, startTime: `${pad(h)}:00`, endTime: `${pad(h + 4)}:00` };
            }),
        };
    });
    return out;
};

const CATS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const run = (divisions: Division[], courts: number, constraints: Record<string, PairAvailability>) => {
    const t0 = performance.now();
    const result = SchedulerEngine.generateSchedule(makeRanking(divisions, config(courts), constraints));
    const elapsed = performance.now() - t0;
    const pending = allMatches(result).filter(m => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE');
    const unplaced = pending.filter(m => !m.startTime);
    return { result, pending, unplaced, elapsed };
};

/** Rules that never bend: one match per court at a time, rest after feeders, operating hours. */
const expectHardRules = (divisions: Division[]) => {
    const placed = allMatches(divisions).filter(m => m.startTime);
    placed.forEach(a => placed.forEach(b => {
        if (a.id === b.id || a.court !== b.court) return;
        expect(new Date(a.startTime!) < endOf(b.startTime!) && new Date(b.startTime!) < endOf(a.startTime!)).toBe(false);
    }));
    const index = buildMatchIndex(divisions);
    placed.forEach(m => getDependencies(m, index).filter(d => d.startTime).forEach(d => {
        expect(new Date(m.startTime!).getTime()).toBeGreaterThanOrEqual(endOf(d.startTime!).getTime() + 60 * 60000);
    }));
    placed.forEach(m => {
        const day = DAYS.find(d => at(d.date, d.startTime) <= new Date(m.startTime!) && endOf(m.startTime!) <= at(d.date, d.endTime));
        expect(day).toBeDefined();
    });
};

describe('assignMatches with heavily restricted pairs', () => {
    // 8 categories × (15 main + 7 consolation) = 176 matches; 8 courts × 24 waves = 192 slots
    const divisions = CATS.flatMap(c => makeCategory(c, 16, true));
    const keys = CATS.flatMap(c => pairIds(c, 16));

    [0.6, 0.75, 0.9].forEach(ratio => [1, 2, 3].forEach(seed => {
        it(`${Math.round(ratio * 100)}% restricted pairs (seed ${seed}): every match gets a slot, finals in their window`, () => {
            const { result, pending, unplaced } = run(divisions, 8, restrictions(keys, ratio, seed));
            expect(pending).toHaveLength(176);
            expect(unplaced.map(m => `${m.roundName} ${m.id}`)).toEqual([]);
            const finals = allMatches(result).filter(m => m.roundName === 'Final' && m.status === 'pendiente');
            finals.forEach(f => expect(new Date(f.startTime!).getTime()).toBeGreaterThanOrEqual(at('2026-06-07', '17:00').getTime()));
            expectHardRules(result);
        });
    }));

    it('~220 matches with 90% restricted pairs schedules in < 1 s', () => {
        // 10 categories × 22 = 220 matches on 10 courts (240 slots)
        const cats = [...CATS, 'I', 'J'];
        const big = cats.flatMap(c => makeCategory(c, 16, true));
        const constraints = restrictions(cats.flatMap(c => pairIds(c, 16)), 0.9, 7);
        run(big, 10, constraints); // warm-up (JIT)
        const { result, pending, unplaced, elapsed } = run(big, 10, constraints);
        expect(pending).toHaveLength(220);
        expect(unplaced).toHaveLength(0);
        expectHardRules(result);
        expect(elapsed).toBeLessThan(1000);
    });
});
