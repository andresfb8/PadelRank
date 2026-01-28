import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player, Ranking, StandingRow, Division, Match } from '../types';

interface ExportConfig {
    rankingName: string;
    categoryName?: string;
    date?: string;
    clubName?: string;
}

// Helper: Get player name
const getPlayerName = (id: string, players: Record<string, Player>): string => {
    if (!id) return 'TBD';
    if (id === 'BYE') return 'BYE';
    const p = players[id];
    return p ? `${p.nombre} ${p.apellidos?.charAt(0) || ''}.` : 'Jugador Desconocido';
};

const getPairName = (pair: { p1Id: string; p2Id?: string }, players: Record<string, Player>): string => {
    const n1 = getPlayerName(pair.p1Id, players);
    const n2 = pair.p2Id ? getPlayerName(pair.p2Id, players) : '';
    if (n1 === 'BYE') return 'BYE';
    return n2 ? `${n1} / ${n2}` : n1;
};

// Helper: Render Scores
const getScoreString = (m: Match, side: 'p1' | 'p2') => {
    if (!m.score) return '';
    const sets = [m.score.set1, m.score.set2, m.score.set3].filter(Boolean);
    return sets.map(s => s ? s[side] : '').join(' ');
};

/**
 * Renders a visual bracket tree to the PDF
 */
