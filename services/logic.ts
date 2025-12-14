
import { Match, MatchScore, Player, StandingRow, Ranking, Division } from "../types";

// PRD 4.4.2 & 4.6.2 Logic
export function calculateMatchPoints(
  s1: { p1: number; p2: number },
  s2: { p1: number; p2: number } | undefined,
  s3: { p1: number; p2: number } | undefined,
  isIncomplete: boolean,
  config?: {
    pointsPerWin2_0: number;
    pointsPerWin2_1: number;
    pointsDraw: number;
    pointsPerLoss2_1: number;
    pointsPerLoss2_0: number;
  },
  forceDraw?: boolean,
  isIndividual?: boolean
): {
  points: { p1: number; p2: number };
  finalizationType: 'completo' | 'victoria_incompleta' | 'empate_diferencia' | 'empate_manual' | 'derrota_incompleta';
  description: string;
} {
  // Defaults (Classic)
  const cfg = config || {
    pointsPerWin2_0: 4,
    pointsPerWin2_1: 3,
    pointsDraw: 2,
    pointsPerLoss2_1: 1,
    pointsPerLoss2_0: 0
  };

  // Force Draw (Manual)
  if (forceDraw) {
    return { points: { p1: cfg.pointsDraw, p2: cfg.pointsDraw }, finalizationType: 'empate_manual', description: 'Empate Acordado' };
  }

  // Logic mostly for Pair 1 perspective, mirrored for Pair 2 if needed
  const p1WonS1 = s1.p1 > s1.p2;

  // --- SPECIAL LOGIC FOR INDIVIDUAL RANKING ---
  if (isIndividual) {
    // Case 1: Only 1 Set Played -> Winner of set wins match (treated as 2-0 win points wise usually, or simple win)
    if (!s2) {
      if (p1WonS1) return { points: { p1: cfg.pointsPerWin2_0, p2: cfg.pointsPerLoss2_0 }, finalizationType: 'completo', description: 'Victoria (1 Set)' };
      else return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'completo', description: 'Derrota (1 Set)' };
    }

    // Case 2: 2 Sets Played
    if (s2 && !s3) {
      const p1WonS2 = s2.p1 > s2.p2;
      // If 1-1 in sets -> DRAW
      if (p1WonS1 !== p1WonS2) {
        return { points: { p1: cfg.pointsDraw, p2: cfg.pointsDraw }, finalizationType: 'completo', description: 'Empate (1-1)' };
      }
      // If 2-0 -> Win
      if (p1WonS1 && p1WonS2) return { points: { p1: cfg.pointsPerWin2_0, p2: cfg.pointsPerLoss2_0 }, finalizationType: 'completo', description: 'Victoria 2-0' };
      if (!p1WonS1 && !p1WonS2) return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'completo', description: 'Derrota 0-2' };
    }
  }

  // If complete match (Standard Logic)
  if (!isIncomplete) {
    let p1Sets = 0;
    let p2Sets = 0;
    if (s1.p1 > s1.p2) p1Sets++; else p2Sets++;
    if (s2) { if (s2.p1 > s2.p2) p1Sets++; else p2Sets++; }
    if (s3) { if (s3.p1 > s3.p2) p1Sets++; else p2Sets++; }

    if (p1Sets > p2Sets) {
      // Win
      if (p2Sets === 0) return { points: { p1: cfg.pointsPerWin2_0, p2: cfg.pointsPerLoss2_0 }, finalizationType: 'completo', description: 'Victoria 2-0' };
      return { points: { p1: cfg.pointsPerWin2_1, p2: cfg.pointsPerLoss2_1 }, finalizationType: 'completo', description: 'Victoria 2-1' };
    } else {
      // Lost (P2 won)
      if (p1Sets === 0) return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'completo', description: 'Derrota 0-2' };
      return { points: { p1: cfg.pointsPerLoss2_1, p2: cfg.pointsPerWin2_1 }, finalizationType: 'completo', description: 'Derrota 1-2' };
    }
  }

  // Incomplete Logic (PRD 4.4.2)
  if (!s2) throw new Error("Set 2 is required for incomplete calculation");

  const p1LeadsS2 = s2.p1 > s2.p2;
  const diffS2 = Math.abs(s2.p1 - s2.p2);

  // SCENARIO A: P1 Won Set 1
  if (p1WonS1) {
    if (p1LeadsS2) {
      return { points: { p1: cfg.pointsPerWin2_0, p2: cfg.pointsPerLoss2_0 }, finalizationType: 'victoria_incompleta', description: 'Victoria Incompleta (Ventaja)' };
    } else {
      if (diffS2 >= 3) {
        return { points: { p1: cfg.pointsDraw, p2: cfg.pointsDraw }, finalizationType: 'empate_diferencia', description: 'Empate por diferencia' };
      } else {
        return { points: { p1: cfg.pointsPerWin2_0, p2: cfg.pointsPerLoss2_0 }, finalizationType: 'victoria_incompleta', description: 'Victoria Incompleta (Rival no remonta)' };
      }
    }
  }
  // SCENARIO B: P1 Lost Set 1
  else {
    if (p1LeadsS2) {
      if (diffS2 >= 3) {
        return { points: { p1: cfg.pointsDraw, p2: cfg.pointsDraw }, finalizationType: 'empate_diferencia', description: 'Empate por diferencia' };
      } else {
        return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'derrota_incompleta', description: 'Derrota Incompleta (Dif < 3)' };
      }
    } else {
      return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'derrota_incompleta', description: 'Derrota Incompleta' };
    }
  }
}

