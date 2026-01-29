import React, { useState, useEffect } from 'react';
import { Player, Ranking } from '../types';
import { subscribeToPlayers, subscribeToRankings } from '../services/db';
import { TVLayout } from '../components/tv/TVLayout';

interface Props {
    rankingId: string;
}

export const TVPage = ({ rankingId }: Props) => {
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to Data
    useEffect(() => {
        // 1. Subscribe to Rankings 
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
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <div className="w-16 h-16 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-xl font-medium tracking-wider animate-pulse">CARGANDO MODO TV...</div>
            </div>
        );
    }

    if (!activeRanking) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
                <p className="text-xl text-gray-400">Torneo no encontrado o acceso denegado.</p>
            </div>
        );
    }

    return <TVLayout ranking={activeRanking} players={players} />;
};
