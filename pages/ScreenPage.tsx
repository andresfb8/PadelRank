import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Screen } from '../types/screens';
import { startDeviceScreen } from '../services/screens/deviceScreen';
import { formatPairingCode } from '../services/screens/pairingCode';
import { TVPage } from './TVPage';

// /tv — what a club TV shows: its pairing code, the club's logo while waiting, or a tournament
export const ScreenPage = () => {
    const [screen, setScreen] = useState<Screen | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let stop: (() => void) | undefined;
        let cancelled = false;
        setFailed(false);
        startDeviceScreen(
            (s) => { if (!cancelled) setScreen(s); },
            () => { if (!cancelled) setFailed(true); },
        )
            .then((fn) => { if (cancelled) fn(); else stop = fn; })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; stop?.(); };
    }, [attempt]);

    const shell = 'h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center text-center px-8';

    if (failed) {
        return (
            <div className={shell}>
                <h1 className="text-4xl font-bold">No se puede conectar esta pantalla</h1>
                <p className="mt-4 text-xl text-slate-400 max-w-2xl">Puede que no haya internet o que las pantallas no estén activadas para este club todavía.</p>
                <button autoFocus onClick={() => setAttempt(a => a + 1)} className="mt-8 px-8 py-4 rounded-xl bg-white text-slate-950 text-xl font-semibold focus:outline-none focus:ring-4 focus:ring-sky-400">Reintentar</button>
            </div>
        );
    }

    if (!screen) {
        return <div className={shell}><p className="text-2xl text-slate-400 animate-pulse">Conectando…</p></div>;
    }

    if (!screen.ownerId) {
        const link = `${window.location.origin}/?vincular=${screen.pairingCode ?? ''}`;
        return (
            <div className={shell}>
                <p className="text-2xl text-slate-400">Vincula esta pantalla a tu club</p>
                <div className="mt-8 flex items-center gap-16">
                    <div>
                        <p className="text-[120px] leading-none font-bold tracking-[0.15em] font-mono" aria-live="polite">
                            {screen.pairingCode ? formatPairingCode(screen.pairingCode) : '··· ···'}
                        </p>
                        <ol className="mt-8 text-left text-2xl text-slate-300 space-y-2">
                            <li>1. Abre Racket Grid en el móvil o el ordenador</li>
                            <li>2. Ve a <b>Pantallas</b> y pulsa <b>Añadir pantalla</b></li>
                            <li>3. Escribe este código o escanea el QR</li>
                        </ol>
                    </div>
                    {screen.pairingCode && (
                        <div className="bg-white p-5 rounded-2xl"><QRCodeSVG value={link} size={260} /></div>
                    )}
                </div>
                <p className="mt-10 text-lg text-slate-500">El código cambia cada 15 minutos.</p>
            </div>
        );
    }

    if (!screen.rankingId) {
        return (
            <div className={shell}>
                {screen.clubLogoUrl && <img src={screen.clubLogoUrl} alt="" className="max-h-60 max-w-[60vw] object-contain" />}
                <h1 className="mt-8 text-5xl font-bold">{screen.clubName || 'Racket Grid'}</h1>
                <p className="mt-4 text-2xl text-slate-400">{screen.name ? `${screen.name} · ` : ''}En espera</p>
            </div>
        );
    }

    return <TVPage key={screen.rankingId} rankingId={screen.rankingId} />;
};
