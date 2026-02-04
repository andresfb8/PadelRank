import { useMemo } from 'react';
import { Match, MatchScore, RankingConfig, Division } from '../../types';
import { getHybridConfig } from '../../utils/configHelpers';

/**
 * Hook for Hybrid format-specific logic
 * Handles group stage + playoff bracket
 */
export function useHybridLogic(config: RankingConfig | undefined) {
    const hybridConfig = getHybridConfig(config);

    /**
     * Calculate match points (same as Classic for group stage)
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
                    p1: hybridConfig.pointsPerWin2_0,
                    p2: hybridConfig.pointsPerLoss2_0
                };
            }

            if (p1Sets === 2 && p2Sets === 1) {
                return {
                    p1: hybridConfig.pointsPerWin2_1,
                    p2: hybridConfig.pointsPerLoss2_1
                };
            }

            if (p2Sets === 2 && p1Sets === 0) {
                return {
                    p1: hybridConfig.pointsPerLoss2_0,
                    p2: hybridConfig.pointsPerWin2_0
                };
            }

            if (p2Sets === 2 && p1Sets === 1) {
                return {
                    p1: hybridConfig.pointsPerLoss2_1,
                    p2: hybridConfig.pointsPerWin2_1
                };
            }

            // Draw (1-1)
            if (p1Sets === 1 && p2Sets === 1) {
                return {
                    p1: hybridConfig.pointsDraw,
                    p2: hybridConfig.pointsDraw
                };
            }

            return { p1: 0, p2: 0 };
        };
    }, [hybridConfig]);

    /**
     * Determine which pairs qualify for main playoff
     */
    const getMainPlayoffQualifiers = useMemo(() => {
        return (groupDivisions: Division[]): string[] => {
            const qualifiers: string[] = [];

            groupDivisions.forEach(division => {
                const standings = division.standings || [];
                const sortedStandings = [...standings].sort((a, b) => a.pos - b.pos);

                // Take top N pairs from each group
                const topPairs = sortedStandings
                    .slice(0, hybridConfig.qualifiersPerGroup)
                    .map(s => s.playerId);

                qualifiers.push(...topPairs);
            });

            return qualifiers;
        };
    }, [hybridConfig]);

    /**
     * Determine which pairs qualify for consolation playoff
     */
    const getConsolationQualifiers = useMemo(() => {
        return (groupDivisions: Division[]): string[] => {
            const qualifiers: string[] = [];

            groupDivisions.forEach(division => {
                const standings = division.standings || [];
                const sortedStandings = [...standings].sort((a, b) => a.pos - b.pos);

                // Take next N pairs from each group (after main qualifiers)
                const consolationPairs = sortedStandings
                    .slice(
                        hybridConfig.qualifiersPerGroup,
                        hybridConfig.qualifiersPerGroup + hybridConfig.consolationQualifiersPerGroup
                    )
                    .map(s => s.playerId);

                qualifiers.push(...consolationPairs);
            });

            return qualifiers;
        };
    }, [hybridConfig]);

    /**
     * Check if a division is a group stage division
     */
    const isGroupStage = useMemo(() => {
        return (divisionName: string): boolean => {
            return divisionName.toLowerCase().includes('grupo') ||
                divisionName.toLowerCase().includes('group');
        };
    }, []);

    /**
     * Check if a division is a playoff division
     */
    const isPlayoff = useMemo(() => {
        return (divisionName: string): boolean => {
            return divisionName.toLowerCase().includes('playoff') ||
                divisionName.toLowerCase().includes('eliminatoria');
        };
    }, []);

    return {
        config: hybridConfig,
        calculateMatchPoints,
        getMainPlayoffQualifiers,
        getConsolationQualifiers,
        isGroupStage,
        isPlayoff
    };
}
