// Checks the club TV rules against the local emulators. Never points at production.
//   npm run emulators   (other terminal)   then   node scripts/checkScreenRules.mjs
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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

// A screen's id is its TV's uid
const screenId = tvUser.uid, code = `T${Date.now().toString(36).slice(-5).toUpperCase()}`;
const base = { id: screenId, deviceUid: tvUser.uid, ownerId: null, name: null, rankingId: null, clubName: null, clubLogoUrl: null, pairingCode: null, codeIssuedAt: null, lastSeenAt: serverTimestamp(), pairedAt: null };
const pairing = (claimCode) => ({ ownerId: adminUser.uid, name: 'Bar', rankingId: null, clubName: 'Club', clubLogoUrl: null, pairedAt: Date.now(), pairingCode: null, codeIssuedAt: null, ...(claimCode === undefined ? {} : { claimCode }) });

await expectDenied('TV cannot create a screen with another id', setDoc(doc(tv.db, 'screens', `s-${Date.now()}`), { ...base, id: 'x' }));
await expectDenied('TV cannot create its screen with extra fields', setDoc(doc(tv.db, 'screens', screenId), { ...base, claimCode: 'X' }));
await expectDenied('TV cannot create its screen with its own clock', setDoc(doc(tv.db, 'screens', screenId), { ...base, lastSeenAt: Timestamp.now() }));
await expectOk('TV reads its screen before it exists', getDoc(doc(tv.db, 'screens', screenId)));
await expectOk('TV creates its screen', setDoc(doc(tv.db, 'screens', screenId), base));
await expectDenied('TV cannot create a code for another screen', setDoc(doc(other.db, 'screenCodes', `O${code.slice(1)}`), { screenId, deviceUid: other.auth.currentUser.uid, issuedAt: serverTimestamp() }));
await expectDenied('TV cannot date a code with its own clock', setDoc(doc(tv.db, 'screenCodes', `C${code.slice(1)}`), { screenId, deviceUid: tvUser.uid, issuedAt: Timestamp.now() }));
await expectOk('TV creates its code', setDoc(doc(tv.db, 'screenCodes', code), { screenId, deviceUid: tvUser.uid, issuedAt: serverTimestamp() }));
await expectOk('TV renews its code', updateDoc(doc(tv.db, 'screens', screenId), { pairingCode: code, codeIssuedAt: serverTimestamp() }));
await expectDenied('TV cannot date its code with its own clock', updateDoc(doc(tv.db, 'screens', screenId), { pairingCode: code, codeIssuedAt: Timestamp.now() }));
await expectOk('TV says it is alive', updateDoc(doc(tv.db, 'screens', screenId), { lastSeenAt: serverTimestamp() }));
await expectDenied('TV cannot fake its signal', updateDoc(doc(tv.db, 'screens', screenId), { lastSeenAt: Timestamp.fromMillis(Date.now() + 86400000) }));
await expectDenied('Code cannot be overwritten', setDoc(doc(other.db, 'screenCodes', code), { screenId: other.auth.currentUser.uid, deviceUid: other.auth.currentUser.uid, issuedAt: serverTimestamp() }));
await expectDenied('TV cannot pair itself', updateDoc(doc(tv.db, 'screens', screenId), { ownerId: tvUser.uid }));
await expectDenied('Another TV cannot read it', getDoc(doc(other.db, 'screens', screenId)));
await expectDenied('A TV cannot look up codes', getDoc(doc(other.db, 'screenCodes', code)));
await expectDenied('A TV cannot create a tournament', setDoc(doc(tv.db, 'rankings', `r-${Date.now()}`), { ownerId: tvUser.uid, nombre: 'x' }));
await expectOk('Admin looks up the code', getDoc(doc(admin.db, 'screenCodes', code)));
await expectDenied('Pairing needs the code', updateDoc(doc(admin.db, 'screens', screenId), pairing()));
await expectDenied('Pairing needs the right code', updateDoc(doc(admin.db, 'screens', screenId), pairing('WRONG1')));
await expectOk('Admin pairs the TV', updateDoc(doc(admin.db, 'screens', screenId), pairing(code)));
await expectOk('TV reads its pairing', getDoc(doc(tv.db, 'screens', screenId)));
await expectDenied('TV cannot set a code while paired', updateDoc(doc(tv.db, 'screens', screenId), { pairingCode: 'NEWONE', codeIssuedAt: serverTimestamp() }));
await expectOk('A paired TV still says it is alive', updateDoc(doc(tv.db, 'screens', screenId), { lastSeenAt: serverTimestamp() }));
await expectOk('Admin sets a tournament', updateDoc(doc(admin.db, 'screens', screenId), { rankingId: 'r-1' }));
await expectDenied('Admin cannot set a code', updateDoc(doc(admin.db, 'screens', screenId), { pairingCode: 'ABCDEF' }));
await expectDenied('Admin cannot hand it to another club', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: 'someone-else' }));
await expectDenied('Unpairing must clear the tournament', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: null }));
await expectOk('Admin unpairs', updateDoc(doc(admin.db, 'screens', screenId), { ownerId: null, rankingId: null, pairedAt: null, pairingCode: null, codeIssuedAt: null, claimCode: null }));
await expectOk('Unpairing clears the code fields', getDoc(doc(tv.db, 'screens', screenId)).then((snap) => {
    const d = snap.data();
    if (d.pairingCode !== null || d.codeIssuedAt !== null || d.claimCode !== null) throw new Error(`left ${JSON.stringify({ p: d.pairingCode, i: d.codeIssuedAt, c: d.claimCode })}`);
}));
await expectDenied('Pairing needs a live code', updateDoc(doc(admin.db, 'screens', screenId), pairing(code)));
await expectOk('An unpaired TV gets a code again', updateDoc(doc(tv.db, 'screens', screenId), { pairingCode: code, codeIssuedAt: serverTimestamp() }));

console.log(failures ? `\n${failures} failed` : '\nAll rules behave');
process.exit(failures ? 1 : 0);
