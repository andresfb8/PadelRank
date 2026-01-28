import { useState, useMemo } from 'react';
import { Player, User, Ranking } from '../../types';
import { PlayerStatsHeader } from './PlayerStatsHeader';
import { PlayerFilters, ViewMode, PlayerSegment } from './PlayerFilters';
import { PlayerList } from '../PlayerList';
import { Drawer } from '../ui/Drawer';
import { PlayerDetailView } from '../PlayerDetailView';

interface PlayerDatabaseViewProps {
    players: Record<string, Player>;
    rankings: Ranking[];
    currentUser?: User;
    onAddPlayer: () => void;
    onEditPlayer: (player: Player) => void;
    onDeletePlayer: (id: string) => void;
    onDeletePlayers: (ids: string[]) => void;
    onImportPlayers: (players: any[]) => void;
}

export const PlayerDatabaseView = ({
    players,
    rankings,
    currentUser,
    onAddPlayer,
    onEditPlayer,
    onDeletePlayer,
    onDeletePlayers,
    onImportPlayers
}: PlayerDatabaseViewProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [activeSegment, setActiveSegment] = useState<PlayerSegment>('all');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    // Filter players based on search and segment
    const filteredPlayers = useMemo(() => {
        let filtered = Object.values(players);

        // Apply search filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.nombre.toLowerCase().includes(lower) ||
                p.apellidos.toLowerCase().includes(lower) ||
                p.email.toLowerCase().includes(lower)
            );
        }

        // Apply segment filter
        switch (activeSegment) {
            case 'top':
                // Top players: winrate >= 60% and at least 5 matches
                filtered = filtered.filter(p =>
                    (p.stats?.winrate ?? 0) >= 60 && (p.stats?.pj ?? 0) >= 5
                );
                break;
            case 'new':
                // New players: less than 3 matches (placeholder logic)
                filtered = filtered.filter(p => (p.stats?.pj ?? 0) < 3);
                break;
            case 'inactive':
                // Inactive: 0 matches played
                filtered = filtered.filter(p => (p.stats?.pj ?? 0) === 0);
                break;
            case 'all':
            default:
                // No additional filter
                break;
        }

        return filtered;
    }, [players, searchTerm, activeSegment]);

    // Convert back to Record for PlayerList compatibility
    const filteredPlayersRecord = useMemo(() => {
        return filteredPlayers.reduce((acc, player) => {
            acc[player.id] = player;
            return acc;
        }, {} as Record<string, Player>);
    }, [filteredPlayers]);

    const handleSelectPlayer = (player: Player) => {
        setSelectedPlayer(player);
    };

    const handleCloseDrawer = () => {
        setSelectedPlayer(null);
    };

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <PlayerStatsHeader players={players} />

            {/* Filters */}
            <PlayerFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                activeSegment={activeSegment}
                onSegmentChange={setActiveSegment}
                totalCount={Object.keys(players).length}
                filteredCount={filteredPlayers.length}
            />

            {/* Player List (reusing existing component) */}
            <PlayerList
                players={filteredPlayersRecord}
                currentUser={currentUser}
                onAddPlayer={onAddPlayer}
                onEditPlayer={onEditPlayer}
                onDeletePlayer={onDeletePlayer}
                onDeletePlayers={onDeletePlayers}
                onImportPlayers={onImportPlayers}
                onSelectPlayer={handleSelectPlayer}
            />

            {/* Player Detail Drawer */}
            <Drawer
                isOpen={!!selectedPlayer}
                onClose={handleCloseDrawer}
                title="Detalle del Jugador"
                size="lg"
            >
                {selectedPlayer && (
                    <PlayerDetailView
                        player={selectedPlayer}
                        players={players}
                        rankings={rankings}
                        onBack={handleCloseDrawer}
                    />
                )}
            </Drawer>
        </div>
    );
};
