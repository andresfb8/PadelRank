import { describe, it, expect } from 'vitest';
import type { Division, Match, Ranking } from '../../../types';
import type { PairAvailability } from '../types';
import { SchedulerEngine } from '../index';
import { TournamentEngine } from '../../TournamentEngine';
import { allMatches, at, endOf, makeCategory, makeConfig, makeRanking, pairIds } from './fixtures';

const weekend = (overrides = {}) => makeConfig({
    courts: 6,
    dailySchedule: [
        { date: '2026-06-05', startTime: '17:00', endTime: '22:00' },
        { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
        { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
    ],
    roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
    ...overrides,
});

/** Plays every playable match (pair1 always wins) the way RankingView does, calling onResultEntered after each. */
const playAll = (ranking: Ranking): Ranking => {
    let current = ranking;
    for (let guard = 0; guard < 500; guard++) {
        const next = allMatches(current.divisions)
            .filter(m => m.status === 'pendiente' && m.pair1.p1Id && m.pair2.p1Id && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
            .sort((a, b) => a.jornada - b.jornada)[0];
        if (!next) break;
        next.status = 'finalizado';
        next.points = { p1: 1, p2: 0 };
        let divisions = TournamentEngine.advanceWinner(next, current, { p1: next.pair1.p1Id, p2: next.pair1.p2Id });
        const isMainFirstRound = current.divisions.find(d => d.matches.includes(next))?.type === 'main' && next.jornada === 1;
        if (isMainFirstRound) {
            divisions = TournamentEngine.moveLoserToConsolation(next, { ...current, divisions }, { p1: next.pair2.p1Id, p2: next.pair2.p2Id });
        }
        divisions = TournamentEngine.tryResolveConsolationDeferred({ divisions });
        current = { ...current, divisions: SchedulerEngine.onResultEntered({ ...current, divisions }).divisions };
    }
    return current;
};

const timesById = (divisions: Division[]) =>
    Object.fromEntries(allMatches(divisions).map(m => [m.id, `${m.startTime}|${m.court}`]));

describe('SchedulerEngine (integration)', () => {
    it('full mode: entering every result never moves a scheduled match', () => {
        const ranking = makeRanking([...makeCategory('A', 8, true), ...makeCategory('B', 6, true)], weekend());
        const scheduled = { ...ranking, divisions: SchedulerEngine.generateSchedule(ranking) };
        const before = timesById(scheduled.divisions);
        allMatches(scheduled.divisions).filter(m => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
            .forEach(m => {
                expect(m.startTime).toBeTruthy();
                expect(m.scheduleLocked).toBe(true);
                expect(m.scheduleEstimated).toBe(false);
            });

        const played = playAll(scheduled);
        expect(allMatches(played.divisions).filter(m => m.status === 'finalizado' && m.score?.description !== 'BYE').length).toBeGreaterThan(15);
        const after = timesById(played.divisions);
        Object.entries(before).forEach(([id, slot]) => {
            if (slot.startsWith('undefined')) return; // BYE matches never get a slot
            expect(after[id]).toBe(slot);
        });
    });

    it('re-generating keeps locked matches untouched', () => {
        const ranking = makeRanking(makeCategory('A', 8), weekend());
        const first = SchedulerEngine.generateSchedule(ranking);
        const second = SchedulerEngine.generateSchedule({ ...ranking, divisions: first });
        expect(timesById(second)).toEqual(timesById(first));
    });

    it('includeLocked recomputes locked matches', () => {
        const ranking = makeRanking(makeCategory('A', 4), weekend());
        const first = SchedulerEngine.generateSchedule(ranking);
        const moved = first.map(d => ({ ...d, matches: d.matches.map(m => m.jornada === 1 ? { ...m, startTime: at('2026-06-06', '20:00').toISOString() } : m) }));
        const regenerated = SchedulerEngine.generateSchedule({ ...ranking, divisions: moved }, { includeLocked: true });
        expect(timesById(regenerated)).toEqual(timesById(first));
    });

    it('a locked match on a day removed from the configuration is rescheduled', () => {
        const [main] = makeCategory('A', 2);
        main.matches[0].startTime = at('2026-06-04', '18:00').toISOString();
        main.matches[0].court = 1;
        main.matches[0].scheduleLocked = true;
        const [div] = SchedulerEngine.generateSchedule(makeRanking([main], weekend()));
        expect(new Date(div.matches[0].startTime!).getDate()).not.toBe(4);
        expect(div.matches[0].scheduleLocked).toBe(true);
    });

    it('daily mode: only the current day is locked, lockNextDay locks the next one', () => {
        const ranking = makeRanking(makeCategory('A', 16), weekend({ mode: 'daily' }));
        const divisions = SchedulerEngine.generateSchedule(ranking, { now: at('2026-06-01', '10:00') });
        const scheduled = allMatches(divisions).filter(m => m.startTime);
        const friday = scheduled.filter(m => new Date(m.startTime!).getDate() === 5);
        const later = scheduled.filter(m => new Date(m.startTime!).getDate() > 5);
        expect(friday.length).toBeGreaterThan(0);
        expect(later.length).toBeGreaterThan(0);
        friday.forEach(m => expect(m.scheduleLocked).toBe(true));
        later.forEach(m => expect(m.scheduleEstimated).toBe(true));

        const fridayBefore: Record<string, string> = Object.fromEntries(friday.map(m => [m.id, `${m.startTime}|${m.court}`]));
        const next = SchedulerEngine.lockNextDay({ ...ranking, divisions });
        const saturday = allMatches(next).filter(m => m.startTime && new Date(m.startTime).getDate() === 6);
        saturday.forEach(m => expect(m.scheduleLocked).toBe(true));
        allMatches(next).filter(m => m.startTime && new Date(m.startTime).getDate() === 7)
            .forEach(m => expect(m.scheduleEstimated).toBe(true));
        allMatches(next).filter(m => fridayBefore[m.id]).forEach(m => expect(`${m.startTime}|${m.court}`).toBe(fridayBefore[m.id]));
    });

    it('balances categories: every final lands in its window', () => {
        const divisions = [...makeCategory('A', 8), ...makeCategory('B', 16), ...makeCategory('C', 32)];
        const ranking = makeRanking(divisions, weekend());
        expect(SchedulerEngine.checkFeasibility(ranking)).toEqual([]);
        const result = SchedulerEngine.generateSchedule(ranking);
        const finals = allMatches(result).filter(m => m.roundName === 'Final');
        expect(finals).toHaveLength(3);
        finals.forEach(f => {
            expect(new Date(f.startTime!).getTime()).toBeGreaterThanOrEqual(at('2026-06-07', '11:00').getTime());
            expect(endOf(f.startTime!).getTime()).toBeLessThanOrEqual(at('2026-06-07', '14:00').getTime());
            expect(f.scheduleConflict).toBeUndefined();
        });
    });

    it('respects legacy constraints stored with the pair in reverse order', () => {
        const [main] = makeCategory('A', 2);
        const reversedKey = 'A1b::A1a';
        const ranking = makeRanking([main], weekend(), {
            [reversedKey]: { unavailableRanges: [{ date: '2026-06-05', startTime: '00:00', endTime: '23:59' }, { date: '2026-06-06', startTime: '00:00', endTime: '20:00' }] },
        });
        const [div] = SchedulerEngine.generateSchedule(ranking);
        const start = new Date(div.matches[0].startTime!);
        expect(start.getTime()).toBeGreaterThanOrEqual(at('2026-06-06', '20:00').getTime());
    });

    it('treats legacy confirmed slots as locked', () => {
        const [main] = makeCategory('A', 2);
        main.matches[0].startTime = at('2026-06-06', '18:00').toISOString();
        main.matches[0].court = 3;
        const [div] = SchedulerEngine.generateSchedule(makeRanking([main], weekend()));
        expect(div.matches[0].startTime).toBe(at('2026-06-06', '18:00').toISOString());
        expect(div.matches[0].scheduleLocked).toBe(true);
    });

    it('onResultEntered flags (but does not move) a match whose real pair is unavailable', () => {
        const [main] = makeCategory('A', 4);
        const ranking = makeRanking([main], weekend());
        const divisions = SchedulerEngine.generateSchedule(ranking);
        const final = divisions[0].matches.find(m => m.roundName === 'Final')!;
        const finalStart = new Date(final.startTime!);
        const semi = divisions[0].matches.find(m => m.nextMatchId === final.id && m.nextMatchSlot === 1)!;
        const winnerKey = `${semi.pair1.p1Id}::${semi.pair1.p2Id}`;
        const constraints: Record<string, PairAvailability> = {
            [winnerKey]: { unavailableRanges: [{ date: '2026-06-07', startTime: '00:00', endTime: '23:59' }] },
        };
        final.pair1 = { ...semi.pair1 };
        final.pair2 = { p1Id: 'X1', p2Id: 'X2' };
        const { divisions: checked, newConflicts } = SchedulerEngine.onResultEntered({ ...ranking, divisions, pairConstraints: constraints });
        const checkedFinal = checked[0].matches.find(m => m.id === final.id)!;
        expect(new Date(checkedFinal.startTime!).getTime()).toBe(finalStart.getTime());
        expect(checkedFinal.scheduleConflict?.[0].pairKey).toBe(winnerKey);
        expect(newConflicts).toHaveLength(1);
    });

    it('reference tournament: 6 categories, 4 courts, 30% restricted pairs → no conflicts, < 1s', () => {
        const divisions = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap(c => makeCategory(c, 8));
        const constraints: Record<string, PairAvailability> = {};
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => pairIds(c, 8).forEach((key, i) => {
            if (i % 10 !== 0 && i % 10 !== 3 && i % 10 !== 6) return; // ~30%
            constraints[key] = i % 2 === 0
                ? { unavailableRanges: [{ date: '2026-06-05', startTime: '00:00', endTime: '23:59' }] }       // no Friday
                : { unavailableRanges: [{ date: '2026-06-06', startTime: '00:00', endTime: '15:00' }] };      // Saturday afternoon only
        }));
        const ranking = makeRanking(divisions, weekend({ courts: 4 }), constraints);
        const t0 = performance.now();
        const result = SchedulerEngine.generateSchedule(ranking);
        const elapsed = performance.now() - t0;
        const conflicts = allMatches(result).filter((m: Match) => m.scheduleConflict);
        expect(conflicts.map(m => `${m.roundName}: ${m.scheduleConflict!.map(c => c.reason).join(', ')}`)).toEqual([]);
        expect(allMatches(result).filter(m => m.status === 'pendiente').every(m => m.startTime)).toBe(true);
        expect(elapsed).toBeLessThan(1000);
    });

    it('notBefore keeps regenerated matches out of the past', () => {
        const ranking = makeRanking(makeCategory('A', 8), weekend());
        const floor = at('2026-06-06', '12:00');
        const result = SchedulerEngine.generateSchedule(ranking, { notBefore: floor });
        const placed = allMatches(result).filter(m => m.startTime);
        expect(placed.length).toBeGreaterThan(0);
        placed.forEach(m => expect(new Date(m.startTime!).getTime()).toBeGreaterThanOrEqual(floor.getTime()));
    });

    it('lockNextDay honours notBefore', () => {
        const ranking = makeRanking(makeCategory('A', 16), weekend({ mode: 'daily' }));
        const divisions = SchedulerEngine.generateSchedule(ranking, { now: at('2026-06-01', '10:00') });
        const floor = at('2026-06-06', '15:00');
        const next = SchedulerEngine.lockNextDay({ ...ranking, divisions }, { notBefore: floor });
        allMatches(next).filter(m => m.startTime && m.scheduleLocked && new Date(m.startTime).getDate() >= 6)
            .forEach(m => expect(new Date(m.startTime!).getTime()).toBeGreaterThanOrEqual(floor.getTime()));
    });

    it('legacy/removed-day rules only touch pending matches, and stale estimates on unplayable matches are cleared', () => {
        const [main] = makeCategory('A', 4);
        const [semi1, semi2, final] = [main.matches[0], main.matches[1], main.matches.find(m => m.roundName === 'Final')!];
        semi1.status = 'finalizado';
        semi1.startTime = at('2026-06-05', '18:00').toISOString();
        semi1.court = 1;
        final.pair1 = { p1Id: 'BYE', p2Id: '' };
        final.startTime = at('2026-06-07', '12:00').toISOString();
        final.court = 2;
        final.scheduleEstimated = true;
        const [div] = SchedulerEngine.generateSchedule(makeRanking([main], weekend()));
        const s1 = div.matches.find(m => m.id === semi1.id)!;
        const f = div.matches.find(m => m.id === final.id)!;
        expect(s1.scheduleLocked).toBeUndefined();
        expect(f.startTime).toBeUndefined();
        expect(f.court).toBeUndefined();
        expect(f.scheduleEstimated).toBeFalsy();
        expect(div.matches.find(m => m.id === semi2.id)!.startTime).toBeTruthy();
    });

    it('an estimated match that was played keeps its slot after regenerating and after lockNextDay', () => {
        const ranking = makeRanking(makeCategory('A', 16), weekend({ mode: 'daily' }));
        const divisions = SchedulerEngine.generateSchedule(ranking, { now: at('2026-06-01', '10:00') });
        const played = allMatches(divisions).find(m => m.scheduleEstimated && m.pair1.p1Id && m.pair2.p1Id)
            ?? allMatches(divisions).find(m => m.scheduleEstimated)!;
        played.status = 'finalizado';
        const slot = `${played.startTime}|${played.court}`;
        const check = (divs: Division[]) => {
            const m = allMatches(divs).find(x => x.id === played.id)!;
            expect(`${m.startTime}|${m.court}`).toBe(slot);
            expect(m.scheduleEstimated).toBe(false);
        };
        check(SchedulerEngine.generateSchedule({ ...ranking, divisions }, { now: at('2026-06-01', '10:00') }));
        check(SchedulerEngine.lockNextDay({ ...ranking, divisions }));
    });
});
