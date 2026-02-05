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
        minWidth: '40px'
    },
    player: {
        key: 'playerId',
        label: 'Jugador',
        sortable: false,
        minWidth: '120px'
    },
    matchesPlayed: {
        key: 'pj',
        label: 'PJ',
        sortable: true,
        minWidth: '35px'
    },
    matchesWon: {
        key: 'pg',
        label: 'PG',
        sortable: true,
        minWidth: '35px'
    },
    matchesLost: {
        key: 'pp',
        label: 'PP',
        sortable: true,
        minWidth: '35px'
    },
    points: {
        key: 'pts',
        label: 'Pts',
        sortable: true,
        minWidth: '40px'
    },
    setsWon: {
        key: 'setsWon',
        label: 'SG',
        sortable: true,
        minWidth: '35px',
        className: 'hidden lg:table-cell'
    },
    setsLost: {
        key: 'setsLost',
        label: 'SP',
        sortable: true,
        minWidth: '35px',
        className: 'hidden lg:table-cell'
    },
    setsDiff: {
        key: 'setsDiff',
        label: 'DS',
        sortable: true,
        minWidth: '35px'
    },
    gamesWon: {
        key: 'gamesWon',
        label: 'JG',
        sortable: true,
        minWidth: '35px',
        className: 'hidden md:table-cell'
    },
    gamesLost: {
        key: 'gamesLost',
        label: 'JP',
        sortable: true,
        minWidth: '35px',
        className: 'hidden md:table-cell'
    },
    gamesDiff: {
        key: 'gamesDiff',
        label: 'DJ',
        sortable: true,
        minWidth: '35px'
    },
    winRate: {
        key: 'winRate',
        label: '% Vic',
        sortable: true,
        minWidth: '45px'
    }
} as const;

/**
 * Format-specific column presets
 */
export const FORMAT_COLUMN_PRESETS = {
    /** Classic, Individual, Pairs, Hybrid - Full statistics following visual order */
    setBasedFormat: [
        COMMON_COLUMNS.position,
        COMMON_COLUMNS.player,
        COMMON_COLUMNS.points,
        COMMON_COLUMNS.matchesPlayed,
        COMMON_COLUMNS.matchesWon,
        COMMON_COLUMNS.matchesLost,
        COMMON_COLUMNS.setsWon,
        COMMON_COLUMNS.setsLost,
        COMMON_COLUMNS.setsDiff,
        COMMON_COLUMNS.gamesWon,
        COMMON_COLUMNS.gamesLost,
        COMMON_COLUMNS.gamesDiff,
        COMMON_COLUMNS.winRate
    ],

    /** Americano, Mexicano, Pozo - Points only */
    pointBasedFormat: [
        COMMON_COLUMNS.position,
        COMMON_COLUMNS.player,
        { ...COMMON_COLUMNS.points, label: 'Puntos' },
        COMMON_COLUMNS.matchesPlayed,
        COMMON_COLUMNS.matchesWon,
        COMMON_COLUMNS.winRate
    ]
} as const;
