import { describe, it, expect } from 'vitest';
import type { Division, Match } from '../../../types';
import type { PairAvailability, SchedulerConfig } from '../types';
import { assignMatches, computeConflicts } from '../matchAssigner';
import { planRounds } from '../roundPlanner';
import { buildMatchIndex, getDependencies } from '../candidates';
import { allMatches, at, endOf, makeCategory, makeConfig, pairIds } from './fixtures';

const run = (divisions: Division[], config: SchedulerConfig, constraints: Record<string, PairAvailability> = {}) => {
    const toSchedule = new Set(allMatches(divisions)
        .filter(m => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
        .map(m => m.id));
    const { plans } = planRounds(divisions, config);
    assignMatches({ divisions, config, constraints, plans, toSchedule });
    return divisions;
};

const oneDay = (start = '09:00', end = '22:00') => [{ date: '2026-06-06', startTime: start, endTime: end }];

describe('matchAssigner', () => {
    it('never puts two matches on the same court at the same time', () => {
        const divs = run([...makeCategory('A', 8), ...makeCategory('B', 8)], makeConfig({ courts: 3, dailySchedule: oneDay() }));
        const placed = allMatches(divs).filter(m => m.startTime);
        placed.forEach(a => placed.forEach(b => {
            if (a.id === b.id || a.court !== b.court) return;
            const overlap = new Date(a.startTime!) < endOf(b.startTime!) && new Date(b.startTime!) < endOf(a.startTime!);
            expect(overlap).toBe(false);
        }));
    });

    it('always respects the rest between a match and its feeders', () => {
        const divs = run(makeCategory('A', 16, true), makeConfig({ courts: 4, dailySchedule: oneDay() }));
        const index = buildMatchIndex(divs);
        allMatches(divs).filter(m => m.startTime).forEach(m => {
            getDependencies(m, index).filter(d => d.startTime).forEach(d => {
                expect(new Date(m.startTime!).getTime()).toBeGreaterThanOrEqual(endOf(d.startTime!).getTime() + 60 * 60000);
            });
        });
    });

    it('never schedules outside operating hours (no room → "Sin capacidad")', () => {
        const [main] = makeCategory('A', 4);
        run([main], makeConfig({ courts: 1, dailySchedule: oneDay('09:00', '12:00') }));
        main.matches.forEach(m => {
            if (!m.startTime) {
                expect(m.scheduleConflict?.[0].reason).toBe('Sin capacidad');
                return;
            }
            expect(new Date(m.startTime).getTime()).toBeGreaterThanOrEqual(at('2026-06-06', '09:00').getTime());
            expect(endOf(m.startTime).getTime()).toBeLessThanOrEqual(at('2026-06-06', '12:00').getTime());
        });
        expect(main.matches.some(m => !m.startTime)).toBe(true);
    });

    it('gives the restricted pair a compatible slot first', () => {
        const [main] = makeCategory('A', 4);
        const restricted = pairIds('A', 4)[1]; // seed 2 plays the SECOND R1 match
        // Only one court; pair A2 can only play 09:00–10:30
        const constraints = { [restricted]: { unavailableRanges: [{ date: '2026-06-06', startTime: '10:30', endTime: '22:00' }] } };
        run([main], makeConfig({ courts: 1, dailySchedule: oneDay() }), constraints);
        const a2Match = main.matches.find(m => m.jornada === 1 && (m.pair1.p1Id === 'A2a' || m.pair2.p1Id === 'A2a'))!;
        expect(new Date(a2Match.startTime!).getTime()).toBe(at('2026-06-06', '09:00').getTime());
        expect(a2Match.scheduleConflict).toBeUndefined();
    });

    it('places an impossible match anyway and flags the conflict', () => {
        const [main] = makeCategory('A', 2);
        const constraints = { [pairIds('A', 2)[0]]: { unavailableRanges: [{ date: '2026-06-06', startTime: '00:00', endTime: '23:59' }] } };
        run([main], makeConfig({ dailySchedule: oneDay() }), constraints);
        const final = main.matches[0];
        expect(final.startTime).toBeTruthy();
        expect(final.scheduleConflict?.[0].pairKey).toBe(pairIds('A', 2)[0]);
        expect(final.scheduleConflict?.[0].reason).toContain('No disponible');
    });

    it('preference availability: the final takes the slot fewer candidates are blocked in', () => {
        const [main] = makeCategory('A', 4);
        const ids = pairIds('A', 4);
        // Sunday 11:00–14:00 final window; 3 of 4 pairs cannot play before 12:30
        const block = { unavailableRanges: [{ date: '2026-06-07', startTime: '09:00', endTime: '12:30' }] };
        const constraints = { [ids[0]]: block, [ids[1]]: block, [ids[2]]: block };
        const config = makeConfig({
            dailySchedule: [
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
            ],
            roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
        });
        run([main], config, constraints);
        const final = main.matches.find(m => m.roundName === 'Final')!;
        expect(new Date(final.startTime!).getTime()).toBe(at('2026-06-07', '12:30').getTime());
        expect(final.scheduleConflict).toBeUndefined(); // pairs unknown → no conflict yet
    });

    it('keeps a windowed round inside its window', () => {
        const cats = [...makeCategory('A', 4), ...makeCategory('B', 4)];
        const config = makeConfig({
            dailySchedule: [
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-07', startTime: '09:00', endTime: '22:00' },
            ],
            roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '17:00', endTime: '20:00' }],
        });
        run(cats, config);
        allMatches(cats).filter(m => m.roundName === 'Final').forEach(f => {
            expect(new Date(f.startTime!).getTime()).toBeGreaterThanOrEqual(at('2026-06-07', '17:00').getTime());
            expect(endOf(f.startTime!).getTime()).toBeLessThanOrEqual(at('2026-06-07', '20:00').getTime());
        });
    });

    it('a round spanning two windows overflows into the second', () => {
        const [main] = makeCategory('A', 8);
        const config = makeConfig({
            courts: 1, restMinutes: 0,
            dailySchedule: [
                { date: '2026-06-05', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
            ],
            roundWindows: [
                { roundName: 'Cuartos', date: '2026-06-05', startTime: '18:00', endTime: '21:00' },
                { roundName: 'Cuartos', date: '2026-06-06', startTime: '09:00', endTime: '12:00' },
            ],
        });
        run([main], config);
        const cuartos = main.matches.filter(m => m.roundName === 'Cuartos');
        const fri = cuartos.filter(m => new Date(m.startTime!).getDate() === 5);
        const sat = cuartos.filter(m => new Date(m.startTime!).getDate() === 6);
        expect(fri).toHaveLength(2);
        expect(sat).toHaveLength(2);
    });

    it('a fallback never takes the court an urgent compatible match needs at the same instant', () => {
        const b = makeCategory('B', 4);
        const a = makeCategory('A', 2);
        const constraints = {
            [pairIds('B', 4)[0]]: { unavailableRanges: [{ date: '2026-06-06', startTime: '10:30', endTime: '22:00' }] },
            [pairIds('A', 2)[0]]: { unavailableRanges: [
                { date: '2026-06-06', startTime: '09:00', endTime: '09:15' },
                { date: '2026-06-06', startTime: '10:30', endTime: '22:00' },
            ] },
        };
        run([...b, ...a], makeConfig({ courts: 1, dailySchedule: oneDay() }), constraints);
        const semiB1 = b[0].matches.find(m => m.jornada === 1 && (m.pair1.p1Id === 'B1a' || m.pair2.p1Id === 'B1a'))!;
        expect(new Date(semiB1.startTime!).getTime()).toBe(at('2026-06-06', '09:00').getTime());
        expect(semiB1.scheduleConflict).toBeUndefined();
    });

    it('a fallback avoids the only compatible slot of another pending match', () => {
        const [a] = makeCategory('A', 2);
        const [b] = makeCategory('B', 2);
        const day = '2026-06-06';
        const onlyBetween = (from: string, to: string) => ({ unavailableRanges: [
            { date: day, startTime: '00:00', endTime: from },
            { date: day, startTime: to, endTime: '23:59' },
        ] });
        run([a, b], makeConfig({ courts: 1, dailySchedule: oneDay() }), {
            [pairIds('A', 2)[0]]: onlyBetween('18:00', '19:00'),
            [pairIds('B', 2)[0]]: onlyBetween('17:30', '19:00'),
        });
        expect(new Date(b.matches[0].startTime!).getTime()).toBe(at(day, '17:30').getTime());
        expect(b.matches[0].scheduleConflict).toBeUndefined();
        expect(a.matches[0].scheduleConflict).toBeDefined();
    });

    it('only candidate (not yet known) pairs get the "Posible pareja" prefix', () => {
        const match = {
            id: 'm', jornada: 1, roundName: 'Octavos',
            pair1: { p1Id: 'k1', p2Id: 'k2' }, pair2: { p1Id: '', p2Id: '' },
            points: { p1: 0, p2: 0 }, status: 'pendiente',
        } as Match;
        const block = { unavailableRanges: [{ date: '2026-06-06', startTime: '09:00', endTime: '12:00' }] };
        const conflicts = computeConflicts(match, at('2026-06-06', '10:00'), makeConfig(),
            { 'k1::k2': block, 'c1::c2': block }, new Set(['k1::k2', 'c1::c2']), false)!;
        expect(conflicts.find(c => c.pairKey === 'k1::k2')!.reason.startsWith('Posible')).toBe(false);
        expect(conflicts.find(c => c.pairKey === 'c1::c2')!.reason.startsWith('Posible pareja: ')).toBe(true);
    });
});
