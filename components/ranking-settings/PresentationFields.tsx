import React, { useState } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { processLogoUpload } from '../../utils/imageProcessor';

// How a tournament presents itself: its logo and the sponsors shown in TV mode.
// Used by the creation wizard and by the tournament settings.

export type Sponsor = { id: string; name: string; url: string };

export const SponsorsEditor = ({ sponsors, onChange, disabled }: { sponsors: Sponsor[]; onChange: (s: Sponsor[]) => void; disabled?: boolean }) => {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const add = async (file: File) => {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const url = await processLogoUpload(file);
            onChange([...sponsors, { id: Date.now().toString(), name: name.trim(), url }]);
            setName('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            {sponsors.length > 0 ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sponsors.map((sp, idx) => (
                        <li key={sp.id || idx} className="bg-white border border-rg-line rounded-lg p-3">
                            <div className="h-16 grid place-items-center">
                                {sp.url ? <img src={sp.url} alt={sp.name} className="max-h-full max-w-full object-contain" /> : <span className="text-[12px] text-rg-muted">Sin logo</span>}
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-[13px] font-medium truncate">{sp.name}</span>
                                {!disabled && (
                                    <button type="button" onClick={() => onChange(sponsors.filter((_, i) => i !== idx))}
                                        className="w-8 h-8 grid place-items-center rounded-md text-rg-muted hover:text-rg-negative hover:bg-[#ffedea] flex-none" aria-label={`Quitar ${sp.name}`}>
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">Todavía no hay patrocinadores.</p>
            )}
            {!disabled && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="sponsor-name" className="sr-only">Nombre del patrocinador</label>
                    <input id="sponsor-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del patrocinador"
                        className="flex-1 h-10 px-3 rounded-md border border-rg-control bg-white text-[15px] focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track" />
                    <label className={`h-10 px-4 rounded-md border border-rg-control bg-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-rg-raised ${busy || !name.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={15} /> {busy ? 'Procesando…' : 'Subir su logo'}
                        <input type="file" accept="image/*" className="sr-only" disabled={busy || !name.trim()}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = ''; }} />
                    </label>
                </div>
            )}
            {!disabled && !name.trim() && <p className="text-[13px] text-rg-muted">Escribe el nombre y después sube su logo.</p>}
        </div>
    );
};

export const LogoPicker = ({ logoUrl, onChange, allowed, disabled }: { logoUrl?: string; onChange: (url: string | undefined) => void; allowed: boolean; disabled?: boolean }) => {
    const [busy, setBusy] = useState(false);
    if (!allowed) return <p className="text-[14px] text-rg-muted">Disponible en los planes Pro, Star Point y Weekend Warrior.</p>;

    const upload = async (file: File) => {
        setBusy(true);
        try {
            onChange(await processLogoUpload(file));
        } catch (error: any) {
            alert(error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg border border-rg-line bg-white grid place-items-center overflow-hidden flex-none">
                {logoUrl ? <img src={logoUrl} alt="Logo del torneo" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-rg-control" />}
            </div>
            {!disabled && (
                <div className="flex flex-wrap gap-2">
                    <label className={`h-10 px-4 rounded-md border border-rg-control bg-white text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-rg-raised ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={15} /> {busy ? 'Procesando…' : logoUrl ? 'Cambiar' : 'Subir logo'}
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
                    </label>
                    {logoUrl && (
                        <button type="button" onClick={() => onChange(undefined)} className="h-10 px-3 rounded-md text-[14px] font-medium text-rg-negative hover:bg-[#ffedea]">Quitar</button>
                    )}
                </div>
            )}
        </div>
    );
};