export function generateStandings(
  divisionId: string,
  matches: Match[],
  playerIds: string[],
  format?: 'classic' | 'americano' | 'mexicano' | 'individual'
): StandingRow[] {
  const map: Record<string, StandingRow> = {};

  // Init
  playerIds.forEach(pid => {
    map[pid] = { playerId: pid, pos: 0, pj: 0, pg: 0, pts: 0, setsDiff: 0, gamesDiff: 0, setsWon: 0, gamesWon: 0 };
  });

  matches.forEach(m => {
    if (m.status !== 'finalizado' && m.status !== 'no_disputado') return;

    // Points
    const p1s = [m.pair1.p1Id, m.pair1.p2Id];
    const p2s = [m.pair2.p1Id, m.pair2.p2Id];

    // For Mexicano/Americano: m.points already contains actual game points scored
    // For Classic/Individual: m.points contains match points (3, 2, 1, 0)
    p1s.forEach(id => { if (map[id]) { map[id].pts += m.points.p1; map[id].pj += 1; } });
    p2s.forEach(id => { if (map[id]) { map[id].pts += m.points.p2; map[id].pj += 1; } });

    // Calculate PG (Partidos Ganados) - Assumes victory if points > opponent points
    if (m.points.p1 > m.points.p2) {
      p1s.forEach(id => { if (map[id]) map[id].pg += 1; });
    } else if (m.points.p2 > m.points.p1) {
      p2s.forEach(id => { if (map[id]) map[id].pg += 1; });
    }

    // Sets/Games if finalizado (only for set-based formats)
    if (m.status === 'finalizado' && m.score && m.score.set1) {
      const sets = [m.score.set1, m.score.set2, m.score.set3].filter(s => !!s);

      sets.forEach(s => {
        if (!s) return;
        const g1 = s.p1;
        const g2 = s.p2;

        p1s.forEach(id => { if (map[id]) { map[id].gamesWon += g1; map[id].gamesDiff += (g1 - g2); } });
        p2s.forEach(id => { if (map[id]) { map[id].gamesWon += g2; map[id].gamesDiff += (g2 - g1); } });

        if (g1 > g2) {
          p1s.forEach(id => { if (map[id]) { map[id].setsWon += 1; map[id].setsDiff += 1; } });
          p2s.forEach(id => { if (map[id]) { map[id].setsDiff -= 1; } });
        } else if (g2 > g1) {
          p2s.forEach(id => { if (map[id]) { map[id].setsWon += 1; map[id].setsDiff += 1; } });
          p1s.forEach(id => { if (map[id]) { map[id].setsDiff -= 1; } });
        }
      });
    }
  });

  return Object.values(map).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
    return b.gamesWon - a.gamesWon;
  }).map((row, idx) => ({ ...row, pos: idx + 1 }));
}

