/**
 * Pozo Format Configuration
 * Multi-court ladder system with point-based scoring
 */
export interface PozoConfig {
    /** Variant: individual (rotating partners) or fixed pairs */
    variant: 'individual' | 'fixed-pairs';

    /** Scoring mode: fixed total points or per-game */
    scoringMode: import('../../types').ScoringMode;

    /** @deprecated Use scoringMode */
    scoringType?: '24' | '32' | 'per-game' | 'custom' | 'sets';

    /** Total points for the match (only used when scoringMode is a number) */
    totalPoints?: number;

    /** Number of courts in the ladder */
    numCourts: number;

    /** Enable golden point scoring */
    goldenPoint?: boolean;
}

/**
 * Default Pozo Configuration
 */
export const DEFAULT_POZO_CONFIG: PozoConfig = {
    variant: 'individual',
    scoringMode: '32',
    numCourts: 4,
    goldenPoint: true
};
