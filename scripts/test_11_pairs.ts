import { TournamentEngine } from '../services/TournamentEngine';
import { Ranking, Match, Division } from '../types';

// Helper function to simulate a match score entry like in RankingView
function playMatch(
  ranking: Ranking,
  matchId: string,
  winner: 1 | 2,
  p1Score: number = 6,
  p2Score: number = 4
): { ranking: Ranking; currentMatch: Match } {
  let foundMatch: Match | undefined;
  let activeDiv: Division | undefined;

  for (const div of ranking.divisions) {
    foundMatch = div.matches.find(m => m.id === matchId);
    if (foundMatch) {
      activeDiv = div;
      break;
    }
  }

  if (!foundMatch || !activeDiv) {
    throw new Error(`Match ${matchId} not found`);
  }

  const updatedMatch: Match = {
    ...foundMatch,
    status: 'finalizado',
    points: winner === 1 ? { p1: p1Score, p2: p2Score } : { p1: p2Score, p2: p1Score },
    score: {
      set1: winner === 1 ? { p1: p1Score, p2: p2Score } : { p1: p2Score, p2: p1Score },
      description: `${winner === 1 ? p1Score : p2Score}-${winner === 1 ? p2Score : p1Score}`
    }
  };

  const winnerPair = winner === 1 ? updatedMatch.pair1 : updatedMatch.pair2;
  const loserPair = winner === 1 ? updatedMatch.pair2 : updatedMatch.pair1;

  // Update match in division
  const matchIndex = activeDiv.matches.findIndex(m => m.id === matchId);
  activeDiv.matches[matchIndex] = updatedMatch;

  // 1. Advance winner
  let newDivisions = TournamentEngine.advanceWinner(updatedMatch, ranking, {
    p1: winnerPair.p1Id,
    p2: winnerPair.p2Id || ''
  });

  // 2. Consolation logic (same as RankingView.tsx)
  if (ranking.format === 'elimination' && ranking.config?.eliminationConfig?.consolation) {
    const isFirstRealMatch = (pairId: { p1Id: string; p2Id: string }) => {
      const mainDiv = newDivisions.find(d => d.type === 'main');
      if (!mainDiv) return false;

      const pairMatches = mainDiv.matches.filter(m =>
        m.status === 'finalizado' &&
        ((m.pair1.p1Id === pairId.p1Id && m.pair1.p2Id === pairId.p2Id) ||
          (m.pair2.p1Id === pairId.p1Id && m.pair2.p2Id === pairId.p2Id))
      );

      const realMatches = pairMatches.filter(m =>
        m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE'
      );

      return realMatches.length === 1;
    };

    if (isFirstRealMatch({ p1Id: loserPair.p1Id, p2Id: loserPair.p2Id || '' })) {
      const tempRanking = { ...ranking, divisions: newDivisions };
      newDivisions = TournamentEngine.moveLoserToConsolation(updatedMatch, tempRanking, {
        p1: loserPair.p1Id,
        p2: loserPair.p2Id || ''
      });
    }
  }

  const updatedRanking: Ranking = { ...ranking, divisions: newDivisions };
  return { ranking: updatedRanking, currentMatch: updatedMatch };
}

function printBracketState(ranking: Ranking, label: string) {
  console.log(`\n==================================================`);
  console.log(`📊 ESTADO DEL CUADRO: ${label}`);
  console.log(`==================================================`);

  for (const div of ranking.divisions) {
    console.log(`\n--- [${div.name.toUpperCase()}] ---`);
    const rounds = [...new Set(div.matches.map(m => m.jornada))].sort((a, b) => a - b);

    for (const r of rounds) {
      const roundMatches = div.matches.filter(m => m.jornada === r);
      const rName = roundMatches[0]?.roundName || `Ronda ${r}`;
      console.log(`\n  ▶ ${rName} (Jornada ${r}):`);

      roundMatches.forEach((m, idx) => {
        const p1 = m.pair1.p1Id ? `${m.pair1.p1Id}/${m.pair1.p2Id}` : (m.pair1.placeholder || 'TBD');
        const p2 = m.pair2.p1Id ? `${m.pair2.p1Id}/${m.pair2.p2Id}` : (m.pair2.placeholder || 'TBD');
        const status = m.status === 'finalizado' ? `✅ [${m.score?.description || 'FIN'}]` : '⏳ [Pendiente]';
        console.log(`    Match ${idx + 1} (${m.id.substring(0, 6)}): ${p1.padEnd(20)} vs ${p2.padEnd(20)} ${status}`);
      });
    }
  }
}

