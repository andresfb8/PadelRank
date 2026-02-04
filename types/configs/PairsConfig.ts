/**
 * Pairs Format Configuration
 * Fixed pairs league with set-based scoring
 */
export interface PairsConfig {
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
 * Default Pairs Configuration
 */
export const DEFAULT_PAIRS_CONFIG: PairsConfig = {
    pointsPerWin2_0: 4,
    pointsPerWin2_1: 3,
    pointsDraw: 2,
    pointsPerLoss2_1: 1,
    pointsPerLoss2_0: 0
};
