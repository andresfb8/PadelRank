import React, { useEffect, useState } from 'react';
import { CAST_NAMESPACE, CastMessage, RECEIVER_SDK, loadScript } from '../services/screens/cast';
import { TVPage } from './TVPage';

declare const cast: any;

// /?cast=1 — the page the Chromecast opens. The phone sends which tournament to show.
export const CastReceiverPage = () => {
    const [rankingId, setRankingId] = useState<string | null>(null);

    useEffect(() => {
        loadScript(RECEIVER_SDK).then(() => {
            const context = cast.framework.CastReceiverContext.getInstance();
            context.addCustomMessageListener(CAST_NAMESPACE, (event: { data: CastMessage | string }) => {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (data?.rankingId) setRankingId(data.rankingId);
            });
            const options = new cast.framework.CastReceiverOptions();
            options.disableIdleTimeout = true; // a scoreboard is never idle
            options.skipPlayersLoad = true;
            context.start(options);
        }).catch(() => { /* not on a Chromecast */ });
    }, []);

    if (!rankingId) {
        return <div className="h-screen w-screen bg-slate-950 text-white grid place-items-center text-3xl text-slate-400">Esperando torneo…</div>;
    }
    return <TVPage key={rankingId} rankingId={rankingId} />;
};