async function runTest() {
  console.log("🚀 INICIANDO PRUEBA CON 11 PAREJAS (Eliminación directa + Consolación)...");

  // 11 Parejas (formato "P1_A::P1_B" o "P1_A-P1_B")
  const participants = [
    'P01_A::P01_B', // Seed 1
    'P02_A::P02_B', // Seed 2
    'P03_A::P03_B', // Seed 3
    'P04_A::P04_B', // Seed 4
    'P05_A::P05_B', // Seed 5
    'P06_A::P06_B', // Seed 6
    'P07_A::P07_B', // Seed 7
    'P08_A::P08_B', // Seed 8
    'P09_A::P09_B', // Seed 9
    'P10_A::P10_B', // Seed 10
    'P11_A::P11_B', // Seed 11
  ];

  // 1. Generar Cuadro
  const divisions = TournamentEngine.generateBracket(participants, true);

  let ranking: Ranking = {
    id: 'test-ranking-11',
    name: 'Torneo Fin de Semana 11 Parejas',
    format: 'elimination',
    status: 'activo',
    createdAt: new Date().toISOString(),
    divisions: divisions,
    config: {
      eliminationConfig: {
        type: 'single',
        consolation: true,
        thirdPlaceMatch: false
      }
    }
  };

  printBracketState(ranking, "1. INICIAL TRAS GENERAR EL CUADRO (Con BYEs procesados)");

  // Verificar R1 de Cuadro Principal:
  const mainDiv = ranking.divisions.find(d => d.type === 'main')!;
  const consDiv = ranking.divisions.find(d => d.type === 'consolation')!;

  const mainR1 = mainDiv.matches.filter(m => m.jornada === 1);
  const mainR2 = mainDiv.matches.filter(m => m.jornada === 2);

  console.log(`\n🔍 Verificaciones iniciales:`);
  console.log(`- Total partidos R1 Principal: ${mainR1.length} (8 partidos para cuadro de 16)`);
  console.log(`- Partidos con BYE finalizados en R1: ${mainR1.filter(m => m.status === 'finalizado').length} (deben ser 5)`);
  console.log(`- Partidos pendientes en R1: ${mainR1.filter(m => m.status === 'pendiente').length} (deben ser 3: 8v9, 6v11, 7v10)`);

  // 2. Jugar los 3 partidos reales de R1 en Cuadro Principal
  const pendingR1 = mainR1.filter(m => m.status === 'pendiente');
  console.log(`\n⚔️ JUGANDO LOS 3 PARTIDOS REALES DE R1 (OCTAVOS)...`);

  // Partido 1: 8 vs 9 -> Gana 8 (P08)
  console.log(`▶ Jugando R1 Match: ${pendingR1[0].pair1.p1Id} vs ${pendingR1[0].pair2.p1Id} -> Gana ${pendingR1[0].pair1.p1Id}`);
  let res = playMatch(ranking, pendingR1[0].id, 1, 6, 2);
  ranking = res.ranking;

  // Partido 2: 6 vs 11 -> Gana 6 (P06)
  console.log(`▶ Jugando R1 Match: ${pendingR1[1].pair1.p1Id} vs ${pendingR1[1].pair2.p1Id} -> Gana ${pendingR1[1].pair1.p1Id}`);
  res = playMatch(ranking, pendingR1[1].id, 1, 6, 3);
  ranking = res.ranking;

  // Partido 3: 7 vs 10 -> Gana 10 (P10)
  console.log(`▶ Jugando R1 Match: ${pendingR1[2].pair1.p1Id} vs ${pendingR1[2].pair2.p1Id} -> Gana ${pendingR1[2].pair2.p1Id}`);
  res = playMatch(ranking, pendingR1[2].id, 2, 4, 6);
  ranking = res.ranking;

  printBracketState(ranking, "2. TRAS COMPLETAR R1 (OCTAVOS)");

  // 3. Jugar R2 (Cuartos de final)
  // En Cuartos de final tenemos:
  // QF1: P01 (Seed 1, vino de BYE) vs P08 (ganó R1)
  // QF2: P05 (Seed 5, vino de BYE) vs P04 (Seed 4, vino de BYE)
  // QF3: P03 (Seed 3, vino de BYE) vs P06 (ganó R1)
  // QF4: P10 (ganó R1) vs P02 (Seed 2, vino de BYE)

  console.log(`\n⚔️ JUGANDO CUARTOS DE FINAL (R2)...`);
  const updatedMainDiv = ranking.divisions.find(d => d.type === 'main')!;
  const qfMatches = updatedMainDiv.matches.filter(m => m.jornada === 2);

  // QF1: P01 vs P08 -> ¡GANA P08 y PIERDE P01! (Prueba de Drop-Down de jugador que vino de BYE)
  console.log(`▶ QF1: ${qfMatches[0].pair1.p1Id} (vino de BYE) vs ${qfMatches[0].pair2.p1Id} -> GANA ${qfMatches[0].pair2.p1Id} (P01 pierde su 1er partido real)`);
  res = playMatch(ranking, qfMatches[0].id, 2, 4, 6);
  ranking = res.ranking;

  // QF2: P05 vs P04 -> Gana P05 (P04 pierde su 1er partido real)
  console.log(`▶ QF2: ${qfMatches[1].pair1.p1Id} vs ${qfMatches[1].pair2.p1Id} -> GANA ${qfMatches[1].pair1.p1Id} (P04 pierde su 1er partido real)`);
  res = playMatch(ranking, qfMatches[1].id, 1, 6, 4);
  ranking = res.ranking;

  // QF3: P03 vs P06 -> Gana P03 (P06 pierde, pero como ya jugó y ganó en R1, NO va a consolación)
  console.log(`▶ QF3: ${qfMatches[2].pair1.p1Id} vs ${qfMatches[2].pair2.p1Id} -> GANA ${qfMatches[2].pair1.p1Id} (P06 ya ganó en R1, queda eliminado)`);
  res = playMatch(ranking, qfMatches[2].id, 1, 6, 3);
  ranking = res.ranking;

  // QF4: P10 vs P02 -> Gana P02 (P10 pierde, ya ganó en R1, queda eliminado)
  console.log(`▶ QF4: ${qfMatches[3].pair1.p1Id} vs ${qfMatches[3].pair2.p1Id} -> GANA ${qfMatches[3].pair2.p1Id} (P10 ya ganó en R1, queda eliminado)`);
  res = playMatch(ranking, qfMatches[3].id, 2, 2, 6);
  ranking = res.ranking;

  printBracketState(ranking, "3. TRAS CUARTOS DE FINAL (Comprobar bajada a Consolación de P01 y P04)");

  // 4. Jugar Semifinales y Final de Principal
  console.log(`\n⚔️ JUGANDO SEMIFINALES PRINCIPALES...`);
  const sfMatches = ranking.divisions.find(d => d.type === 'main')!.matches.filter(m => m.jornada === 3);
  
  // SF1: P08 vs P05 -> Gana P05
  console.log(`▶ SF1: ${sfMatches[0].pair1.p1Id} vs ${sfMatches[0].pair2.p1Id} -> Gana ${sfMatches[0].pair2.p1Id}`);
  res = playMatch(ranking, sfMatches[0].id, 2, 3, 6);
  ranking = res.ranking;

  // SF2: P03 vs P02 -> Gana P02
  console.log(`▶ SF2: ${sfMatches[1].pair1.p1Id} vs ${sfMatches[1].pair2.p1Id} -> Gana ${sfMatches[1].pair2.p1Id}`);
  res = playMatch(ranking, sfMatches[1].id, 2, 4, 6);
  ranking = res.ranking;

  // Final Principal
  const finalMatch = ranking.divisions.find(d => d.type === 'main')!.matches.find(m => m.jornada === 4)!;
  console.log(`▶ FINAL PRINCIPAL: ${finalMatch.pair1.p1Id} vs ${finalMatch.pair2.p1Id} -> Gana ${finalMatch.pair1.p1Id} (CAMPEÓN PRINCIPAL: P05)`);
  res = playMatch(ranking, finalMatch.id, 1, 6, 4);
  ranking = res.ranking;

  printBracketState(ranking, "4. CUADRO PRINCIPAL COMPLETADO");

  // 5. Jugar Consolación
  console.log(`\n⚔️ JUGANDO PARTIDOS DE CONSOLACIÓN...`);
  let updatedConsDiv = ranking.divisions.find(d => d.type === 'consolation')!;
  
  // Jugar todos los partidos pendientes de consolación ronda a ronda
  for (let r = 1; r <= 3; r++) {
    updatedConsDiv = ranking.divisions.find(d => d.type === 'consolation')!;
    const pendingCons = updatedConsDiv.matches.filter(m => m.jornada === r && m.status === 'pendiente');
    console.log(`\n  --- Ronda ${r} de Consolación (${pendingCons.length} partidos pendientes) ---`);
    for (const m of pendingCons) {
      if (m.pair1.p1Id && m.pair2.p1Id) {
        console.log(`  ▶ Jugando Cons. J${r}: ${m.pair1.p1Id} vs ${m.pair2.p1Id} -> Gana ${m.pair1.p1Id}`);
        res = playMatch(ranking, m.id, 1, 6, 3);
        ranking = res.ranking;
      } else {
        console.log(`  ⚠️ Match no listo aún: ${m.pair1.p1Id || 'TBD'} vs ${m.pair2.p1Id || 'TBD'}`);
      }
    }
  }

  printBracketState(ranking, "5. TORNEO COMPLETADO AL 100% (Principal + Consolación)");

  console.log("\n✅ PRUEBA COMPLETADA EXITOSAMENTE.");
}

runTest().catch(err => {
  console.error("❌ ERROR EN LA PRUEBA:", err);
  process.exit(1);
});
