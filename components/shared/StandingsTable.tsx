import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, Medal, Award, Edit2, AlertCircle } from 'lucide-react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper, SortingState, ColumnDef } from '@tanstack/react-table';
import { StandingRow, Player } from '../../types';
import { StandingsColumn, FORMAT_COLUMN_PRESETS } from '../../types/StandingsColumn';

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
}

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
    consolationCount = 0
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

    const getPositionIcon = (pos: number) => {
        if (!isAmericanoOrMexicano) return null;
        if (pos === 1) return <Trophy size={14} className="text-yellow-500" />;
        if (pos === 2) return <Medal size={14} className="text-gray-400" />;
        if (pos === 3) return <Award size={14} className="text-amber-600" />;
        return null;
    };

    const getRowClassName = (row: StandingRow) => {
        const isPromoted = !isHybrid && !isAmericanoOrMexicano && row.pos <= promotionCount;
        const isRelegated = !isHybrid && !isAmericanoOrMexicano && row.pos > standings.length - relegationCount;
        const isQualified = isHybrid && row.pos <= qualifiersCount;
        const isConsolation = isHybrid && row.pos > qualifiersCount && row.pos <= (qualifiersCount + consolationCount);

        if (isPromoted || isQualified) return 'bg-green-50/50 hover:bg-green-100/50';
        if (isConsolation || isRelegated) return 'bg-red-50/50 hover:bg-red-100/50';
        return 'hover:bg-gray-50';
    };

    const columnHelper = createColumnHelper<StandingRow>();

    // Build table columns from StandingsColumn definitions
    const tableColumns: ColumnDef<StandingRow, any>[] = columns.map(col => {
        // Special handling for common columns
        if (col.key === 'pos') {
            return columnHelper.accessor('pos', {
                header: col.label,
                cell: info => (
                    <div className="flex items-center gap-2">
                        {getPositionIcon(info.getValue())}
                        <span className="font-bold text-gray-900">{info.getValue()}</span>
                    </div>
                ),
                enableSorting: col.sortable ?? true,
                meta: { className: col.className }
            });
        }

        if (col.key === 'playerId') {
            return columnHelper.accessor('playerId', {
                header: col.label,
                cell: info => {
                    const row = info.row.original;
                    const isPromoted = !isHybrid && !isAmericanoOrMexicano && row.pos <= promotionCount;
                    const isRelegated = !isHybrid && !isAmericanoOrMexicano && row.pos > standings.length - relegationCount;
                    const isQualified = isHybrid && row.pos <= qualifiersCount;
                    const isConsolation = isHybrid && row.pos > qualifiersCount && row.pos <= (qualifiersCount + consolationCount);

                    return (
                        <div className="flex items-center gap-2">
                            <span
                                className={`font-medium text-gray-900 truncate max-w-[100px] sm:max-w-[200px] ${onPlayerClick && !isPairFormat ? 'cursor-pointer hover:text-primary' : ''}`}
                                onClick={() => {
                                    if (onPlayerClick && !isPairFormat) {
                                        onPlayerClick(info.getValue());
                                    }
                                }}
                            >
                                {getPlayerName(info.getValue())}
                            </span>
                            <div className="flex gap-1">
                                {isPromoted && <span className="text-[8px] sm:text-[10px] bg-green-100 text-green-700 px-1 rounded font-bold">ASC</span>}
                                {isRelegated && <span className="text-[8px] sm:text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">DESC</span>}
                                {isQualified && <span className="text-[8px] sm:text-[10px] bg-green-100 text-green-700 px-1 rounded font-bold">Q</span>}
                                {isConsolation && <span className="text-[8px] sm:text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">C</span>}
                                {row.manualAdjustment !== undefined && row.manualAdjustment !== 0 && (
                                    <span className="text-[8px] sm:text-[10px] bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-0.5" title={`Ajuste manual: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}`}>
                                        <AlertCircle size={10} />
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
                enableSorting: col.sortable ?? false,
                meta: { className: col.className }
            });
        }

        if (col.key === 'pts') {
            return columnHelper.accessor('pts', {
                header: col.label,
                cell: info => <span className="font-bold text-primary">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className }
            });
        }

        if (col.key === 'pg') {
            return columnHelper.accessor('pg', {
                header: col.label,
                cell: info => <span className="text-green-600 font-semibold">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className }
            });
        }

        if (col.key === 'winRate') {
            return columnHelper.accessor('winRate', {
                header: col.label,
                cell: info => <span className="font-semibold text-gray-900">{Math.round(info.getValue())}%</span>,
                enableSorting: col.sortable ?? true,
                meta: { className: col.className }
            });
        }

        if (col.key === 'setsDiff' || col.key === 'gamesDiff') {
            return columnHelper.accessor(col.key as any, {
                header: col.label,
                cell: info => {
                    const val = info.getValue() as number;
                    return (
                        <span className={`font-medium ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {val > 0 ? '+' : ''}{val}
                        </span>
                    );
                },
                enableSorting: col.sortable ?? true,
                meta: { className: col.className }
            });
        }

        // Generic column
        return columnHelper.accessor(col.key as any, {
            header: col.label,
            cell: col.render ? (info => col.render!(info.getValue(), info.row.original)) : (info => <span className="text-gray-600">{info.getValue()}</span>),
            enableSorting: col.sortable ?? true,
            meta: { className: col.className }
        });
    });

    const table = useReactTable({
        data: standings,
        columns: tableColumns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const getSortIcon = (isSorted: false | 'asc' | 'desc') => {
        if (!isSorted) return <ArrowUpDown size={14} className="opacity-30" />;
        return isSorted === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const meta = header.column.columnDef.meta as any;
                                    return (
                                        <th
                                            key={header.id}
                                            className={`px-2 sm:px-4 lg:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100' : ''} ${meta?.className || ''}`}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-1">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && getSortIcon(header.column.getIsSorted())}
                                            </div>
                                        </th>
                                    );
                                })}
                                {isAdmin && onEditStats && <th className="px-4 py-4"></th>}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={`transition-colors ${getRowClassName(row.original)}`}>
                                {row.getVisibleCells().map(cell => {
                                    const meta = cell.column.columnDef.meta as any;
                                    return (
                                        <td key={cell.id} className={`px-2 sm:px-4 lg:px-6 py-3 text-[11px] sm:text-sm font-medium text-gray-900 ${meta?.className || ''}`}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    );
                                })}
                                {isAdmin && onEditStats && (
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onEditStats(row.original)}
                                            className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                                            title="Editar estadísticas"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {standings.length === 0 && (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
                    <Trophy size={32} className="text-gray-200" />
                    <p className="font-medium text-sm">No hay datos de clasificación disponibles</p>
                </div>
            )}
        </div>
    );
};