// Generate Global Standings for the entire ranking (all divisions)
export function generateGlobalStandings(ranking: Ranking): StandingRow[] {
  const allMatches: Match[] = [];
  const allPlayers: Set<string> = new Set();

  ranking.divisions.forEach(div => {
    div.matches.forEach(m => allMatches.push(m));
    div.players.forEach(p => allPlayers.add(p));
  });

  // Re-use logic but with a flat list
  return generateStandings('global', allMatches, Array.from(allPlayers));
}

// Logic to calculate promotions and generate new divisions for next phase
export function calculatePromotions(ranking: Ranking): {
  newDivisions: Division[],
  movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[]
} {
  const sortedDivisions = [...ranking.divisions].sort((a, b) => a.numero - b.numero);
  const movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[] = [];
  const nextPhasePlayers: Record<number, string[]> = {};

  // 1. Calculate standings for each division and determine movements
  sortedDivisions.forEach((div, index) => {
    const standings = generateStandings(div.id, div.matches, div.players);
    const divNum = div.numero;
    const isFirst = index === 0;
    const isLast = index === sortedDivisions.length - 1;

    // Initialize array for this division if not exists
    if (!nextPhasePlayers[divNum]) nextPhasePlayers[divNum] = [];
    if (!nextPhasePlayers[divNum - 1] && !isFirst) nextPhasePlayers[divNum - 1] = [];
    if (!nextPhasePlayers[divNum + 1] && !isLast) nextPhasePlayers[divNum + 1] = [];

    standings.forEach((row, posIndex) => {
      const pos = posIndex + 1; // 1-based position

      // Promotion Logic (Top 2 go up, except in Div 1)
      if (pos <= 2 && !isFirst) {
        nextPhasePlayers[divNum - 1].push(row.playerId);
        movements.push({ playerId: row.playerId, fromDiv: divNum, toDiv: divNum - 1, type: 'up' });
      }
      // Relegation Logic (Bottom 2 go down, except in Last Div)
      else if (pos >= 3 && !isLast) {
        nextPhasePlayers[divNum + 1].push(row.playerId);
        movements.push({ playerId: row.playerId, fromDiv: divNum, toDiv: divNum + 1, type: 'down' });
      }
      // Stay Logic
      else {
        nextPhasePlayers[divNum].push(row.playerId);
        movements.push({ playerId: row.playerId, fromDiv: divNum, toDiv: divNum, type: 'stay' });
      }
    });
  });

  // 2. Generate new Division objects with new players
  const newDivisions: Division[] = sortedDivisions.map(oldDiv => {
    const newPlayers = nextPhasePlayers[oldDiv.numero] || [];

    // Safety check: ensure 4 players (unless last div had weird numbers)
    // If not 4, we might have issues generating calendar, but we proceed for MVP.

    return {
      id: `div-${Date.now()}-${oldDiv.numero}`,
      numero: oldDiv.numero,
      status: 'activa',
      players: newPlayers,
      matches: generateNewPhaseMatches(newPlayers, oldDiv.numero)
    };
  });

  return { newDivisions, movements };
}

function generateNewPhaseMatches(players: string[], divIndex: number): Match[] {
  if (players.length < 4) return []; // Cannot generate proper round robin

  const [p0, p1, p2, p3] = players;
  const createMatch = (jornada: number, p1Id: string, p2Id: string, p3Id: string, p4Id: string): Match => ({
    id: `m-ph2-${Date.now()}-${divIndex}-${jornada}-${Math.random().toString(36).substr(2, 5)}`,
    jornada,
    pair1: { p1Id, p2Id },
    pair2: { p1Id: p3Id, p2Id: p4Id },
    status: 'pendiente',
    points: { p1: 0, p2: 0 }
  });

  return [
    createMatch(1, p0, p1, p2, p3),
    createMatch(2, p0, p2, p1, p3),
    createMatch(3, p0, p3, p1, p2)
  ];
}
