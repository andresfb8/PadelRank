import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Components';
import { pairScreen } from '../../services/screens/clubScreens';

interface Props {
    initialCode?: string;
    club: { clubId: string; clubName?: string; clubLogoUrl?: string };
    onClose: () => void;
}

export const PairScreenModal = ({ initialCode, club, onClose }: Props) => {
    const [code, setCode] = useState(initialCode || '');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await pairScreen(code, { ...club, name });
            onClose();
        } catch (err: any) {
            setError(err.message || 'No se ha podido vincular la pantalla.');
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full h-11 px-3 rounded-md border border-rg-control bg-white text-[15px] focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track';

    return (
        <div className="rg fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0F1729]/40 sm:p-4">
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="pair-title" className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-[0_12px_40px_rgba(15,23,41,0.2)] p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="pair-title" className="text-[18px] font-semibold">Añadir pantalla</h2>
                        <p className="text-[13px] text-rg-muted mt-0.5">En la tele, abre el navegador y entra en <span className="font-medium text-rg-ink">{window.location.host}/tv</span>.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 -mr-2 rounded-md grid place-items-center text-rg-muted hover:bg-rg-raised" aria-label="Cerrar"><X size={18} /></button>
                </div>
                <div>
                    <label htmlFor="pair-code" className="block text-[13px] font-medium mb-1.5">Código que sale en la tele</label>
                    <input id="pair-code" autoFocus={!initialCode} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={7} autoComplete="off" placeholder="AB3 K9Q"
                        className={`${field} text-[22px] font-semibold tracking-[0.2em] text-center font-mono`} />
                </div>
                <div>
                    <label htmlFor="pair-name" className="block text-[13px] font-medium mb-1.5">Nombre de la pantalla</label>
                    <input id="pair-name" autoFocus={!!initialCode} value={name} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo: Bar, Pista central" className={field} />
                </div>
                {error && <p role="alert" className="rounded-md bg-[#ffedea] px-3 py-2 text-[14px] text-rg-negative">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={busy || !code.trim()}>{busy ? 'Vinculando…' : 'Vincular'}</Button>
                </div>
            </form>
        </div>
    );
};
