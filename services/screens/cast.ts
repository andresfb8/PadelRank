// Google Cast: a sender button in the tournament and a receiver page the Chromecast opens.
export const CAST_APP_ID: string | undefined = import.meta.env.VITE_CAST_APP_ID || undefined;
export const CAST_NAMESPACE = 'urn:x-cast:racketgrid.tv';
export const SENDER_SDK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
export const RECEIVER_SDK = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';

const loading: Record<string, Promise<void>> = {};
export const loadScript = (src: string) => (loading[src] ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
}));

export type CastMessage = { rankingId: string };
