import { TournamentEngine } from '../../TournamentEngine';
import type { Division, Ranking } from '../../../types';
import type { PairAvailability, SchedulerConfig } from '../types';

export const makeConfig = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
    courts: 2,
    slotDurationMinutes: 90,
    restMinutes: 60,
    timeWindows: [{ start: '09:00', end: '22:00' }],
    dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
    ...overrides,
});

export const makeRanking = (
    divisions: Division[],
    config: SchedulerConfig,
    pairConstraints: Record<string, PairAvailability> = {}
): Ranking => ({
    id: 'r1', nombre: 'Test', categoria: 'Masculino',
    fechaInicio: '', status: 'activo', format: 'elimination',
    divisions, schedulerConfig: config, pairConstraints,
});

/** Pair ids "<prefix>1a::<prefix>1b", ... for `n` pairs. */
export const pairIds = (prefix: string, n: number): string[] =>
    Array.from({ length: n }, (_, i) => `${prefix}${i + 1}a::${prefix}${i + 1}b`);

/** One category = main (+ consolation) bracket, tagged with `category`. */
export const makeCategory = (prefix: string, n: number, consolation = false): Division[] =>
    TournamentEngine.generateBracket(pairIds(prefix, n), consolation)
        .filter(d => consolation || d.type !== 'consolation')
        .map(d => ({ ...d, category: prefix }));

export const at = (date: string, time: string): Date => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi);
};

export const allMatches = (divisions: Division[]) => divisions.flatMap(d => d.matches);

export const endOf = (startIso: string, minutes = 90) => new Date(new Date(startIso).getTime() + minutes * 60000);
