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
    }
};
