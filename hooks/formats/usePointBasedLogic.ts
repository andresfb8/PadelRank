import { useMemo } from 'react';
import { Match, MatchScore, RankingConfig } from '../../types';
import { getAmericanoConfig, getMexicanoConfig } from '../../utils/configHelpers';

/**
 * Hook for Americano/Mexicano format-specific logic
 * Handles point-based scoring
 */
export function usePointBasedLogic(
    config: RankingConfig | undefined,
    format: 'americano' | 'mexicano'
) {
    const formatConfig = format === 'americano'
        ? getAmericanoConfig(config)
        : getMexicanoConfig(config);

    /**
     * Get total points for the match based on scoring mode
     */
    const getTotalPoints = useMemo(() => {
        return (): number => {
            if (formatConfig.scoringMode === 'custom' && formatConfig.totalPoints) {
                return formatConfig.totalPoints;
            }

            const modePoints: Record<string, number> = {
                '24': 24,
                '32': 32,
                'per-game': 0 // No fixed total
            };

            return modePoints[formatConfig.scoringMode] ?? 32;
        };
    }, [formatConfig]);

    /**
     * Calculate match points (winner gets 1, loser gets 0)
     */
    const calculateMatchPoints = useMemo(() => {
        return (score: MatchScore): { p1: number; p2: number } => {
            if (!score.pointsScored) {
                return { p1: 0, p2: 0 };
            }

            const { p1, p2 } = score.pointsScored;

            if (p1 > p2) return { p1: 1, p2: 0 };
            if (p2 > p1) return { p1: 0, p2: 1 };

            return { p1: 0, p2: 0 }; // Tie (shouldn't happen)
        };
    }, []);

    /**
     * Calculate points difference for standings
     */
    const calculatePointsDiff = useMemo(() => {
        return (matches: Match[], playerId: string): { pointsScored: number; pointsAgainst: number } => {
            let pointsScored = 0;
            let pointsAgainst = 0;

            matches.forEach(match => {
                if (match.status !== 'finalizado' || !match.score?.pointsScored) return;

                const isP1 = match.pair1.p1Id === playerId || match.pair1.p2Id === playerId;
                const score = match.score.pointsScored;

                if (isP1) {
                    pointsScored += score.p1;
                    pointsAgainst += score.p2;
                } else {
                    pointsScored += score.p2;
                    pointsAgainst += score.p1;
                }
            });

            return { pointsScored, pointsAgainst };
        };
    }, []);

    /**
     * Validate if a match score is complete
     */
    const isValidScore = useMemo(() => {
        return (score: MatchScore): boolean => {
            if (!score.pointsScored) return false;

            const { p1, p2 } = score.pointsScored;
            const totalPoints = getTotalPoints();

            // For fixed total modes, check if sum matches
            if (formatConfig.scoringMode !== 'per-game' && totalPoints > 0) {
                return p1 + p2 === totalPoints && (p1 > 0 || p2 > 0);
            }

            // For per-game mode, just check that there's a winner
            return p1 !== p2 && (p1 > 0 || p2 > 0);
        };
    }, [formatConfig, getTotalPoints]);

    /**
     * Auto-calculate second pair's points (for single input mode)
     */
    const autoCalculatePoints = useMemo(() => {
        return (p1Points: number): number => {
            const totalPoints = getTotalPoints();

            if (formatConfig.scoringMode === 'per-game') {
                return 0; // Can't auto-calculate in per-game mode
            }

            return Math.max(0, totalPoints - p1Points);
        };
    }, [formatConfig, getTotalPoints]);

    return {
        config: formatConfig,
        getTotalPoints,
        calculateMatchPoints,
        calculatePointsDiff,
        isValidScore,
        autoCalculatePoints
    };
}
