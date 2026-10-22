// Checks the club TV rules against the local emulators. Never points at production.
//   npm run emulators   (other terminal)   then   node scripts/checkScreenRules.mjs
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const config = { apiKey: 'demo-api-key', projectId: 'demo-padelrank', authDomain: 'demo-padelrank.firebaseapp.com' };
const client = (name) => {
    const app = initializeApp(config, name);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return { auth, db };
};
let failures = 0;
const expectOk = async (label, p) => { try { await p; console.log('ok   ', label); } catch (e) { failures++; console.log('FAIL ', label, e.code || e.message); } };
const expectDenied = async (label, p) => { try { await p; failures++; console.log('FAIL ', label, '(was allowed)'); } catch (e) { console.log(e.code === 'permission-denied' ? 'ok   ' : 'FAIL ', label, e.code); if (e.code !== 'permission-denied') failures++; } };

const tv = client('tv'), other = client('otherTv'), admin = client('admin');
const tvUser = (await signInAnonymously(tv.auth)).user;
await signInAnonymously(other.auth);
const adminUser = (await createUserWithEmailAndPassword(admin.auth, `rules-${Date.now()}@padelrank.test`, 'emulator-only-123')).user;

const screenId = `s-${Date.now()}`, code = `T${Date.now().toString(36).slice(-5).toUpperCase()}`;
const base = { id: screenId, deviceUid: tvUser.uid, ownerId: null, name: null, rankingId: null, clubName: null, clubLogoUrl: null, pairingCode: null, codeExpiresAt: null, lastSeenAt: Date.now(), pairedAt: null };

await expectOk('TV creates its screen', setDoc(doc(tv.db, 'screens', screenId), base));
await expectOk('TV creates its code', setDoc(doc(tv.db, 'screenCodes', code), { screenId, deviceUid: tvUser.uid, expiresAt: Date.now() + 900000 }));
await expectOk('TV renews its code', updateDoc(doc(tv.db, 'screens', screenId), { pairingCode: code, codeExpiresAt: Date.now() + 900000 }));
await expectDenied('Code cannot be overwritten', setDoc(doc(other.db, 'screenCodes', code), { screenId: 'x', deviceUid: other.auth.currentUser.uid, expiresAt: 1 }));
await expectDenied('TV cannot pair itself', updateDoc(doc(tv.db, 'screens', screenId), { ownerId: tvUser.uid }));
await expectDenied('Another TV cannot read it', getDoc(doc(other.db, 'screens', screenId)));
await expectDenied('A TV cannot look up codes', getDoc(doc(other.db, 'screenCodes', code)));
await expectDenied('A TV cannot create a tournament', setDoc(doc(tv.db, 'rankings', `r-${Date.now()}`), { ownerId: tvUser.uid, nombre: 'x' }));
await expectOk('Admin looks up the code', getDoc(doc(admin.db, 'screenCodes', code)));
await expectOk('Admin pairs the TV', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: adminUser.uid, name: 'Bar', rankingId: null, clubName: 'Club', clubLogoUrl: null, pairedAt: Date.now(), pairingCode: null, codeExpiresAt: null }));
await expectOk('TV reads its pairing', getDoc(doc(tv.db, 'screens', screenId)));
await expectOk('Admin sets a tournament', updateDoc(doc(admin.db, 'screens', screenId), { rankingId: 'r-1' }));
await expectDenied('Admin cannot hand it to another club', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: 'someone-else' }));
await expectDenied('Unpairing must clear the tournament', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: null }));
await expectOk('Admin unpairs', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: null, rankingId: null, pairedAt: null }));
await expectDenied('Pairing needs a live code', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: adminUser.uid, pairingCode: null }));

console.log(failures ? `\n${failures} failed` : '\nAll rules behave');
process.exit(failures ? 1 : 0);
