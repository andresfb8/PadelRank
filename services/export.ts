
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player, Ranking, StandingRow } from '../types';

interface ExportConfig {
    rankingName: string;
    categoryName?: string;
    date?: string;
    clubName?: string;
}

/**
 * Genera un PDF con las clasificaciones y estadísticas del torneo.
 * Soporta individual, parejas e híbrido.
 */
export const exportRankingToPDF = (
    ranking: Ranking,
    standingsCallback: () => StandingRow[],
    players: Record<string, Player>,
    config: ExportConfig = { rankingName: 'Torneo PadelRank' }
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(config.rankingName, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const subtitle = config.categoryName ? `${config.categoryName} • ${config.clubName || 'PadelRank'}` : (config.clubName || 'Generado por PadelRank');
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 32, pageWidth - 15, 32);

    const standings = standingsCallback();

    if (standings.length === 0) {
        doc.text("No hay datos disponibles para exportar.", 15, 45);
        doc.save(`Ranking_${ranking.nombre.replace(/\s+/g, '_')}.pdf`);
        return;
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
    autoTable(doc, {
        startY: 40,
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
            doc.text("PadelRank.pro", 15, doc.internal.pageSize.height - 10);
        }
    });

    const fileName = `Ranking_${ranking.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
