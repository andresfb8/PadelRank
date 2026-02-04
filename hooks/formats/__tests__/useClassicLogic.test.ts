import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClassicLogic } from '../useClassicLogic';
import { RankingConfig, MatchScore, Match } from '../../../types';

describe('useClassicLogic', () => {
    const mockConfig: RankingConfig = {
        classicConfig: {
            pointsPerWin2_0: 4,
            pointsPerWin2_1: 3,
            pointsDraw: 2,
            pointsPerLoss2_1: 1,
            pointsPerLoss2_0: 0,
            maxPlayersPerDivision: 4,
            promotionCount: 2,
            relegationCount: 2
        }
    };

    describe('calculateMatchPoints', () => {
        it('should calculate points for 2-0 win', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 },
                set2: { p1: 6, p2: 3 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 4, p2: 0 });
        });

        it('should calculate points for 2-1 win', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 },
                set2: { p1: 3, p2: 6 },
                set3: { p1: 6, p2: 2 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 3, p2: 1 });
        });

        it('should calculate points for draw (1-1)', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 },
                set2: { p1: 3, p2: 6 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 2, p2: 2 });
        });

        it('should calculate points for 0-2 loss', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 3, p2: 6 },
                set2: { p1: 4, p2: 6 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 0, p2: 4 });
        });

        it('should return 0 points for incomplete score', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 0, p2: 0 });
        });
    });

    describe('calculateSetsDiff', () => {
        it('should calculate sets and games difference correctly', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: '1',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player3', p2Id: 'player4' },
                    status: 'finalizado',
                    score: {
                        set1: { p1: 6, p2: 4 },
                        set2: { p1: 6, p2: 3 }
                    }
                } as Match,
                {
                    id: '2',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player5', p2Id: 'player6' },
                    status: 'finalizado',
                    score: {
                        set1: { p1: 6, p2: 4 },
                        set2: { p1: 3, p2: 6 },
                        set3: { p1: 6, p2: 2 }
                    }
                } as Match
            ];

            const stats = result.current.calculateSetsDiff(matches, 'player1');

            expect(stats.setsWon).toBe(4); // 2 sets in match 1, 2 sets in match 2
            expect(stats.setsLost).toBe(1); // 1 set lost in match 2
            expect(stats.setsDiff).toBe(3); // 4 - 1
            expect(stats.gamesWon).toBe(27); // 6+6+6+3+6
            expect(stats.gamesLost).toBe(19); // 4+3+4+6+2
            expect(stats.gamesDiff).toBe(8); // 27 - 19
        });

        it('should ignore unfinished matches', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: '1',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player3', p2Id: 'player4' },
                    status: 'pendiente',
                    score: {
                        set1: { p1: 6, p2: 4 },
                        set2: { p1: 6, p2: 3 }
                    }
                } as Match
            ];

            const stats = result.current.calculateSetsDiff(matches, 'player1');

            expect(stats.setsWon).toBe(0);
            expect(stats.setsLost).toBe(0);
        });
    });

    describe('isValidScore', () => {
        it('should validate complete score', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 },
                set2: { p1: 6, p2: 3 }
            };

            expect(result.current.isValidScore(score)).toBe(true);
        });

        it('should invalidate incomplete score (missing set2)', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 6, p2: 4 }
            };

            expect(result.current.isValidScore(score)).toBe(false);
        });

        it('should invalidate score with no winner', () => {
            const { result } = renderHook(() => useClassicLogic(mockConfig));

            const score: MatchScore = {
                set1: { p1: 0, p2: 0 },
                set2: { p1: 0, p2: 0 }
            };

            expect(result.current.isValidScore(score)).toBe(false);
        });
    });

    describe('config fallback', () => {
        it('should use default config when none provided', () => {
            const { result } = renderHook(() => useClassicLogic(undefined));

            expect(result.current.config.pointsPerWin2_0).toBe(4);
            expect(result.current.config.pointsPerWin2_1).toBe(3);
        });
    });
});
