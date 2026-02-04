import { useMemo } from 'react';
import { Match, MatchScore, RankingConfig, MatchPair } from '../../types';
import { getEliminationConfig } from '../../utils/configHelpers';

/**
 * Hook for Elimination (Single/Double Elimination) format-specific logic
 * Handles bracket generation, match progression, and consolation brackets
 */
export function useEliminationLogic(config: RankingConfig | undefined) {
    const eliminationConfig = getEliminationConfig(config);

    /**
     * Calculate match points (winner advances, loser is eliminated or goes to consolation)
     * In elimination, points are typically not used for standings
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

            // Winner gets 1, loser gets 0 (for tracking purposes)
            if (p1Sets > p2Sets) return { p1: 1, p2: 0 };
            if (p2Sets > p1Sets) return { p1: 0, p2: 1 };

            return { p1: 0, p2: 0 };
        };
    }, []);

    /**
     * Determine the winner of a match
     */
    const getMatchWinner = useMemo(() => {
        return (match: Match): 'p1' | 'p2' | null => {
            if (match.status !== 'finalizado' || !match.score) return null;

            const points = calculateMatchPoints(match.score);

            if (points.p1 > points.p2) return 'p1';
            if (points.p2 > points.p1) return 'p2';

            return null;
        };
    }, [calculateMatchPoints]);

    /**
     * Get the winner pair from a match
     */
    const getWinnerPair = useMemo(() => {
        return (match: Match): MatchPair | null => {
            const winner = getMatchWinner(match);

            if (winner === 'p1') return match.pair1;
            if (winner === 'p2') return match.pair2;

            return null;
        };
    }, [getMatchWinner]);

    /**
     * Get the loser pair from a match
     */
    const getLoserPair = useMemo(() => {
        return (match: Match): MatchPair | null => {
            const winner = getMatchWinner(match);

            if (winner === 'p1') return match.pair2;
            if (winner === 'p2') return match.pair1;

            return null;
        };
    }, [getMatchWinner]);

    /**
     * Calculate bracket size needed for N participants
     * Returns the next power of 2
     */
    const calculateBracketSize = useMemo(() => {
        return (participantCount: number): number => {
            return Math.pow(2, Math.ceil(Math.log2(participantCount)));
        };
    }, []);

    /**
     * Calculate number of rounds needed
     */
    const calculateRoundCount = useMemo(() => {
        return (participantCount: number): number => {
            const bracketSize = calculateBracketSize(participantCount);
            return Math.log2(bracketSize);
        };
    }, [calculateBracketSize]);

    /**
     * Get round name based on round number
     * @param roundNumber 1 = Final, 2 = Semi-Final, 3 = Quarter-Final, etc.
     */
    const getRoundName = useMemo(() => {
        return (roundNumber: number, totalRounds: number): string => {
            if (roundNumber === 1) return 'Final';
            if (roundNumber === 2) return 'Semifinal';
            if (roundNumber === 3) return 'Cuartos de Final';
            if (roundNumber === 4) return 'Octavos de Final';
            if (roundNumber === 5) return 'Dieciseisavos de Final';

            // For earlier rounds, use generic naming
            const matchesInRound = Math.pow(2, roundNumber - 1);
            return `Ronda de ${matchesInRound * 2}`;
        };
    }, []);

    /**
     * Check if consolation bracket is enabled
     */
    const hasConsolation = useMemo(() => {
        return eliminationConfig.consolation;
    }, [eliminationConfig]);

    /**
     * Check if third-place match is enabled
     */
    const hasThirdPlaceMatch = useMemo(() => {
        return eliminationConfig.thirdPlaceMatch;
    }, [eliminationConfig]);

    /**
     * Determine if a match is in the main bracket or consolation bracket
     */
    const isConsolationMatch = useMemo(() => {
        return (match: Match): boolean => {
            return match.consolationMatchId !== undefined;
        };
    }, []);

    /**
     * Validate if bracket is complete (all matches finished)
     */
    const isBracketComplete = useMemo(() => {
        return (matches: Match[]): boolean => {
            return matches.every(m => m.status === 'finalizado' || m.status === 'no_disputado');
        };
    }, []);

    /**
     * Get final standings from completed bracket
     */
    const getFinalStandings = useMemo(() => {
        return (matches: Match[]): { first: MatchPair | null; second: MatchPair | null; third: MatchPair | null } => {
            // Find the final match
            const finalMatch = matches.find(m => m.roundName === 'Final');
            if (!finalMatch || finalMatch.status !== 'finalizado') {
                return { first: null, second: null, third: null };
            }

            const first = getWinnerPair(finalMatch);
            const second = getLoserPair(finalMatch);

            // Find third place match if enabled
            let third: MatchPair | null = null;
            if (hasThirdPlaceMatch) {
                const thirdPlaceMatch = matches.find(m => m.roundName?.includes('3er'));
                if (thirdPlaceMatch && thirdPlaceMatch.status === 'finalizado') {
                    third = getWinnerPair(thirdPlaceMatch);
                }
            }

            return { first, second, third };
        };
    }, [hasThirdPlaceMatch, getWinnerPair, getLoserPair]);

    return {
        config: eliminationConfig,
        calculateMatchPoints,
        getMatchWinner,
        getWinnerPair,
        getLoserPair,
        calculateBracketSize,
        calculateRoundCount,
        getRoundName,
        hasConsolation,
        hasThirdPlaceMatch,
        isConsolationMatch,
        isBracketComplete,
        getFinalStandings
    };
}
