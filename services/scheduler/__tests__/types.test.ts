import { describe, it, expect } from 'vitest';
import { makePairKey, normalizePairConstraints, normalizeRoundName, pairKeyOf, roundRank } from '../types';

describe('scheduler types', () => {
    it('pair keys are order-independent', () => {
        expect(makePairKey('zeta', 'alfa')).toBe('alfa::zeta');
        expect(makePairKey('alfa', 'zeta')).toBe('alfa::zeta');
        expect(makePairKey('solo')).toBe('solo');
        expect(pairKeyOf({ p1Id: 'zeta', p2Id: 'alfa' })).toBe('alfa::zeta');
        expect(pairKeyOf({ p1Id: 'BYE', p2Id: '' })).toBeNull();
        expect(pairKeyOf({ p1Id: '', p2Id: '' })).toBeNull();
    });

    it('legacy keys are normalized and merged', () => {
        const merged = normalizePairConstraints({
            'zeta::alfa': { unavailableRanges: [{ date: '2026-06-06', startTime: '09:00', endTime: '10:00' }] },
            'alfa::zeta': { unavailableRanges: [{ date: '2026-06-07', startTime: '09:00', endTime: '10:00' }] },
        });
        expect(Object.keys(merged)).toEqual(['alfa::zeta']);
        expect(merged['alfa::zeta'].unavailableRanges).toHaveLength(2);
        expect(normalizePairConstraints(undefined)).toEqual({});
    });

    it('round names and play order', () => {
        expect(normalizeRoundName('Final (Cons.)')).toBe('Final');
        expect(roundRank('Ronda de 32')).toBeLessThan(roundRank('Octavos'));
        expect(roundRank('Octavos')).toBeLessThan(roundRank('Cuartos'));
        expect(roundRank('Semifinales (Cons.)')).toBeLessThan(roundRank('Final'));
    });
});
