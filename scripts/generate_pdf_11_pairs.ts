import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TournamentEngine } from '../services/TournamentEngine';
import { Ranking, Match, Division, Player } from '../types';

// Player dictionary for names
const playersDict: Record<string, Player> = {};

function createPlayer(id: string, name: string): Player {
  return {
    id,
    nombre: name,
    apellidos: '',
    email: `${id.toLowerCase()}@padel.com`,
    telefono: '123456789',
    stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
  };
}

// Helper to simulate a match score entry
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

  // 2. Consolation logic
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

function getPairLabel(pair: { p1Id: string; p2Id?: string; placeholder?: string }) {
  if (pair.p1Id === 'BYE') return 'BYE (Exento)';
  if (pair.p1Id) {
    const p1 = playersDict[pair.p1Id]?.nombre || pair.p1Id;
    const p2 = pair.p2Id ? (playersDict[pair.p2Id]?.nombre || pair.p2Id) : '';
    return p2 ? `${p1} / ${p2}` : p1;
  }
  return pair.placeholder || 'TBD';
}

function renderVisualBracket(doc: jsPDF, division: Division, title: string) {
  doc.addPage('a4', 'landscape');
  const pageWidth = 297;
  const pageHeight = 210;

  // Header
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`PadelRank - ${title.toUpperCase()}`, 15, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Torneo Fin de Semana (11 Parejas) • Vista Gráfica de Cuadro', 15, 21);

  // Bracket logic
  const rounds = [...new Set(division.matches.map(m => m.jornada))].sort((a, b) => a - b);
  const totalRounds = rounds.length;

  const startX = 15;
  const startY = 36;
  const availableWidth = pageWidth - 30;
  const roundWidth = (availableWidth - (totalRounds - 1) * 8) / totalRounds;
  const cardHeight = 22;

  rounds.forEach((r, rIdx) => {
    const roundMatches = division.matches.filter(m => m.jornada === r);
    const roundX = startX + rIdx * (roundWidth + 8);
    const roundName = roundMatches[0]?.roundName || `Ronda ${r}`;

    // Round Column Header
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(roundX, startY, roundWidth, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(roundName, roundX + roundWidth / 2, startY + 5.5, { align: 'center' });

    // Matches
    const contentAreaHeight = pageHeight - startY - 20;
    const matchCount = roundMatches.length;
    const spacing = contentAreaHeight / matchCount;

    roundMatches.forEach((m, mIdx) => {
      const matchY = startY + 12 + mIdx * spacing + (spacing - cardHeight) / 2;

      // Card Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.setLineWidth(0.3);
      doc.roundedRect(roundX, matchY, roundWidth, cardHeight, 2, 2, 'FD');

      const isP1Winner = m.status === 'finalizado' && m.points.p1 > m.points.p2;
      const isP2Winner = m.status === 'finalizado' && m.points.p2 > m.points.p1;
      const isBye = m.score?.description === 'BYE';

      // Pair 1 Box
      if (isP1Winner) {
        doc.setFillColor(240, 253, 244); // Green 50
        doc.rect(roundX + 0.5, matchY + 0.5, roundWidth - 1, (cardHeight / 2) - 0.5, 'F');
      }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', isP1Winner ? 'bold' : 'normal');
      doc.setTextColor(isP1Winner ? 22 : 71, isP1Winner ? 101 : 85, isP1Winner ? 52 : 105);
      const p1Text = getPairLabel(m.pair1);
      doc.text(doc.splitTextToSize(p1Text, roundWidth - 16)[0] || '', roundX + 3, matchY + 6.5);

      if (m.status === 'finalizado') {
        doc.setFont('helvetica', 'bold');
        doc.text(isBye ? (isP1Winner ? 'W' : 'BYE') : `${m.points.p1}`, roundX + roundWidth - 3, matchY + 6.5, { align: 'right' });
      }

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(roundX + 2, matchY + cardHeight / 2, roundX + roundWidth - 2, matchY + cardHeight / 2);

      // Pair 2 Box
      if (isP2Winner) {
        doc.setFillColor(240, 253, 244); // Green 50
        doc.rect(roundX + 0.5, matchY + cardHeight / 2, roundWidth - 1, (cardHeight / 2) - 0.5, 'F');
      }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', isP2Winner ? 'bold' : 'normal');
      doc.setTextColor(isP2Winner ? 22 : 71, isP2Winner ? 101 : 85, isP2Winner ? 52 : 105);
      const p2Text = getPairLabel(m.pair2);
      doc.text(doc.splitTextToSize(p2Text, roundWidth - 16)[0] || '', roundX + 3, matchY + 16.5);

      if (m.status === 'finalizado') {
        doc.setFont('helvetica', 'bold');
        doc.text(isBye ? (isP2Winner ? 'W' : 'BYE') : `${m.points.p2}`, roundX + roundWidth - 3, matchY + 16.5, { align: 'right' });
      }

      // Connector lines to next round
      if (rIdx < totalRounds - 1) {
        const nextRoundX = roundX + roundWidth + 8;
        const nextRoundSpacing = contentAreaHeight / (matchCount / 2);
        const parentIdx = Math.floor(mIdx / 2);
        const nextMatchY = startY + 12 + parentIdx * nextRoundSpacing + (nextRoundSpacing - cardHeight) / 2;
        const targetConnectorY = mIdx % 2 === 0 ? nextMatchY + 6.5 : nextMatchY + 16.5;

        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);
        // Horizontal from right edge
        doc.line(roundX + roundWidth, matchY + cardHeight / 2, roundX + roundWidth + 4, matchY + cardHeight / 2);
        // Vertical connector
        doc.line(roundX + roundWidth + 4, matchY + cardHeight / 2, roundX + roundWidth + 4, targetConnectorY);
        // Horizontal into next match
        doc.line(roundX + roundWidth + 4, targetConnectorY, nextRoundX, targetConnectorY);
      }
    });
  });
}

