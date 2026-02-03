import { describe, it, expect } from 'vitest';
import { generateInitialRound, calculateNextRound } from './PozoEngine';
import { RankingConfig, Match } from '../types';

describe('PozoEngine', () => {
    describe('generateInitialRound', () => {
        it('should generate correct number of matches for 2 courts', () => {
            const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']; // 8 players for 2 courts
            const config: RankingConfig = {
                pozoConfig: { variant: 'individual', numCourts: 2, scoringType: 'sets', goldenPoint: true }
            } as any;

            const matches = generateInitialRound(players, config);
            expect(matches).toHaveLength(2);
            expect(matches[0].court).toBe(1);
            expect(matches[1].court).toBe(2);
        });

        it('should handle odd number of players gracefully (some waiting)', () => {
            // Implementation handles exact multiples usually, but let's see if it crashes
            const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
            const config: RankingConfig = {
                pozoConfig: { variant: 'individual', numCourts: 1, scoringType: 'sets', goldenPoint: true }
            } as any;

            const matches = generateInitialRound(players, config);
            expect(matches).toHaveLength(1);
        });
    });

    describe('calculateNextRound - Individual', () => {
        const config: RankingConfig = {
            pozoConfig: { variant: 'individual', numCourts: 2, scoringType: 'sets', goldenPoint: true }
        } as any;

        // Setup a scenario: 2 courts.
        // Court 1: P1/P2 vs P3/P4. Winner: P1/P2.
        // Court 2: P5/P6 vs P7/P8. Winner: P5/P6.
        // Logic:
        // Court 1 Winners (P1, P2) -> Stay Court 1.
        // Court 1 Losers (P3, P4) -> Go Court 2.
        // Court 2 Winners (P5, P6) -> Go Court 1.
        // Court 2 Losers (P7, P8) -> Stay Court 2.

        // Next Round Court 1 Buckets: [P1, P2, P5, P6]
        // Next Round Court 2 Buckets: [P3, P4, P7, P8]

        // Shuffle Partner Logic (0-2, 1-3):
        // Court 1 Match: P1(0) plays with P5(2). P2(1) plays with P6(3).
        // Court 2 Match: P3(0) plays with P7(2). P4(1) plays with P8(3).

        it('should move players correctly and shuffle partners', () => {
            const currentMatches: Match[] = [
                {
                    id: 'm1',
                    court: 1,
                    pair1: { p1Id: 'p1', p2Id: 'p2' },
                    pair2: { p1Id: 'p3', p2Id: 'p4' },
                    points: { p1: 1, p2: 0 }, // Pair 1 wins
                    status: 'finalizado',
                    jornada: 1
                } as any,
                {
                    id: 'm2',
                    court: 2,
                    pair1: { p1Id: 'p5', p2Id: 'p6' },
                    pair2: { p1Id: 'p7', p2Id: 'p8' },
                    points: { p1: 1, p2: 0 }, // Pair 1 (p5/p6) wins
                    status: 'finalizado',
                    jornada: 1
                } as any
            ];

            const nextMatches = calculateNextRound(currentMatches, 1, config);

            expect(nextMatches).toHaveLength(2);

            // Court 1 Match
            const c1 = nextMatches.find(m => m.court === 1);
            expect(c1).toBeDefined();
            // Expect P1 with P5? Or P1 with P6? Depends on sort order in bucket.
            // Winners of C1 (P1, P2) are pushed first.
            // Winners of C2 (P5, P6) are pushed second.
            // Bucket: [p1, p2, p5, p6]
            // Shuffle: 0-2 (p1-p5) vs 1-3 (p2-p6)
            expect(c1?.pair1.p1Id).toBe('p1');
            expect(c1?.pair1.p2Id).toBe('p5');
            expect(c1?.pair2.p1Id).toBe('p2');
            expect(c1?.pair2.p2Id).toBe('p6');

            // Court 2 Match
            const c2 = nextMatches.find(m => m.court === 2);
            // Losers of C1 (p3, p4) pushed first to bucket[1]? 
            // C1 Losers -> down to C2.
            // C2 Losers -> stay C2.
            // Bucket: [p3, p4, p7, p8]
            // Shuffle: p3-p7 vs p4-p8
            expect(c2?.pair1.p1Id).toBe('p3');
            expect(c2?.pair1.p2Id).toBe('p7');
            expect(c2?.pair2.p1Id).toBe('p4');
            expect(c2?.pair2.p2Id).toBe('p8');
        });
    });

    describe('calculateNextRound - Pairs', () => {
        const config: RankingConfig = {
            pozoConfig: { variant: 'pairs', numCourts: 2, scoringType: 'sets', goldenPoint: true }
        } as any;

        it('should keep pairs together', () => {
            const currentMatches: Match[] = [
                {
                    id: 'm1',
                    court: 1,
                    pair1: { p1Id: 'p1', p2Id: 'p2' },
                    pair2: { p1Id: 'p3', p2Id: 'p4' },
                    points: { p1: 1, p2: 0 }, // P1/P2 win
                    status: 'finalizado',
                    jornada: 1
                } as any,
                {
                    id: 'm2',
                    court: 2,
                    pair1: { p1Id: 'p5', p2Id: 'p6' },
                    pair2: { p1Id: 'p7', p2Id: 'p8' },
                    points: { p1: 1, p2: 0 }, // P5/P6 win
                    status: 'finalizado',
                    jornada: 1
                } as any
            ];

            // Expected:
            // C1 Winners (P1/P2) -> Stay C1
            // C2 Winners (P5/P6) -> Move to C1
            // New C1: P1/P2 vs P5/P6

            // C1 Losers (P3/P4) -> Move to C2
            // C2 Losers (P7/P8) -> Stay C2
            // New C2: P3/P4 vs P7/P8

            const nextMatches = calculateNextRound(currentMatches, 1, config);

            const c1 = nextMatches.find(m => m.court === 1);
            expect(c1?.pair1.p1Id).toBe('p1');
            expect(c1?.pair1.p2Id).toBe('p2');
            expect(c1?.pair2.p1Id).toBe('p5');
            expect(c1?.pair2.p2Id).toBe('p6');

            const c2 = nextMatches.find(m => m.court === 2);
            expect(c2?.pair1.p1Id).toBe('p3');
            expect(c2?.pair1.p2Id).toBe('p4');
            expect(c2?.pair2.p1Id).toBe('p7');
            expect(c2?.pair2.p2Id).toBe('p8');
        });
    });
});
