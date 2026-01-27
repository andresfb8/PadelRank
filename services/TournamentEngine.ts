
import { Match, Division, MatchPair, Ranking } from '../types';

export class TournamentEngine {

    /**
     * Generates a single elimination bracket (and consolation if requested)
     */
    static generateBracket(
        participants: string[], // Array of IDs (or "p1-p2" strings)
        hasConsolation: boolean
    ): Division[] {
        const total = participants.length;
        if (total < 2) return [];

        // 1. Calculate Bracket Size (Power of 2)
        const size = Math.pow(2, Math.ceil(Math.log2(total)));

        // 2. Sort Participants by "Seed" (Assume input is sorted 1..N)
        // Map to Bracket Slots (e.g. 1 vs 16, 2 vs 15...) "Snake" order
        const bracketOrder = this.mapSeedsToBracket(participants, size);

        // 3. Create Divisions
        // Extract individual player IDs from pairs
        const allPlayerIds: string[] = [];
        participants.forEach(pairStr => {
            let p1Id = '';
            let p2Id = '';
            if (pairStr.includes('::')) {
                [p1Id, p2Id] = pairStr.split('::');
            } else if (pairStr.includes('-')) {
                [p1Id, p2Id] = pairStr.split('-');
            } else {
                p1Id = pairStr;
            }

            if (p1Id && p1Id !== 'BYE') allPlayerIds.push(p1Id);
            if (p2Id && p2Id !== 'BYE') allPlayerIds.push(p2Id);
        });

        const mainDiv: Division = {
            id: crypto.randomUUID(),
            numero: 1,
            name: "Cuadro Principal",
            status: "activa",
            players: allPlayerIds, // Individual player IDs
            matches: [],
            type: 'main'
        };

        const consolationDiv: Division = {
            id: crypto.randomUUID(),
            numero: 2,
            name: "Cuadro Consolación",
            status: "activa",
            players: [], // Will be populated with losers
            matches: [],
            type: 'consolation'
        };

        // 4. Generate Main Bracket Structure
        // rounds count: log2(16) = 4 rounds (R16, QF, SF, F)
        const totalRounds = Math.log2(size);

        // We generate from Round 1 to Final.
        // We store matches in a map to easily link "nextMatch"
        // Key: "round-index"
        const matchMap = new Map<string, Match>();

        for (let r = 1; r <= totalRounds; r++) {
            const matchesInRound = size / Math.pow(2, r); // Round 1 (size 16) -> 8 matches

            for (let i = 0; i < matchesInRound; i++) {
                const matchId = crypto.randomUUID();
                const m: Match = {
                    id: matchId,
                    jornada: r, // 1 = First Round, 2 = Second...
                    pair1: { p1Id: '', p2Id: '' },
                    pair2: { p1Id: '', p2Id: '' },
                    points: { p1: 0, p2: 0 },
                    status: 'pendiente',
                    roundName: this.getRoundName(matchesInRound)
                };

                matchMap.set(`${r}-${i}`, m);
                mainDiv.matches.push(m);
            }
        }

        // 5. Link Main Matches (Next Match Pointers) & Fill Round 1 Players
        for (let r = 1; r <= totalRounds; r++) {
            const matchesInRound = size / Math.pow(2, r);
            for (let i = 0; i < matchesInRound; i++) {
                const currentMatch = matchMap.get(`${r}-${i}`);
                if (!currentMatch) continue;

                // Link to Next Round (if not final)
                if (r < totalRounds) {
                    const nextRoundIndex = Math.floor(i / 2); // 0,1 -> 0; 2,3 -> 1
                    const nextMatch = matchMap.get(`${r + 1}-${nextRoundIndex}`);
                    if (nextMatch) {
                        currentMatch.nextMatchId = nextMatch.id;
                    }
                }

                // Fill Players (Only Round 1)
                if (r === 1) {
                    const p1Val = bracketOrder[i * 2];
                    const p2Val = bracketOrder[i * 2 + 1];
                    this.setPair(currentMatch.pair1, p1Val);
                    this.setPair(currentMatch.pair2, p2Val);
                    // BYE check will be done after all links are created
                } else {
                    // Placeholders
                    const prevMatch1 = matchMap.get(`${r - 1}-${i * 2}`);
                    const prevMatch2 = matchMap.get(`${r - 1}-${i * 2 + 1}`);
                    currentMatch.pair1 = { p1Id: '', p2Id: '', placeholder: prevMatch1 ? `Ganador ${prevMatch1.jornada}.${i * 2 + 1}` : '?' };
                    currentMatch.pair2 = { p1Id: '', p2Id: '', placeholder: prevMatch2 ? `Ganador ${prevMatch2.jornada}.${i * 2 + 2}` : '?' };
                }
            }
        }

        // 5.5 Process BYEs AFTER all matches are linked
        // This enables auto-advancement to work correctly
        for (let i = 0; i < size / 2; i++) {
            const match = matchMap.get(`1-${i}`);
            if (match) {
                // Reconstruct matchMap for ID-based lookup (needed by checkBye)
                const idMatchMap = new Map<string, Match>();
                matchMap.forEach(m => idMatchMap.set(m.id, m));
                this.checkBye(match, idMatchMap);
            }
        }

        // 6. Generate Consolation Structure (if needed)
        // Consolation usually takes Losers from Main Round 1.

        if (hasConsolation && size >= 4) {
            const consRounds = totalRounds - 1; // One less round
            const consMap = new Map<string, Match>();

            // Create Structure
            for (let r = 1; r <= consRounds; r++) {
                // Consolation R1 matches = Main R1 matches / 2
                const matchesCount = (size / 2) / Math.pow(2, r);

                for (let i = 0; i < matchesCount; i++) {
                    const m: Match = {
                        id: crypto.randomUUID(),
                        jornada: r,
                        pair1: { p1Id: '', p2Id: '', placeholder: 'Perdedor R1' },
                        pair2: { p1Id: '', p2Id: '', placeholder: 'Perdedor R1' },
                        points: { p1: 0, p2: 0 },
                        status: 'pendiente',
                        roundName: this.getRoundName(matchesCount) + " (Cons.)"
                    };
                    consMap.set(`${r}-${i}`, m);
                    consolationDiv.matches.push(m);
                }
            }

            // Link Consolation Internally
            for (let r = 1; r <= consRounds; r++) {
                const matchesCount = (size / 2) / Math.pow(2, r);
                for (let i = 0; i < matchesCount; i++) {
                    const curr = consMap.get(`${r}-${i}`);
                    if (curr && r < consRounds) {
                        const next = consMap.get(`${r + 1}-${Math.floor(i / 2)}`);
                        if (next) curr.nextMatchId = next.id;
                    }
                }
            }

            // Link Main Losers -> Consolation R1
            const mainR1 = size / 2;
            for (let i = 0; i < mainR1; i++) {
                const mainM = matchMap.get(`1-${i}`);
                const consM = consMap.get(`1-${Math.floor(i / 2)}`);

                if (mainM && consM) {
                    mainM.consolationMatchId = consM.id;
                }
            }
        }

        return [mainDiv, consolationDiv];
    }

