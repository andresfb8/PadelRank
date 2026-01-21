
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
    } else if (p1Sets < p2Sets) {
      // Lost (P2 won)
      if (p1Sets === 0) return { points: { p1: cfg.pointsPerLoss2_0, p2: cfg.pointsPerWin2_0 }, finalizationType: 'completo', description: 'Derrota 0-2' };
      return { points: { p1: cfg.pointsPerLoss2_1, p2: cfg.pointsPerWin2_1 }, finalizationType: 'completo', description: 'Derrota 1-2' };
    } else {
      // Draw (1-1) - Standard Logic when no Tie Break is played or recorded, or forced draw in league.
      // Often leagues enforce a Tie Break. But if logic allows 1-1 final:
      return { points: { p1: cfg.pointsDraw, p2: cfg.pointsDraw }, finalizationType: 'completo', description: 'Empate 1-1' };
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
  format?: 'classic' | 'americano' | 'mexicano' | 'individual' | 'pairs'
): StandingRow[] {
  const map: Record<string, StandingRow> = {};

  // Init
  if (format === 'pairs') {
    // PAIRS LOGIC: We track TEAMS, not individual players.
    // Key is "p1Id-p2Id". We assume pairs are consistent.

    // 1. Initialize map for all pairs found in ANY match (active or pending)
    matches.forEach(m => {
      const pair1Key = `${m.pair1.p1Id}-${m.pair1.p2Id}`;
      const pair2Key = `${m.pair2.p1Id}-${m.pair2.p2Id}`;

      if (!map[pair1Key]) map[pair1Key] = { playerId: pair1Key, pos: 0, pj: 0, pg: 0, pts: 0, setsDiff: 0, gamesDiff: 0, setsWon: 0, gamesWon: 0 };
      if (!map[pair2Key]) map[pair2Key] = { playerId: pair2Key, pos: 0, pj: 0, pg: 0, pts: 0, setsDiff: 0, gamesDiff: 0, setsWon: 0, gamesWon: 0 };
    });

    // 2. Process Stats for finalized matches
    matches.forEach(m => {
      if (m.status !== 'finalizado' && m.status !== 'no_disputado') return;

      const pair1Key = `${m.pair1.p1Id}-${m.pair1.p2Id}`;
      const pair2Key = `${m.pair2.p1Id}-${m.pair2.p2Id}`;

      // P1 Stats
      map[pair1Key].pts += m.points.p1;
      map[pair1Key].pj += 1;

      // P2 Stats
      map[pair2Key].pts += m.points.p2;
      map[pair2Key].pj += 1;

      // Win/Loss
      if (m.points.p1 > m.points.p2) map[pair1Key].pg += 1;
      else if (m.points.p2 > m.points.p1) map[pair2Key].pg += 1;

      // Sets/Games
      if (m.status === 'finalizado' && m.score && m.score.set1) {
        const sets = [m.score.set1, m.score.set2, m.score.set3].filter(s => !!s) as { p1: number, p2: number }[];
        sets.forEach(s => {
          const g1 = s.p1;
          const g2 = s.p2;
          map[pair1Key].gamesWon += g1;
          map[pair1Key].gamesDiff += (g1 - g2);
          map[pair2Key].gamesWon += g2;
          map[pair2Key].gamesDiff += (g2 - g1);

          if (g1 > g2) {
            map[pair1Key].setsWon += 1;
            map[pair1Key].setsDiff += 1;
            map[pair2Key].setsDiff -= 1;
          } else if (g2 > g1) {
            map[pair2Key].setsWon += 1;
            map[pair2Key].setsDiff += 1;
            map[pair1Key].setsDiff -= 1;
          }
        });
      }
    });

    // Sort and Return
    return Object.values(map).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
      if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
      return b.gamesWon - a.gamesWon;
    }).map((row, idx) => ({ ...row, pos: idx + 1 }));
  }

  // STANDARD LOGIC (INDIVIDUALS)
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

  // Include historical matches if any
  if (ranking.history) {
    ranking.history.forEach(m => allMatches.push(m));
    // We assume players in history are already covered or we don't strictly need to add them to 'allPlayers'
    // for the table if they are no longer in any division, BUT if we want to show them in global
    // even if they dropped out, we should extract IDs from history match pairs too.
    ranking.history.forEach(m => {
      allPlayers.add(m.pair1.p1Id);
      allPlayers.add(m.pair1.p2Id);
      allPlayers.add(m.pair2.p1Id);
      allPlayers.add(m.pair2.p2Id);
    });
  }

  // Re-use logic but with a flat list
  return generateStandings('global', allMatches, Array.from(allPlayers), ranking.format);
}

