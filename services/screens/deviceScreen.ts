import { User } from 'firebase/auth';
import { deleteDoc, doc, DocumentReference, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Screen } from '../../types/screens';
import { CODE_TTL_MS, generatePairingCode } from './pairingCode';
import { screenDb, signInScreen } from './screenFirebase';

const HEARTBEAT_MS = 5 * 60 * 1000;
const TICK_MS = 30 * 1000;
// Renew a little before the code expires, so the TV never shows a dead code
const RENEW_MARGIN_MS = 60 * 1000;

type Device = { user: User; screenRef: DocumentReference };

// The screen's id is the TV's anonymous uid, so the same browser always finds the same screen
async function findOrCreateScreen(): Promise<Device> {
    const user = await signInScreen();
    const screenRef = doc(screenDb, 'screens', user.uid);
    // From the server: offline must fail (and offer Reintentar), never look like a missing screen
    const snap = await getDocFromServer(screenRef);
    if (!snap.exists()) {
        const fresh = {
            id: user.uid, deviceUid: user.uid, ownerId: null, name: null, rankingId: null, clubName: null, clubLogoUrl: null,
            pairingCode: null, codeIssuedAt: null, lastSeenAt: serverTimestamp(), pairedAt: null,
        };
        try {
            await setDoc(screenRef, fresh);
        } catch (e) {
            // React StrictMode (dev) starts twice: the other run may have just created it
            if (!(await getDocFromServer(screenRef)).exists()) throw e;
        }
    }
    return { user, screenRef };
}

/**
 * Runs the TV side: finds or creates this browser's screen, keeps an unpaired screen showing a live
 * code, sends a signal of life, and reports every change. Reports onError if the screen cannot be
 * followed any more. Returns a function that stops it all.
 */
export async function startDeviceScreen(onChange: (screen: Screen) => void, onError: (error: Error) => void): Promise<() => void> {
    const { user, screenRef } = await findOrCreateScreen();

    let current: Screen | null = null;
    let renewing = false;
    let lastCode: string | null = null;
    // Local clock only (performance.now): the TV's clock may be far from the server's
    let codeObtainedAt: number | null = null;

    const forgetCode = async () => {
        codeObtainedAt = null;
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
                const startedAt = performance.now();
                try {
                    // Creating an existing code is an update, which the rules deny: try another
                    await setDoc(doc(screenDb, 'screenCodes', code), { screenId: screenRef.id, deviceUid: user.uid, issuedAt: serverTimestamp() });
                } catch { continue; }
                await forgetCode();
                lastCode = code;
                codeObtainedAt = startedAt;
                try {
                    await updateDoc(screenRef, { pairingCode: code, codeIssuedAt: serverTimestamp() });
                } catch { /* offline or just paired: the next snapshot or tick decides */ }
                return;
            }
        } finally {
            renewing = false;
        }
    };

    // A code this run did not obtain (e.g. from before a restart) is always replaced
    const needsCode = (s: Screen) => !s.ownerId && (!s.pairingCode || s.pairingCode !== lastCode
        || codeObtainedAt === null || performance.now() - codeObtainedAt > CODE_TTL_MS - RENEW_MARGIN_MS);

    const unsubscribe = onSnapshot(screenRef, (snap) => {
        if (!snap.exists()) {
            onError(new Error('La pantalla ya no existe.'));
            return;
        }
        current = snap.data() as Screen;
        onChange(current);
        if (current.ownerId) void forgetCode();
        else if (needsCode(current)) void renewCode();
    }, (e) => onError(e));

    const beat = () => { void updateDoc(screenRef, { lastSeenAt: serverTimestamp() }).catch(() => {}); };
    const tick = setInterval(() => { if (current && needsCode(current)) void renewCode(); }, TICK_MS);
    const heartbeat = setInterval(beat, HEARTBEAT_MS);
    beat();

    return () => { unsubscribe(); clearInterval(tick); clearInterval(heartbeat); };
}
