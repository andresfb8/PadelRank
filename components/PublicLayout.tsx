import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { RankingView } from './RankingView';
import { PlayerDetailView } from './PlayerDetailView';
import { PairDetailView } from './PairDetailView';
import { Player, Ranking } from '../types';
import { subscribeToPlayers, subscribeToRankings, subscribeToPublicRanking, subscribeToPlayersByIds } from '../services/db';

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
        // 1. Subscribe to this specific ranking (public access)
        let unsubscribePlayers: (() => void) | null = null;

        const unsubscribeRanking = subscribeToPublicRanking(rankingId, (ranking) => {
            if (ranking) {
                setRankings([ranking]);

                // 2. Once ranking is loaded, subscribe to only its players
                if (unsubscribePlayers) unsubscribePlayers();

                const playerIds = new Set<string>();
                ranking.divisions.forEach(div => {
                    div.players.forEach(id => playerIds.add(id));
                });

                unsubscribePlayers = subscribeToPlayersByIds(Array.from(playerIds), (data) => {
                    setPlayers(data);
                    setLoading(false);
                });
            } else {
                setRankings([]);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeRanking();
            if (unsubscribePlayers) unsubscribePlayers();
        };
    }, [rankingId]);

    const activeRanking = rankings.find(r => r.id === rankingId);
    const [ownerLogo, setOwnerLogo] = useState<string | null>(null);

    // 3. Fallback Branding: If ranking has no logo, fetch owner's organization logo
    useEffect(() => {
        if (activeRanking && !activeRanking.config?.branding?.logoUrl && activeRanking.ownerId) {
            import('../services/db').then(({ subscribeToUserProfile }) => {
                const unsubscribe = subscribeToUserProfile(activeRanking.ownerId!, (profile) => {
                    if (profile?.branding?.logoUrl) {
                        setOwnerLogo(profile.branding.logoUrl);
                    }
                });
                return () => unsubscribe();
            });
        }
    }, [activeRanking?.id, activeRanking?.ownerId, activeRanking?.config?.branding?.logoUrl]);
    const isPairSelection = selectedPlayerId?.includes('::');
    const selectedPlayer = selectedPlayerId && !isPairSelection ? players[selectedPlayerId] : null;

    const handlePlayerClick = (playerId: string) => {
        setSelectedPlayerId(playerId);
    };

    const handleBackToRanking = () => {
        setSelectedPlayerId(null);
    };

    if (loading) {
        return <div className="rg min-h-screen flex items-center justify-center text-rg-muted bg-rg-ground">Cargando torneo…</div>;
    }

    if (!activeRanking) {
        return <div className="rg min-h-screen flex items-center justify-center px-6 text-center text-rg-ink bg-rg-ground">Este torneo no existe o ya no está publicado.</div>;
    }

    const branding = activeRanking.config?.branding;
    const displayLogo = branding?.logoUrl || ownerLogo;

    return (
        <div className="min-h-screen bg-rg-ground text-rg-ink flex flex-col">
            <header className="rg bg-white border-b border-rg-line h-14 md:h-[60px] flex items-center gap-3 px-4 md:px-8 sticky top-0 z-30">
                {displayLogo ? (
                    <img src={displayLogo} alt="Logo del club" className="h-8 md:h-10 max-w-[120px] object-contain" />
                ) : (
                    <span className="flex items-center gap-2 font-semibold text-[15px] text-rg-ink">
                        <span className="w-7 h-7 rounded-lg bg-court text-white grid place-items-center">
                            <Trophy size={15} />
                        </span>
                        Racket Grid
                    </span>
                )}
                {selectedPlayerId && (
                    <button onClick={handleBackToRanking} className="ml-auto flex items-center gap-1 text-sm font-medium text-court py-2">
                        <ArrowLeft size={16} /> Volver al torneo
                    </button>
                )}
            </header>

            <main className="px-4 pt-5 pb-4 md:px-8 md:py-8 flex-1 w-full md:max-w-[1280px] md:mx-auto">
                {selectedPlayerId && isPairSelection ? (
                    <PairDetailView
                        pairId={selectedPlayerId}
                        players={players}
                        rankings={rankings}
                        onBack={handleBackToRanking}
                    />
                ) : selectedPlayer ? (
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

            {displayLogo && (
                <footer className="rg hidden md:block py-6 text-center text-rg-muted text-sm border-t border-rg-line">
                    Hecho con <strong className="font-semibold text-rg-ink">Racket Grid</strong>
                </footer>
            )}
        </div>
    );
};
