import React, { useEffect, useState } from 'react';
import { Monitor, Plus, Unlink } from 'lucide-react';
import { Ranking } from '../../types';
import { Screen } from '../../types/screens';
import { Button } from '../ui/Components';
import { renameScreen, setScreenRanking, subscribeToClubScreens, unlinkScreen } from '../../services/screens/clubScreens';
import { screenStatus } from '../../services/screens/screenStatus';
import { PairScreenModal } from './PairScreenModal';

interface Props {
    clubId: string;
    clubName?: string;
    clubLogoUrl?: string;
    rankings: Ranking[];
    initialCode?: string;
}

const saveOrAlert = (p: Promise<unknown>) => p.catch(() => alert('No se ha podido guardar el cambio. Inténtalo de nuevo.'));

export const ScreensView = ({ clubId, clubName, clubLogoUrl, rankings, initialCode }: Props) => {
    const [screens, setScreens] = useState<Screen[] | null>(null);
    const [pairing, setPairing] = useState(!!initialCode);
    const [now, setNow] = useState(Date.now());

    useEffect(() => subscribeToClubScreens(clubId, setScreens), [clubId]);
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

    const active = rankings.filter(r => r.status === 'activo' && !r.deletedAt);

    return (
        <div className="rg max-w-3xl mx-auto px-4 py-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold">Pantallas</h1>
                    <p className="text-[14px] text-rg-muted mt-0.5">Las teles del club que enseñan un torneo en directo. En la tele, abre el navegador y entra en <span className="font-medium text-rg-ink">{window.location.host}/tv</span>.</p>
                </div>
                <Button onClick={() => setPairing(true)}><Plus size={16} /> Añadir pantalla</Button>
            </div>

            {screens === null ? (
                <p className="text-[14px] text-rg-muted">Cargando…</p>
            ) : screens.length === 0 ? (
                <div className="rounded-lg border border-dashed border-rg-control px-5 py-8 text-center">
                    <Monitor className="mx-auto text-rg-control" size={28} />
                    <p className="mt-2 text-[15px] font-medium">Todavía no hay pantallas</p>
                    <p className="text-[14px] text-rg-muted">Abre {window.location.host}/tv en la tele y pulsa «Añadir pantalla».</p>
                </div>
            ) : (
                <ul className="bg-white border border-rg-line rounded-lg divide-y divide-rg-rule">
                    {screens.map(s => {
                        const status = screenStatus(s.lastSeenAt, now);
                        return (
                            <li key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <label htmlFor={`screen-${s.id}`} className="sr-only">Nombre de la pantalla</label>
                                    <input key={s.id + (s.name || '')} id={`screen-${s.id}`} defaultValue={s.name || ''} onBlur={(e) => e.target.value !== (s.name || '') && saveOrAlert(renameScreen(s.id, e.target.value))}
                                        className="w-full h-9 px-2.5 -ml-2.5 rounded-md border border-transparent hover:border-rg-control focus:border-court focus:ring-2 focus:ring-court-track focus:outline-none text-[15px] font-semibold bg-transparent" />
                                    <p className="text-[13px] text-rg-muted flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.online ? 'bg-rg-positive' : 'bg-rg-control'}`} aria-hidden="true" />
                                        {status.label}
                                    </p>
                                </div>
                                <label htmlFor={`screen-ranking-${s.id}`} className="sr-only">Qué enseña</label>
                                <select id={`screen-ranking-${s.id}`} value={s.rankingId || ''} onChange={(e) => saveOrAlert(setScreenRanking(s.id, e.target.value || null))}
                                    className="h-10 px-3 rounded-md border border-rg-control bg-white text-[14px] sm:w-64">
                                    <option value="">En espera (logo del club)</option>
                                    {active.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    {s.rankingId && !active.some(r => r.id === s.rankingId) && <option value={s.rankingId}>Torneo terminado o borrado</option>}
                                </select>
                                <button type="button" onClick={() => confirm(`¿Desvincular «${s.name || 'Pantalla'}»? La tele volverá a enseñar un código.`) && saveOrAlert(unlinkScreen(s.id))}
                                    className="h-10 px-3 rounded-md text-[14px] font-medium text-rg-negative hover:bg-[#ffedea] inline-flex items-center gap-1.5">
                                    <Unlink size={15} /> Desvincular
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {pairing && <PairScreenModal initialCode={initialCode} club={{ clubId, clubName, clubLogoUrl }} onClose={() => setPairing(false)} />}
        </div>
    );
};
