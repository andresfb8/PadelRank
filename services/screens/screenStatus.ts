// A TV sends a signal every 5 minutes; two missed signals means it is off or offline
export const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export const screenStatus = (lastSeenAt: number | { toMillis(): number }, now = Date.now()): { online: boolean; label: string } => {
    const silent = now - (typeof lastSeenAt === 'number' ? lastSeenAt : lastSeenAt.toMillis());
    if (silent < ONLINE_WINDOW_MS) return { online: true, label: 'Conectada' };
    const minutes = Math.floor(silent / 60_000);
    if (minutes < 60) return { online: false, label: `Sin señal desde hace ${minutes} min` };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { online: false, label: `Sin señal desde hace ${hours} h` };
    const days = Math.floor(hours / 24);
    return { online: false, label: `Sin señal desde hace ${days} ${days === 1 ? 'día' : 'días'}` };
};
