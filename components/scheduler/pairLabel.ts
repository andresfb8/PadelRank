import { Player } from '../../types';

/** "Ana G. / Luis P." from a pair key ("id1::id2"). */
export const pairLabel = (pairKey: string, players: Record<string, Player>): string =>
    pairKey.split('::').filter(Boolean).map(id => {
        const p = players[id];
        return p ? `${p.nombre} ${(p.apellidos || '').charAt(0)}.`.trim() : id;
    }).join(' / ');
