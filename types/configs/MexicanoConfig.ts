/**
 * Mexicano Format Configuration
 * Point-based scoring with ranking-based pairings
 */
export interface MexicanoConfig {
    /** Scoring mode: fixed total points or per-game */
    scoringMode: '24' | '32' | 'per-game' | 'custom';

    /** Total points for the match (only used when scoringMode is a number) */
    totalPoints?: number;

    /** Variant: Individual (rotating partners) or Fixed Pairs */
    variant?: 'individual' | 'pairs';
}

/**
 * Default Mexicano Configuration
 */
export const DEFAULT_MEXICANO_CONFIG: MexicanoConfig = {
    scoringMode: '32',
    variant: 'individual'
};
