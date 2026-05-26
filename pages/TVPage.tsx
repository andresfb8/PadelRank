import React, { useState, useEffect } from 'react';
import { Player, Ranking } from '../types';
import { subscribeToPublicRanking, subscribeToPlayersByIds } from '../services/db';
import { TVLayout } from '../components/tv/TVLayout';

interface Props {
    rankingId: string;
}

export const TVPage = ({ rankingId }: Props) => {
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [ranking, setRanking] = useState<Ranking | null>(null);
    const [loading, setLoading] = useState(true);

    // Subscribe using the PUBLIC access pattern (single-doc gets, allowed by
    // Firestore rules). The previous version used collection `list` queries
    // which the rules deny to non-owners, leaving the page stuck on loading.
    useEffect(() => {
        let unsubscribePlayers: (() => void) | null = null;

        const unsubscribeRanking = subscribeToPublicRanking(rankingId, (data) => {
            if (data) {
                setRanking(data);

                // Collect every player ID referenced by the ranking (division
                // rosters + match pairs, since consolation rosters start empty)
                const playerIds = new Set<string>();
                data.divisions.forEach(div => {
                    div.players.forEach(id => id && playerIds.add(id));
                    div.matches.forEach(m => {
                        [m.pair1.p1Id, m.pair1.p2Id, m.pair2.p1Id, m.pair2.p2Id].forEach(id => {
                            if (id && id !== 'BYE') playerIds.add(id);
                        });
                    });
                });

                if (unsubscribePlayers) unsubscribePlayers();
                unsubscribePlayers = subscribeToPlayersByIds(Array.from(playerIds), (data) => {
                    setPlayers(data);
                    setLoading(false);
                });
            } else {
                setRanking(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeRanking();
            if (unsubscribePlayers) unsubscribePlayers();
        };
    }, [rankingId]);

    // Merge guest players for consistent name lookup
    const allPlayers = React.useMemo(() => {
        if (!ranking) return players;
        const merged = { ...players };
        if (Array.isArray(ranking.guestPlayers)) {
            for (const g of ranking.guestPlayers) {
                if (g?.id && !merged[g.id]) {
                    merged[g.id] = {
                        id: g.id,
                        nombre: g.nombre || 'Invitado',
                        apellidos: g.apellidos || '',
                        email: '',
                        telefono: '',
                        stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
                    } as Player;
                }
            }
        }
        return merged;
    }, [players, ranking]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <div className="w-16 h-16 border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-xl font-medium tracking-wider animate-pulse">CARGANDO MODO TV...</div>
            </div>
        );
    }

    if (!ranking) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
                <p className="text-xl text-gray-400">Torneo no encontrado o acceso denegado.</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <TVLayout ranking={ranking} players={allPlayers} />
        </div>
    );
};
