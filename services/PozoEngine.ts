import { Match, MatchPair, RankingConfig, User, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Pozo (King of the Court) Engine
 * Handles the logic for generating rounds and calculating movements.
 */

interface PozoPlayerState {
    playerId: string;
    currentCourt: number;
    prevPartnerId?: string; // To avoid repeating partners in individual mode
}

/**
 * Generates the first round of the Pozo tournament.
 * Randomly assigns players to courts.
 */
export function generateInitialRound(
    players: string[], // List of Player IDs
    config: RankingConfig
): Match[] {
    if (!config.pozoConfig) throw new Error('Pozo config is missing');

    const { variant, numCourts } = config.pozoConfig;
    const matches: Match[] = [];
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numCourts; i++) {
        const courtNumber = i + 1;
        let pair1: MatchPair;
        let pair2: MatchPair;

        if (variant === 'pairs') {
            const pairString1 = shuffledPlayers[i * 2];
            const pairString2 = shuffledPlayers[i * 2 + 1];

            // If we don't have enough pairs for this court, stop generating matches
            if (!pairString1 || !pairString2) break;

            const [p1a, p1b] = pairString1.split('::');
            const [p2a, p2b] = pairString2.split('::');

            pair1 = { p1Id: p1a, p2Id: p1b };
            pair2 = { p1Id: p2a, p2Id: p2b };

        } else {
            // Individual mode: Need 4 players per court
            if (shuffledPlayers.length < (i * 4) + 4) break;

            pair1 = { p1Id: shuffledPlayers[i * 4], p2Id: shuffledPlayers[i * 4 + 1] };
            pair2 = { p1Id: shuffledPlayers[i * 4 + 2], p2Id: shuffledPlayers[i * 4 + 3] };
        }

        matches.push({
            id: uuidv4(),
            jornada: 1,
            pair1,
            pair2,
            points: { p1: 0, p2: 0 },
            status: 'pendiente',
            court: courtNumber,
        });
    }

    return matches;
}

/**
 * Calculates the next round based on the results of the current round.
 */
export function calculateNextRound(
    currentRoundMatches: Match[],
    currentRoundNumber: number,
    config: RankingConfig
): Match[] {
    if (!config.pozoConfig) throw new Error('Pozo config is missing');
    const { variant, numCourts } = config.pozoConfig;

    // We need to determine who goes to which court.
    // Court buckets: index 0 = Court 1, index 1 = Court 2...
    const nextRoundBuckets: string[][] = Array.from({ length: numCourts }, () => []);

    // Helper to get winners/losers
    const getMatchOutcome = (match: Match) => {
        // Basic logic using points or sets. Assuming points p1 > p2 for win.
        // In Pozo, we usually force a winner (Golden Point). Draw shouldn't happen or implies P1 wins.
        const p1Wins = (match.score?.set1?.p1 || 0) > (match.score?.set1?.p2 || 0) ||
            (match.points.p1 > match.points.p2);

        return {
            winners: [match.pair1.p1Id, match.pair1.p2Id],
            losers: [match.pair2.p1Id, match.pair2.p2Id],
            p1Won: p1Wins
        };
    };

    // Sort matches by court to process them in order
    const sortedMatches = [...currentRoundMatches].sort((a, b) => (a.court || 0) - (b.court || 0));

    sortedMatches.forEach(match => {
        const courtIdx = (match.court || 1) - 1; // 0-based index
        const { winners, losers, p1Won } = getMatchOutcome(match);
        const actualWinners = p1Won ? [match.pair1.p1Id, match.pair1.p2Id] : [match.pair2.p1Id, match.pair2.p2Id];
        const actualLosers = p1Won ? [match.pair2.p1Id, match.pair2.p2Id] : [match.pair1.p1Id, match.pair1.p2Id];

        // LOGIC:
        // Court 1 (Index 0): Winners stay (0), Losers go to 2 (1)
        // Court N (Index N-1): Winners go to N-1, Losers stay (N-1)
        // Court Middle (Index I): Winners go to I-1, Losers go to I+1

        // Winners Movement
        if (courtIdx === 0) {
            // Court 1 Winners -> Stay in Court 1
            nextRoundBuckets[0].push(...actualWinners);
        } else {
            // Middle/Last Winners -> Go Up (i-1)
            nextRoundBuckets[courtIdx - 1].push(...actualWinners);
        }

        // Losers Movement
        if (courtIdx === numCourts - 1) {
            // Last Court Losers -> Stay in Last Court
            nextRoundBuckets[numCourts - 1].push(...actualLosers);
        } else {
            // Middle/First Losers -> Go Down (i+1)
            nextRoundBuckets[courtIdx + 1].push(...actualLosers);
        }
    });

    const nextMatches: Match[] = [];

    // Generate matches from buckets
    for (let i = 0; i < numCourts; i++) {
        const courtPlayers = nextRoundBuckets[i];

        // In Pairs variant, teams are fixed. 
        // In Individual variant, we need to shuffle.

        let pair1: MatchPair;
        let pair2: MatchPair;

        if (variant === 'pairs') {
            // Assuming fixed pairs logic: [P1a, P1b, P2a, P2b]
            // We keep them as is. 
            // Ideally we should track who is partner with whom. Since we just pushed IDs, 
            // we pushed [Winner1, Winner2] together. So 0 and 1 are partners.
            pair1 = { p1Id: courtPlayers[0], p2Id: courtPlayers[1] };
            pair2 = { p1Id: courtPlayers[2], p2Id: courtPlayers[3] };
        } else {
            // Individual: SHUFFLE
            // To establish fairness, we shouldn't just pair 0-1 and 2-3 again if they came from same place.
            // E.g. Winners of Court 2 (A,B) go to Court 1. Winners of Court 1 (C,D) stay.
            // We have A,B,C,D in Court 1. A,B were partners. C,D were partners.
            // We MUST split them. A-C vs B-D or A-D vs B-C.

            const shuffled = shufflePartners(courtPlayers);
            pair1 = { p1Id: shuffled[0], p2Id: shuffled[1] };
            pair2 = { p1Id: shuffled[2], p2Id: shuffled[3] };
        }

        nextMatches.push({
            id: uuidv4(),
            jornada: currentRoundNumber + 1,
            pair1,
            pair2,
            points: { p1: 0, p2: 0 },
            status: 'pendiente',
            court: i + 1
        });
    }

    return nextMatches;
}

/**
 * Shuffles 4 players ensuring previous partners (if adjacent in input) are split.
 * Input assumption: [A, B, C, D] where A&B arrived together and C&D arrived together.
 */
function shufflePartners(players: string[]): string[] {
    // Simple deterministic split to ensure mixing:
    // Pair 1: Player 0 + Player 2
    // Pair 2: Player 1 + Player 3

    // Input: [W1a, W1b, W2a, W2b]
    // Output: [W1a, W2a, W1b, W2b]

    // However, sometimes inputs might be mixed differently if source logic changes.
    // For basic Pozo flow, the "Split" strategy is usually:
    // "Winners split and play against Losers split"? No, everyone on Court 1 is a "Winner" (except R1).
    // The goal is just to not play with the SAME partner.

    // Strategy: 0 plays with 2. 1 plays with 3.
    return [players[0], players[2], players[1], players[3]];
}
