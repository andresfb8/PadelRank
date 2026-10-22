import React, { useEffect, useState } from 'react';
import { CAST_APP_ID, CAST_NAMESPACE, SENDER_SDK, loadScript } from '../../services/screens/cast';

declare const cast: any;
declare const chrome: any;

let ready: Promise<boolean> | null = null;
const castReady = () => (ready ??= new Promise<boolean>((resolve) => {
    if (!CAST_APP_ID) return resolve(false);
    (window as any).__onGCastApiAvailable = (available: boolean) => {
        if (!available) return resolve(false);
        cast.framework.CastContext.getInstance().setOptions({
            receiverApplicationId: CAST_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        resolve(true);
    };
    loadScript(SENDER_SDK).catch(() => resolve(false));
}));

// Shows the Cast icon only where Cast works (Chrome on Android and computers) and only once the app is registered
export const CastButton = ({ rankingId }: { rankingId: string }) => {
    const [available, setAvailable] = useState(false);

    useEffect(() => { castReady().then(setAvailable); }, []);

    useEffect(() => {
        if (!available) return;
        const context = cast.framework.CastContext.getInstance();
        const send = () => context.getCurrentSession()?.sendMessage(CAST_NAMESPACE, { rankingId });
        const onState = (e: any) => {
            const S = cast.framework.SessionState;
            if (e.sessionState === S.SESSION_STARTED || e.sessionState === S.SESSION_RESUMED) send();
        };
        context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onState);
        send(); // already casting: switch the TV to this tournament
        return () => context.removeEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onState);
    }, [available, rankingId]);

    if (!available) return null;
    return (
        <span title="Enviar a Chromecast" className="w-10 h-10 grid place-items-center rounded-lg border border-rg-line bg-white">
            {React.createElement('google-cast-launcher', { style: { width: 22, height: 22, cursor: 'pointer', '--disconnected-color': '#64748b' } as any })}
        </span>
    );
};
