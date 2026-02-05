
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

        // 6. Generate Consolation Structure (if needed) - MOVED BEFORE BYE PROCESSING
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

        // 5.5 Process BYEs AFTER all matches are linked (including Consolation links)
        for (let i = 0; i < size / 2; i++) {
            const match = matchMap.get(`1-${i}`);
            if (match) {
                // Reconstruct matchMap for ID-based lookup (needed by checkBye)
                const idMatchMap = new Map<string, Match>();
                matchMap.forEach(m => idMatchMap.set(m.id, m));
                // Add Consolation matches to map too
                if (hasConsolation) {
                    consolationDiv.matches.forEach(m => idMatchMap.set(m.id, m));
                }

                this.checkBye(match, idMatchMap);

                // NEW: If match is BYE (Auto-Finalized), move loser (BYE) to Consolation
                if (hasConsolation && match.status === 'finalizado' && match.score?.description === 'BYE') {
                    // Identify loser
                    let loser = { p1: '', p2: '' };
                    // Points set by checkBye: 1-0 or 0-1
                    if (match.points.p1 > match.points.p2) loser = { p1: match.pair2.p1Id, p2: match.pair2.p2Id };
                    else loser = { p1: match.pair1.p1Id, p2: match.pair1.p2Id };

                    // Move to Consolation
                    if (match.consolationMatchId) {
                        const consM = idMatchMap.get(match.consolationMatchId);
                        if (consM) {
                            if (this.isEmpty(consM.pair1)) {
                                consM.pair1.p1Id = loser.p1;
                                consM.pair1.p2Id = loser.p2;
                                delete consM.pair1.placeholder;
                            } else if (this.isEmpty(consM.pair2)) {
                                consM.pair2.p1Id = loser.p1;
                                consM.pair2.p2Id = loser.p2;
                                delete consM.pair2.placeholder;
                            }
                            // Recursive Check BYE in Consolation
                            this.checkBye(consM, idMatchMap);
                        }
                    }
                }
            }
        }

        // 6 (Already done above via Consolation Logic inside loop? NO, structure creation was before loop).
        // Return
        return [mainDiv, consolationDiv];
    }

    /**
     * Regenerates the playoff bracket by removing existing playoff divisions and creating new ones.
     * Dangerous operation - wipes existing playoff data.
     */
    static regeneratePlayoff(
        ranking: Ranking,
        qualifiedParticipants: string[],
        hasConsolation: boolean
    ): Division[] {
        // Keep non-playoff divisions (Group Phase)
        const groupDivisions = ranking.divisions.filter(d =>
            d.type !== 'main' && d.type !== 'consolation'
        );

        // Generate new Bracket
        const newPlayoffDivisions = this.generateBracket(qualifiedParticipants, hasConsolation);

        // Mark playoff divisions with stage
        const markedPlayoffDivisions = newPlayoffDivisions.map(d => ({
            ...d,
            stage: 'playoff' as const
        }));

        // Merge Back
        return [...groupDivisions, ...markedPlayoffDivisions];
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

    public static checkBye(m: Match, matchMap?: Map<string, Match>) {
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

        // 1. Try to find consolation match by ID first (Standard R1 logic)
        if (currentMatch.consolationMatchId) {
            for (const div of newDivisions) {
                consMatch = div.matches.find(m => m.id === currentMatch.consolationMatchId);
                if (consMatch) {
                    console.log("✅ Found consolation match by ID:", consMatch.id, "in division:", div.name);
                    break;
                }
            }
        }

        // Pre-Flight Check: Is this Losed Pair ALREADY in the Consolation bracket?
        // This prevents duplicate entries if the user updates the score multiple times.
        const alreadyInConsolation = newDivisions.some(d =>
            d.type === 'consolation' && d.matches.some(m =>
                (m.pair1.p1Id === loserId.p1 && (m.pair1.p2Id || '') === (loserId.p2 || '')) ||
                (m.pair2.p1Id === loserId.p1 && (m.pair2.p2Id || '') === (loserId.p2 || ''))
            )
        );

        if (alreadyInConsolation) {
            console.log("⚠️ Player already in consolation bracket. Skipping logic.");
            return newDivisions;
        }

        // 2. Logic for Loser coming from R2+ (who had a BYE in R1)
        if (!consMatch && currentMatch.jornada > 1) {
            console.log("⚠️ No consolationMatchId on current match. Checking logic for advanced rounds (BYE catch-up)...");

            let originMatch: Match | undefined;

            for (const div of newDivisions) {
                if (div.type === 'consolation') continue; // Don't look in consolation

                // Find a match in Round 1 that has this player/pair
                // Use relaxed comparison for P2 (undefined vs empty string)
                originMatch = div.matches.find(m =>
                    m.jornada === 1 &&
                    ((m.pair1.p1Id === loserId.p1 && (m.pair1.p2Id || '') === (loserId.p2 || '')) ||
                        (m.pair2.p1Id === loserId.p1 && (m.pair2.p2Id || '') === (loserId.p2 || '')))
                );
                if (originMatch) break;
            }

            if (originMatch && originMatch.consolationMatchId) {
                console.log("✅ Found Origin R1 Match:", originMatch.id, "with consolationMatchId:", originMatch.consolationMatchId);
                // Now find THAT consolation match
                for (const div of newDivisions) {
                    consMatch = div.matches.find(m => m.id === originMatch!.consolationMatchId);
                    if (consMatch) {
                        // CRITICAL: Since this slot was likely filled with "BYE", we need to checking if we need to "Overwrite" the BYE
                        // If the match is "finalizado" with "BYE", we must reset it.
                        if (consMatch.score?.description === 'BYE') {
                            console.log("   -> Target match was auto-finalized as BYE. Resetting for real match.");

                            // 1. Identify who "won" this BYE match (the one who is NOT BYE)
                            let previousWinnerId: string | undefined;
                            let previousWinnerPairIndex: 1 | 2 = 1;

                            if (consMatch.pair1.p1Id !== 'BYE') {
                                previousWinnerId = consMatch.pair1.p1Id;
                                previousWinnerPairIndex = 1;
                            } else {
                                previousWinnerId = consMatch.pair2.p1Id;
                                previousWinnerPairIndex = 2;
                            }

                            // 2. Reset the current match
                            consMatch.status = 'pendiente';
                            consMatch.score = undefined;
                            consMatch.points = { p1: 0, p2: 0 };

                            // Important: Clear the BYE slot
                            if (consMatch.pair1.p1Id === 'BYE') {
                                consMatch.pair1.p1Id = '';
                            } else if (consMatch.pair2.p1Id === 'BYE') {
                                consMatch.pair2.p1Id = '';
                            }

                            // 3. PULL-BACK: Remove the previous winner from the NEXT match
                            if (previousWinnerId && consMatch.nextMatchId) {
                                console.log("   -> Pulling back previous winner:", previousWinnerId, "from next match:", consMatch.nextMatchId);
                                // Find next match in any division (likely same division)
                                let nextMatch: Match | undefined;
                                for (const d of newDivisions) {
                                    nextMatch = d.matches.find(m => m.id === consMatch!.nextMatchId);
                                    if (nextMatch) break;
                                }

                                if (nextMatch) {
                                    // Remove the player/pair from next match
                                    if (nextMatch.pair1.p1Id === previousWinnerId) {
                                        nextMatch.pair1.p1Id = '';
                                        nextMatch.pair1.p2Id = '';
                                        nextMatch.pair1.placeholder = 'Ganador Previo'; // Restore placeholder
                                        console.log("      -> Removed from Pair 1");
                                    } else if (nextMatch.pair2.p1Id === previousWinnerId) {
                                        nextMatch.pair2.p1Id = '';
                                        nextMatch.pair2.p2Id = '';
                                        nextMatch.pair2.placeholder = 'Ganador Previo'; // Restore placeholder
                                        console.log("      -> Removed from Pair 2");
                                    }

                                    // Also ensure Next Match is not marked as Finalized or BYE if it was
                                    // (Unlikely for next match to be BYE immediately unless double BYE, but good practice)
                                    if (nextMatch.status === 'finalizado' && nextMatch.score?.description === 'BYE') {
                                        // Complex edge case: Recursive rollback? 
                                        // For now, let's assume just resetting the slot is enough to stop the chain, 
                                        // but ideally we should reset status if it was finalized.
                                        // But if it was finalized, it means IT had a BYE too? 
                                        // Safest is to just clear the participant. The next re-evaluation/user interaction handles it.
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            } else {
                console.warn("⚠️ Could not find R1 origin match for this loser, or it has no consolation link.");
            }
        }

        // 3. Fallback: Find any empty slot in Consolation R1
        // Only valid if the loser is coming from R1 (Standard flow).
        // If they are dropping from R2+, they MUST be handled by Step 2. If Step 2 failed, we STOP.
        if (!consMatch && currentMatch.jornada === 1) {
            console.log("⚠️ No consolationMatchId found even after R1 traceback. Searching for available slot in Consolation R1.");
            const consolationDiv = newDivisions.find(d => d.type === 'consolation');

            if (consolationDiv) {
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

        // Assign Loser to valid slot
        let assigned = false;

        // Check for BYE overwriting first (Specific for the R2 drop-down case)
        if (consMatch.pair1.p1Id === 'BYE') {
            console.log("   -> Overwriting 'BYE' in pair1");
            consMatch.pair1.p1Id = loserId.p1;
            consMatch.pair1.p2Id = loserId.p2;
            delete consMatch.pair1.placeholder;
            assigned = true;
        } else if (consMatch.pair2.p1Id === 'BYE') {
            console.log("   -> Overwriting 'BYE' in pair2");
            consMatch.pair2.p1Id = loserId.p1;
            consMatch.pair2.p2Id = loserId.p2;
            delete consMatch.pair2.placeholder;
            assigned = true;
        }

        // Normal Empty Slot Assignment
        if (!assigned) {
            if (this.isEmpty(consMatch.pair1)) {
                console.log("   -> Assigning loser to pair1");
                consMatch.pair1.p1Id = loserId.p1;
                consMatch.pair1.p2Id = loserId.p2;
                delete consMatch.pair1.placeholder;
            } else if (this.isEmpty(consMatch.pair2)) {
                console.log("   -> Assigning loser to pair2");
                consMatch.pair2.p1Id = loserId.p1;
                consMatch.pair2.p2Id = loserId.p2;
                delete consMatch.pair2.placeholder;
            } else {
                console.warn("⚠️ Both pairs in consolation match are already filled!");
            }
        }

        // NEW: Check if the moved loser is BYE (unlikely if dropping from R2, but possible in other flows)
        if (loserId.p1 === 'BYE') {
            const allMatchesMap = new Map<string, Match>();
            newDivisions.forEach(d => d.matches.forEach(m => allMatchesMap.set(m.id, m)));
            this.checkBye(consMatch, allMatchesMap);
        }

        return newDivisions;
    }

    private static isEmpty(pair: MatchPair) {
        return !pair.p1Id && !pair.p2Id;
    }
}
