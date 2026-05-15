import React, { useMemo } from 'react';
import { Ranking, Player } from '../types';
import { DrawAnimationModal, DrawGroup } from './ranking-wizard/DrawAnimationModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    players: Record<string, Player>;
}

export const DrawReplayModal = ({ isOpen, onClose, ranking, players }: Props) => {
    const groups = useMemo<DrawGroup[]>(() => {
        const guestMap: Record<string, { nombre: string; apellidos?: string }> = {};
        (ranking.guestPlayers || []).forEach(g => { guestMap[g.id] = g; });

        const nameOf = (id: string) => {
            if (!id) return '';
            const p = players[id] || guestMap[id];
            return p ? `${p.nombre} ${p.apellidos || ''}`.trim() : id;
        };

        const groupDivisions = (ranking.divisions || []).filter(d => d.stage === 'group');
        return groupDivisions.map((d, idx) => {
            const pairs: { p1Name: string; p2Name: string }[] = [];
            for (let i = 0; i < d.players.length; i += 2) {
                pairs.push({
                    p1Name: nameOf(d.players[i]),
                    p2Name: nameOf(d.players[i + 1] || ''),
                });
            }
            return {
                label: d.name || `Grupo ${String.fromCharCode(65 + idx)}`,
                pairs,
            };
        });
    }, [ranking, players]);

    return (
        <DrawAnimationModal
            isOpen={isOpen}
            groups={groups}
            onClose={onClose}
            autoCloseOnComplete={false}
        />
    );
};
