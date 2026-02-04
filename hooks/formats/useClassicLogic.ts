import { useMemo } from 'react';
import { Match, MatchScore, RankingConfig } from '../../types';
import { getClassicConfig } from '../../utils/configHelpers';

/**
 * Hook for Classic format-specific logic
 * Handles set-based scoring and match points calculation
 */
export function useClassicLogic(config: RankingConfig | undefined) {
    const classicConfig = getClassicConfig(config);

    /**
     * Calculate match points based on sets won
     */
    const calculateMatchPoints = useMemo(() => {
        return (score: MatchScore): { p1: number; p2: number } => {
            if (!score.set1 || !score.set2) {
                return { p1: 0, p2: 0 };
            }

            // Count sets won
            let p1Sets = 0;
            let p2Sets = 0;

            if (score.set1.p1 > score.set1.p2) p1Sets++;
            else if (score.set1.p2 > score.set1.p1) p2Sets++;

            if (score.set2.p1 > score.set2.p2) p1Sets++;
            else if (score.set2.p2 > score.set2.p1) p2Sets++;

            if (score.set3) {
                if (score.set3.p1 > score.set3.p2) p1Sets++;
                else if (score.set3.p2 > score.set3.p1) p2Sets++;
            }

            // Calculate points based on sets
            if (p1Sets === 2 && p2Sets === 0) {
                return {
                    p1: classicConfig.pointsPerWin2_0,
                    p2: classicConfig.pointsPerLoss2_0
                };
            }

            if (p1Sets === 2 && p2Sets === 1) {
                return {
                    p1: classicConfig.pointsPerWin2_1,
                    p2: classicConfig.pointsPerLoss2_1
                };
            }

            if (p2Sets === 2 && p1Sets === 0) {
                return {
                    p1: classicConfig.pointsPerLoss2_0,
                    p2: classicConfig.pointsPerWin2_0
                };
            }

            if (p2Sets === 2 && p1Sets === 1) {
                return {
                    p1: classicConfig.pointsPerLoss2_1,
                    p2: classicConfig.pointsPerWin2_1
                };
            }

            // Draw (1-1)
            if (p1Sets === 1 && p2Sets === 1) {
                return {
                    p1: classicConfig.pointsDraw,
                    p2: classicConfig.pointsDraw
                };
            }

            return { p1: 0, p2: 0 };
        };
    }, [classicConfig]);

    /**
     * Calculate sets and games difference for standings
     */
    const calculateSetsDiff = useMemo(() => {
        return (matches: Match[], playerId: string): { setsDiff: number; gamesDiff: number; setsWon: number; setsLost: number; gamesWon: number; gamesLost: number } => {
            let setsWon = 0;
            let setsLost = 0;
            let gamesWon = 0;
            let gamesLost = 0;

            matches.forEach(match => {
                if (match.status !== 'finalizado' || !match.score) return;

                const isP1 = match.pair1.p1Id === playerId || match.pair1.p2Id === playerId;
                const score = match.score;

                // Count sets
                [score.set1, score.set2, score.set3].forEach(set => {
                    if (!set) return;

                    if (isP1) {
                        gamesWon += set.p1;
                        gamesLost += set.p2;
                        if (set.p1 > set.p2) setsWon++;
                        else if (set.p2 > set.p1) setsLost++;
                    } else {
                        gamesWon += set.p2;
                        gamesLost += set.p1;
                        if (set.p2 > set.p1) setsWon++;
                        else if (set.p1 > set.p2) setsLost++;
                    }
                });
            });

            return {
                setsDiff: setsWon - setsLost,
                gamesDiff: gamesWon - gamesLost,
                setsWon,
                setsLost,
                gamesWon,
                gamesLost
            };
        };
    }, []);

    /**
     * Validate if a match score is complete
     */
    const isValidScore = useMemo(() => {
        return (score: MatchScore): boolean => {
            if (!score.set1 || !score.set2) return false;

            // At least one set must have a winner
            const set1HasWinner = score.set1.p1 !== score.set1.p2;
            const set2HasWinner = score.set2.p1 !== score.set2.p2;

            return set1HasWinner || set2HasWinner;
        };
    }, []);

    return {
        config: classicConfig,
        calculateMatchPoints,
        calculateSetsDiff,
        isValidScore
    };
}