const renderBracketToPDF = (doc: jsPDF, divisions: Division[], players: Record<string, Player>, startY: number, pageWidth: number, bracketType: 'main' | 'consolation' = 'main') => {
    const allMatches = divisions.flatMap(d => d.matches);
    const filteredMatches = bracketType === 'main'
        ? allMatches.filter(m => !m.roundName?.includes('(Cons.)'))
        : allMatches.filter(m => m.roundName?.includes('(Cons.)'));

    if (filteredMatches.length === 0) return startY;

    // Identify Rounds
    const rounds = Array.from(new Set(filteredMatches.map(m => Number(m.jornada)))).sort((a, b) => a - b);
    const matchesByRound: Record<number, Match[]> = {};
    rounds.forEach(r => {
        matchesByRound[r] = filteredMatches.filter(m => Number(m.jornada) === r);
    });

    const boxWidth = 50;
    const boxHeight = 20; // Taller for pairs
    const xGap = 15;
    const headerHeight = 10;

    // Scale down if too many rounds for page width
    // total width = rounds * (boxWidth + xGap)
    // if width > pageWidth -> scale
    let scale = 1;
    const totalRequiredWidth = rounds.length * (boxWidth + xGap) + 20;
    if (totalRequiredWidth > pageWidth) {
        scale = pageWidth / totalRequiredWidth;
    }

    const scaledBoxWidth = boxWidth * scale;
    const scaledBoxHeight = boxHeight * scale;
    const scaledXGap = xGap * scale;
    const bufferY = startY + 20;

    let currentX = 15; // Margin Left

    // Draw Title
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(bracketType === 'main' ? "Cuadro Principal" : "Cuadro de Consolación", 15, startY + 10);

    doc.setFontSize(8 * scale); // Scale font

    rounds.forEach((round, rIndex) => {
        const matches = matchesByRound[round];
        const roundName = matches[0]?.roundName || `Ronda ${round}`;

        // Draw Round Header
        doc.setTextColor(100, 100, 100);
        doc.text(roundName, currentX + (scaledBoxWidth / 2), bufferY - 5, { align: 'center' });

        // Calculate Y positions
        // In a perfect binary tree, spacing doubles each round.
        // Round 1: spacing 1. Round 2: spacing 2. Round 3: spacing 4.
        // Base spacing
        const matchSpacing = 10 * scale;

        matches.forEach((match, mIndex) => {
            // Need a smart way to position vertically to align with previous round winners
            // For simple rendering: just stack them with gaps that grow with rounds? 
            // Or just list them? Listing is safer for non-perfect trees. 
            // Let's try "Center Alignment" logic simply:

            // Basic Layout: Just list them for now to ensure visibility of all matches
            // Ideally: Y = Offset + mIndex * (Height + Gap) * (2^rIndex)? 
            // It's tricky without a strict tree traversal to coordinate parents/children visually in canvas.
            // Fallback: Simple column lists.

            // To make it look like a bracket, we usually center children relative to parents.
            // Let's stick to a simple columnar view.

            const yPos = bufferY + (mIndex * (scaledBoxHeight + matchSpacing)) + (rIndex * 15); // Add drift to prevent overlap if dense? No.

            // We need to spread them out more in later rounds
            // Heuristic: spacing = base * 2^rIndex
            const spreadFactor = Math.pow(2, rIndex);
            // BUT this assumes the matches list is sorted in bracket order (1 vs 16, 8 vs 9...). 
            // Our matchesByRound might not be perfectly sorted.

            // Creating a "Box"
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(255, 255, 255);
            doc.rect(currentX, yPos, scaledBoxWidth, scaledBoxHeight, 'FD');

            // Highlight Winner
            const p1Won = match.status === 'finalizado' && match.points.p1 > match.points.p2;
            const p2Won = match.status === 'finalizado' && match.points.p2 > match.points.p1;

            // Pair 1 Name
            doc.setTextColor(p1Won ? 0 : 80);
            if (p1Won) doc.setFont(undefined, 'bold'); else doc.setFont(undefined, 'normal');
            doc.text(getPairName(match.pair1, players), currentX + 2, yPos + (scaledBoxHeight * 0.35));

            // Pair 1 Score
            if (match.status === 'finalizado') {
                doc.text(getScoreString(match, 'p1'), currentX + scaledBoxWidth - 2, yPos + (scaledBoxHeight * 0.35), { align: 'right' });
            }

            // Separator Line
            doc.setDrawColor(240, 240, 240);
            doc.line(currentX + 2, yPos + (scaledBoxHeight / 2), currentX + scaledBoxWidth - 2, yPos + (scaledBoxHeight / 2));

            // Pair 2 Name
            doc.setTextColor(p2Won ? 0 : 80);
            if (p2Won) doc.setFont(undefined, 'bold'); else doc.setFont(undefined, 'normal');
            doc.text(getPairName(match.pair2, players), currentX + 2, yPos + (scaledBoxHeight * 0.85));

            // Pair 2 Score
            if (match.status === 'finalizado') {
                doc.text(getScoreString(match, 'p2'), currentX + scaledBoxWidth - 2, yPos + (scaledBoxHeight * 0.85), { align: 'right' });
            }

            // Draw Connector Line (simplified: just a stub to the right)
            if (rIndex < rounds.length - 1) {
                doc.setDrawColor(180, 180, 180);
                doc.line(currentX + scaledBoxWidth, yPos + (scaledBoxHeight / 2), currentX + scaledBoxWidth + (scaledXGap / 2), yPos + (scaledBoxHeight / 2));
            }
        });

        currentX += (scaledBoxWidth + scaledXGap);
    });

    // Return bottom Y for next section
    // Estimate max height used
    const maxMatchesConfig = rounds.map(r => matchesByRound[r].length);
    const maxMatches = Math.max(...maxMatchesConfig);
    // This calc is rough because we didn't apply the exponential spacing in the loop above fully. 
    // For a robust one, we'd need tree traversal. 
    // This "Simple Column" view is acceptable for export MVP.
    return bufferY + (maxMatches * (scaledBoxHeight + 10)) + 20;
};

/**
 * Genera un PDF con las clasificaciones y estadísticas del torneo.
 * Soporta individual, parejas e híbrido.
 */
