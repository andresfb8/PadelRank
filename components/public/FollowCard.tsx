import React, { useState } from 'react';
import { Match, Player } from '../../types';
import { entryLabel, followedSide, matchDay, matchTime, pairText } from './playerMobile';

interface Props {
    /** Every participant the visitor can follow, already labelled */
    options: { entry: string; label: string }[];
    followed: string | null;
    onFollow: (entry: string | null) => void;
    players: Record<string, Player>;
    isPairs: boolean;
    /** Where the followed entry stands now */
    standing?: { pos: number; pts: number; division: string } | null;
    nextMatch: Match | null;
}

/** "Sigues a…": the visitor's own pair, its next match and its position, on top of every screen. */
export const FollowCard = ({ options, followed, onFollow, players, isPairs, standing, nextMatch }: Props) => {
    const [choosing, setChoosing] = useState(false);
    const noun = isPairs ? 'tu pareja' : 'tu nombre';

    if (!followed || choosing) {
        return (
            <div className="rg bg-court-soft rounded-xl p-3.5">
                <label htmlFor="rg-follow" className="block text-[13px] font-medium text-court-ink mb-2">
                    Elige {noun} y verás aquí tu próximo partido
                </label>
                <select
                    id="rg-follow"
                    className="w-full h-11 rounded-lg border border-rg-control bg-white px-3 text-[15px] text-rg-ink"
                    value={followed || ''}
                    onChange={e => { onFollow(e.target.value || null); setChoosing(false); }}
                >
                    <option value="">{isPairs ? 'Buscar pareja…' : 'Buscar jugador…'}</option>
                    {options.map(o => <option key={o.entry} value={o.entry}>{o.label}</option>)}
                </select>
                {followed && (
                    <button type="button" onClick={() => setChoosing(false)} className="mt-2 text-[13px] font-medium text-court py-1">
                        Cancelar
                    </button>
                )}
            </div>
        );
    }

    const side = nextMatch ? followedSide(followed, nextMatch) : 0;
    const rival = nextMatch ? (side === 1 ? nextMatch.pair2 : nextMatch.pair1) : null;
    const when = nextMatch
        ? [matchDay(nextMatch), matchTime(nextMatch), nextMatch.court ? `Pista ${nextMatch.court}` : null].filter(Boolean).join(' · ') || `Jornada ${nextMatch.jornada} · sin hora todavía`
        : null;

    return (
        <div className="rg bg-court-soft rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-court-ink">
                <span className="truncate">Sigues a {entryLabel(followed, players)}</span>
                <button type="button" onClick={() => setChoosing(true)} className="text-court font-semibold py-1 flex-none">Cambiar</button>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 items-center">
                <div className="min-w-0">
                    {rival ? (
                        <>
                            <p className="text-base font-semibold truncate">vs {pairText(rival, players)}</p>
                            <p className="text-[13px] text-court-ink num">{when}</p>
                        </>
                    ) : (
                        <p className="text-[15px] font-semibold">No tienes partidos pendientes</p>
                    )}
                </div>
                {standing && (
                    <div className="text-right num">
                        <span className="block text-2xl leading-none font-semibold text-court">{standing.pos}.º</span>
                        <span className="text-xs text-court-ink">{standing.pts} pts · {standing.division}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
