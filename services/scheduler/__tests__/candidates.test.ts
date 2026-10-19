import { describe, it, expect } from 'vitest';
import { buildMatchIndex, getCandidatePairs, getDependencies } from '../candidates';
import { makeCategory, pairIds } from './fixtures';

describe('candidates', () => {
    it('the final can be reached by every pair of the category', () => {
        const divs = makeCategory('A', 8);
        const index = buildMatchIndex(divs);
        const final = divs[0].matches.find(m => m.roundName === 'Final')!;
        expect(getCandidatePairs(final, index).size).toBe(8);
        const semi = divs[0].matches.find(m => m.roundName === 'Semifinales')!;
        expect(getCandidatePairs(semi, index).size).toBe(4);
    });

    it('known pairs only when both are set', () => {
        const divs = makeCategory('A', 4);
        const index = buildMatchIndex(divs);
        const r1 = divs[0].matches.find(m => m.jornada === 1)!;
        expect(Array.from(getCandidatePairs(r1, index))).toHaveLength(2);
    });

    it('consolation includes bye-seeds and depends on their round-2 match', () => {
        // 6 pairs in an 8 bracket → seeds 1 and 2 have a BYE in round 1
        const [main, cons] = makeCategory('A', 6, true);
        const index = buildMatchIndex([main, cons]);
        const consR1 = cons.matches.filter(m => m.jornada === 1);
        const allCandidates = new Set(consR1.flatMap(m => Array.from(getCandidatePairs(m, index))));
        const seed1 = pairIds('A', 6)[0];
        expect(allCandidates.has(seed1)).toBe(true);

        const seedConsMatch = consR1.find(m => getCandidatePairs(m, index).has(seed1))!;
        const deps = getDependencies(seedConsMatch, index);
        expect(deps.some(d => d.jornada === 2)).toBe(true); // the bye-seed's first real match
    });
});
