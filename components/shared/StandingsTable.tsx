import React from 'react';
import { ArrowUp, ArrowDown, Trophy, Edit2 } from 'lucide-react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper, SortingState, ColumnDef } from '@tanstack/react-table';
import { StandingRow, Player } from '../../types';
import { StandingsColumn, FORMAT_COLUMN_PRESETS } from '../../types/StandingsColumn';
import { signed, zoneFor, ZoneKind } from '../public/playerMobile';

interface StandingsTableProps {
    /** Standings data to display */
    standings: StandingRow[];

    /** Player lookup map */
    players: Record<string, Player>;

    /** Column definitions (if not provided, uses default columns) */
    columns?: readonly StandingsColumn[];

    /** Whether player names should be clickable */
    onPlayerClick?: (playerId: string) => void;

    /** Number of top positions to highlight (default: 3) */
    highlightTop?: number;

    /** Formatting context */
    isAmericanoOrMexicano?: boolean;
    isHybrid?: boolean;

    /** Admin interactions */
    isAdmin?: boolean;
    onEditStats?: (row: StandingRow) => void;

    /** Promotion/Relegation zones */
    promotionCount?: number;
    relegationCount?: number;
    qualifiersCount?: number;
    consolationCount?: number;

    /** The pair or player this visitor follows: its row is tinted */
    highlightEntry?: string | null;
}

const ZONE_LABEL: Record<ZoneKind, string> = {
    up: 'Suben de división',
    down: 'Bajan de división',
    qualified: 'Pasan al cuadro principal',
    consolation: 'Van al cuadro de consolación',
    none: 'Sin cambio de división',
};

// Columns that hold figures: right-aligned, tabular
const TEXT_COLUMNS = new Set(['pos', 'playerId']);
// Won and lost sets and games only from wide screens; their differences stay at every width
const WIDE_ONLY = new Set(['setsWon', 'setsLost', 'gamesWon', 'gamesLost']);

