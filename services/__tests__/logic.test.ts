import { describe, it, expect } from 'vitest';
import { calculateMatchPoints } from '../logic';

describe('calculateMatchPoints', () => {
    const defaultConfig = {
        pointsPerWin2_0: 4,
        pointsPerWin2_1: 3,
        pointsDraw: 2,
        pointsPerLoss2_1: 1,
        pointsPerLoss2_0: 0
    };

    it('should result in a draw if the third set is tied (Classic Format)', () => {
        const s1 = { p1: 6, p2: 4 }; // P1 wins
        const s2 = { p1: 4, p2: 6 }; // P2 wins
        const s3 = { p1: 4, p2: 4 }; // TIE

        const result = calculateMatchPoints(s1, s2, s3, false, defaultConfig, false, false);

        // Expected: p1Sets=1, p2Sets=1, p3Sets=0 (tie) -> Overall Match Draw
        // Current Bug: p1Sets=1, p2Sets=2 -> P2 wins 2-1
        expect(result.description).toBe('Empate 1-1');
        expect(result.points.p1).toBe(defaultConfig.pointsDraw);
        expect(result.points.p2).toBe(defaultConfig.pointsDraw);
    });

    it('should result in a win for P1 if P1 wins set 1 and set 2 is tied (Individual Format)', () => {
        const s1 = { p1: 6, p2: 4 }; // P1 wins
        const s2 = { p1: 4, p2: 4 }; // TIE

        const result = calculateMatchPoints(s1, s2, undefined, false, defaultConfig, false, true);

        // P1 wins S1. S2 is tie. P1 has 1 set, P2 has 0. Result: P1 Wins.
        expect(result.description).toContain('Victoria');
        expect(result.points.p1).toBeGreaterThan(result.points.p2);
    });

    it('should result in a draw if both sets are tied (Individual Format)', () => {
        const s1 = { p1: 4, p2: 4 }; // TIE
        const s2 = { p1: 4, p2: 4 }; // TIE

        const result = calculateMatchPoints(s1, s2, undefined, false, defaultConfig, false, true);

        // Current Bug: returns "Derrota 0-2" because !p1WonS1 && !p1WonS2 is true.
        expect(result.description).toContain('Empate');
        expect(result.points.p1).toBe(defaultConfig.pointsDraw);
        expect(result.points.p2).toBe(defaultConfig.pointsDraw);
    });
});
