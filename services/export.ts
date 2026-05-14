import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player, Ranking, StandingRow, Division, Match } from '../types';

interface ExportConfig {
    rankingName: string;
    categoryName?: string;
    date?: string;
    clubName?: string;
}

// Helper: Download file
const downloadFile = (content: string, fileName: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

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
    // Determine orientation: Landscape for brackets (elimination/playoff)
    const isLandscape = ranking.format === 'elimination' || (ranking.format === 'hybrid' && ranking.phase === 'playoff');
    const doc = new jsPDF({
        orientation: isLandscape ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
    });
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
    let tableColumns = [
        { header: '#', dataKey: 'pos', key: 'pos' },
        { header: (ranking.format === 'pairs' || ranking.format === 'hybrid') ? 'Pareja' : 'Jugador', dataKey: 'name', key: 'player' },
        { header: 'PJ', dataKey: 'matchCount', key: 'pj' }, // Note: key 'pj' matches config
        { header: 'PTS', dataKey: 'pts', key: 'pts' },
        { header: 'PG', dataKey: 'matchesWon', key: 'pg' },
        { header: 'PP', dataKey: 'matchesLost', key: 'pp' },
        { header: '% Vic', dataKey: 'winRate', key: 'winRate' },
    ];

    // Add Sets/Games diff for non-points based formats (Standard Padel)
    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        tableColumns.push(
            { header: 'Dif Sets', dataKey: 'setsDiff', key: 'setsDiff' },
            { header: 'Dif Juegos', dataKey: 'gamesDiff', key: 'gamesDiff' }
        );
    }

    // Filter columns based on config
    const visibleConfig = ranking.config?.visibleColumns;
    if (visibleConfig) {
        tableColumns = tableColumns.filter(col =>
            // Always show Position and Name
            ['pos', 'player'].includes(col.key) ||
            // Show mandatory columns as per web view logic if not explicitly in config, 
            // but for safety rely on config. If config exists, it should have mandatory ones.
            // Fallback: If 'pts' is missing in config (shouldn't happen with UI), force it?
            // Better: Trust config + enforce pos/player.
            visibleConfig.includes(col.key)
        );
    }

    // --- Table Data Transformation ---
    const tableData = standings.map(row => {
        // Prepare data with keys matching tableColumns 'dataKey'
        // Using loose matching for transformation flexibility
        return {
            pos: row.pos,
            name: formatName(row.playerId),
            matchCount: row.pj, // mapped to 'pj' header
            pts: row.pts,
            matchesWon: row.pg, // mapped to 'pg' header
            matchesLost: row.pj - row.pg, // mapped to 'pp' header
            winRate: `${Math.round(row.winRate)}%`,
            setsDiff: row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff,
            gamesDiff: row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff
        };
    });

    // --- Generate Table ---
    if (standings.length > 0) {
        const finalBody = tableData.map(row => tableColumns.map(c => (row as any)[c.dataKey]));

        autoTable(doc, {
            startY: currentY,
            head: [tableColumns.map(c => c.header)],
            body: finalBody,
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
            // Dynamic column styles tricky with dynamic columns. 
            // We can map styles by index after filtering.
            columnStyles: tableColumns.reduce((acc, col, index) => {
                if (col.key === 'pos') acc[index] = { halign: 'center', fontStyle: 'bold', cellWidth: 15 };
                else if (col.key === 'player') acc[index] = { halign: 'left' };
                else if (col.key === 'pts') acc[index] = { halign: 'center', fontStyle: 'bold' };
                else if (col.key === 'pg') acc[index] = { halign: 'center', textColor: [0, 100, 0] };
                else if (col.key === 'pp') acc[index] = { halign: 'center', textColor: [150, 0, 0] };
                else if (col.key === 'winRate') acc[index] = { halign: 'center' };
                else if (col.key === 'setsDiff' || col.key === 'gamesDiff') acc[index] = { halign: 'center', textColor: [100, 100, 100] };
                else acc[index] = { halign: 'center' };
                return acc;
            }, {} as any),
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

/**
 * Exporta la clasificación a CSV
 */
export const exportRankingToCSV = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const standings = standingsCallback();

    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    // CSV Header
    let csvContent = `Clasificación: ${config.rankingName}\n`;
    if (config.categoryName) csvContent += `Categoría: ${config.categoryName}\n`;
    if (config.clubName) csvContent += `Club: ${config.clubName}\n`;
    csvContent += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Table Header
    const headers = [
        'Posición',
        ranking.format === 'pairs' || ranking.format === 'hybrid' ? 'Pareja' : 'Jugador',
        'PJ',
        'PTS',
        'PG',
        'PP',
        '% Victorias'
    ];

    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        headers.push('Dif Sets', 'Dif Juegos');
    }

    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

    // Table Data
    standings.forEach(row => {
        const rowData = [
            row.pos,
            formatName(row.playerId),
            row.pj,
            row.pts,
            row.pg,
            row.pj - row.pg,
            `${Math.round(row.winRate)}%`
        ];

        if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
            rowData.push(
                row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff,
                row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff
            );
        }

        csvContent += rowData.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
};

/**
 * Exporta la clasificación a Excel
 */
export const exportRankingToExcel = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const standings = standingsCallback();

    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    // Prepare data for Excel
    const headers = [
        'Posición',
        ranking.format === 'pairs' || ranking.format === 'hybrid' ? 'Pareja' : 'Jugador',
        'PJ',
        'PTS',
        'PG',
        'PP',
        '% Victorias'
    ];

    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        headers.push('Dif Sets', 'Dif Juegos');
    }

    const data = standings.map(row => {
        const rowData = [
            row.pos,
            formatName(row.playerId),
            row.pj,
            row.pts,
            row.pg,
            row.pj - row.pg,
            Math.round(row.winRate)
        ];

        if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
            rowData.push(
                row.setsDiff,
                row.gamesDiff
            );
        }

        return rowData;
    });

    // Create workbook XML
    const wsData = [headers, ...data];
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xmlContent += '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>' + config.rankingName + '</Title></DocumentProperties>\n';
    xmlContent += '<Styles>\n';
    xmlContent += '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="3F51B5" ss:Pattern="Solid"/><Font ss:Color="FFFFFF"/></Style>\n';
    xmlContent += '<Style ss:ID="Center"><Alignment ss:Horizontal="Center"/></Style>\n';
    xmlContent += '</Styles>\n';
    xmlContent += '<Worksheet ss:Name="Clasificación">\n';
    xmlContent += '<Table>\n';

    // Add header row with info
    xmlContent += '<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Clasificación: ' + config.rankingName + '</Data></Cell></Row>\n';
    if (config.categoryName) xmlContent += '<Row><Cell><Data ss:Type="String">Categoría: ' + config.categoryName + '</Data></Cell></Row>\n';
    if (config.clubName) xmlContent += '<Row><Cell><Data ss:Type="String">Club: ' + config.clubName + '</Data></Cell></Row>\n';
    xmlContent += '<Row><Cell><Data ss:Type="String">Fecha: ' + new Date().toLocaleDateString('es-ES') + '</Data></Cell></Row>\n';
    xmlContent += '<Row></Row>\n'; // Empty row for spacing

    // Add table headers
    xmlContent += '<Row>\n';
    headers.forEach(header => {
        xmlContent += '<Cell ss:StyleID="Header"><Data ss:Type="String">' + header + '</Data></Cell>\n';
    });
    xmlContent += '</Row>\n';

    // Add data rows
    data.forEach(row => {
        xmlContent += '<Row>\n';
        row.forEach((cell, idx) => {
            const isNumeric = typeof cell === 'number' && idx > 1; // Skip pos and name
            const dataType = isNumeric ? 'Number' : 'String';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="' + dataType + '">' + cell + '</Data></Cell>\n';
        });
        xmlContent += '</Row>\n';
    });

    xmlContent += '</Table>\n';
    xmlContent += '</Worksheet>\n';
    xmlContent += '</Workbook>';

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xls`;
    downloadFile(xmlContent, fileName, 'application/vnd.ms-excel');
};

/**
 * Exporta la clasificación a JSON
 */
export const exportRankingToJSON = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const standings = standingsCallback();

    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    const exportData = {
        metadata: {
            rankingName: config.rankingName,
            categoryName: config.categoryName,
            clubName: config.clubName,
            format: ranking.format,
            exportDate: new Date().toISOString(),
            totalPlayers: standings.length
        },
        standings: standings.map(row => ({
            position: row.pos,
            player: formatName(row.playerId),
            playerId: row.playerId,
            matchesPlayed: row.pj,
            points: row.pts,
            matchesWon: row.pg,
            matchesLost: row.pj - row.pg,
            winRate: `${Math.round(row.winRate)}%`,
            ...(ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo' && {
                setsDifference: row.setsDiff,
                gamesDifference: row.gamesDiff
            })
        }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, fileName, 'application/json');
};

/**
 * Exporta los partidos a CSV
 */
export const exportMatchesToCSV = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id || id === 'BYE') return id;
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : "Jugador Desconocido";
    };

    const formatPairName = (pair: any): string => {
        if (!pair.p1Id) return "TBD";
        if (pair.p1Id === 'BYE') return 'BYE';
        const p1 = formatName(pair.p1Id);
        const p2 = pair.p2Id ? formatName(pair.p2Id) : '';
        return p2 ? `${p1} / ${p2}` : p1;
    };

    let csvContent = `Partidos: ${config.rankingName}\n`;
    if (config.categoryName) csvContent += `Categoría: ${config.categoryName}\n`;
    if (config.clubName) csvContent += `Club: ${config.clubName}\n`;
    csvContent += `Fecha de Exportación: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Headers
    const headers = ['División', 'Jornada', 'Equipo 1', 'Equipo 2', 'Resultado', 'Estado', 'Hora'];
    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        headers.push('Sets');
    } else {
        headers.push('Puntos');
    }
    headers.push('Cancha');

    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

    // Data
    divisions.forEach(division => {
        division.matches.forEach(match => {
            const p1Name = formatPairName(match.pair1);
            const p2Name = formatPairName(match.pair2);

            let resultado = '';
            if (match.status === 'finalizado') {
                resultado = match.points.p1 > match.points.p2 ? p1Name : p2Name;
            } else if (match.status === 'pendiente') {
                resultado = 'Pendiente';
            } else {
                resultado = match.status;
            }

            let scoreStr = '';
            if (match.status === 'finalizado' && match.score) {
                if (ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo') {
                    scoreStr = `${match.score.pointsScored?.p1 || match.points.p1} - ${match.score.pointsScored?.p2 || match.points.p2}`;
                } else {
                    const sets = [];
                    if (match.score.set1) sets.push(`${match.score.set1.p1}-${match.score.set1.p2}`);
                    if (match.score.set2) sets.push(`${match.score.set2.p1}-${match.score.set2.p2}`);
                    if (match.score.set3) sets.push(`${match.score.set3.p1}-${match.score.set3.p2}`);
                    scoreStr = sets.join(', ');
                }
            }

            const rowData = [
                division.category || `División ${division.numero}`,
                match.jornada,
                p1Name,
                p2Name,
                resultado,
                match.status,
                match.startTime ? new Date(match.startTime).toLocaleTimeString('es-ES') : '',
                scoreStr,
                match.court || ''
            ];

            csvContent += rowData.map(cell => `"${cell}"`).join(',') + '\n';
        });
    });

    const fileName = `RacketGrid_Partidos_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
};

/**
 * Exporta los partidos a Excel
 */
export const exportMatchesToExcel = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id || id === 'BYE') return id;
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : "Jugador Desconocido";
    };

    const formatPairName = (pair: any): string => {
        if (!pair.p1Id) return "TBD";
        if (pair.p1Id === 'BYE') return 'BYE';
        const p1 = formatName(pair.p1Id);
        const p2 = pair.p2Id ? formatName(pair.p2Id) : '';
        return p2 ? `${p1} / ${p2}` : p1;
    };

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xmlContent += '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Partidos - ' + config.rankingName + '</Title></DocumentProperties>\n';
    xmlContent += '<Styles>\n';
    xmlContent += '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="3F51B5" ss:Pattern="Solid"/><Font ss:Color="FFFFFF"/></Style>\n';
    xmlContent += '<Style ss:ID="Center"><Alignment ss:Horizontal="Center"/></Style>\n';
    xmlContent += '<Style ss:ID="DivisionHeader"><Font ss:Bold="1" ss:Size="12"/><Interior ss:Color="E0E0E0" ss:Pattern="Solid"/></Style>\n';
    xmlContent += '</Styles>\n';
    xmlContent += '<Worksheet ss:Name="Partidos">\n';
    xmlContent += '<Table>\n';

    // Header Info
    xmlContent += '<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Partidos: ' + config.rankingName + '</Data></Cell></Row>\n';
    if (config.categoryName) xmlContent += '<Row><Cell><Data ss:Type="String">Categoría: ' + config.categoryName + '</Data></Cell></Row>\n';
    if (config.clubName) xmlContent += '<Row><Cell><Data ss:Type="String">Club: ' + config.clubName + '</Data></Cell></Row>\n';
    xmlContent += '<Row><Cell><Data ss:Type="String">Fecha: ' + new Date().toLocaleDateString('es-ES') + '</Data></Cell></Row>\n';
    xmlContent += '<Row></Row>\n';

    // Headers
    const headers = ['División', 'Jornada', 'Equipo 1', 'Equipo 2', 'Resultado', 'Estado', 'Hora', 'Score', 'Cancha'];
    xmlContent += '<Row>\n';
    headers.forEach(header => {
        xmlContent += '<Cell ss:StyleID="Header"><Data ss:Type="String">' + header + '</Data></Cell>\n';
    });
    xmlContent += '</Row>\n';

    // Data
    divisions.forEach(division => {
        // Division separator
        xmlContent += '<Row>\n';
        xmlContent += '<Cell ss:StyleID="DivisionHeader"><Data ss:Type="String">' + (division.category || `División ${division.numero}`) + '</Data></Cell>\n';
        xmlContent += '</Row>\n';

        division.matches.forEach(match => {
            const p1Name = formatPairName(match.pair1);
            const p2Name = formatPairName(match.pair2);

            let resultado = '';
            if (match.status === 'finalizado') {
                resultado = match.points.p1 > match.points.p2 ? p1Name : p2Name;
            } else if (match.status === 'pendiente') {
                resultado = 'Pendiente';
            } else {
                resultado = match.status;
            }

            let scoreStr = '';
            if (match.status === 'finalizado' && match.score) {
                if (ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo') {
                    scoreStr = `${match.score.pointsScored?.p1 || match.points.p1}-${match.score.pointsScored?.p2 || match.points.p2}`;
                } else {
                    const sets = [];
                    if (match.score.set1) sets.push(`${match.score.set1.p1}-${match.score.set1.p2}`);
                    if (match.score.set2) sets.push(`${match.score.set2.p1}-${match.score.set2.p2}`);
                    if (match.score.set3) sets.push(`${match.score.set3.p1}-${match.score.set3.p2}`);
                    scoreStr = sets.join(', ');
                }
            }

            xmlContent += '<Row>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + (division.category || `División ${division.numero}`) + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + match.jornada + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + p1Name + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + p2Name + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + resultado + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + match.status + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + (match.startTime ? new Date(match.startTime).toLocaleTimeString('es-ES') : '') + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + scoreStr + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="String">' + (match.court || '') + '</Data></Cell>\n';
            xmlContent += '</Row>\n';
        });
    });

    xmlContent += '</Table>\n';
    xmlContent += '</Worksheet>\n';
    xmlContent += '</Workbook>';

    const fileName = `RacketGrid_Partidos_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xls`;
    downloadFile(xmlContent, fileName, 'application/vnd.ms-excel');
};

/**
 * Exporta clasificación de múltiples divisiones (cada una por separado) a CSV
 */
export const exportMultipleDivisionsToCSV = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    let csvContent = `Clasificación: ${config.rankingName}\n`;
    if (config.categoryName) csvContent += `Categoría: ${config.categoryName}\n`;
    if (config.clubName) csvContent += `Club: ${config.clubName}\n`;
    csvContent += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Table Header
    const headers = [
        'División',
        'Posición',
        ranking.format === 'pairs' || ranking.format === 'hybrid' ? 'Pareja' : 'Jugador',
        'PJ',
        'PTS',
        'PG',
        'PP',
        '% Victorias'
    ];

    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        headers.push('Dif Sets', 'Dif Juegos');
    }

    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

    // Data for each division
    divisions.forEach(division => {
        const { generateStandings } = require('../services/logic');
        const divisionStandings = generateStandings(
            division.id,
            division.matches,
            division.players,
            ranking.format as any,
            ranking.manualPointsAdjustments,
            ranking.manualStatsAdjustments,
            ranking.config?.tieBreakCriteria
        );

        divisionStandings.forEach(row => {
            const rowData = [
                division.category || `División ${division.numero}`,
                row.pos,
                formatName(row.playerId),
                row.pj,
                row.pts,
                row.pg,
                row.pj - row.pg,
                `${Math.round(row.winRate)}%`
            ];

            if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
                rowData.push(
                    row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff,
                    row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff
                );
            }

            csvContent += rowData.map(cell => `"${cell}"`).join(',') + '\n';
        });

        csvContent += '\n';
    });

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
};

/**
 * Exporta clasificación de múltiples divisiones (cada una por separado) a Excel
 */
export const exportMultipleDivisionsToExcel = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xmlContent += '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>Clasificación - ' + config.rankingName + '</Title></DocumentProperties>\n';
    xmlContent += '<Styles>\n';
    xmlContent += '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="3F51B5" ss:Pattern="Solid"/><Font ss:Color="FFFFFF"/></Style>\n';
    xmlContent += '<Style ss:ID="DivisionHeader"><Font ss:Bold="1" ss:Size="12"/><Interior ss:Color="E0E0E0" ss:Pattern="Solid"/></Style>\n';
    xmlContent += '<Style ss:ID="Center"><Alignment ss:Horizontal="Center"/></Style>\n';
    xmlContent += '</Styles>\n';
    xmlContent += '<Worksheet ss:Name="Clasificación">\n';
    xmlContent += '<Table>\n';

    // Header Info
    xmlContent += '<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Clasificación: ' + config.rankingName + '</Data></Cell></Row>\n';
    if (config.categoryName) xmlContent += '<Row><Cell><Data ss:Type="String">Categoría: ' + config.categoryName + '</Data></Cell></Row>\n';
    if (config.clubName) xmlContent += '<Row><Cell><Data ss:Type="String">Club: ' + config.clubName + '</Data></Cell></Row>\n';
    xmlContent += '<Row><Cell><Data ss:Type="String">Fecha: ' + new Date().toLocaleDateString('es-ES') + '</Data></Cell></Row>\n';
    xmlContent += '<Row></Row>\n';

    // Headers
    const headers = ['Posición', ranking.format === 'pairs' || ranking.format === 'hybrid' ? 'Pareja' : 'Jugador', 'PJ', 'PTS', 'PG', 'PP', '% Victorias'];
    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        headers.push('Dif Sets', 'Dif Juegos');
    }

    // Data for each division
    divisions.forEach(division => {
        // Division separator
        xmlContent += '<Row>\n';
        xmlContent += '<Cell ss:StyleID="DivisionHeader"><Data ss:Type="String">' + (division.category || `División ${division.numero}`) + '</Data></Cell>\n';
        xmlContent += '</Row>\n';

        // Division header row
        xmlContent += '<Row>\n';
        headers.forEach(header => {
            xmlContent += '<Cell ss:StyleID="Header"><Data ss:Type="String">' + header + '</Data></Cell>\n';
        });
        xmlContent += '</Row>\n';

        // Division data
        const { generateStandings } = require('../services/logic');
        const divisionStandings = generateStandings(
            division.id,
            division.matches,
            division.players,
            ranking.format as any,
            ranking.manualPointsAdjustments,
            ranking.manualStatsAdjustments,
            ranking.config?.tieBreakCriteria
        );

        divisionStandings.forEach(row => {
            xmlContent += '<Row>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.pos + '</Data></Cell>\n';
            xmlContent += '<Cell><Data ss:Type="String">' + formatName(row.playerId) + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.pj + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.pts + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.pg + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + (row.pj - row.pg) + '</Data></Cell>\n';
            xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + Math.round(row.winRate) + '</Data></Cell>\n';
            if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
                xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.setsDiff + '</Data></Cell>\n';
                xmlContent += '<Cell ss:StyleID="Center"><Data ss:Type="Number">' + row.gamesDiff + '</Data></Cell>\n';
            }
            xmlContent += '</Row>\n';
        });

        xmlContent += '<Row></Row>\n'; // Spacing
    });

    xmlContent += '</Table>\n';
    xmlContent += '</Worksheet>\n';
    xmlContent += '</Workbook>';

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xls`;
    downloadFile(xmlContent, fileName, 'application/vnd.ms-excel');
};

