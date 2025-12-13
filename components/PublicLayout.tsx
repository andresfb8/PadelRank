import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { RankingView } from './RankingView';
import { Player, Ranking } from '../types';
import { subscribeToPlayers, subscribeToRankings } from '../services/db';

interface Props {
    rankingId: string;
}

export const PublicLayout = ({ rankingId }: Props) => {
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando torneo...</div>;
    }

    if (!activeRanking) {
        return <div className="min-h-screen flex items-center justify-center text-red-500">Torneo no encontrado o eliminado.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-primary text-xl">
                    <Trophy size={24} /> PadelRank <span className="text-xs text-gray-400 font-normal uppercase tracking-wider border-l pl-2 ml-2">Vista Pública</span>
                </div>
                <div>
                    {/* Optional: Add a 'Login' button here if we want to allow admins to jump to login */}
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <RankingView
                    ranking={activeRanking}
                    players={players}
                    isAdmin={false} // STRICTLY FALSE
                    onBack={() => { }} // No back button in public view implies "Top Level"
                />
            </main>
        </div>
    );
};
