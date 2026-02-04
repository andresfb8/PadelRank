/**
 * Elimination Format Usage Examples
 * Shows how to use the Elimination logic hook for bracket management
 */

import React from 'react';
import { useEliminationLogic } from '../hooks/formats';
import { Ranking, Match } from '../types';

/**
 * Example 1: Bracket Generation
 */
export function EliminationBracketExample({ ranking }: { ranking: Ranking }) {
    const {
        calculateBracketSize,
        calculateRoundCount,
        getRoundName,
        hasConsolation,
        hasThirdPlaceMatch
    } = useEliminationLogic(ranking.config);

    const participants = ranking.players?.length || 0;
    const bracketSize = calculateBracketSize(participants);
    const rounds = calculateRoundCount(participants);

    return (
        <div>
            <h3>Elimination Bracket Info</h3>
            <p>Participants: {participants}</p>
            <p>Bracket Size: {bracketSize}</p>
            <p>Total Rounds: {rounds}</p>
            <p>Consolation Bracket: {hasConsolation ? 'Yes' : 'No'}</p>
            <p>Third Place Match: {hasThirdPlaceMatch ? 'Yes' : 'No'}</p>

            <h4>Round Names:</h4>
            <ul>
                {Array.from({ length: rounds }, (_, i) => (
                    <li key={i}>
                        Round {i + 1}: {getRoundName(i + 1, rounds)}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Example 2: Match Result Processing
 */
export function EliminationMatchResultExample({ ranking, match }: { ranking: Ranking; match: Match }) {
    const {
        getMatchWinner,
        getWinnerPair,
        getLoserPair,
        hasConsolation
    } = useEliminationLogic(ranking.config);

    const handleMatchComplete = () => {
        const winner = getMatchWinner(match);
        const winnerPair = getWinnerPair(match);
        const loserPair = getLoserPair(match);

        if (winner && winnerPair) {
            console.log('Winner:', winnerPair);
            console.log('Advances to next round');

            if (hasConsolation && loserPair) {
                console.log('Loser:', loserPair);
                console.log('Goes to consolation bracket');
            } else {
                console.log('Loser is eliminated');
            }
        }
    };

    return (
        <div>
            <h3>Match Result</h3>
            <button onClick={handleMatchComplete}>
                Complete Match
            </button>
        </div>
    );
}

/**
 * Example 3: Final Standings
 */
export function EliminationStandingsExample({ ranking }: { ranking: Ranking }) {
    const { getFinalStandings, isBracketComplete } = useEliminationLogic(ranking.config);

    const matches = ranking.divisions?.[0]?.matches || [];
    const isComplete = isBracketComplete(matches);
    const standings = getFinalStandings(matches);

    return (
        <div>
            <h3>Final Standings</h3>
            {isComplete ? (
                <div>
                    <div>🥇 1st Place: {standings.first?.p1Id || 'TBD'}</div>
                    <div>🥈 2nd Place: {standings.second?.p1Id || 'TBD'}</div>
                    {standings.third && (
                        <div>🥉 3rd Place: {standings.third.p1Id}</div>
                    )}
                </div>
            ) : (
                <p>Bracket not complete yet</p>
            )}
        </div>
    );
}

/**
 * Example 4: Bracket Progression
 */
export function BracketProgressionExample({ ranking }: { ranking: Ranking }) {
    const {
        getWinnerPair,
        getRoundName,
        calculateRoundCount,
        isConsolationMatch
    } = useEliminationLogic(ranking.config);

    const matches = ranking.divisions?.[0]?.matches || [];
    const totalRounds = calculateRoundCount(ranking.players?.length || 0);

    const advanceWinner = (match: Match) => {
        const winner = getWinnerPair(match);
        if (!winner) return;

        const isConsolation = isConsolationMatch(match);
        const currentRound = match.roundNumber || 1;
        const nextRound = currentRound - 1; // Rounds count down to final

        if (nextRound > 0) {
            const nextRoundName = getRoundName(nextRound, totalRounds);
            console.log(`${winner.p1Id} advances to ${nextRoundName}`);
            console.log(`Bracket: ${isConsolation ? 'Consolation' : 'Main'}`);

            // Create next match...
        } else {
            console.log(`${winner.p1Id} wins the ${isConsolation ? 'consolation' : 'main'} bracket!`);
        }
    };

    return (
        <div>
            <h3>Bracket Progression</h3>
            {matches.map(match => (
                <div key={match.id}>
                    <p>{match.roundName}</p>
                    {match.status === 'finalizado' && (
                        <button onClick={() => advanceWinner(match)}>
                            Advance Winner
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Example 5: Bracket Validation
 */
export function BracketValidationExample({ ranking }: { ranking: Ranking }) {
    const { calculateBracketSize, isBracketComplete } = useEliminationLogic(ranking.config);

    const participants = ranking.players?.length || 0;
    const bracketSize = calculateBracketSize(participants);
    const byesNeeded = bracketSize - participants;
    const matches = ranking.divisions?.[0]?.matches || [];
    const isComplete = isBracketComplete(matches);

    return (
        <div>
            <h3>Bracket Validation</h3>
            <div>
                <p>Participants: {participants}</p>
                <p>Bracket Size: {bracketSize}</p>
                {byesNeeded > 0 && (
                    <p className="text-amber-600">
                        ⚠️ {byesNeeded} bye(s) needed
                    </p>
                )}
                <p>Status: {isComplete ? '✅ Complete' : '⏳ In Progress'}</p>
            </div>
        </div>
    );
}
