import React, { useState } from 'react';
import { Player, StandingRow } from '../../types';
import { entryLabel, signed, zoneFor, ZoneKind } from './playerMobile';

interface Props {
    standings: StandingRow[];
    players: Record<string, Player>;
    format?: string;
    title: string;
    subtitle?: string;
    followed?: string | null;
    promotionCount?: number;
    relegationCount?: number;
    qualifiersCount?: number;
    consolationCount?: number;
    /** Opens the player's or pair's detail page */
    onOpenDetail?: (entry: string) => void;
    /** Admin only: opens the stats adjustment dialog */
    onEditStats?: (row: StandingRow) => void;
}

const ZONE_LABEL: Record<ZoneKind, string> = {
    up: 'Suben de división',
    down: 'Bajan de división',
    qualified: 'Pasan al cuadro principal',
    consolation: 'Van al cuadro de consolación',
    none: 'Sin cambio de división',
};

const ZONE_TONE: Record<ZoneKind, string> = {
    up: 'text-rg-positive',
    down: 'text-rg-negative',
    qualified: 'text-rg-positive',
    consolation: 'text-rg-muted',
    none: 'text-rg-muted',
};

/** Standings as two-line rows: nothing scrolls sideways; a tap opens every column. */
export const MobileStandingsList = ({
    standings, players, format, title, subtitle, followed, promotionCount, relegationCount, qualifiersCount, consolationCount, onOpenDetail, onEditStats,
}: Props) => {
    const [openEntry, setOpenEntry] = useState<string | null>(null);
    const isPointBased = format === 'americano' || format === 'mexicano' || format === 'pozo';
    const zoneOpts = { format, promotionCount, relegationCount, qualifiersCount, consolationCount };
    const zones = standings.map(row => zoneFor(row, standings.length, zoneOpts));
    const hasZones = zones.some(z => z !== 'none');

    return (
        <section className="rg bg-white border border-rg-line rounded-xl overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-1">
                <h3 className="text-[15px] font-semibold">{title}</h3>
                {subtitle && <span className="text-xs text-rg-muted num">{subtitle}</span>}
            </div>

            {standings.length === 0 && (
                <p className="px-4 py-6 text-sm text-rg-muted">Aún no hay partidos jugados en esta división.</p>
            )}

            <ol>
                {standings.map((row, i) => {
                    const zone = zones[i];
                    const showZoneHeader = hasZones && (i === 0 ? zone !== 'none' : zone !== zones[i - 1]);
                    const isFollowed = followed === row.playerId;
                    const isOpen = openEntry === row.playerId;
                    const meta = isPointBased
                        ? `${row.pj} PJ · ${row.pg} G · ${Math.round(row.winRate)} % victorias`
                        : `${row.pj} PJ · ${row.pg} G · ${row.pp} P · sets ${signed(row.setsDiff)} · juegos ${signed(row.gamesDiff)}`;

                    return (
                        <li key={row.playerId}>
                            {showZoneHeader && (
                                <div className={`px-4 pt-3 pb-1 text-xs font-medium ${i > 0 ? 'border-t border-rg-rule' : ''} ${ZONE_TONE[zone]}`}>
                                    {ZONE_LABEL[zone]}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setOpenEntry(isOpen ? null : row.playerId)}
                                aria-expanded={isOpen}
                                className={`w-full text-left grid grid-cols-[24px_1fr_auto] gap-x-2.5 items-center px-4 py-2.5 transition-colors ${i > 0 && !showZoneHeader ? 'border-t border-rg-rule' : ''} ${isFollowed ? 'bg-court-soft' : 'active:bg-rg-raised'}`}
                            >
                                <span className={`num font-semibold text-right ${isFollowed ? 'text-court' : 'text-rg-muted'}`}>{row.pos}</span>
                                <span className="min-w-0">
                                    <span className="block truncate text-[15px] font-semibold">{entryLabel(row.playerId, players)}</span>
                                    <span className="block truncate text-[12.5px] text-rg-muted num">
                                        {meta}
                                        {row.manualAdjustment ? ` · ajuste ${signed(row.manualAdjustment)}` : ''}
                                    </span>
                                </span>
                                <span className="text-right num">
                                    <span className={`block text-lg font-semibold leading-tight ${isFollowed ? 'text-court' : ''}`}>{row.pts}</span>
                                    <span className="block text-xs text-rg-muted">pts</span>
                                </span>
                            </button>

                            {isOpen && (
                                <div className={`px-4 pb-3 ${isFollowed ? 'bg-court-soft' : ''}`}>
                                    <dl className="ml-[34px] grid grid-cols-4 gap-2 pt-2.5 border-t border-court-track num">
                                        {isPointBased ? (
                                            <>
                                                <div><dt className="text-xs text-rg-muted">Ganados</dt><dd className="text-[15px] font-semibold">{row.pg}</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Perdidos</dt><dd className="text-[15px] font-semibold">{row.pp}</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Victorias</dt><dd className="text-[15px] font-semibold">{Math.round(row.winRate)} %</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Diferencia</dt><dd className="text-[15px] font-semibold">{signed(row.gamesDiff)}</dd></div>
                                            </>
                                        ) : (
                                            <>
                                                <div><dt className="text-xs text-rg-muted">Sets</dt><dd className="text-[15px] font-semibold">{row.setsWon}–{row.setsLost}</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Juegos</dt><dd className="text-[15px] font-semibold">{row.gamesWon}–{row.gamesLost}</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Victorias</dt><dd className="text-[15px] font-semibold">{Math.round(row.winRate)} %</dd></div>
                                                <div><dt className="text-xs text-rg-muted">Perdidos</dt><dd className="text-[15px] font-semibold">{row.pp}</dd></div>
                                            </>
                                        )}
                                    </dl>
                                    {(onOpenDetail || onEditStats) && (
                                        <div className="ml-[34px] mt-2 flex gap-4 text-sm font-medium">
                                            {onOpenDetail && (
                                                <button type="button" onClick={() => onOpenDetail(row.playerId)} className="text-court py-1">
                                                    Ver ficha
                                                </button>
                                            )}
                                            {onEditStats && (
                                                <button type="button" onClick={() => onEditStats(row)} className="text-rg-ink py-1">
                                                    Ajustar estadísticas
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};
