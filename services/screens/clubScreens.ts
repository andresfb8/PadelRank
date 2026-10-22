import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../../types';
import { Screen, ScreenCode } from '../../types/screens';
import { isValidPairingCode, normalizePairingCode } from './pairingCode';

/** The club a user acts for: staff act for their admin */
export const clubIdOf = (user: Pick<User, 'id' | 'role' | 'parentAdminId'>) =>
    user.role === 'staff' && user.parentAdminId ? user.parentAdminId : user.id;

export const subscribeToClubScreens = (clubId: string, callback: (screens: Screen[]) => void) =>
    onSnapshot(query(collection(db, 'screens'), where('ownerId', '==', clubId)), (snap) => {
        callback(snap.docs.map(d => d.data() as Screen).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    }, () => callback([]));

export async function pairScreen(rawCode: string, club: { clubId: string; name: string; clubName?: string; clubLogoUrl?: string }): Promise<string> {
    const code = normalizePairingCode(rawCode);
    if (!isValidPairingCode(code)) throw new Error('El código tiene 6 letras o números. Cópialo tal como sale en la tele.');
    const snap = await getDoc(doc(db, 'screenCodes', code));
    if (!snap.exists()) throw new Error('Ese código no existe o ha caducado. Mira el que sale ahora en la tele.');
    const found = snap.data() as ScreenCode;
    // No expiry check here: the phone's clock may be wrong. The rules check it with the server's time.
    try {
        await updateDoc(doc(db, 'screens', found.screenId), {
            ownerId: club.clubId, name: club.name.trim() || 'Pantalla', rankingId: null,
            clubName: club.clubName || null, clubLogoUrl: club.clubLogoUrl || null,
            pairedAt: Date.now(), pairingCode: null, codeIssuedAt: null, claimCode: code,
        });
    } catch (e: any) {
        if (e?.code === 'permission-denied') throw new Error('Ese código ha caducado o la pantalla ya está vinculada. Mira el código que sale ahora en la tele.');
        throw e;
    }
    return found.screenId;
}

export const setScreenRanking = (screenId: string, rankingId: string | null) => updateDoc(doc(db, 'screens', screenId), { rankingId });
export const renameScreen = (screenId: string, name: string) => updateDoc(doc(db, 'screens', screenId), { name: name.trim() || 'Pantalla' });
export const unlinkScreen = (screenId: string) => updateDoc(doc(db, 'screens', screenId), {
    ownerId: null, rankingId: null, pairedAt: null, pairingCode: null, codeIssuedAt: null, claimCode: null,
});
