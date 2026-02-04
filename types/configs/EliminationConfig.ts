/**
 * Elimination Format Configuration
 * Single or double elimination brackets
 */
export interface EliminationConfig {
    /** Enable consolation bracket for first-round losers */
    consolation: boolean;

    /** Include third-place match in the bracket */
    thirdPlaceMatch: boolean;

    /** Participant type: individual or pairs */
    type: 'individual' | 'pairs';
}

/**
 * Default Elimination Configuration
 */
export const DEFAULT_ELIMINATION_CONFIG: EliminationConfig = {
    consolation: false,
    thirdPlaceMatch: false,
    type: 'pairs'
};
