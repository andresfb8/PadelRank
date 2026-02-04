import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, Medal, Award } from 'lucide-react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper, SortingState, ColumnDef } from '@tanstack/react-table';
import { StandingRow, Player } from '../../types';
import { StandingsColumn } from '../../types/StandingsColumn';

interface StandingsTableProps {
    /** Standings data to display */
    standings: StandingRow[];

    /** Player lookup map */
    players: Record<string, Player>;

    /** Column definitions (if not provided, uses default columns) */
    columns?: StandingsColumn[];

    /** Whether player names should be clickable */
    onPlayerClick?: (playerId: string) => void;

    /** Number of top positions to highlight (default: 3) */
    highlightTop?: number;

    /** Whether to show pairs format (p1::p2) */
    isPairFormat?: boolean;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
    standings,
    players,
    columns,
    onPlayerClick,
    highlightTop = 3,
    isPairFormat = false
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);

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
        if (pos === 1) return <Trophy size={16} className="text-yellow-500" />;
        if (pos === 2) return <Medal size={16} className="text-gray-400" />;
        if (pos === 3) return <Award size={16} className="text-amber-600" />;
        return null;
    };

    const getRowClassName = (pos: number) => {
        if (pos === 1) return 'bg-yellow-50/50 hover:bg-yellow-50';
        if (pos === 2) return 'bg-gray-50/50 hover:bg-gray-100';
        if (pos === 3) return 'bg-amber-50/50 hover:bg-amber-50';
        return 'hover:bg-gray-50';
    };

    const columnHelper = createColumnHelper<StandingRow>();

    // Build table columns from StandingsColumn definitions
    const tableColumns: ColumnDef<StandingRow, any>[] = (columns || []).map(col => {
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
                enableSorting: col.sortable ?? true
            });
        }

        if (col.key === 'playerId') {
            return columnHelper.accessor('playerId', {
                header: col.label,
                cell: info => (
                    <div className="flex items-center gap-2">
                        <span
                            className={`font-medium text-gray-900 ${onPlayerClick && !isPairFormat ? 'cursor-pointer hover:text-primary' : ''}`}
                            onClick={() => {
                                if (onPlayerClick && !isPairFormat) {
                                    onPlayerClick(info.getValue());
                                }
                            }}
                        >
                            {getPlayerName(info.getValue())}
                        </span>
                        {info.row.original.manualAdjustment && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                {info.row.original.manualAdjustment > 0 ? '+' : ''}{info.row.original.manualAdjustment}
                            </span>
                        )}
                    </div>
                ),
                enableSorting: col.sortable ?? false
            });
        }

        if (col.key === 'pts') {
            return columnHelper.accessor('pts', {
                header: col.label,
                cell: info => <span className="font-bold text-primary">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true
            });
        }

        if (col.key === 'pg') {
            return columnHelper.accessor('pg', {
                header: col.label,
                cell: info => <span className="text-green-600 font-semibold">{info.getValue()}</span>,
                enableSorting: col.sortable ?? true
            });
        }

        if (col.key === 'setsDiff' || col.key === 'gamesDiff') {
            return columnHelper.accessor(col.key as any, {
                header: col.label,
                cell: info => {
                    const value = info.getValue() as number;
                    return (
                        <span className={`font-medium ${value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {value > 0 ? '+' : ''}{value}
                        </span>
                    );
                },
                enableSorting: col.sortable ?? true
            });
        }

        // Generic column
        return columnHelper.accessor(col.key as any, {
            header: col.label,
            cell: col.render ? (info => col.render!(info.getValue(), info.row.original)) : (info => <span className="text-gray-600">{info.getValue()}</span>),
            enableSorting: col.sortable ?? true
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
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
                <h3 className="font-bold text-lg text-gray-900">Clasificación</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                                            }`}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getCanSort() && getSortIcon(header.column.getIsSorted())}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className={`transition-colors ${getRowClassName(row.original.pos)}`}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {standings.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    No hay datos de clasificación disponibles
                </div>
            )}
        </div>
    );
};