function generateFullPDF() {
  console.log("⚙️ Generando torneo y exportando a PDF visual...");

  // 11 Parejas con nombres reales
  const pairsData = [
    { id1: 'P01_A', n1: 'A. Galán', id2: 'P01_B', n2: 'F. Chingotto', seed: 1 },
    { id1: 'P02_A', n1: 'A. Coello', id2: 'P02_B', n2: 'A. Tapia', seed: 2 },
    { id1: 'P03_A', n1: 'F. Stupaczuk', id2: 'P03_B', n2: 'M. Yanguas', seed: 3 },
    { id1: 'P04_A', n1: 'P. Navarro', id2: 'P04_B', n2: 'J. Lebrón', seed: 4 },
    { id1: 'P05_A', n1: 'M. Di Nenno', id2: 'P05_B', n2: 'F. Belasteguín', seed: 5 },
    { id1: 'P06_A', n1: 'J. Nieto', id2: 'P06_B', n2: 'J. Sanz', seed: 6 },
    { id1: 'P07_A', n1: 'L. Bergamini', id2: 'P07_B', n2: 'V. Ruiz', seed: 7 },
    { id1: 'P08_A', n1: 'A. Arroyo', id2: 'P08_B', n2: 'E. Alonso', seed: 8 },
    { id1: 'P09_A', n1: 'J. González', id2: 'P09_B', n2: 'I. Ramírez', seed: 9 },
    { id1: 'P10_A', n1: 'L. Capra', id2: 'P10_B', n2: 'M. Sánchez', seed: 10 },
    { id1: 'P11_A', n1: 'P. Cardona', id2: 'P11_B', n2: 'J. Muñoz', seed: 11 },
  ];

  pairsData.forEach(p => {
    playersDict[p.id1] = createPlayer(p.id1, p.n1);
    playersDict[p.id2] = createPlayer(p.id2, p.n2);
  });

  const participants = pairsData.map(p => `${p.id1}::${p.id2}`);
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

  // Simular Partidos
  const mainDiv = ranking.divisions.find(d => d.type === 'main')!;
  const mainR1 = mainDiv.matches.filter(m => m.jornada === 1 && m.status === 'pendiente');

  // Octavos
  ranking = playMatch(ranking, mainR1[0].id, 1, 6, 2).ranking; // 8 vs 9 -> Gana 8
  ranking = playMatch(ranking, mainR1[1].id, 1, 6, 3).ranking; // 6 vs 11 -> Gana 6
  ranking = playMatch(ranking, mainR1[2].id, 2, 4, 6).ranking; // 7 vs 10 -> Gana 10

  // Cuartos
  const qfMatches = ranking.divisions.find(d => d.type === 'main')!.matches.filter(m => m.jornada === 2);
  ranking = playMatch(ranking, qfMatches[0].id, 2, 4, 6).ranking; // 1 vs 8 -> Gana 8 (1 drop-down a consolación)
  ranking = playMatch(ranking, qfMatches[1].id, 1, 6, 4).ranking; // 4 vs 5 -> Gana 4 (5 drop-down a consolación)
  ranking = playMatch(ranking, qfMatches[2].id, 1, 6, 3).ranking; // 2 vs 10 -> Gana 2 (10 eliminado)
  ranking = playMatch(ranking, qfMatches[3].id, 1, 6, 2).ranking; // 3 vs 6 -> Gana 3 (6 eliminado)

  // Semifinales
  const sfMatches = ranking.divisions.find(d => d.type === 'main')!.matches.filter(m => m.jornada === 3);
  ranking = playMatch(ranking, sfMatches[0].id, 2, 3, 6).ranking; // 8 vs 4 -> Gana 4
  ranking = playMatch(ranking, sfMatches[1].id, 1, 6, 4).ranking; // 2 vs 3 -> Gana 2

  // Final Principal
  const finalMatch = ranking.divisions.find(d => d.type === 'main')!.matches.find(m => m.jornada === 4)!;
  ranking = playMatch(ranking, finalMatch.id, 2, 4, 6).ranking; // 4 vs 2 -> Gana 2 (CAMPEONES: A. Coello / A. Tapia)

  // Consolación
  for (let r = 1; r <= 3; r++) {
    const consDiv = ranking.divisions.find(d => d.type === 'consolation')!;
    const pending = consDiv.matches.filter(m => m.jornada === r && m.status === 'pendiente');
    for (const m of pending) {
      if (m.pair1.p1Id && m.pair2.p1Id) {
        ranking = playMatch(ranking, m.id, 1, 6, 3).ranking;
      }
    }
  }

  // CREAR PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // PÁGINA 1: PORTADA Y RESUMEN
  doc.setFillColor(15, 23, 42); // Dark Navy
  doc.rect(0, 0, 210, 50, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PADELRANK PRO', 15, 24);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // Cyan 400
  doc.text('INFORME COMPLETO DE TORNEO (11 PAREJAS)', 15, 34);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} • Formato: Eliminación Directa + Consolación`, 15, 42);

  // Cuadro de Honor
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 58, 180, 42, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('🏆 CUADRO DE HONOR DEL TORNEO', 22, 68);

  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text('🥇 CAMPEÓN CUADRO PRINCIPAL:', 22, 78);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('A. Coello / A. Tapia (Seed 2)', 90, 78);

  doc.setTextColor(59, 130, 246); // Blue 500
  doc.text('🥈 SUBCAMPEÓN PRINCIPAL:', 22, 86);
  doc.setTextColor(15, 23, 42);
  doc.text('P. Navarro / J. Lebrón (Seed 4)', 90, 86);

  doc.setTextColor(245, 158, 11); // Amber 500
  doc.text('🎖️ CAMPEÓN CONSOLACIÓN:', 22, 94);
  doc.setTextColor(15, 23, 42);
  doc.text('A. Galán / F. Chingotto (Seed 1)', 90, 94);

  // Tabla de Parejas Participantes
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Parejas Inscritas y Cabezas de Serie', 15, 112);

  const tableBody = pairsData.map(p => [
    `#${p.seed}`,
    `${p.n1} / ${p.n2}`,
    p.seed <= 5 ? 'Exento R1 (BYE)' : 'Ronda 1 (Octavos)',
    p.seed <= 5 ? 'Octavos' : 'Dieciseisavos'
  ]);

  autoTable(doc, {
    startY: 116,
    head: [['Seed', 'Pareja', 'Entrada en Cuadro', 'Fase Inicial']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  // PÁGINA 2: VISTA GRÁFICA CUADRO PRINCIPAL
  renderVisualBracket(doc, ranking.divisions.find(d => d.type === 'main')!, 'Cuadro Principal');

  // PÁGINA 3: VISTA GRÁFICA CUADRO DE CONSOLACIÓN
  renderVisualBracket(doc, ranking.divisions.find(d => d.type === 'consolation')!, 'Cuadro de Consolación');

  // Guardar Archivo
  const outputPath = path.resolve(process.cwd(), 'Torneo_11_Parejas_Eliminacion.pdf');
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`\n✅ PDF generado exitosamente en: ${outputPath}`);
}

generateFullPDF();