/**
 * Exporta clasificación de múltiples divisiones (cada una por separado) a JSON
 */
export const exportMultipleDivisionsToJSON = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    const divisionData = divisions.map(division => {
        const { generateStandings } = require('../services/logic');
        const standings = generateStandings(
            division.id,
            division.matches,
            division.players,
            ranking.format as any,
            ranking.manualPointsAdjustments,
            ranking.manualStatsAdjustments,
            ranking.config?.tieBreakCriteria
        );

        return {
            nombre: division.category || `División ${division.numero}`,
            jugadores: standings.map(row => ({
                posicion: row.pos,
                jugador: formatName(row.playerId),
                jugadorId: row.playerId,
                pj: row.pj,
                pts: row.pts,
                pg: row.pg,
                pp: row.pj - row.pg,
                winRate: `${Math.round(row.winRate)}%`,
                setsDiff: row.setsDiff,
                gamesDiff: row.gamesDiff
            }))
        };
    });

    const exportData = {
        metadata: {
            rankingName: config.rankingName,
            categoryName: config.categoryName,
            clubName: config.clubName,
            format: ranking.format,
            exportDate: new Date().toISOString(),
            divisiones: divisionData.length
        },
        divisiones: divisionData
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, fileName, 'application/json');
};

/**
 * Exporta clasificación y partidos a PDF en un solo documento
 */
