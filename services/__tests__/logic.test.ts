import { describe, it, expect } from 'vitest';
import { calculateMatchPoints, substitutePair } from '../logic';
import { Ranking } from '../../types';

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

describe('substitutePair', () => {
    const makeRanking = (): Ranking => ({
        id: 'r1', nombre: 'T', categoria: 'Masculino', fechaInicio: '', status: 'activo', format: 'elimination',
        divisions: [{
            id: 'd1', numero: 1, status: 'activa', type: 'main',
            players: ['a1', 'a2', 'b1', 'b2'],
            matches: [
                { id: 'm1', jornada: 1, roundName: 'Final', status: 'pendiente',
                  pair1: { p1Id: 'a1', p2Id: 'a2' }, pair2: { p1Id: 'b1', p2Id: 'b2' } } as any,
            ],
        }],
    });

    it('replaces an outgoing pair across the bracket with an incoming pair', () => {
        const ranking = makeRanking();
        const divs = substitutePair(ranking, 'a1::a2', { p1Id: 'g1', p2Id: 'g2' });

        const m = divs[0].matches[0];
        expect(m.pair1.p1Id).toBe('g1');
        expect(m.pair1.p2Id).toBe('g2');
        expect(m.pair2.p1Id).toBe('b1'); // untouched
        expect(divs[0].players).toContain('g1');
        expect(divs[0].players).toContain('g2');
        expect(divs[0].players).not.toContain('a1');
    });

    it('matches the outgoing pair regardless of slot order', () => {
        const ranking = makeRanking();
        // outgoing given in reversed order should still match pair1 a1/a2
        const divs = substitutePair(ranking, 'a2::a1', { p1Id: 'g1', p2Id: 'g2' });
        expect(divs[0].matches[0].pair1.p1Id).toBe('g1');
    });
});
