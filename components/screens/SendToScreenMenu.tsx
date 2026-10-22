import React, { useEffect, useRef, useState } from 'react';
import { Check, ScreenShare } from 'lucide-react';
import { Screen } from '../../types/screens';
import { setScreenRanking, subscribeToClubScreens } from '../../services/screens/clubScreens';

// Sends this tournament to one of the club's TVs, or takes it off
export const SendToScreenMenu = ({ rankingId, clubId }: { rankingId: string; clubId: string }) => {
    const [open, setOpen] = useState(false);
    const [screens, setScreens] = useState<Screen[]>([]);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => subscribeToClubScreens(clubId, setScreens), [clubId]);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={box} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" title="Enseñar en una pantalla"
                className="w-10 h-10 grid place-items-center rounded-lg border border-rg-line bg-white text-rg-muted hover:text-rg-ink">
                <ScreenShare size={18} />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 mt-2 w-64 bg-white border border-rg-line rounded-lg shadow-[0_12px_40px_rgba(15,23,41,0.15)] py-1 z-50">
                    <p className="px-3 py-2 text-[12px] font-medium text-rg-muted">Enseñar en una pantalla</p>
                    {screens.length === 0 ? (
                        <p className="px-3 pb-3 text-[13px] text-rg-muted">No hay pantallas. Añádelas en «Pantallas».</p>
                    ) : screens.map(s => {
                        const showing = s.rankingId === rankingId;
                        return (
                            <button key={s.id} type="button" role="menuitemcheckbox" aria-checked={showing}
                                onClick={() => setScreenRanking(s.id, showing ? null : rankingId).catch(() => alert('No se ha podido guardar el cambio. Inténtalo de nuevo.'))}
                                className="w-full px-3 py-2 flex items-center gap-2 text-left text-[14px] hover:bg-rg-raised">
                                <span className="w-4">{showing && <Check size={15} className="text-court" />}</span>
                                <span className="flex-1 truncate">{s.name || 'Pantalla'}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
