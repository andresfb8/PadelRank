import { describe, it, expect } from 'vitest';
import { TournamentEngine } from '../TournamentEngine';
import { Player, Match, Division, Ranking } from '../../types';

// Minimal Ranking stub for engine methods that need it
const makeRanking = (divisions: Division[]): Ranking => ({
    id: 'r1', nombre: 'Test', categoria: 'Masculino',
    fechaInicio: '', status: 'activo', divisions,
    format: 'elimination',
    config: { eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' } }
});

// Finalize a match with p1 winning (sets status, score, points)
const finalizeP1Wins = (m: Match): void => {
    m.status = 'finalizado';
    m.score = { set1: { p1: 6, p2: 3 }, set2: { p1: 6, p2: 3 } };
    m.points = { p1: 1, p2: 0 };
};

// Mock Players
const createPlayers = (count: number): Record<string, Player> => {
    const players: Record<string, Player> = {};
    for (let i = 1; i <= count; i++) {
        players[`p${i}`] = {
            id: `p${i}`,
            nombre: `Player`,
            apellidos: `${i}`,
            email: `p${i}@test.com`,
            telefono: '123',
            stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
        };
    }
    return players;
};

describe('TournamentEngine - Elimination Mode', () => {

    it('should generate a correct bracket for 8 players', () => {
        const players = createPlayers(8);
        const playerIds = Object.keys(players);

        const [division] = TournamentEngine.generateBracket(playerIds, false);

        // 8 players -> 7 matches total (4 QF + 2 SF + 1 F)
        expect(division.matches.length).toBe(7);

        // Check Round 1 (Quarter Finals)
        const round1Msg = division.matches.filter(m => m.jornada === 1);
        expect(round1Msg.length).toBe(4);
    });

    it('should seed players correctly (1 vs 8, 2 vs 7, etc) for 8 players', () => {
        const players = createPlayers(8);
        // p1..p8 created in order.
        // If passed in order, seed logic should pair:
        // Match 1: p1 vs p8
        // Match 2: p4 vs p5
        // Match 3: p2 vs p7
        // Match 4: p3 vs p6
        // (Standard bracket order typically 1-16, 8-9... but our simple impl might differ, let's just check pairing existence)

        const playerIds = Object.keys(players);
        const [division] = TournamentEngine.generateBracket(playerIds, false);
        const round1 = division.matches.filter(m => m.jornada === 1);

        // Find match with p1
        const m1 = round1.find(m => m.pair1.p1Id === 'p1');
        expect(m1).toBeDefined();
        // Should play p8?
        // Our engine implements:
        // 0 vs N-1
        // 1 vs N-2
        // So p1 (idx 0) vs p8 (idx 7)
        expect(m1?.pair2.p1Id).toBe('p8');
    });

    it('should handle byes for 7 players', () => {
        const players = createPlayers(7);
        const playerIds = Object.keys(players);

        const [division] = TournamentEngine.generateBracket(playerIds, false);

        // 7 players -> Next power of 2 is 8.
        // 1 BYE.
        // Top seed (p1) should get the BYE if seeded correctly?
        // p1 (0) vs BYE (7 - empty slot)

        const round1 = division.matches.filter(m => m.jornada === 1);

        // There should be 4 matches in R1 logic (filling the 8 slots), 
        // but matches with BYEs might be auto-resolved or marked.

        const byeMatch = round1.find(m => m.pair1.p1Id === 'BYE' || m.pair2.p1Id === 'BYE');
        expect(byeMatch).toBeDefined();

        // p1 vs BYE
        const m1 = round1.find(m => m.pair1.p1Id === 'p1');
        expect(m1?.pair2.p1Id).toBe('BYE');
    });

    it('should generate correct round names', () => {
        const players = createPlayers(4);
        const playerIds = Object.keys(players);
        const [division] = TournamentEngine.generateBracket(playerIds, false);

        // 4 players -> 2 rounds.
        // R1: Semifinals
        // R2: Final

        const r1 = division.matches.find(m => m.jornada === 1);
        const r2 = division.matches.find(m => m.jornada === 2);

        expect(r1?.roundName).toBe('Semifinales');
        expect(r2?.roundName).toBe('Final');
    });

});

describe('TournamentEngine - Consolation (feed-in)', () => {

    it('generateBracket sets consolationMatchId and consolationSlot on every R1 match', () => {
        // 7 players → size 8, 1 BYE → 4 R1 matches, 2 consolation R1 matches
        const playerIds = Object.keys(createPlayers(7));
        const [, consolation] = TournamentEngine.generateBracket(playerIds, true);
        const [main] = TournamentEngine.generateBracket(playerIds, true);

        const r1Matches = main.matches.filter(m => m.jornada === 1);
        expect(r1Matches).toHaveLength(4);

        r1Matches.forEach(m => {
            expect(m.consolationMatchId).toBeDefined();
            expect(m.consolationSlot).toBeOneOf([1, 2]);
        });

        // consolationSlot must be 1 for even-indexed R1 matches and 2 for odd
        expect(r1Matches[0].consolationSlot).toBe(1);
        expect(r1Matches[1].consolationSlot).toBe(2);
        expect(r1Matches[2].consolationSlot).toBe(1);
        expect(r1Matches[3].consolationSlot).toBe(2);
    });

    it('consolation R1 slot stays empty after generation (no premature BYE fill)', () => {
        // 7 players → p1 gets BYE. Their consolation slot must remain empty at generation time.
        const playerIds = Object.keys(createPlayers(7));
        const [main, consolation] = TournamentEngine.generateBracket(playerIds, true);

        const byeR1 = main.matches.find(m =>
            m.jornada === 1 && (m.pair1.p1Id === 'BYE' || m.pair2.p1Id === 'BYE')
        )!;
        expect(byeR1).toBeDefined();

        const consMatch = consolation.matches.find(m => m.id === byeR1.consolationMatchId)!;
        expect(consMatch).toBeDefined();

        // The slot reserved for the bye-seed should be empty (not 'BYE') at generation time
        const reservedSlot = byeR1.consolationSlot === 1 ? consMatch.pair1 : consMatch.pair2;
        expect(reservedSlot.p1Id).toBe('');
    });

    it('R1 real loser fills the correct consolation slot', () => {
        // 4 players, no byes → 2 R1 matches → 1 consolation R1 match
        const playerIds = Object.keys(createPlayers(4)); // p1,p2,p3,p4
        const [main, consolation] = TournamentEngine.generateBracket(playerIds, true);

        // Finalize R1 match 0 (p1 wins, p4 loses — based on snake seeding)
        const r1m0 = main.matches.find(m => m.jornada === 1 && m.pair1.p1Id === 'p1')!;
        expect(r1m0).toBeDefined();
        const loserPair = r1m0.pair2; // p4

        finalizeP1Wins(r1m0);

        const ranking = makeRanking([main, consolation]);
        const result = TournamentEngine.moveLoserToConsolation(r1m0, ranking, { p1: loserPair.p1Id, p2: loserPair.p2Id });

        const consMatch = result
            .flatMap(d => d.matches)
            .find(m => m.id === r1m0.consolationMatchId)!;

        const filledSlot = r1m0.consolationSlot === 1 ? consMatch.pair1 : consMatch.pair2;
        expect(filledSlot.p1Id).toBe(loserPair.p1Id);
    });

    it('bye-seed losing R2 routes to the reserved consolation slot', () => {
        // 7 players → p1 has BYE, plays first real match in R2
        const playerIds = Object.keys(createPlayers(7));
        let [main, consolation] = TournamentEngine.generateBracket(playerIds, true);

        const byeR1 = main.matches.find(m =>
            m.jornada === 1 && (m.pair1.p1Id === 'BYE' || m.pair2.p1Id === 'BYE')
        )!;
        const byeSeed = byeR1.pair1.p1Id !== 'BYE' ? byeR1.pair1 : byeR1.pair2;

        // Find the R2 match where the bye-seed appears
        const r2Match = main.matches.find(m =>
            m.jornada === 2 &&
            (m.pair1.p1Id === byeSeed.p1Id || m.pair2.p1Id === byeSeed.p1Id)
        )!;
        expect(r2Match).toBeDefined();

        // Simulate bye-seed LOSING R2 (pair2 wins)
        const isByeSeedPair1 = r2Match.pair1.p1Id === byeSeed.p1Id;
        r2Match.status = 'finalizado';
        r2Match.score = { set1: { p1: 3, p2: 6 }, set2: { p1: 3, p2: 6 } };
        r2Match.points = isByeSeedPair1 ? { p1: 0, p2: 1 } : { p1: 1, p2: 0 };

        const ranking = makeRanking([main, consolation]);
        const result = TournamentEngine.moveLoserToConsolation(
            r2Match, ranking, { p1: byeSeed.p1Id, p2: byeSeed.p2Id }
        );

        // The consolation slot reserved by the bye-seed's R1 match should now be filled
        const consMatch = result
            .flatMap(d => d.matches)
            .find(m => m.id === byeR1.consolationMatchId)!;

        const reservedSlot = byeR1.consolationSlot === 1 ? consMatch.pair1 : consMatch.pair2;
        expect(reservedSlot.p1Id).toBe(byeSeed.p1Id);
    });

    it('tryResolveConsolationDeferred: bye-seed winning R2 triggers BYE walkover for waiting opponent', () => {
        // 7 players → p1 has BYE
        // R1 real loser fills consolation slot first, then p1 wins R2
        // → consolation R1 match should auto-resolve (waiting pair wins by walkover)
        const playerIds = Object.keys(createPlayers(7));
        let [main, consolation] = TournamentEngine.generateBracket(playerIds, true);

        const byeR1 = main.matches.find(m =>
            m.jornada === 1 && (m.pair1.p1Id === 'BYE' || m.pair2.p1Id === 'BYE')
        )!;
        const byeSeed = byeR1.pair1.p1Id !== 'BYE' ? byeR1.pair1 : byeR1.pair2;

        // Fill the OTHER slot in consolation with a real R1 loser
        const realSlot = byeR1.consolationSlot === 1 ? 2 : 1;
        const consMatch = consolation.matches.find(m => m.id === byeR1.consolationMatchId)!;
        if (realSlot === 1) {
            consMatch.pair1.p1Id = 'someLoser'; consMatch.pair1.p2Id = '';
            delete consMatch.pair1.placeholder;
        } else {
            consMatch.pair2.p1Id = 'someLoser'; consMatch.pair2.p2Id = '';
            delete consMatch.pair2.placeholder;
        }

        // Simulate bye-seed WINNING R2
        const r2Match = main.matches.find(m =>
            m.jornada === 2 &&
            (m.pair1.p1Id === byeSeed.p1Id || m.pair2.p1Id === byeSeed.p1Id)
        )!;
        const isByeSeedPair1 = r2Match.pair1.p1Id === byeSeed.p1Id;
        r2Match.status = 'finalizado';
        r2Match.score = { set1: { p1: 6, p2: 3 }, set2: { p1: 6, p2: 3 } };
        r2Match.points = isByeSeedPair1 ? { p1: 1, p2: 0 } : { p1: 0, p2: 1 };

        const result = TournamentEngine.tryResolveConsolationDeferred({ divisions: [main, consolation] });

        const resolvedConsMatch = result
            .flatMap(d => d.matches)
            .find(m => m.id === byeR1.consolationMatchId)!;

        // Reserved slot should now be BYE
        const resolvedReservedSlot = byeR1.consolationSlot === 1
            ? resolvedConsMatch.pair1
            : resolvedConsMatch.pair2;
        expect(resolvedReservedSlot.p1Id).toBe('BYE');

        // Match should be auto-finalized with 'someLoser' winning by walkover
        expect(resolvedConsMatch.status).toBe('finalizado');
        expect(resolvedConsMatch.score?.description).toBe('BYE');
    });

    it('checkBye handles double-BYE by marking match no_disputado', () => {
        const [main, consolation] = TournamentEngine.generateBracket(
            Object.keys(createPlayers(4)), true
        );
        const allMap = new Map<string, Match>();
        [...main.matches, ...consolation.matches].forEach(m => allMap.set(m.id, m));

        const consR1 = consolation.matches.find(m => m.jornada === 1)!;
        consR1.pair1.p1Id = 'BYE'; consR1.pair1.p2Id = '';
        consR1.pair2.p1Id = 'BYE'; consR1.pair2.p2Id = '';

        TournamentEngine.checkBye(consR1, allMap);

        expect(consR1.status).toBe('no_disputado');
    });

});
