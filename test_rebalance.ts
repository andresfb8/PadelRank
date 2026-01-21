
import { calculatePromotions } from './services/logic';
import { Ranking, Division, Match } from './types';

// Mock data helpers
const createMockPlayer = (id: string) => ({
    id,
    nombre: `Player ${id}`,
    apellidos: 'Test',
    email: `p${id}@test.com`,
    telefono: '123456789',
    stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
});

const createMockMatch = (p1: string, p2: string, pointsP1: number, pointsP2: number): Match => ({
    id: `m-${p1}-${p2}`,
    jornada: 1,
    pair1: { p1Id: p1, p2Id: '' },
    pair2: { p1Id: p2, p2Id: '' },
    points: { p1: pointsP1, p2: pointsP2 },
    status: 'finalizado'
});

// Setup Scenario: 2 Divisions, 4 players each.
// Div 1: P1, P2, P3, P4
// Div 2: P5, P6, P7, P8
// Scenario: P3 retires (or is substituted and removed)
// Standard Logic: Top 2 Promote, Bottom 2 Relegate.
// Imbalance Issue: If P3 is gone, Div 1 has 3 players. Logic might just move P5, P6 up, and P4 down?
// We want to force Div 1 to have 4 players.

console.log("--- Starting Rebalance Test ---");

// 1. Mock Ranking State
const div1Players = ['P1', 'P2', 'P3', 'P4'];
const div2Players = ['P5', 'P6', 'P7', 'P8'];

// Matches to determine standings
// Div 1 Standings: P1 (9pts), P2 (6pts), P3 (3pts), P4 (0pts) -> P3 is 3rd, P4 is 4th.
const div1Matches = [
    createMockMatch('P1', 'P2', 3, 0),
    createMockMatch('P1', 'P3', 3, 0),
    createMockMatch('P1', 'P4', 3, 0),
    createMockMatch('P2', 'P3', 3, 0),
    createMockMatch('P2', 'P4', 3, 0),
    createMockMatch('P3', 'P4', 3, 0),
];

// Div 2 Standings: P5 (9pts), P6 (6pts), P7 (3pts), P8 (0pts)
const div2Matches = [
    createMockMatch('P5', 'P6', 3, 0),
    createMockMatch('P5', 'P7', 3, 0),
    createMockMatch('P5', 'P8', 3, 0),
    createMockMatch('P6', 'P7', 3, 0),
    createMockMatch('P6', 'P8', 3, 0),
    createMockMatch('P7', 'P8', 3, 0),
];

const mockRanking: Ranking = {
    id: 'test-rank',
    nombre: 'Test',
    categoria: 'Mixto',
    fechaInicio: '2025-01-01',
    status: 'activo',
    divisions: [
        {
            id: 'd1', numero: 1, status: 'activa',
            players: div1Players,
            matches: div1Matches,
            retiredPlayers: ['P3'] // P3 RETIRED!
        },
        {
            id: 'd2', numero: 2, status: 'activa',
            players: div2Players,
            matches: div2Matches
        }
    ],
    config: {
        promotionCount: 2,
        relegationCount: 2,
        pointsPerWin2_0: 3,
        pointsPerWin2_1: 2,
        pointsDraw: 1,
        pointsPerLoss2_1: 0,
        pointsPerLoss2_0: 0
    }
};

try {
    const result = calculatePromotions(mockRanking);

    console.log("Calculated New Divisions:");
    result.newDivisions.forEach(d => {
        console.log(`Div ${d.numero}: ${d.players.length} players -> ${d.players.join(', ')}`);
    });

    console.log("\nMovements:");
    result.movements.forEach(m => {
        console.log(`${m.playerId}: Div ${m.fromDiv} -> Div ${m.toDiv} (${m.type})`);
    });

    // Verification
    const d1Count = result.newDivisions.find(d => d.numero === 1)?.players.length;
    const d2Count = result.newDivisions.find(d => d.numero === 2)?.players.length;

    if (d1Count === 4 && d2Count === 4) {
        console.log("\nPASS: Divisions balanced (Div 1 full priority)");
    } else {
        console.log(`\nFAIL: Div 1 has ${d1Count}, Div 2 has ${d2Count}`);
    }

    console.log("\n--- Testing Manual Override ---");
    // P8 is last in Div 2. Without override, P8 stays in Div 2 (or drops if rebalance pushes down).
    // We FORCE P8 to Div 1.
    console.log("Forcing P8 (Div 2, Last Place) -> Div 1");

    const overrides = [{ playerId: 'P8', forceDiv: 1 }];
    // @ts-ignore
    const overrideResult = calculatePromotions(mockRanking, overrides);

    const d1Players = overrideResult.newDivisions.find(d => d.numero === 1)?.players || [];
    console.log(`Div 1 Players: ${d1Players.join(', ')}`);

    if (d1Players.includes('P8') && d1Players.length === 4) {
        console.log("PASS: P8 is in Div 1 and capacity maintained.");
    } else {
        console.log(`FAIL: P8 missing or capacity broken. P8 in? ${d1Players.includes('P8')}. Size: ${d1Players.length}`);
    }

} catch (e) {
    console.error("Error running calculation:", e);
}
