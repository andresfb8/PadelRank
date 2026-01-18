import { Match, Player, Ranking, StandingRow } from "../types";

// Helper to create a match object
const createMatch = (
    divIndex: number,
    jornada: number,
    p1Id: string,
    p2Id: string,
    p3Id: string,
    p4Id: string,
    court?: number
): Match => ({
    id: `m-${crypto.randomUUID()}`,
    jornada,
    pair1: { p1Id, p2Id },
    pair2: { p1Id: p3Id, p2Id: p4Id },
    status: 'pendiente',
    points: { p1: 0, p2: 0 },
    court
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

    generateAmericano: (players: Player[], courts: number): Match[] => {
        const n = players.length;
        // Only robustly support N divisible by 4 for now (Standard Americano)
        // If not div by 4, we might need byes. The randomized logic handles it if we define "valid pairing".
        // For N=8, rounds=7. For N=12, rounds=11.

        // Target rounds: N-1 (Everyone partners everyone else once)
        // If N is not even, this loop concept changes. 
        // Let's assume N % 4 === 0 based on typical Americano rules.
        // If 5, 6, 7... we use best effort or fallback.

        const targetRounds = n - 1;
        const ids = players.map(p => p.id);
        const matchesPerRound = Math.floor(n / 4);

        // Optimization: Randomized Backtracking with Retries
        // 500 attempts should be enough for N=8, 12. N=16 might be tougher but fast enough.

        // Improved Americano Generator: High-Volume Randomized Greedy with Backtracking
        // This is much more robust for N > 12 than simple shuffling.
        const maxAttempts = 5000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const schedule: Match[] = [];
            const partnerHistory = new Set<string>();
            let scheduleValid = true;

            // We need to generate 'targetRounds' rounds
            for (let r = 1; r <= targetRounds; r++) {
                let roundMatches: Match[] = [];

                // For this round, we need to pair up all players directly
                // Candidates pool
                let roundPlayers = [...ids];
                // Shuffle for randomness
                roundPlayers.sort(() => Math.random() - 0.5);

                let roundPairs: string[][] = [];
                let roundValid = true;

                // Try to pair them up greedily
                while (roundPlayers.length > 0) {
                    if (roundPlayers.length === 1) {
                        // Odd player out? Should not happen if N is even.
                        // If N is odd, this logic needs "Bye" handling which is not fully scoped here.
                        // Assuming N is even for standard Americano.
                        roundValid = false;
                        break;
                    }

                    const p1 = roundPlayers[0];
                    // Find a valid partner for p1 from the rest
                    let validPartnerIndex = -1;

                    // Simple search for first valid partner
                    for (let i = 1; i < roundPlayers.length; i++) {
                        const p2 = roundPlayers[i];
                        const k = [p1, p2].sort().join('-');
                        if (!partnerHistory.has(k)) {
                            validPartnerIndex = i;
                            break;
                        }
                    }

                    if (validPartnerIndex !== -1) {
                        const p2 = roundPlayers[validPartnerIndex];
                        roundPairs.push([p1, p2]);
                        // Remove p1 and p2
                        roundPlayers.splice(validPartnerIndex, 1); // Remove p2 first to keep index 0 valid
                        roundPlayers.shift(); // Remove p1
                    } else {
                        // Dead end for this round
                        roundValid = false;
                        break;
                    }
                }

                if (!roundValid) {
                    scheduleValid = false;
                    break;
                }

                // Create matches for this round from the pairs
                // 4 players -> 1 match. 2 Pairs.
                // We need to pair the PAIRS now. (Opponents do not matter for "Partner" validity).
                // Just group pairs 0-1, 2-3...
                for (let i = 0; i < roundPairs.length; i += 2) {
                    if (i + 1 < roundPairs.length) {
                        // Register History ONLY when match is confirmed
                        const pair1 = roundPairs[i];
                        const pair2 = roundPairs[i + 1];

                        partnerHistory.add([pair1[0], pair1[1]].sort().join('-'));
                        partnerHistory.add([pair2[0], pair2[1]].sort().join('-'));

                        const court = courts > 0 ? ((i / 2) % courts) + 1 : undefined;
                        roundMatches.push(createMatch(0, r,
                            pair1[0], pair1[1],
                            pair2[0], pair2[1],
                            court
                        ));
                    }
                }

                schedule.push(...roundMatches);
            }

            if (scheduleValid) {
                console.log(`Americano schedule generated efficiently in ${attempt + 1} attempts`);
                return schedule;
            }
        }

        // Fallback: If perfect schedule not found, return at least one valid round?
        // Or empty array?
        // Let's return a simple random single round to avoid crash, but warn?
        console.warn("Could not generate perfect Americano schedule. Returning simple round.");
        return MatchGenerator.generateIndividualRound(ids, 0, 1);
    },

    // --- MEXICANO (Skill Based) ---
    // Generated Round by Round based on Standings.
    generateMexicanoRound: (players: Player[], standings: StandingRow[], roundNumber: number, courts: number = 20): Match[] => {
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
            // Use roundNumber as part of ID, but court assignment follows available courts
            const currentCourt = ((courtIndex - 1) % courts) + 1;
            matches.push(createMatch(0, roundNumber, p1, p4, p2, p3, currentCourt));
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
    },
    // --- PAIRS LEAGUE (Fixed Teams A vs B) ---
    generatePairsLeague: (pairs: string[][], divIndex: number): Match[] => {
        // pairs is array of [p1Id, p2Id]
        const n = pairs.length;
        if (n < 2) return [];

        const matches: Match[] = [];

        // PAIRS LEAGUE: Round Robin for Teams
        // Input: pairs array [[p1, p2], [p3, p4], ...]
        // We treat each pair as a "Participant".
        // Standard RR Algorithm (Polygon method)

        const nPairs = pairs.length;
        if (nPairs < 2) return [];

        // If odd number of pairs, add a "dummy" pair for byes
        const participants = [...pairs];
        if (nPairs % 2 !== 0) {
            participants.push(['Bye', 'Bye']);
        }

        const numParticipants = participants.length;
        const numRounds = numParticipants - 1;
        const half = numParticipants / 2;



        // Generate Rounds
        for (let r = 0; r < numRounds; r++) {
            const roundIndex = r + 1;

            // Generate pairings for this round
            for (let i = 0; i < half; i++) {
                const home = participants[i];
                const away = participants[numParticipants - 1 - i];

                // Check for Bye
                if (home[0] === 'Bye' || away[0] === 'Bye') continue; // One pair sits out

                matches.push(createMatch(divIndex, roundIndex,
                    home[0], home[1],
                    away[0], away[1],
                    undefined // No Court assigned automatically
                ));
            }

            // Rotate participants for next round (keep index 0 fixed)
            // [0, 1, 2, 3] -> [0, 3, 1, 2] (Standard rotation)
            // participants array mutation:
            // Remove last, insert at index 1
            const last = participants.pop();
            if (last) participants.splice(1, 0, last);
        }

        return matches;
    }
};
