import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { Screen } from '../../types/screens';
import { CODE_TTL_MS, generatePairingCode } from './pairingCode';
import { screenDb, signInScreen } from './screenFirebase';

const STORAGE_KEY = 'rg-screen-id';
const HEARTBEAT_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;
// Renew a little before the code expires, so the TV never shows a dead code
const RENEW_MARGIN_MS = 60 * 1000;

const readId = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };
const saveId = (id: string) => { try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode: pairs again next time */ } };

/**
 * Runs the TV side: finds or creates this browser's screen, keeps an unpaired screen showing a live
 * code, sends a signal of life, and reports every change. Returns a function that stops it all.
 */
export async function startDeviceScreen(onChange: (screen: Screen) => void): Promise<() => void> {
    const user = await signInScreen();

    let ref = null as ReturnType<typeof doc> | null;
    const savedId = readId();
    if (savedId) {
        try {
            const snap = await getDoc(doc(screenDb, 'screens', savedId));
            if (snap.exists() && snap.data().deviceUid === user.uid) ref = snap.ref;
        } catch { /* not ours any more: start again */ }
    }
    if (!ref) {
        ref = doc(collection(screenDb, 'screens'));
        const fresh: Screen = {
            id: ref.id, deviceUid: user.uid, ownerId: null, name: null, rankingId: null, clubName: null, clubLogoUrl: null,
            pairingCode: null, codeExpiresAt: null, lastSeenAt: Date.now(), pairedAt: null,
        };
        await setDoc(ref, fresh);
        saveId(ref.id);
    }
    const screenRef = ref;

    let current: Screen | null = null;
    let renewing = false;
    let lastCode: string | null = null;

    const forgetCode = async () => {
        if (!lastCode) return;
        const code = lastCode;
        lastCode = null;
        try { await deleteDoc(doc(screenDb, 'screenCodes', code)); } catch { /* it expires anyway */ }
    };

    const renewCode = async () => {
        if (renewing) return;
        renewing = true;
        try {
            for (let attempt = 0; attempt < 5; attempt++) {
                const code = generatePairingCode();
                const expiresAt = Date.now() + CODE_TTL_MS;
                try {
                    // Creating an existing code is an update, which the rules deny: try another
                    await setDoc(doc(screenDb, 'screenCodes', code), { screenId: screenRef.id, deviceUid: user.uid, expiresAt });
                } catch { continue; }
                await forgetCode();
                lastCode = code;
                try {
                    await updateDoc(screenRef, { pairingCode: code, codeExpiresAt: expiresAt });
                } catch { /* offline or just paired: the next snapshot or tick decides */ }
                return;
            }
        } finally {
            renewing = false;
        }
    };

    const needsCode = (s: Screen) => !s.ownerId && (!s.pairingCode || !s.codeExpiresAt || s.codeExpiresAt - Date.now() < RENEW_MARGIN_MS);

    const unsubscribe = onSnapshot(screenRef, (snap) => {
        if (!snap.exists()) return;
        current = snap.data() as Screen;
        onChange(current);
        if (current.ownerId) void forgetCode();
        else if (needsCode(current)) void renewCode();
    });

    const tick = setInterval(() => { if (current && needsCode(current)) void renewCode(); }, TICK_MS);
    const heartbeat = setInterval(() => { void updateDoc(screenRef, { lastSeenAt: Date.now() }).catch(() => {}); }, HEARTBEAT_MS);
    void updateDoc(screenRef, { lastSeenAt: Date.now() }).catch(() => {});

    return () => { unsubscribe(); clearInterval(tick); clearInterval(heartbeat); };
}
