import { describe, it, expect } from 'vitest';
import { SchedulerEngine, SchedulerConfig } from '../SchedulerEngine';
import { TournamentEngine } from '../TournamentEngine';
import { Ranking, Division } from '../../types';

const makeConfig = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
    courts: 2,
    slotDurationMinutes: 90,
    restMinutes: 60,
    timeWindows: [{ start: '09:00', end: '22:00' }],
    dailySchedule: [{ date: '2026-06-01', startTime: '09:00', endTime: '22:00' }],
    ...overrides,
});

const makeRanking = (divisions: Division[], config: SchedulerConfig): Ranking => ({
    id: 'r1', nombre: 'Test', categoria: 'Masculino',
    fechaInicio: '', status: 'activo', format: 'elimination',
    divisions, schedulerConfig: config,
});

describe('SchedulerEngine.generateFullSchedule', () => {

    it('schedules all R1 matches with confirmed (non-estimated) slots', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        const [main] = TournamentEngine.generateBracket(playerIds, false);
        const ranking = makeRanking([main], makeConfig());

        const result = SchedulerEngine.generateFullSchedule(ranking);
        const r1 = result[0].matches.filter(m => m.jornada === 1);

        expect(r1).toHaveLength(2);
        r1.forEach(m => {
            expect(m.startTime).toBeTruthy();
            expect(m.court).toBeGreaterThanOrEqual(1);
            expect(m.scheduleEstimated).toBeFalsy();
        });
    });

    it('estimates the next round (final) once both R1 feeders are scheduled', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        const [main] = TournamentEngine.generateBracket(playerIds, false);
        const ranking = makeRanking([main], makeConfig());

        const result = SchedulerEngine.generateFullSchedule(ranking);
        const final = result[0].matches.find(m => m.jornada === 2)!;

        expect(final).toBeDefined();
        expect(final.startTime).toBeTruthy();
        expect(final.scheduleEstimated).toBe(true);

        // Final must start after both semis end + rest (semis 09:00-10:30, +60 → 11:30)
        const r1Ends = result[0].matches
            .filter(m => m.jornada === 1)
            .map(m => new Date(m.startTime!).getTime() + 90 * 60000);
        const latestEnd = Math.max(...r1Ends);
        expect(new Date(final.startTime!).getTime()).toBeGreaterThanOrEqual(latestEnd + 60 * 60000);
    });

    it('does not schedule matches outside operating hours', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        const [main] = TournamentEngine.generateBracket(playerIds, false);
        // Single court forces sequential scheduling; tight window
        const ranking = makeRanking([main], makeConfig({ courts: 1, dailySchedule: [{ date: '2026-06-01', startTime: '09:00', endTime: '12:00' }] }));

        const result = SchedulerEngine.generateFullSchedule(ranking);
        result[0].matches.forEach(m => {
            if (!m.startTime) return;
            const start = new Date(m.startTime);
            const end = new Date(start.getTime() + 90 * 60000);
            const dayStart = new Date('2026-06-01T09:00:00');
            const dayEnd = new Date('2026-06-01T12:00:00');
            expect(start.getTime()).toBeGreaterThanOrEqual(dayStart.getTime());
            expect(end.getTime()).toBeLessThanOrEqual(dayEnd.getTime());
        });
    });

    it('confines a round to its configured time window across categories', () => {
        // Two categories of 4 pairs → both have "Semifinales" (R1) and "Final" (R2)
        const [catA] = TournamentEngine.generateBracket(['p1', 'p2', 'p3', 'p4'], false);
        const [catB] = TournamentEngine.generateBracket(['q1', 'q2', 'q3', 'q4'], false);
        catB.id = catB.id + '-b';

        const config = makeConfig({
            courts: 2,
            dailySchedule: [
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-07', startTime: '09:00', endTime: '22:00' },
            ],
            roundWindows: [
                { roundName: 'Final', date: '2026-06-07', startTime: '17:00', endTime: '20:00' },
            ],
        });
        const ranking = makeRanking([catA, catB], config);

        const result = SchedulerEngine.generateFullSchedule(ranking);

        const finals = result.flatMap(d => d.matches).filter(m => m.roundName === 'Final');
        expect(finals.length).toBe(2);
        finals.forEach(f => {
            expect(f.startTime).toBeTruthy();
            const start = new Date(f.startTime!);
            expect(start.toISOString().split('T')[0]).toBe('2026-06-07');
            expect(start.getTime()).toBeGreaterThanOrEqual(new Date('2026-06-07T17:00:00').getTime());
            expect(start.getTime() + 90 * 60000).toBeLessThanOrEqual(new Date('2026-06-07T20:00:00').getTime());
        });
    });

    it('re-running clears stale estimates (idempotent)', () => {
        const playerIds = ['p1', 'p2', 'p3', 'p4'];
        const [main] = TournamentEngine.generateBracket(playerIds, false);
        const ranking = makeRanking([main], makeConfig());

        const first = SchedulerEngine.generateFullSchedule(ranking);
        const second = SchedulerEngine.generateFullSchedule({ ...ranking, divisions: first });

        const finalFirst = first[0].matches.find(m => m.jornada === 2)!;
        const finalSecond = second[0].matches.find(m => m.jornada === 2)!;
        // Estimate is recomputed, not duplicated/shifted
        expect(finalSecond.scheduleEstimated).toBe(true);
        expect(finalSecond.startTime).toBe(finalFirst.startTime);
    });

});
