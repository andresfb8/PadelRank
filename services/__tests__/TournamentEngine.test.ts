import { describe, it, expect } from 'vitest';
import { TournamentEngine } from '../TournamentEngine';
import { Player } from '../../types';

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