export const exportRankingAndMatchesToPDF = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const isLandscape = false;
    const doc = new jsPDF({
        orientation: isLandscape ? 'l' : 'p',
        unit: 'mm',
        format: 'a4'
    });
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

    // --- SECTION 1: STANDINGS ---
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Clasificación', 15, currentY);
    currentY += 10;

    const formatName = (id: string): string => {
        if (!id) return "Desconocido";
        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
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

    let tableColumns = [
        { header: '#', dataKey: 'pos', key: 'pos' },
        { header: (ranking.format === 'pairs' || ranking.format === 'hybrid') ? 'Pareja' : 'Jugador', dataKey: 'name', key: 'player' },
        { header: 'PJ', dataKey: 'matchCount', key: 'pj' },
        { header: 'PTS', dataKey: 'pts', key: 'pts' },
        { header: 'PG', dataKey: 'matchesWon', key: 'pg' },
        { header: 'PP', dataKey: 'matchesLost', key: 'pp' },
    ];

    if (ranking.format !== 'americano' && ranking.format !== 'mexicano' && ranking.format !== 'pozo') {
        tableColumns.push(
            { header: 'Dif Sets', dataKey: 'setsDiff', key: 'setsDiff' },
            { header: 'Dif Juegos', dataKey: 'gamesDiff', key: 'gamesDiff' }
        );
    }

    // Generate standings for each division
    const { generateStandings } = require('../services/logic');
    divisions.forEach(division => {
        // Add division title
        doc.setFontSize(12);
        doc.setTextColor(63, 81, 181);
        doc.text(division.category || `División ${division.numero}`, 15, currentY);
        currentY += 7;

        // Get standings for this division
        const divisionStandings = generateStandings(
            division.id,
            division.matches,
            division.players,
            ranking.format as any,
            ranking.manualPointsAdjustments,
            ranking.manualStatsAdjustments,
            ranking.config?.tieBreakCriteria
        );

        const tableData = divisionStandings.map(row => ({
            pos: row.pos,
            name: formatName(row.playerId),
            matchCount: row.pj,
            pts: row.pts,
            matchesWon: row.pg,
            matchesLost: row.pj - row.pg,
            setsDiff: row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff,
            gamesDiff: row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff
        }));

        const finalBody = tableData.map(row => tableColumns.map(c => (row as any)[c.dataKey]));

        if (finalBody.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [tableColumns.map(c => c.header)],
                body: finalBody,
                styles: {
                    fontSize: 8,
                    cellPadding: 1.5,
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [63, 81, 181],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: tableColumns.reduce((acc, col, index) => {
                    if (col.key === 'pos') acc[index] = { halign: 'center', fontStyle: 'bold', cellWidth: 10 };
                    else if (col.key === 'player') acc[index] = { halign: 'left', cellWidth: 35 };
                    else if (col.key === 'pts') acc[index] = { halign: 'center', fontStyle: 'bold' };
                    else acc[index] = { halign: 'center' };
                    return acc;
                }, {} as any),
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { bottom: 10 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Add page break if needed
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
    });

    // --- PAGE BREAK ---
    doc.addPage();
    currentY = 20;

    // --- SECTION 2: MATCHES ---
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Partidos', 15, currentY);
    currentY += 10;

    const formatPairName = (pair: any): string => {
        if (!pair.p1Id) return "TBD";
        if (pair.p1Id === 'BYE') return 'BYE';
        const p1 = formatName(pair.p1Id);
        const p2 = pair.p2Id ? formatName(pair.p2Id) : '';
        return p2 ? `${p1} / ${p2}` : p1;
    };

    const matchesData: any[] = [];
    divisions.forEach(division => {
        division.matches.forEach(match => {
            const p1Name = formatPairName(match.pair1);
            const p2Name = formatPairName(match.pair2);

            let resultado = '';
            if (match.status === 'finalizado') {
                resultado = match.points.p1 > match.points.p2 ? p1Name : p2Name;
            } else if (match.status === 'pendiente') {
                resultado = 'Pendiente';
            } else {
                resultado = match.status;
            }

            let scoreStr = '';
            if (match.status === 'finalizado' && match.score) {
                if (ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo') {
                    scoreStr = `${match.score.pointsScored?.p1 || match.points.p1}-${match.score.pointsScored?.p2 || match.points.p2}`;
                } else {
                    const sets = [];
                    if (match.score.set1) sets.push(`${match.score.set1.p1}-${match.score.set1.p2}`);
                    if (match.score.set2) sets.push(`${match.score.set2.p1}-${match.score.set2.p2}`);
                    if (match.score.set3) sets.push(`${match.score.set3.p1}-${match.score.set3.p2}`);
                    scoreStr = sets.join(', ');
                }
            }

            matchesData.push({
                division: division.category || `División ${division.numero}`,
                jornada: match.jornada,
                team1: p1Name,
                team2: p2Name,
                resultado: resultado,
                status: match.status,
                score: scoreStr
            });
        });
    });

    if (matchesData.length > 0) {
        const matchHeaders = ['División', 'Jornada', 'Equipo 1', 'Equipo 2', 'Ganador', 'Estado', 'Score'];
        const matchBody = matchesData.map(row => [
            row.division,
            row.jornada,
            row.team1,
            row.team2,
            row.resultado,
            row.status,
            row.score
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [matchHeaders],
            body: matchBody,
            styles: {
                fontSize: 8,
                cellPadding: 1.5,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [100, 130, 100],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' },
                1: { cellWidth: 12, halign: 'center' },
                2: { cellWidth: 35, halign: 'left' },
                3: { cellWidth: 35, halign: 'left' },
                4: { cellWidth: 28, halign: 'left' },
                5: { cellWidth: 18, halign: 'center' },
                6: { cellWidth: 15, halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            didDrawPage: (data) => {
                const str = `Página ${doc.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(str, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
                doc.text("RacketGrid.com", 15, doc.internal.pageSize.height - 10);
            }
        });
    }

    const fileName = `RacketGrid_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

/**
 * Exporta solo los partidos a PDF
 */
export const exportMatchesToPDF = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
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

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Partidos', 15, currentY);
    currentY += 10;

    const formatName = (id: string): string => {
        if (!id || id === 'BYE') return id;
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : "Jugador Desconocido";
    };

    const formatPairName = (pair: any): string => {
        if (!pair.p1Id) return "TBD";
        if (pair.p1Id === 'BYE') return 'BYE';
        const p1 = formatName(pair.p1Id);
        const p2 = pair.p2Id ? formatName(pair.p2Id) : '';
        return p2 ? `${p1} / ${p2}` : p1;
    };

    const matchesData: any[] = [];
    divisions.forEach(division => {
        division.matches.forEach(match => {
            const p1Name = formatPairName(match.pair1);
            const p2Name = formatPairName(match.pair2);

            let resultado = '';
            if (match.status === 'finalizado') {
                resultado = match.points.p1 > match.points.p2 ? p1Name : p2Name;
            } else if (match.status === 'pendiente') {
                resultado = 'Pendiente';
            } else {
                resultado = match.status;
            }

            let scoreStr = '';
            if (match.status === 'finalizado' && match.score) {
                if (ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo') {
                    scoreStr = `${match.score.pointsScored?.p1 || match.points.p1}-${match.score.pointsScored?.p2 || match.points.p2}`;
                } else {
                    const sets = [];
                    if (match.score.set1) sets.push(`${match.score.set1.p1}-${match.score.set1.p2}`);
                    if (match.score.set2) sets.push(`${match.score.set2.p1}-${match.score.set2.p2}`);
                    if (match.score.set3) sets.push(`${match.score.set3.p1}-${match.score.set3.p2}`);
                    scoreStr = sets.join(', ');
                }
            }

            matchesData.push({
                division: division.category || `División ${division.numero}`,
                jornada: match.jornada,
                team1: p1Name,
                team2: p2Name,
                resultado: resultado,
                status: match.status,
                score: scoreStr
            });
        });
    });

    if (matchesData.length > 0) {
        const matchHeaders = ['División', 'Jornada', 'Equipo 1', 'Equipo 2', 'Ganador', 'Estado', 'Score'];
        const matchBody = matchesData.map(row => [
            row.division,
            row.jornada,
            row.team1,
            row.team2,
            row.resultado,
            row.status,
            row.score
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [matchHeaders],
            body: matchBody,
            styles: {
                fontSize: 9,
                cellPadding: 2,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [100, 130, 100],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 25, halign: 'center' },
                1: { cellWidth: 12, halign: 'center' },
                2: { cellWidth: 35, halign: 'left' },
                3: { cellWidth: 35, halign: 'left' },
                4: { cellWidth: 28, halign: 'left' },
                5: { cellWidth: 18, halign: 'center' },
                6: { cellWidth: 15, halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [250, 250, 250]
            },
            didDrawPage: (data) => {
                const str = `Página ${doc.getNumberOfPages()}`;
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(str, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
                doc.text("RacketGrid.com", 15, doc.internal.pageSize.height - 10);
            }
        });
    }

    const fileName = `RacketGrid_Partidos_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

/**
 * Exporta los partidos a JSON
 */
export const exportMatchesToJSON = (
    ranking: Ranking,
    divisions: Division[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo Racket Grid' }
) => {
    const formatName = (id: string): string => {
        if (!id || id === 'BYE') return id;
        const p = players[id];
        return p ? `${p.nombre} ${p.apellidos}` : "Jugador Desconocido";
    };

    const formatPairName = (pair: any): string => {
        if (!pair.p1Id) return "TBD";
        if (pair.p1Id === 'BYE') return 'BYE';
        const p1 = formatName(pair.p1Id);
        const p2 = pair.p2Id ? formatName(pair.p2Id) : '';
        return p2 ? `${p1} / ${p2}` : p1;
    };

    const matches = divisions.flatMap(division =>
        division.matches.map(match => {
            const p1Name = formatPairName(match.pair1);
            const p2Name = formatPairName(match.pair2);

            let resultado = '';
            if (match.status === 'finalizado') {
                resultado = match.points.p1 > match.points.p2 ? p1Name : p2Name;
            } else if (match.status === 'pendiente') {
                resultado = 'Pendiente';
            } else {
                resultado = match.status;
            }

            let score = null;
            if (match.status === 'finalizado' && match.score) {
                if (ranking.format === 'americano' || ranking.format === 'mexicano' || ranking.format === 'pozo') {
                    score = {
                        p1Points: match.score.pointsScored?.p1 || match.points.p1,
                        p2Points: match.score.pointsScored?.p2 || match.points.p2
                    };
                } else {
                    score = {
                        set1: match.score.set1,
                        set2: match.score.set2,
                        set3: match.score.set3
                    };
                }
            }

            return {
                id: match.id,
                division: division.category || `División ${division.numero}`,
                jornada: match.jornada,
                team1: p1Name,
                team2: p2Name,
                winner: resultado,
                status: match.status,
                scheduledTime: match.startTime,
                score: score,
                court: match.court
            };
        })
    );

    const exportData = {
        metadata: {
            rankingName: config.rankingName,
            categoryName: config.categoryName,
            clubName: config.clubName,
            format: ranking.format,
            exportDate: new Date().toISOString(),
            totalMatches: matches.length,
            totalDivisions: divisions.length
        },
        matches: matches
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileName = `RacketGrid_Partidos_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, fileName, 'application/json');
};
