/**
 * Standings Table Integration Examples
 * Shows how each format view should use the new StandingsTable component
 */

import { StandingsTable } from '../components/shared/StandingsTable';
import { FORMAT_COLUMN_PRESETS } from '../types/StandingsColumn';

// Mock Data for Examples
const standings: any[] = [];
const players: Record<string, any> = {};
const handlePlayerClick = (id: string) => console.log('Clicked player:', id);

/**
 * Example 1: Classic Format
 * Uses full set/game statistics
 */
export function ClassicStandingsExample() {
    return (
        <StandingsTable
            standings={standings}
            players={players}
            columns={FORMAT_COLUMN_PRESETS.setBasedFormat as any}
            onPlayerClick={handlePlayerClick}
            isPairFormat={false}
        />
    );
}

/**
 * Example 2: Pairs/Hybrid Format
 * Same columns as Classic but with pair display
 */
export function PairsStandingsExample() {
    return (
        <StandingsTable
            standings={standings}
            players={players}
            columns={FORMAT_COLUMN_PRESETS.setBasedFormat as any}
            onPlayerClick={handlePlayerClick}
            isPairFormat={true} // Key difference: shows "Player1 / Player2"
        />
    );
}

/**
 * Example 3: Americano/Mexicano Format
 * Points only, no set/game stats
 */
export function AmericanoStandingsExample() {
    return (
        <StandingsTable
            standings={standings}
            players={players}
            columns={FORMAT_COLUMN_PRESETS.pointBasedFormat as any}
            onPlayerClick={handlePlayerClick}
            isPairFormat={false}
        />
    );
}

/**
 * Example 4: Custom Columns
 * If you need format-specific customization
 */
export function CustomStandingsExample() {
    const customColumns = [
        { key: 'pos', label: 'Posición', sortable: true },
        { key: 'playerId', label: 'Nombre', sortable: false },
        { key: 'pts', label: 'Puntos', sortable: true },
        {
            key: 'winrate',
            label: 'Win %',
            sortable: true,
            render: (value: number) => `${(value * 100).toFixed(1)}%`
        }
    ];

    return (
        <StandingsTable
            standings={standings}
            players={players}
            columns={customColumns as any}
        />
    );
}
