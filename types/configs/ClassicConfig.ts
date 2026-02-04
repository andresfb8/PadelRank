/**
 * Classic Format Configuration
 * Traditional league with set-based scoring and divisions
 */
export interface ClassicConfig {
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

    /** Maximum number of players per division */
    maxPlayersPerDivision: number;

    /** Number of top players to promote to upper division */
    promotionCount: number;

    /** Number of bottom players to relegate to lower division */
    relegationCount: number;
}

/**
 * Default Classic Configuration
 */
export const DEFAULT_CLASSIC_CONFIG: ClassicConfig = {
    pointsPerWin2_0: 4,
    pointsPerWin2_1: 3,
    pointsDraw: 2,
    pointsPerLoss2_1: 1,
    pointsPerLoss2_0: 0,
    maxPlayersPerDivision: 4,
    promotionCount: 2,
    relegationCount: 2
};
