import { describe, it, expect } from 'vitest';
import type { Match, Ranking, TournamentRegistration } from '../../../types';
import type { DaySchedule } from '../../scheduler/types';
import { SchedulerEngine, makePairKey } from '../../scheduler';
import { TournamentEngine } from '../../TournamentEngine';
import { applyRegistrationBlocks, guestIdsOf, importRegistrations, isImported } from '../syncRegistration';

const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const SUN: DaySchedule = { date: '2026-10-25', startTime: '09:00', endTime: '14:00' };

const reg = (id: string, overrides: Partial<TournamentRegistration> = {}): TournamentRegistration => ({
    id, rankingId: 'r',
    player1: { name: `${id}-A`, phone: '600000001' },
    player2: { name: `${id}-B`, phone: '600000002' },
    selectedCategory: 'Primera', status: 'approved', createdAt: '2026-10-19T10:00:00.000Z',
    ...overrides,
});

const keyOf = (id: string) => makePairKey(guestIdsOf(id).p1, guestIdsOf(id).p2);
const pairOf = (id: string) => ({ p1Id: guestIdsOf(id).p1, p2Id: guestIdsOf(id).p2 });

const baseRanking = (matches: Match[] = []): Ranking => ({
    id: 'r', nombre: 'T', categoria: 'Mixto', fechaInicio: '2026-10-24', status: 'activo', format: 'elimination',
    divisions: [{ id: 'd', numero: 1, status: 'activa', players: [], matches, category: 'Primera' }],
    schedulerConfig: { courts: 2, slotDurationMinutes: 90, restMinutes: 60, timeWindows: [], dailySchedule: [SAT, SUN] },
    pairConstraints: {},
});

describe('syncRegistration', () => {
    it('importRegistrations adds guests and copies the blocks cut to the tournament days', () => {
        const ranking = importRegistrations(baseRanking(), [
            reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '08:00', endTime: '10:30' }, { date: '2026-10-26', startTime: '10:00', endTime: '11:00' }] }),
            reg('r2'),
        ]);
        expect(ranking.guestPlayers!.map(p => p.id)).toEqual([
            guestIdsOf('r1').p1, guestIdsOf('r1').p2, guestIdsOf('r2').p1, guestIdsOf('r2').p2,
        ]);
        expect(ranking.guestPlayers![0]).toEqual({ id: guestIdsOf('r1').p1, nombre: 'r1-A', apellidos: '(Primera)' });
        expect(ranking.pairConstraints![keyOf('r1')]).toEqual({ unavailableRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:30' }] });
        expect(ranking.pairConstraints![keyOf('r2')]).toBeUndefined();
    });

    it('importRegistrations is idempotent', () => {
        const once = importRegistrations(baseRanking(), [reg('r1')]);
        const twice = importRegistrations(once, [reg('r1')]);
        expect(twice.guestPlayers).toHaveLength(2);
    });

    it('applyRegistrationBlocks leaves a registration that is not imported alone', () => {
        const ranking = baseRanking();
        const result = applyRegistrationBlocks(ranking, reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] }));
        expect(isImported(ranking, reg('r1'))).toBe(false);
        expect(result.ranking).toBe(ranking);
        expect(result.newConflicts).toEqual([]);
    });

    it('applyRegistrationBlocks flags a scheduled match inside the new block without moving it', () => {
        const start = new Date(2026, 9, 24, 9, 0).toISOString();
        const match = {
            id: 'm1', jornada: 2, roundName: 'Semifinales', pair1: pairOf('r1'), pair2: pairOf('r2'),
            points: { p1: 0, p2: 0 }, status: 'pendiente', startTime: start, court: 1, scheduleLocked: true,
        } as Match;
        const imported = importRegistrations(baseRanking([match]), [reg('r1'), reg('r2')]);
        const edited = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] });

        const { ranking, newConflicts } = applyRegistrationBlocks(imported, edited);

        expect(ranking.pairConstraints![keyOf('r1')]).toEqual({ unavailableRanges: edited.blockedRanges });
        expect(newConflicts).toHaveLength(1);
        expect(newConflicts[0].matchId).toBe('m1');
        const after = ranking.divisions[0].matches[0];
        expect(after.startTime).toBe(start);
        expect(after.scheduleConflict?.[0].pairKey).toBe(keyOf('r1'));
    });

    it('applyRegistrationBlocks removes the constraint (and the conflict) when the blocks are cleared', () => {
        const start = new Date(2026, 9, 24, 9, 0).toISOString();
        const match = {
            id: 'm1', jornada: 2, roundName: 'Semifinales', pair1: pairOf('r1'), pair2: pairOf('r2'),
            points: { p1: 0, p2: 0 }, status: 'pendiente', startTime: start, court: 1, scheduleLocked: true,
        } as Match;
        const blocked = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] });
        const withConflict = applyRegistrationBlocks(importRegistrations(baseRanking([match]), [blocked, reg('r2')]), blocked).ranking;

        const { ranking } = applyRegistrationBlocks(withConflict, reg('r1', { blockedRanges: [] }));

        expect(ranking.pairConstraints![keyOf('r1')]).toBeUndefined();
        expect(ranking.divisions[0].matches[0].scheduleConflict).toBeUndefined();
    });

    it('an imported registration with blocks is never scheduled inside them', () => {
        const ids = ['r1', 'r2', 'r3', 'r4'];
        const division = { ...TournamentEngine.generateBracket(ids.map(id => `${guestIdsOf(id).p1}::${guestIdsOf(id).p2}`), false)[0], category: 'Primera' };
        const blocked = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '18:00' }] });
        const ranking = importRegistrations({ ...baseRanking(), divisions: [division] }, [blocked, reg('r2'), reg('r3'), reg('r4')]);

        const divisions = SchedulerEngine.generateSchedule(ranking);

        const r1Match = divisions[0].matches.find(m => m.pair1.p1Id === guestIdsOf('r1').p1 || m.pair2.p1Id === guestIdsOf('r1').p1)!;
        const start = new Date(r1Match.startTime!);
        expect(start.getTime()).toBeGreaterThanOrEqual(new Date(2026, 9, 24, 18, 0).getTime());
        expect(r1Match.scheduleConflict).toBeUndefined();
    });
});