export const exportRankingToPDF = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(config.rankingName, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const subtitle = config.categoryName ? `${config.categoryName} • ${config.clubName || 'Racket Grid'}` : (config.clubName || 'Generado por Racket Grid');
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 32, pageWidth - 15, 32);

    let currentY = 40;

    // --- BRACKET RENDERING (Elimination / Hybrid Playoff) ---
    if (ranking.format === 'elimination' || (ranking.format === 'hybrid' && ranking.phase === 'playoff')) {
        // We need to render the bracket(s)
        // 1. Get relevant divisions (Main + Consolation)
        // For hybrid playoff, the divisions are distinct objects created in startPlayoffs
        // filter to 'playoff' stage or implicit if 'elimination' format

        let bracketDivisions: Division[] = [];
        if (ranking.format === 'elimination') {
            bracketDivisions = ranking.divisions;
        } else {
            bracketDivisions = ranking.divisions.filter(d => d.stage === 'playoff');
        }

        // Main Bracket
        currentY = renderBracketToPDF(doc, bracketDivisions, players, currentY, pageWidth, 'main');

        // Consolation Bracket (if exists matches)
        const hasConsolation = bracketDivisions.flatMap(d => d.matches).some(m => m.roundName?.includes('(Cons.)'));
        if (hasConsolation) {
            // Create a new page if running low on space
            if (doc.internal.pageSize.height - currentY < 100) {
                doc.addPage();
                currentY = 20;
            }
            currentY = renderBracketToPDF(doc, bracketDivisions, players, currentY, pageWidth, 'consolation');
        }

        // Add page break for potential standings table if desired
        doc.addPage();
        currentY = 20;
        doc.text("Clasificación / Resultados", 15, 15);
    }

    const standings = standingsCallback();

    if (standings.length === 0) {
        if (ranking.format !== 'elimination' && !(ranking.format === 'hybrid' && ranking.phase === 'playoff')) {
            doc.text("No hay datos de clasificación disponibles.", 15, currentY);
        }
        // If it's bracket only, we might have skipped standings, which is fine.
        // Ensure we save if we drew brackets
        if (ranking.format === 'elimination' || (ranking.format === 'hybrid' && ranking.phase === 'playoff')) {
            doc.save(`Cuadro_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }
    }

    // --- Utility to format player Name ---
    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
            // ID format: 'p1Id::p2Id' or 'p1Id-p2Id' in some legacy
            const separator = id.includes('::') ? '::' : '-';
            const [p1Id, p2Id] = id.split(separator);
            const p1 = players[p1Id];
            const p2 = players[p2Id];
            return `${p1?.nombre || '?'} ${p1?.apellidos?.charAt(0) || ''}. / ${p2?.nombre || '?'} ${p2?.apellidos?.charAt(0) || ''}.`;
        } else {
            const p = players[id];
            return p ? `${p.nombre} ${p.apellidos}` : "Jugador Eliminado";
        }
    };

    // --- Table Columns Definition ---
    const tableColumns = [
        { header: '#', dataKey: 'pos' },
        { header: (ranking.format === 'pairs' || ranking.format === 'hybrid') ? 'Pareja' : 'Jugador', dataKey: 'name' },
        { header: 'PJ', dataKey: 'pj' },
        { header: 'PTS', dataKey: 'pts' },
        { header: 'PG', dataKey: 'pg' },
        { header: 'PP', dataKey: 'pp' },
        { header: '% Vic', dataKey: 'winrate' },
    ];

    // Add Sets/Games diff for non-points based formats (Standard Padel)
    if (ranking.format !== 'americano' && ranking.format !== 'mexicano') {
        tableColumns.push(
            { header: 'Dif Sets', dataKey: 'setsDiff' },
            { header: 'Dif Juegos', dataKey: 'gamesDiff' }
        );
    }

    // --- Table Data Transformation ---
    const tableData = standings.map(row => {
        const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;
        return {
            pos: row.pos,
            name: formatName(row.playerId),
            pj: row.pj,
            pts: row.pts,
            pg: row.pg,
            pp: row.pj - row.pg, // Calculated PP
            winrate: `${winrate}%`,
            setsDiff: row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff,
            gamesDiff: row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff
        };
    });

    // --- Generate Table ---
    if (standings.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [tableColumns.map(c => c.header)],
            body: tableData.map(row => tableColumns.map(c => row[c.dataKey as keyof typeof row])),
            styles: {
                fontSize: 10,
                cellPadding: 3,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [63, 81, 181], // Indigo / Primary Color approximation
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 15 }, // Pos
                1: { halign: 'left' }, // Name
                2: { halign: 'center' }, // PJ
                3: { halign: 'center', fontStyle: 'bold' }, // PTS
                4: { halign: 'center', textColor: [0, 100, 0] }, // PG (Greenish)
                5: { halign: 'center', textColor: [150, 0, 0] }, // PP (Reddish)
                6: { halign: 'center' }, // Winrate
                7: { halign: 'center', textColor: [100, 100, 100] }, // Sets
                8: { halign: 'center', textColor: [100, 100, 100] }  // Games
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            didDrawPage: (data) => {
                // Footer: Page Number
                const str = `Página ${doc.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(str, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });

                // Footer: Branding
                doc.text("RacketGrid.com", 15, doc.internal.pageSize.height - 10);
            }
        });
    }

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