    // --- Helpers ---

    private static setPair(pair: MatchPair, val: string) {
        if (val === 'BYE') {
            pair.p1Id = 'BYE';
            pair.p2Id = '';
        } else if (val.includes('::')) {
            const [p1, p2] = val.split('::');
            pair.p1Id = p1;
            pair.p2Id = p2 || '';
        } else if (val.includes('-')) {
            // Legacy support or fallback, but risky if ID has hyphen
            const [p1, p2] = val.split('-');
            pair.p1Id = p1;
            pair.p2Id = p2 || '';
        } else {
            pair.p1Id = val;
            pair.p2Id = '';
        }
    }

    private static checkBye(m: Match, matchMap?: Map<string, Match>) {
        let winner: { p1: string, p2: string } | null = null;

        if (m.pair1.p1Id === 'BYE') {
            m.status = 'finalizado';
            m.score = { description: 'BYE' };
            m.points = { p1: 0, p2: 1 }; // P2 wins
            winner = { p1: m.pair2.p1Id, p2: m.pair2.p2Id };
        } else if (m.pair2.p1Id === 'BYE') {
            m.status = 'finalizado';
            m.score = { description: 'BYE' };
            m.points = { p1: 1, p2: 0 }; // P1 wins
            winner = { p1: m.pair1.p1Id, p2: m.pair1.p2Id };
        }

        // Auto-advance winner to next match if there is one
        if (winner && m.nextMatchId && matchMap) {
            const nextMatch = matchMap.get(m.nextMatchId);
            if (nextMatch) {
                if (this.isEmpty(nextMatch.pair1)) {
                    nextMatch.pair1.p1Id = winner.p1;
                    nextMatch.pair1.p2Id = winner.p2;
                    delete nextMatch.pair1.placeholder;
                } else if (this.isEmpty(nextMatch.pair2)) {
                    nextMatch.pair2.p1Id = winner.p1;
                    nextMatch.pair2.p2Id = winner.p2;
                    delete nextMatch.pair2.placeholder;
                }
                // Check if next match also has a BYE (recursive)
                this.checkBye(nextMatch, matchMap);
            }
        }
    }

