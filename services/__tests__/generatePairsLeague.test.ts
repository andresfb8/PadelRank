import { describe, it, expect } from 'vitest';
import { MatchGenerator } from '../matchGenerator';

const pairKey = (p1: string, p2: string) => [p1, p2].sort().join('|');
const matchupKey = (m: any) => [pairKey(m.pair1.p1Id, m.pair1.p2Id), pairKey(m.pair2.p1Id, m.pair2.p2Id)].sort().join('__VS__');

describe('generatePairsLeague — single leg', () => {
    it('generates N*(N-1)/2 matches for N pairs (round-robin)', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0);
        expect(matches.length).toBe(6); // 4*3/2
    });

    it('each pair plays each other exactly once', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0);
        const seen = new Set<string>();
        for (const m of matches) seen.add(matchupKey(m));
        expect(seen.size).toBe(6);
    });
});

describe('generatePairsLeague — double leg (ida y vuelta)', () => {
    it('generates 2x matches when doubleRoundRobin=true', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const single = MatchGenerator.generatePairsLeague(pairs, 0, false);
        const double = MatchGenerator.generatePairsLeague(pairs, 0, true);
        expect(double.length).toBe(single.length * 2);
    });

    it('each matchup occurs exactly twice in double mode', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0, true);
        const counts: Record<string, number> = {};
        for (const m of matches) {
            const k = matchupKey(m);
            counts[k] = (counts[k] || 0) + 1;
        }
        const counted = Object.values(counts);
        expect(counted.length).toBe(6); // 6 distinct matchups
        expect(counted.every(c => c === 2)).toBe(true);
    });

    it('vuelta jornadas come strictly after ida jornadas', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0, true);
        const numRoundsSingle = pairs.length - 1; // 3
        const ida = matches.filter(m => m.jornada <= numRoundsSingle);
        const vuelta = matches.filter(m => m.jornada > numRoundsSingle);
        expect(ida.length).toBe(vuelta.length);
        expect(Math.max(...vuelta.map(m => m.jornada))).toBe(numRoundsSingle * 2);
    });

    it('in vuelta, pair1/pair2 are swapped vs the corresponding ida match', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2'], ['d1', 'd2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0, true);
        const numRoundsSingle = pairs.length - 1;
        const ida = matches.filter(m => m.jornada <= numRoundsSingle);
        for (const idaMatch of ida) {
            const mirror = matches.find(m =>
                m.jornada === idaMatch.jornada + numRoundsSingle &&
                m.pair1.p1Id === idaMatch.pair2.p1Id &&
                m.pair1.p2Id === idaMatch.pair2.p2Id &&
                m.pair2.p1Id === idaMatch.pair1.p1Id &&
                m.pair2.p2Id === idaMatch.pair1.p2Id
            );
            expect(mirror).toBeDefined();
        }
    });

    it('works with odd number of pairs (bye is duplicated correctly)', () => {
        const pairs = [['a1', 'a2'], ['b1', 'b2'], ['c1', 'c2']];
        const matches = MatchGenerator.generatePairsLeague(pairs, 0, true);
        const real = matches.filter(m => m.status !== 'descanso');
        // 3 pairs → 3 real matchups in single leg → 6 in double
        expect(real.length).toBe(6);
        // Each real matchup occurs twice
        const counts: Record<string, number> = {};
        for (const m of real) {
            const k = matchupKey(m);
            counts[k] = (counts[k] || 0) + 1;
        }
        expect(Object.values(counts).every(c => c === 2)).toBe(true);
    });
});
