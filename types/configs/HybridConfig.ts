/**
 * Hybrid Format Configuration
 * Group stage followed by playoff brackets (pairs-based)
 */
export interface HybridConfig {
    /** Number of pairs in each group of the group stage */
    pairsPerGroup: number;

    /** Number of top teams from each group that qualify for main playoff */
    qualifiersPerGroup: number;

    /** Number of teams from each group that qualify for consolation playoff */
    consolationQualifiersPerGroup: number;

    /** Points awarded for winning 2-0 */
    pointsPerWin2_0: number;

    /** Points awarded for winning 2-1 */
    pointsPerWin2_1: number;

    /** Points awarded for a draw (1-1) */
    pointsDraw: number;

    /** Points awarded for losing 1-2 */
    pointsPerLoss2_1: number;

    /** Points awarded for losing 0-2 */
    pointsPerLoss2_0: number;
}

/**
 * Default Hybrid Configuration
 */
export const DEFAULT_HYBRID_CONFIG: HybridConfig = {
    pairsPerGroup: 4,
    qualifiersPerGroup: 2,
    consolationQualifiersPerGroup: 0,
    pointsPerWin2_0: 4,
    pointsPerWin2_1: 3,
    pointsDraw: 2,
    pointsPerLoss2_1: 1,
    pointsPerLoss2_0: 0
};
