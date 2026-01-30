import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { RankingView } from './RankingView';
import { PlayerDetailView } from './PlayerDetailView';
import { Player, Ranking } from '../types';
import { subscribeToPlayers, subscribeToRankings } from '../services/db';

interface Props {
    rankingId: string;
}

export const PublicLayout = ({ rankingId }: Props) => {
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

    // Subscribe to Data
    useEffect(() => {
        // 1. Subscribe to Rankings (Public view simply loads list to find the one, 
        //    or ideally we would fetch just one, but existing logic uses subscribeToRankings)
        //    We pass 'undefined' as ownerId to load globally (or rely on existing behavior)
        const unsubscribeRankings = subscribeToRankings((data) => {
            setRankings(data);
        });

        // 2. Subscribe to Players
        const unsubscribePlayers = subscribeToPlayers((data) => {
            setPlayers(data);
            setLoading(false);
        });

        return () => {
            unsubscribeRankings();
            unsubscribePlayers();
        };
    }, []);

    const activeRanking = rankings.find(r => r.id === rankingId);
    const selectedPlayer = selectedPlayerId ? players[selectedPlayerId] : null;

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(playerId);
    };

    const handleBackToRanking = () => {
        setSelectedPlayerId(null);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando torneo...</div>;
    }

    if (!activeRanking) {
        return <div className="min-h-screen flex items-center justify-center text-red-500">Torneo no encontrado o eliminado.</div>;
    }

    const branding = activeRanking.config?.branding;
    const hasCustomLogo = !!branding?.logoUrl;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-primary text-xl">
                    {hasCustomLogo ? (
                        <img src={branding.logoUrl} alt="Logo" className="h-10 object-contain" />
                    ) : (
                        <>
                            <Trophy size={24} /> Racket Grid
                        </>
                    )}
                    <span className="text-xs text-gray-400 font-normal uppercase tracking-wider border-l pl-2 ml-2">Vista Pública</span>
                </div>
                <div>
                    {/* Optional: Add a 'Login' button here if we want to allow admins to jump to login */}
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto flex-1 w-full">
                {selectedPlayer ? (
                    <PlayerDetailView
                        player={selectedPlayer}
                        players={players}
                        rankings={rankings}
                        onBack={handleBackToRanking}
                    />
                ) : (
                    <RankingView
                        ranking={activeRanking}
                        players={players}
                        isAdmin={false} // STRICTLY FALSE
                        onBack={() => { }} // No back button in public view implies "Top Level"
                        onPlayerClick={handlePlayerClick}
                    />
                )}
            </main>

            {hasCustomLogo && (
                <footer className="py-6 text-center text-gray-400 text-sm border-t bg-gray-50">
                    <p className="flex items-center justify-center gap-2">
                        Powered by <strong className="text-gray-600 flex items-center gap-1"><Trophy size={14} /> Racket Grid</strong>
                    </p>
                </footer>
            )}
        </div>
    );
};