export const StandingsTable: React.FC<StandingsTableProps> = ({
    standings,
    players,
    columns = FORMAT_COLUMN_PRESETS.setBasedFormat as readonly StandingsColumn[],
    onPlayerClick,
    isAmericanoOrMexicano,
    isHybrid,
    isAdmin,
    onEditStats,
    promotionCount = 0,
    relegationCount = 0,
    qualifiersCount = 0,
    consolationCount = 0,
    highlightEntry,
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const isPairFormat = standings.length > 0 && standings[0].playerId.includes('::');

    const getPlayerName = (playerId: string) => {
        if (isPairFormat && playerId.includes('::')) {
            const [p1, p2] = playerId.split('::');
            const player1 = players[p1];
            const player2 = players[p2];
            return `${player1 ? `${player1.nombre} ${player1.apellidos}` : '?'} / ${player2 ? `${player2.nombre} ${player2.apellidos}` : '?'}`;
        }
        const player = players[playerId];
        return player ? `${player.nombre} ${player.apellidos}` : 'Desconocido';
    };

    const format = isHybrid ? 'hybrid' : isAmericanoOrMexicano ? 'americano' : 'classic';
    const zoneOf = (row: StandingRow) => zoneFor(row, standings.length, {
        format, promotionCount, relegationCount,
        qualifiersCount: isHybrid ? qualifiersCount : undefined,
        consolationCount: isHybrid ? consolationCount : undefined,
    });

    const columnHelper = createColumnHelper<StandingRow>();

    const tableColumns: ColumnDef<StandingRow, any>[] = columns.map(col => {
        const header = col.key === 'playerId' && isPairFormat ? 'Pareja' : col.label;

        if (col.key === 'pos') {
            return columnHelper.accessor('pos', {
                header,
                cell: info => <span className="font-semibold text-rg-muted">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className },
            });
        }

        if (col.key === 'playerId') {
            return columnHelper.accessor('playerId', {
                header,
                cell: info => {
                    const row = info.row.original;
                    const name = getPlayerName(info.getValue());
                    return (
                        <span className="flex items-center gap-2 min-w-0">
                            {onPlayerClick ? (
                                <button type="button" onClick={() => onPlayerClick(info.getValue())} className="font-semibold text-left truncate hover:text-court transition-colors">
                                    {name}
                                </button>
                            ) : <span className="font-semibold truncate">{name}</span>}
                            {row.manualAdjustment ? (
                                <span className="pill bg-[#fffbeb] text-[#92400e]" title="Ajuste manual de puntos">ajuste {signed(row.manualAdjustment)}</span>
                            ) : null}
                        </span>
                    );
                },
                enableSorting: col.sortable ?? false,
                meta: { className: col.className },
            });
        }

        if (col.key === 'pts') {
            return columnHelper.accessor('pts', {
                header,
                cell: info => <span className="font-bold text-[15px]">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className },
            });
        }

        if (col.key === 'winRate') {
            return columnHelper.accessor('winRate', {
                header,
                cell: info => <span>{Math.round(info.getValue())} %</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className },
            });
        }

        if (col.key === 'setsDiff' || col.key === 'gamesDiff') {
            return columnHelper.accessor(col.key as any, {
                header,
                cell: info => <span>{signed(info.getValue() as number)}</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className },
            });
        }

        // Generic column (pj, pg, pp, sets and games won and lost)
        return columnHelper.accessor(col.key as any, {
            header,
            cell: col.render ? (info => col.render!(info.getValue(), info.row.original)) : (info => <span>{info.getValue()}</span>),
            enableSorting: col.sortable ?? true,
            meta: { className: col.className },
        });
    });

    const table = useReactTable({
        data: standings,
        columns: tableColumns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const sorted = sorting.length > 0;
    const rows = table.getRowModel().rows;
    const zones = rows.map(r => zoneOf(r.original));
    const hasZones = !sorted && zones.some(z => z !== 'none');
    const colCount = columns.length + (isAdmin && onEditStats ? 1 : 0); // a colSpan wider than the visible columns is harmless

    return (
        <div className="rg">
            <table className="w-full border-collapse num">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const key = (header.column.columnDef as any).accessorKey as string;
                                const numeric = !TEXT_COLUMNS.has(key);
                                const isSorted = header.column.getIsSorted();
                                return (
                                    <th
                                        key={header.id}
                                        scope="col"
                                        aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : undefined}
                                        className={`px-2.5 first:pl-4 last:pr-4 pt-1 pb-2 text-[12.5px] font-normal text-rg-muted whitespace-nowrap ${numeric ? 'text-right' : 'text-left'} ${key === 'pos' ? 'w-12' : ''} ${WIDE_ONLY.has(key) ? 'hidden xl:table-cell' : ''}`}
                                    >
                                        {header.column.getCanSort() ? (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={`inline-flex items-center gap-1 hover:text-rg-ink transition-colors ${numeric ? 'flex-row-reverse' : ''} ${isSorted ? 'text-rg-ink' : ''}`}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {isSorted === 'asc' && <ArrowUp size={12} />}
                                                {isSorted === 'desc' && <ArrowDown size={12} />}
                                            </button>
                                        ) : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                );
                            })}
                            {isAdmin && onEditStats && <th className="w-10"><span className="sr-only">Acciones</span></th>}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const zone = zones[i];
                        const showZone = hasZones && (i === 0 ? zone !== 'none' : zone !== zones[i - 1]);
                        const mine = highlightEntry === row.original.playerId;
                        return (
                            <React.Fragment key={row.id}>
                                {showZone && (
                                    <tr>
                                        <td colSpan={colCount} className={`px-4 pt-3 pb-1 text-[12.5px] border-t border-rg-rule ${zone === 'down' ? 'text-rg-negative' : zone === 'up' || zone === 'qualified' ? 'text-rg-positive' : 'text-rg-muted'}`}>
                                            {ZONE_LABEL[zone]}
                                        </td>
                                    </tr>
                                )}
                                <tr className={`transition-colors ${mine ? 'bg-court-soft' : 'hover:bg-rg-ground'}`}>
                                    {row.getVisibleCells().map(cell => {
                                        const key = (cell.column.columnDef as any).accessorKey as string;
                                        const numeric = !TEXT_COLUMNS.has(key);
                                        return (
                                            <td
                                                key={cell.id}
                                                className={`px-2.5 first:pl-4 last:pr-4 py-2.5 text-[14px] border-t border-rg-rule ${numeric ? 'text-right whitespace-nowrap' : ''} ${WIDE_ONLY.has(key) ? 'hidden xl:table-cell' : ''} ${key === 'playerId' ? 'max-w-[320px]' : ''} ${mine && (key === 'pos' || key === 'pts' || key === 'playerId') ? '[&_*]:text-court-ink' : ''}`}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        );
                                    })}
                                    {isAdmin && onEditStats && (
                                        <td className="pr-3 py-2.5 text-right border-t border-rg-rule">
                                            <button
                                                type="button"
                                                onClick={() => onEditStats(row.original)}
                                                className="w-8 h-8 inline-grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised transition-colors"
                                                title="Ajustar estadísticas"
                                                aria-label={`Ajustar estadísticas de ${getPlayerName(row.original.playerId)}`}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
            {standings.length === 0 && (
                <div className="px-4 py-10 text-center text-rg-muted flex flex-col items-center gap-2">
                    <Trophy size={24} className="text-rg-control" />
                    <p className="text-sm">Aún no hay partidos jugados para calcular la clasificación.</p>
                </div>
            )}
        </div>
    );
};