export function calculatePromotions(
  ranking: Ranking,
  overrides?: { playerId: string, forceDiv: number }[]
): {
  newDivisions: Division[],
  movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[]
} {
  const sortedDivisions = [...ranking.divisions].sort((a, b) => a.numero - b.numero);
  const movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[] = [];

  // Configuration Defaults
  const config = ranking.config || {};
  const targetCapacity = config.maxPlayersPerDivision || 4;
  const promoCount = config.promotionCount !== undefined ? config.promotionCount : 2;
  const releCount = config.relegationCount !== undefined ? config.relegationCount : 2;

  // 0. Process Overrides
  const forcedAssignments: Record<number, string[]> = {};

  if (overrides) {
    overrides.forEach(o => {
      if (!forcedAssignments[o.forceDiv]) forcedAssignments[o.forceDiv] = [];
      forcedAssignments[o.forceDiv].push(o.playerId);
    });
  }

  // 1. Calculate Standings & Pool of Candidates per Division
  type Candidate = {
    playerId: string;
    originDivNum: number;
    pos: number;
    standing: StandingRow;
  };

  const poolByDiv: Record<number, Candidate[]> = {};
  const activeDivisionNums = sortedDivisions.map(d => d.numero);
  if (activeDivisionNums.length === 0) return { newDivisions: [], movements: [] };

  // Also consider overrides forcing new divisions (e.g. Div 5)
  const overrideDivs = Object.keys(forcedAssignments).map(Number);
  const maxDivNum = Math.max(...activeDivisionNums, ...overrideDivs);

  sortedDivisions.forEach(div => {
    const retiredSet = new Set(div.retiredPlayers || []);

    const standings = generateStandings(div.id, div.matches, div.players);
    const cands: Candidate[] = [];

    standings.forEach((row, idx) => {
      if (retiredSet.has(row.playerId)) return;

      cands.push({
        playerId: row.playerId,
        originDivNum: div.numero,
        pos: idx + 1,
        standing: row
      });
    });

    poolByDiv[div.numero] = cands;
  });

  // 2. Waterfall Filling
  const assignedPlayers = new Set<string>();
  const finalAssignments: Record<number, string[]> = {};

  // Pre-fill assignments with FORCED players
  Object.keys(forcedAssignments).forEach(dNumStr => {
    const dNum = parseInt(dNumStr);
    finalAssignments[dNum] = [...forcedAssignments[dNum]];
    forcedAssignments[dNum].forEach(pid => assignedPlayers.add(pid));
  });

  const getUnconsumed = (pool: Candidate[]) => pool.filter(c => !assignedPlayers.has(c.playerId));

  for (let divNum = 1; divNum <= maxDivNum; divNum++) {
    if (!finalAssignments[divNum]) finalAssignments[divNum] = [];

    const countAfterForced = finalAssignments[divNum].length;
    let slotsRemaining = targetCapacity - countAfterForced;

    if (slotsRemaining <= 0) {
      continue;
    }

    const currentPool = poolByDiv[divNum] || [];
    const belowPool = poolByDiv[divNum + 1] || [];
    const abovePool = poolByDiv[divNum - 1] || [];

    const natives = getUnconsumed(currentPool);
    const incomingFromAbove = getUnconsumed(abovePool);
    const incomingFromBelow = getUnconsumed(belowPool);

    // Draft Logic
    // Step A: Priority Inclusions
    const priorityList: string[] = [];

    // A1. Incoming from Above (Relegated)
    incomingFromAbove.forEach(c => priorityList.push(c.playerId));

    // A2. Guaranteed Promoters from Below
    // Only take top 'promoCount' available
    const promoters = incomingFromBelow.slice(0, promoCount);
    promoters.forEach(c => priorityList.push(c.playerId));

    // A3. Natives
    // Fill remainder with best natives
    let currentFilled = priorityList.length + countAfterForced;
    let spaceForNatives = targetCapacity - currentFilled;

    if (spaceForNatives < 0) {
      // Capacity Exceeded by Priority 1 & 2
      // We stick to the priority list order (Above > Below) so some promoters might get stuck in below logic if we cut?
      // But here we just push them to 'priorityList'.
    } else {
      const bestNatives = natives.slice(0, spaceForNatives);
      bestNatives.forEach(c => priorityList.push(c.playerId));
    }

    // Add Priority List to Assignments (respecting capacity)
    for (const pid of priorityList) {
      if (finalAssignments[divNum].length < targetCapacity && !assignedPlayers.has(pid)) {
        finalAssignments[divNum].push(pid);
        assignedPlayers.add(pid);
      }
    }

    // A4. Gaps? (Extra Promotions)
    if (finalAssignments[divNum].length < targetCapacity) {
      // Try filling with more Promoters (Lucky Losers from below)
      const morePromoters = getUnconsumed(belowPool);

      for (const c of morePromoters) {
        if (finalAssignments[divNum].length < targetCapacity) {
          finalAssignments[divNum].push(c.playerId);
          assignedPlayers.add(c.playerId);
        }
      }
    }
  }

  // 3. Overflow Handling (Last Division)
  const allCandidates = Object.values(poolByDiv).flat();
  const unassigned = allCandidates.filter(c => !assignedPlayers.has(c.playerId));

  if (unassigned.length > 0) {
    // Find the last division index that exists
    let lastDiv = maxDivNum;
    while (!finalAssignments[lastDiv] && lastDiv > 0) lastDiv--;
    if (lastDiv === 0) lastDiv = 1; // Fallback

    if (!finalAssignments[lastDiv]) finalAssignments[lastDiv] = [];

    unassigned.forEach(c => {
      finalAssignments[lastDiv].push(c.playerId);
      assignedPlayers.add(c.playerId);
    });
  }

  // 4. Generate Movements
  Object.keys(finalAssignments).forEach(dNumStr => {
    const dNum = parseInt(dNumStr);
    const pIds = finalAssignments[dNum];

    pIds.forEach(pid => {
      let originDiv = 0;
      Object.values(poolByDiv).flat().forEach(c => {
        if (c.playerId === pid) originDiv = c.originDivNum;
      });

      if (originDiv !== 0) {
        let type: 'up' | 'down' | 'stay' = 'stay';
        if (dNum < originDiv) type = 'up';
        if (dNum > originDiv) type = 'down';

        movements.push({ playerId: pid, fromDiv: originDiv, toDiv: dNum, type });
      } else {
        // New player or manual insert
        movements.push({ playerId: pid, fromDiv: 0, toDiv: dNum, type: 'stay' });
      }
    });
  });

  const newDivisions: Division[] = [];
  const finalKeys = Object.keys(finalAssignments).map(Number).sort((a, b) => a - b);

  finalKeys.forEach(i => {
    const players = finalAssignments[i];
    if (players.length === 0) return;

    const oldDiv = sortedDivisions.find(d => d.numero === i);
    const divId = oldDiv ? `div-${Date.now()}-${i}` : `div-new-${Date.now()}-${i}`;

    newDivisions.push({
      id: divId,
      numero: i,
      status: 'activa',
      players: players,
      matches: generateNewPhaseMatches(players, i)
    });
  });

  return { newDivisions, movements };
}

function generateNewPhaseMatches(players: string[], divIndex: number): Match[] {
  if (players.length < 2) return [];

  const createMatch = (jornada: number, p1Id: string, p2Id: string, p3Id: string, p4Id: string): Match => ({
    id: `m-ph2-${Date.now()}-${divIndex}-${jornada}-${Math.random().toString(36).substr(2, 5)}`,
    jornada,
    pair1: { p1Id, p2Id },
    pair2: { p1Id: p3Id, p2Id: p4Id },
    status: 'pendiente',
    points: { p1: 0, p2: 0 }
  });

  if (players.length === 4) {
    const [p0, p1, p2, p3] = players;
    return [
      createMatch(1, p0, p1, p2, p3),
      createMatch(2, p0, p2, p1, p3),
      createMatch(3, p0, p3, p1, p2)
    ];
  }

  return [];
}
