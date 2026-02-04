import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePointBasedLogic } from '../usePointBasedLogic';
import { RankingConfig, MatchScore, Match } from '../../../types';

describe('usePointBasedLogic', () => {
    const mockAmericanoConfig: RankingConfig = {
        americanoConfig: {
            scoringMode: '32',
            totalPoints: undefined
        }
    };

    const mockCustomConfig: RankingConfig = {
        americanoConfig: {
            scoringMode: 'custom',
            totalPoints: 40
        }
    };

    describe('getTotalPoints', () => {
        it('should return 32 for mode "32"', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            expect(result.current.getTotalPoints()).toBe(32);
        });

        it('should return 24 for mode "24"', () => {
            const config: RankingConfig = {
                americanoConfig: { scoringMode: '24' }
            };
            const { result } = renderHook(() => usePointBasedLogic(config, 'americano'));

            expect(result.current.getTotalPoints()).toBe(24);
        });

        it('should return custom points when mode is "custom"', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockCustomConfig, 'americano'));

            expect(result.current.getTotalPoints()).toBe(40);
        });

        it('should return 0 for "per-game" mode', () => {
            const config: RankingConfig = {
                americanoConfig: { scoringMode: 'per-game' }
            };
            const { result } = renderHook(() => usePointBasedLogic(config, 'americano'));

            expect(result.current.getTotalPoints()).toBe(0);
        });
    });

    describe('calculateMatchPoints', () => {
        it('should give 1 point to winner, 0 to loser', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 20, p2: 12 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 1, p2: 0 });
        });

        it('should handle reverse winner', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 10, p2: 22 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 0, p2: 1 });
        });

        it('should return 0-0 for tie (edge case)', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 16, p2: 16 }
            };

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 0, p2: 0 });
        });

        it('should return 0-0 for missing score', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {};

            const points = result.current.calculateMatchPoints(score);

            expect(points).toEqual({ p1: 0, p2: 0 });
        });
    });

    describe('calculatePointsDiff', () => {
        it('should calculate points scored and against correctly', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const matches: Match[] = [
                {
                    id: '1',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player3', p2Id: 'player4' },
                    status: 'finalizado',
                    score: {
                        pointsScored: { p1: 20, p2: 12 }
                    }
                } as Match,
                {
                    id: '2',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player5', p2Id: 'player6' },
                    status: 'finalizado',
                    score: {
                        pointsScored: { p1: 18, p2: 14 }
                    }
                } as Match
            ];

            const stats = result.current.calculatePointsDiff(matches, 'player1');

            expect(stats.pointsScored).toBe(38); // 20 + 18
            expect(stats.pointsAgainst).toBe(26); // 12 + 14
        });

        it('should handle player in pair2 position', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const matches: Match[] = [
                {
                    id: '1',
                    pair1: { p1Id: 'player3', p2Id: 'player4' },
                    pair2: { p1Id: 'player1', p2Id: 'player2' },
                    status: 'finalizado',
                    score: {
                        pointsScored: { p1: 12, p2: 20 }
                    }
                } as Match
            ];

            const stats = result.current.calculatePointsDiff(matches, 'player1');

            expect(stats.pointsScored).toBe(20);
            expect(stats.pointsAgainst).toBe(12);
        });

        it('should ignore unfinished matches', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const matches: Match[] = [
                {
                    id: '1',
                    pair1: { p1Id: 'player1', p2Id: 'player2' },
                    pair2: { p1Id: 'player3', p2Id: 'player4' },
                    status: 'pendiente',
                    score: {
                        pointsScored: { p1: 20, p2: 12 }
                    }
                } as Match
            ];

            const stats = result.current.calculatePointsDiff(matches, 'player1');

            expect(stats.pointsScored).toBe(0);
            expect(stats.pointsAgainst).toBe(0);
        });
    });

    describe('isValidScore', () => {
        it('should validate score with correct total (32)', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 20, p2: 12 }
            };

            expect(result.current.isValidScore(score)).toBe(true);
        });

        it('should invalidate score with incorrect total', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 20, p2: 15 } // Total = 35, not 32
            };

            expect(result.current.isValidScore(score)).toBe(false);
        });

        it('should validate custom total points', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockCustomConfig, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 25, p2: 15 } // Total = 40
            };

            expect(result.current.isValidScore(score)).toBe(true);
        });

        it('should validate per-game mode (no fixed total)', () => {
            const config: RankingConfig = {
                americanoConfig: { scoringMode: 'per-game' }
            };
            const { result } = renderHook(() => usePointBasedLogic(config, 'americano'));

            const score: MatchScore = {
                pointsScored: { p1: 15, p2: 10 } // Any total is valid
            };

            expect(result.current.isValidScore(score)).toBe(true);
        });

        it('should invalidate missing score', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            const score: MatchScore = {};

            expect(result.current.isValidScore(score)).toBe(false);
        });
    });

    describe('autoCalculatePoints', () => {
        it('should auto-calculate p2 points for mode 32', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            expect(result.current.autoCalculatePoints(20)).toBe(12);
            expect(result.current.autoCalculatePoints(16)).toBe(16);
            expect(result.current.autoCalculatePoints(32)).toBe(0);
        });

        it('should auto-calculate for custom total', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockCustomConfig, 'americano'));

            expect(result.current.autoCalculatePoints(25)).toBe(15);
            expect(result.current.autoCalculatePoints(30)).toBe(10);
        });

        it('should return 0 for per-game mode', () => {
            const config: RankingConfig = {
                americanoConfig: { scoringMode: 'per-game' }
            };
            const { result } = renderHook(() => usePointBasedLogic(config, 'americano'));

            expect(result.current.autoCalculatePoints(15)).toBe(0);
        });

        it('should not return negative values', () => {
            const { result } = renderHook(() => usePointBasedLogic(mockAmericanoConfig, 'americano'));

            expect(result.current.autoCalculatePoints(40)).toBe(0); // Max(0, 32-40)
        });
    });

    describe('Mexicano format', () => {
        it('should work identically for Mexicano', () => {
            const config: RankingConfig = {
                mexicanoConfig: { scoringMode: '32' }
            };
            const { result } = renderHook(() => usePointBasedLogic(config, 'mexicano'));

            expect(result.current.getTotalPoints()).toBe(32);

            const score: MatchScore = {
                pointsScored: { p1: 20, p2: 12 }
            };
            expect(result.current.isValidScore(score)).toBe(true);
        });
    });
});
