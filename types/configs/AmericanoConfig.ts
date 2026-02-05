/**
 * Americano Format Configuration
 * Point-based scoring system
 */
export interface AmericanoConfig {
    /** Scoring mode: fixed total points or per-game */
    scoringMode: '24' | '32' | 'per-game' | 'custom';

    /** Total points for the match (only used when scoringMode is a number) */
    totalPoints?: number;

    /** Variant: Individual (rotating partners) or Fixed Pairs */
    variant?: 'individual' | 'pairs';
}

/**
 * Default Americano Configuration
 */
export const DEFAULT_AMERICANO_CONFIG: AmericanoConfig = {
    scoringMode: '32',
    variant: 'individual'
};