    private static getRoundName(matchCount: number): string {
        if (matchCount === 1) return "Final";
        if (matchCount === 2) return "Semifinales";
        if (matchCount === 4) return "Cuartos";
        if (matchCount === 8) return "Octavos";
        return `Ronda de ${matchCount * 2}`;
    }

    static mapSeedsToBracket(sortedPlayers: string[], size: number): string[] {
        let rounds = Math.log2(size);
        let brackets = [1, 2];

        for (let i = 0; i < rounds - 1; i++) {
            const nextBrackets = [];
            const currSize = brackets.length * 2;
            for (let seed of brackets) {
                nextBrackets.push(seed);
                nextBrackets.push((currSize + 1) - seed);
            }
            brackets = nextBrackets;
        }

        return brackets.map(seed => {
            if (seed <= sortedPlayers.length) return sortedPlayers[seed - 1];
            return 'BYE';
        });
    }

    /**
     * Logic to advance a winner to the next match
     */
    static advanceWinner(
        currentMatch: Match,
        ranking: Ranking,
        winnerId: { p1: string, p2: string } // Winner Pair IDs
    ): Division[] {
        if (!currentMatch.nextMatchId) return ranking.divisions;

        // Clone divisions to avoid mutation issues (React state)
        const newDivisions = [...ranking.divisions];

        // Find Next Match
        let nextMatch: Match | undefined;

        // Search in all divisions (Main or Consolation)
        for (const div of newDivisions) {
            nextMatch = div.matches.find(m => m.id === currentMatch.nextMatchId);
            if (nextMatch) break;
        }

        if (nextMatch) {
            if (this.isEmpty(nextMatch.pair1)) {
                nextMatch.pair1.p1Id = winnerId.p1;
                nextMatch.pair1.p2Id = winnerId.p2;
                delete nextMatch.pair1.placeholder;
            } else if (this.isEmpty(nextMatch.pair2)) {
                nextMatch.pair2.p1Id = winnerId.p1;
                nextMatch.pair2.p2Id = winnerId.p2;
                delete nextMatch.pair2.placeholder;
            }
        }
        return newDivisions;
    }

    // Also move loser to consolation
    static moveLoserToConsolation(
        currentMatch: Match,
        ranking: Ranking,
        loserId: { p1: string, p2: string }
    ): Division[] {
        console.log("🔍 moveLoserToConsolation called for match:", currentMatch.id);
        console.log("   consolationMatchId:", currentMatch.consolationMatchId);
        console.log("   loserId:", loserId);

        const newDivisions = [...ranking.divisions];
        let consMatch: Match | undefined;

        // Try to find consolation match by ID first (R1 matches have this)
        if (currentMatch.consolationMatchId) {
            for (const div of newDivisions) {
                consMatch = div.matches.find(m => m.id === currentMatch.consolationMatchId);
                if (consMatch) {
                    console.log("✅ Found consolation match by ID:", consMatch.id, "in division:", div.name);
                    break;
                }
            }
        }

        // Fallback: If no consolationMatchId (e.g., R2 loser with BYE in R1), find first available slot in Consolation R1
        if (!consMatch) {
            console.log("⚠️ No consolationMatchId - searching for available slot in Consolation R1");
            const consolationDiv = newDivisions.find(d => d.type === 'consolation');

            if (consolationDiv) {
                // Find first match in Consolation R1 with an empty slot
                const consR1Matches = consolationDiv.matches.filter(m => m.jornada === 1);

                for (const match of consR1Matches) {
                    if (this.isEmpty(match.pair1) || this.isEmpty(match.pair2)) {
                        consMatch = match;
                        console.log("✅ Found available slot in consolation match:", match.id);
                        break;
                    }
                }
            }
        }

        if (!consMatch) {
            console.error("❌ No consolation match available for loser");
            return newDivisions;
        }

        if (this.isEmpty(consMatch.pair1)) {
            console.log("   → Assigning loser to pair1 of consolation match");
            consMatch.pair1.p1Id = loserId.p1;
            consMatch.pair1.p2Id = loserId.p2;
            delete consMatch.pair1.placeholder;
        } else if (this.isEmpty(consMatch.pair2)) {
            console.log("   → Assigning loser to pair2 of consolation match");
            consMatch.pair2.p1Id = loserId.p1;
            consMatch.pair2.p2Id = loserId.p2;
            delete consMatch.pair2.placeholder;
        } else {
            console.warn("⚠️ Both pairs in consolation match are already filled!");
        }

        return newDivisions;
    }

    private static isEmpty(pair: MatchPair) {
        return !pair.p1Id && !pair.p2Id;
    }
}
