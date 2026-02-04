/**
 * Column definition for StandingsTable
 * Allows format-specific views to define which columns to display
 */
export interface StandingsColumn {
    /** Unique key matching StandingRow property */
    key: string;

    /** Display label for the column header */
    label: string;

    /** Whether this column is sortable */
    sortable?: boolean;

    /** Custom render function for the cell value */
    render?: (value: any, row: any) => React.ReactNode;

    /** CSS classes for the column */
    className?: string;

    /** Minimum width for the column */
    minWidth?: string;
}

/**
 * Predefined column definitions for common use cases
 */
export const COMMON_COLUMNS = {
    position: {
        key: 'pos',
        label: 'Pos',
        sortable: true,
        minWidth: '60px'
    },
    player: {
        key: 'playerId',
        label: 'Jugador',
        sortable: false,
        minWidth: '200px'
    },
    matchesPlayed: {
        key: 'pj',
        label: 'PJ',
        sortable: true,
        minWidth: '60px'
    },
    matchesWon: {
        key: 'pg',
        label: 'PG',
        sortable: true,
        minWidth: '60px'
    },
    points: {
        key: 'pts',
        label: 'Pts',
        sortable: true,
        minWidth: '70px'
    },
    setsDiff: {
        key: 'setsDiff',
        label: 'Sets',
        sortable: true,
        minWidth: '70px'
    },
    gamesDiff: {
        key: 'gamesDiff',
        label: 'Games',
        sortable: true,
        minWidth: '80px'
    }
} as const;

/**
 * Format-specific column presets
 */
export const FORMAT_COLUMN_PRESETS = {
    /** Classic, Individual, Pairs, Hybrid - Full set/game stats */
    setBasedFormat: [
        COMMON_COLUMNS.position,
        COMMON_COLUMNS.player,
        COMMON_COLUMNS.matchesPlayed,
        COMMON_COLUMNS.matchesWon,
        COMMON_COLUMNS.points,
        COMMON_COLUMNS.setsDiff,
        COMMON_COLUMNS.gamesDiff
    ],

    /** Americano, Mexicano, Pozo - Points only */
    pointBasedFormat: [
        COMMON_COLUMNS.position,
        COMMON_COLUMNS.player,
        COMMON_COLUMNS.matchesPlayed,
        COMMON_COLUMNS.matchesWon,
        COMMON_COLUMNS.points
    ]
} as const;
