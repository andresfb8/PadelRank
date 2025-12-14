import { Match, Player, Ranking, StandingRow } from "../types";

// Helper to create a match object
const createMatch = (
    divIndex: number,
    jornada: number,
    p1Id: string,
    p2Id: string,
    p3Id: string,
    p4Id: string
): Match => ({
    id: `m-${Date.now()}-${divIndex}-${jornada}-${Math.random().toString(36).substr(2, 9)}`,
    jornada,
    pair1: { p1Id, p2Id },
    pair2: { p1Id: p3Id, p2Id: p4Id },
    status: 'pendiente',
    points: { p1: 0, p2: 0 }
});

export const MatchGenerator = {
    // --- CLASSIC (Existing Logic: Groups of 4, everyone plays with everyone) ---
    generateClassic4: (playerIds: string[], divIndex: number): Match[] => {
        if (playerIds.length !== 4) return [];
        const [p0, p1, p2, p3] = playerIds;
        const matches: Match[] = [];
        // Round 1: P0/P1 vs P2/P3
        matches.push(createMatch(divIndex, 1, p0, p1, p2, p3));
        // Round 2: P0/P2 vs P1/P3
        matches.push(createMatch(divIndex, 2, p0, p2, p1, p3));
        // Round 3: P0/P3 vs P1/P2
        matches.push(createMatch(divIndex, 3, p0, p3, p1, p2));
        return matches;
    },

    // --- AMERICANO (All vs All) ---
    // Simple algorithm for N players. Ideally N should be multiple of 4.
    // If not, we need 'byes' (descansos).
    // This is a complex rotation. For now, we implement a basic random mixer or specific logic for 4, 8, 12, 16.
    // A true Americano for X players requires a specific mathematical rotation (like a Whist drive).
    // For MVP: We will implement a "Random Fair Mixer" if N > 4, or strict Americano for 4/8.
    generateAmericano: (players: Player[], courts: number): Match[] => {
        // MVP: Use Random Round logic. 
        // Real implementation would require a pre-calculated matrix for perfect rotation.
        // But for now, random mixing (Shuffle) acts as a "Mixer".
        // Use a high round number or dynamic? 
        // We usually generate all rounds at once? No, Americano is often round by round too if dynamic.
        // Let's generate 1 round for now.
        return MatchGenerator.generateIndividualRound(players.map(p => p.id), 0, 1);
    },

    // --- MEXICANO (Skill Based) ---
    // Generated Round by Round based on Standings.
    generateMexicanoRound: (players: Player[], standings: StandingRow[], roundNumber: number): Match[] => {
        // Sort players by points
        const sorted = [...standings].sort((a, b) => b.pts - a.pts || b.gamesDiff - a.gamesDiff);

        const matches: Match[] = [];
        // Pair 1 vs 2, 3 vs 4...
        // But in Padel it's 2vs2. So 1&3 vs 2&4? Or 1&4 vs 2&3 (Balanced)?
        // Mexicano usually: 1 & 3 vs 2 & 4 is common to balance, or 1 & 2 vs 3 & 4 (Top court vs lower court).
        // Standard Mexicano:
        // Court 1: Rank 1, Rank 2, Rank 3, Rank 4.
        // They play together. Usually 1&4 vs 2&3 or 1&3 vs 2&4.
        // Let's go with Snake Draft for balance: 1 & 4 vs 2 & 3.

        const usedPlayers = new Set<string>();
        let courtIndex = 1;

        // Group by 4
        for (let i = 0; i < sorted.length; i += 4) {
            const group = sorted.slice(i, i + 4);
            if (group.length < 4) break; // Remainder sits out

            // Players for this court
            const p1 = group[0].playerId;
            const p2 = group[1].playerId;
            const p3 = group[2].playerId;
            const p4 = group[3].playerId;

            // 1 & 4 vs 2 & 3 (Balanced)
            matches.push(createMatch(courtIndex, roundNumber, p1, p4, p2, p3));
            courtIndex++;
        }

        return matches;
    },

    // --- INDIVIDUAL (Random Pairs / League with promotion) ---
    // If user wants random matches for a league.
    generateIndividualRound: (playerIds: string[], divIndex: number, roundNumber: number): Match[] => {
        // Shuffle players
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
        const matches: Match[] = [];

        for (let i = 0; i < shuffled.length; i += 4) {
            const group = shuffled.slice(i, i + 4);
            if (group.length < 4) break; // Rest
            matches.push(createMatch(divIndex, roundNumber, group[0], group[1], group[2], group[3]));
        }
        return matches;
    },

    // NEW: Full League Generation for Individual Ranking
    generateIndividualLeague: (playerIds: string[], divIndex: number): Match[] => {
        const n = playerIds.length;
        const matches: Match[] = [];

        // --- N=4: 3 Matches (Everyone plays 3, All Partners) ---
        if (n === 4) {
            return MatchGenerator.generateClassic4(playerIds, divIndex);
        }

        // --- N=5: 5 Matches (Everyone plays 4, All Partners) ---
        if (n === 5) {
            const [p0, p1, p2, p3, p4] = playerIds;
            // R1: 0-1 vs 2-3 (4 sits)
            matches.push(createMatch(divIndex, 1, p0, p1, p2, p3));
            // R2: 0-4 vs 1-2 (3 sits)
            matches.push(createMatch(divIndex, 2, p0, p4, p1, p2));
            // R3: 0-3 vs 1-4 (2 sits)
            matches.push(createMatch(divIndex, 3, p0, p3, p1, p4));
            // R4: 0-2 vs 3-4 (1 sits)
            matches.push(createMatch(divIndex, 4, p0, p2, p3, p4));
            // R5: 1-3 vs 2-4 (0 sits)
            matches.push(createMatch(divIndex, 5, p1, p3, p2, p4));
            return matches;
        }

        // --- N=6: 6 Matches (Everyone plays 4) ---
        // Logic: 6 rounds. In each round, 2 players sit. 
        // To ensure fairness (everyone sits 2 times), we sit adjacent pairs mod 6:
        // (0,1), (1,2), (2,3), (3,4), (4,5), (5,0)
        // This leaves 4 players to play. We attempt to maximize partner diversity in pairing.
        if (n === 6) {
            for (let r = 0; r < 6; r++) {
                // Sit r and (r+1)%6
                const sit1 = r;
                const sit2 = (r + 1) % 6;
                const players = playerIds.filter((_, idx) => idx !== sit1 && idx !== sit2);

                // We have 4 players. How to pair them?
                // To maximize rotation, we can use a fixed permutation logic or random shuffle?
                // Random shuffle is good but might repeat partners.
                // Let's use a "Gap" pairing derived from round number to vary it.
                // Simple split [0,1] vs [2,3] of the filtered list.
                // But we should rotate the inner list.
                // Let's just shuffle the 4 players deterministically based on round?
                // Actually, for N=6 with 6 matches, we won't get all partners anyway (5 needed, only 4 plays).
                // So randomizing the pair of the 4 active players is fine.

                // Deterministic mixing:
                // r0 (sit 0,1) -> 2,3,4,5 -> 2-3 vs 4-5
                // r1 (sit 1,2) -> 3,4,5,0 -> 3-5 vs 4-0 (Mix it up: 0 vs 2? No indices changed)
                // Let's Just Pair A-B vs C-D, but swap B and C every odd round.

                const [pA, pB, pC, pD] = players;
                if (r % 2 === 0) {
                    matches.push(createMatch(divIndex, r + 1, pA, pB, pC, pD));
                } else {
                    matches.push(createMatch(divIndex, r + 1, pA, pC, pB, pD));
                }
            }
            return matches;
        }

        // --- N=7: 7 Matches (Everyone plays 4) ---
        // Logic: 7 rounds. In each round, 3 players sit.
        // Everyone must sit 3 times.
        // Sit Triplets mod 7: (0,1,2), (1,2,3)...
        if (n === 7) {
            for (let r = 0; r < 7; r++) {
                const s1 = r;
                const s2 = (r + 1) % 7;
                const s3 = (r + 2) % 7;
                const players = playerIds.filter((_, idx) => idx !== s1 && idx !== s2 && idx !== s3);

                // 4 players active.
                const [pA, pB, pC, pD] = players;
                // Alternate pairings
                if (r % 2 === 0) {
                    matches.push(createMatch(divIndex, r + 1, pA, pB, pC, pD));
                } else {
                    matches.push(createMatch(divIndex, r + 1, pA, pC, pB, pD));
                }
            }
            return matches;
        }

        // --- N=8: 14 Matches (7 Rounds x 2 Matches). Everyone plays 7. ---
        // Perfect Round Robin.
        // We can use a standard approach: Fix P0, rotate others.
        // R1: 0-1, 2-7, 3-6, 4-5 -> Pairs?
        // Wait, standard RR is for 1v1.
        // For 4-player games (Partners), we need a specific "Whist" schedule for 8 players.
        // Generating a perfect 7-round schedule for 8 players is a known problem.
        // Let's use a known solution hardcoded or a robust generator.
        // Solution for 8 players (7 rounds):
        // R1: (1,2 v 3,4) (5,6 v 7,8) ...
        // Simplest MVP: Just generate 7 rounds using Randomized Hill Climbing to ensure uniqueness?
        // No, better to use the fixed logic for N=8.
        // Known "Mitchell movement" or similar?
        // Let's use a cyclic generator for N=8. 
        // Or actually, user just wants "Balanced". 
        // 7 Rounds. Each round, simply partition 8 players into 2 matches.
        // Ensuring everyone partners everyone exactly once.
        // Hardcoding the "Mitchell" solution for 8 players / 7 rounds:
        // Round 1: (0,1 vs 2,3) | (4,5 vs 6,7)
        // Round 2: (0,2 vs 4,6) | (1,5 vs 3,7)
        // Round 3: (0,3 vs 5,7) | (1,6 vs 2,4)
        // Round 4: (0,4 vs 1,7) | (2,6 vs 3,5)
        // Round 5: (0,5 vs 2,7) | (1,3 vs 4,6) -- Wait, this is getting complex to verify mentally.
        // Let's use a randomized search with retries. It's fast for N=8.
        if (n === 8) {
            // Try to find a valid set of 7 rounds where everyone partners everyone.
            // Max attempts
            for (let attempt = 0; attempt < 50; attempt++) {
                const potentialMatches: Match[] = [];
                const partnerHistory: Set<string> = new Set();
                let valid = true;

                // We need 7 rounds
                for (let r = 1; r <= 7; r++) {
                    // We need to partition 8 players into 2 matches such that no one partners someone they already partnered.
                    // Shuffle players
                    const p = [...playerIds].sort(() => Math.random() - 0.5);

                    // Try to form 2 matches
                    // M1: p0, p1, p2, p3
                    // M2: p4, p5, p6, p7
                    // Check partners: (0,1) (2,3) (4,5) (6,7)
                    const pairs = [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]], [p[6], p[7]]];

                    // Verify partners haven't met
                    let roundOk = true;
                    const roundPairs = [];

                    for (const pair of pairs) {
                        const k = [pair[0], pair[1]].sort().join('-');
                        if (partnerHistory.has(k)) {
                            roundOk = false;
                            break;
                        }
                        roundPairs.push(k);
                    }

                    if (!roundOk) {
                        valid = false;
                        break;
                    }

                    // Add to history and matches
                    roundPairs.forEach(k => partnerHistory.add(k));
                    potentialMatches.push(createMatch(divIndex, r, p[0], p[1], p[2], p[3]));
                    potentialMatches.push(createMatch(divIndex, r, p[4], p[5], p[6], p[7]));
                }

                if (valid) return potentialMatches;
            }
            // If manual search failed, fall back to simple random logic
        }


        // GENERIC / FALLBACK (e.g. 9+ players or failed optimization)
        // Generate n rounds? Or 4?
        // User asked for "Auto adjust".
        // Default to n-1 rounds? Or just 4?
        // Let's stick to 4 rounds for N > 8 to be safe on length, or N if small?
        // Let's do 4 rounds.
        for (let r = 1; r <= 4; r++) {
            const roundMatches = MatchGenerator.generateIndividualRound(playerIds, divIndex, r);
            matches.push(...roundMatches);
        }

        return matches;
    }
};
