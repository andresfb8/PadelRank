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

    /** If true, each pair plays every other pair twice (home + away legs). */
    doubleRoundRobin?: boolean;

    /**
     * Size of the main playoff bracket. If undefined, computed automatically as
     * the next power of 2 from `qualifiersPerGroup × groupCount`.
     * Valid values: 2, 4, 8, 16, 32. Cross-group ranking fills any remaining slots.
     */
    playoffBracketSize?: number;

    /**
     * Size of the consolation playoff bracket. If undefined, computed automatically as
     * the next power of 2 from `consolationQualifiersPerGroup × groupCount`.
     */
    consolationBracketSize?: number;
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
