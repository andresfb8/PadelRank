# Pantallas del club y Google Cast — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una tele con navegador abre `/tv`, se empareja con un código y queda vinculada al club; desde la app se elige qué torneo enseña o se desvincula. Además, un botón de Google Cast que solo aparece cuando hay `VITE_CAST_APP_ID`.

**Architecture:** La tele usa una instancia de Firebase propia (`Screen`) con acceso anónimo, para no cerrar la sesión de un administrador en el mismo navegador. Cada tele es un documento `screens/{id}`; los códigos viven en `screenCodes/{code}` para que la app encuentre la pantalla sin poder listar las ajenas. La página de la tele reutiliza `TVPage`. Las reglas pasan a distinguir usuarios de verdad (`isSignedIn`) de teles anónimas (`isAuthed`).

**Tech Stack:** React 19 + TypeScript, Vite, Firebase 12 (Auth + Firestore), Vitest, `qrcode.react`, Cast SDKs cargados desde gstatic.

Spec: `docs/superpowers/specs/2026-10-22-tv-screens-cast-design.md`

Todas las rutas son relativas a `PadelRank/PadelRank`. Pruebas: `npx vitest run <ruta>`. Tipos: `npx tsc --noEmit -p .` (hay errores previos en otros archivos; no añadir ninguno en los tocados).

Emuladores para las tareas que los necesitan: `npm run emulators` (en segundo plano) y `npm run seed:emulator`. Credenciales de prueba en `scripts/seedEmulator.mjs`.

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `types/screens.ts` | Crear: tipos `Screen`, `ScreenCode` |
| `services/screens/pairingCode.ts` (+ test) | Crear: generar/normalizar/validar códigos |
| `services/screens/screenStatus.ts` (+ test) | Crear: «Conectada / Sin señal desde…» |
| `firestore.rules` | Modificar: `isSignedIn` excluye anónimos; reglas de `screens` y `screenCodes` |
| `scripts/checkScreenRules.mjs` | Crear: comprueba las reglas contra el emulador |
| `services/firebase.ts` | Modificar: exportar `firebaseConfig` y `useEmulators` |
| `services/screens/screenFirebase.ts` | Crear: app `Screen` + acceso anónimo |
| `services/screens/deviceScreen.ts` | Crear: lado tele |
| `services/screens/clubScreens.ts` | Crear: lado club |
| `pages/ScreenPage.tsx` | Crear: página `/tv` |
| `App.tsx` | Modificar: rutas `/tv`, `?cast=1`, `?vincular=` |
| `components/screens/PairScreenModal.tsx` | Crear |
| `components/screens/ScreensView.tsx` | Crear |
| `components/AdminLayout.tsx` | Modificar: vista `screens`, menú, `?vincular` |
| `components/screens/SendToScreenMenu.tsx` | Crear |
| `components/RankingView.tsx` | Modificar: menú junto a Modo TV + botón Cast |
| `services/screens/cast.ts` | Crear: constantes y carga de scripts |
| `pages/CastReceiverPage.tsx` | Crear |
| `components/screens/CastButton.tsx` | Crear |

---

### Task 1: Tipos, códigos y estado de señal

**Files:**
- Create: `types/screens.ts`, `services/screens/pairingCode.ts`, `services/screens/screenStatus.ts`
- Test: `services/screens/__tests__/pairingCode.test.ts`, `services/screens/__tests__/screenStatus.test.ts`

- [ ] **Step 1: Tipos**

`types/screens.ts`:

```ts
/** A club TV: a browser that opened /tv and was paired with a code */
export interface Screen {
    id: string;
    /** Anonymous uid of the TV's browser */
    deviceUid: string;
    /** Club that owns it (uid of the owning admin); null while unpaired */
    ownerId: string | null;
    name: string | null;
    /** Tournament on screen; null = waiting with the club's logo */
    rankingId: string | null;
    /** Copied when pairing: the TV cannot read users/ */
    clubName: string | null;
    clubLogoUrl: string | null;
    pairingCode: string | null;
    /** epoch ms */
    codeExpiresAt: number | null;
    lastSeenAt: number;
    pairedAt: number | null;
}

/** screenCodes/{code}: lets the club find a TV by its code without listing other clubs' TVs */
export interface ScreenCode {
    screenId: string;
    deviceUid: string;
    expiresAt: number;
}
```

- [ ] **Step 2: Pruebas que fallan**

`services/screens/__tests__/pairingCode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generatePairingCode, normalizePairingCode, isValidPairingCode, formatPairingCode, CODE_ALPHABET, CODE_LENGTH } from '../pairingCode';

describe('pairing codes', () => {
    it('are 6 characters from an alphabet without look-alikes', () => {
        const code = generatePairingCode();
        expect(code).toHaveLength(CODE_LENGTH);
        expect([...code].every(c => CODE_ALPHABET.includes(c))).toBe(true);
        expect(CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    });

    it('uses the given random source', () => {
        expect(generatePairingCode(() => 0)).toBe(CODE_ALPHABET[0].repeat(6));
    });

    it('accepts what people type', () => {
        expect(normalizePairingCode(' ab3-k9q ')).toBe('AB3K9Q');
        expect(isValidPairingCode('AB3K9Q')).toBe(true);
        expect(isValidPairingCode('AB3K9')).toBe(false);
        expect(isValidPairingCode('AB3K90')).toBe(false); // 0 is not in the alphabet
    });

    it('is shown in two halves', () => {
        expect(formatPairingCode('AB3K9Q')).toBe('AB3 K9Q');
    });
});
```

`services/screens/__tests__/screenStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { screenStatus } from '../screenStatus';

const NOW = 1_800_000_000_000;
const min = 60_000;

describe('screenStatus', () => {
    it('is connected with a recent signal', () => {
        expect(screenStatus(NOW - 3 * min, NOW)).toEqual({ online: true, label: 'Conectada' });
    });
    it('says how long it has been silent', () => {
        expect(screenStatus(NOW - 25 * min, NOW).label).toBe('Sin señal desde hace 25 min');
        expect(screenStatus(NOW - 3 * 60 * min, NOW).label).toBe('Sin señal desde hace 3 h');
        expect(screenStatus(NOW - 24 * 60 * min, NOW).label).toBe('Sin señal desde hace 1 día');
        expect(screenStatus(NOW - 3 * 24 * 60 * min, NOW).label).toBe('Sin señal desde hace 3 días');
        expect(screenStatus(NOW - 25 * min, NOW).online).toBe(false);
    });
});
```

- [ ] **Step 3: Ver que fallan**

Run: `npx vitest run services/screens`
Expected: FAIL, no se resuelven los imports.

- [ ] **Step 4: Implementar**

`services/screens/pairingCode.ts`:

```ts
// Codes a TV shows so the club can pair it. No 0/O, 1/I/L: they look alike on a TV across the room.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;

const cryptoRandom = () => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
};

export const generatePairingCode = (random: () => number = cryptoRandom) =>
    Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');

export const normalizePairingCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidPairingCode = (code: string) =>
    code.length === CODE_LENGTH && [...code].every(c => CODE_ALPHABET.includes(c));

export const formatPairingCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
```

`services/screens/screenStatus.ts`:

```ts
// A TV sends a signal every 5 minutes; two missed signals means it is off or offline
export const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export const screenStatus = (lastSeenAt: number, now = Date.now()): { online: boolean; label: string } => {
    const silent = now - lastSeenAt;
    if (silent < ONLINE_WINDOW_MS) return { online: true, label: 'Conectada' };
    const minutes = Math.floor(silent / 60_000);
    if (minutes < 60) return { online: false, label: `Sin señal desde hace ${minutes} min` };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { online: false, label: `Sin señal desde hace ${hours} h` };
    const days = Math.floor(hours / 24);
    return { online: false, label: `Sin señal desde hace ${days} ${days === 1 ? 'día' : 'días'}` };
};
```

- [ ] **Step 5: Ver que pasan**

Run: `npx vitest run services/screens`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add types/screens.ts services/screens
git commit -m "feat(pantallas): tipos, códigos de emparejamiento y estado de señal"
```

---

### Task 2: Reglas de Firestore

**Files:**
- Modify: `firestore.rules`
- Create: `scripts/checkScreenRules.mjs`

- [ ] **Step 1: Separar usuarios de teles**

En `firestore.rules`, sustituye la función `isSignedIn` por:

```
    // A person with an account. TVs sign in anonymously and must never count as one.
    function isSignedIn() {
      return request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }

    // Anyone with a session, TVs included
    function isAuthed() {
      return request.auth != null;
    }

    // The club that owns something: its admin or the admin's staff
    function isClub(ownerId) {
      return isSignedIn() && (request.auth.uid == ownerId || isStaffOf(ownerId));
    }

    function changedOnly(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }
```

(Todas las reglas existentes que usan `isSignedIn()` quedan así cerradas a las teles.)

- [ ] **Step 2: Reglas de pantallas**

Justo antes del bloque final `match /{document=**}`, añade:

```
    // Club TVs (pages/ScreenPage.tsx). A TV signs in anonymously and owns its own document.
    match /screenCodes/{code} {
      allow create: if isAuthed()
        && request.resource.data.deviceUid == request.auth.uid
        && request.resource.data.keys().hasOnly(['screenId', 'deviceUid', 'expiresAt']);
      allow get: if isSignedIn();
      allow delete: if isAuthed() && resource.data.deviceUid == request.auth.uid;
    }

    match /screens/{screenId} {
      allow create: if isAuthed()
        && request.resource.data.deviceUid == request.auth.uid
        && request.resource.data.ownerId == null
        && request.resource.data.rankingId == null;

      allow get: if isAuthed() && (
        resource.data.deviceUid == request.auth.uid ||
        (resource.data.ownerId != null && isClub(resource.data.ownerId)) ||
        isSuperAdmin()
      );

      allow list: if isSignedIn() && (resource.data.ownerId == request.auth.uid || isStaffOf(resource.data.ownerId));

      allow update: if
        // The TV renewing its code or saying it is alive
        (isAuthed() && resource.data.deviceUid == request.auth.uid
          && changedOnly(['pairingCode', 'codeExpiresAt', 'lastSeenAt']))
        // A club pairing an unpaired TV whose code has not expired
        || (resource.data.ownerId == null
          && isClub(request.resource.data.ownerId)
          && resource.data.codeExpiresAt != null
          && resource.data.codeExpiresAt > request.time.toMillis()
          && request.resource.data.pairingCode == null
          && changedOnly(['ownerId', 'name', 'rankingId', 'clubName', 'clubLogoUrl', 'pairedAt', 'pairingCode', 'codeExpiresAt']))
        // The club managing its TV, or unpairing it
        || (resource.data.ownerId != null && isClub(resource.data.ownerId)
          && changedOnly(['name', 'rankingId', 'clubName', 'clubLogoUrl', 'ownerId', 'pairedAt'])
          && (request.resource.data.ownerId == resource.data.ownerId
            || (request.resource.data.ownerId == null && request.resource.data.rankingId == null)));
    }
```

- [ ] **Step 3: Script de comprobación**

`scripts/checkScreenRules.mjs`:

```js
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
```

- [ ] **Step 4: Ejecutar contra el emulador**

Con los emuladores arrancados (`npm run emulators` en segundo plano; cargan `firestore.rules` al arrancar, así que arráncalos después del cambio o reinícialos):

Run: `node scripts/checkScreenRules.mjs`
Expected: todas las líneas `ok`, y al final `All rules behave`.

Si falla una línea, corrige la regla (no el script) salvo que el script contradiga la spec.

- [ ] **Step 5: Comprobar que la app sigue funcionando con las reglas nuevas**

Run: `npm run seed:emulator`
Expected: termina sin error (el admin sembrado es de email y contraseña, así que sigue siendo `isSignedIn`).

- [ ] **Step 6: Commit**

```bash
git add firestore.rules scripts/checkScreenRules.mjs
git commit -m "feat(reglas): pantallas del club y teles anónimas sin permisos de escritura"
```

---

### Task 3: Firebase de la tele y lado tele

**Files:**
- Modify: `services/firebase.ts`
- Create: `services/screens/screenFirebase.ts`, `services/screens/deviceScreen.ts`

- [ ] **Step 1: Exportar la configuración**

En `services/firebase.ts`, cambia `const useEmulators =` por `export const useEmulators =` y `const firebaseConfig =` por `export const firebaseConfig =`.

- [ ] **Step 2: App de la tele**

`services/screens/screenFirebase.ts`:

```ts
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, User } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { firebaseConfig, useEmulators } from '../firebase';

// The TV signs in anonymously in its own Firebase app, so opening /tv in a browser where an
// admin is logged in never signs the admin out.
const screenApp = initializeApp(firebaseConfig, 'Screen');
export const screenAuth = getAuth(screenApp);
export const screenDb = getFirestore(screenApp);

if (useEmulators) {
    connectAuthEmulator(screenAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(screenDb, '127.0.0.1', 8080);
}

export const signInScreen = async (): Promise<User> => {
    await screenAuth.authStateReady();
    return screenAuth.currentUser ?? (await signInAnonymously(screenAuth)).user;
};
```

- [ ] **Step 3: Lado tele**

`services/screens/deviceScreen.ts`:

```ts
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
                await updateDoc(screenRef, { pairingCode: code, codeExpiresAt: expiresAt });
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
```

- [ ] **Step 4: Tipos**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "services/screens|services/firebase"`
Expected: sin salida.

- [ ] **Step 5: Commit**

```bash
git add services/firebase.ts services/screens/screenFirebase.ts services/screens/deviceScreen.ts
git commit -m "feat(pantallas): la tele entra sola, enseña un código vivo y avisa de que sigue encendida"
```

---

### Task 4: Lado club

**Files:**
- Create: `services/screens/clubScreens.ts`

- [ ] **Step 1: Implementar**

```ts
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
    const found = snap.exists() ? (snap.data() as ScreenCode) : null;
    if (!found || found.expiresAt < Date.now()) throw new Error('Ese código no existe o ha caducado. Mira el que sale ahora en la tele.');
    try {
        await updateDoc(doc(db, 'screens', found.screenId), {
            ownerId: club.clubId, name: club.name.trim() || 'Pantalla', rankingId: null,
            clubName: club.clubName || null, clubLogoUrl: club.clubLogoUrl || null,
            pairedAt: Date.now(), pairingCode: null, codeExpiresAt: null,
        });
    } catch (e: any) {
        if (e?.code === 'permission-denied') throw new Error('Esta pantalla ya está vinculada a un club o su código ha caducado.');
        throw e;
    }
    return found.screenId;
}

export const setScreenRanking = (screenId: string, rankingId: string | null) => updateDoc(doc(db, 'screens', screenId), { rankingId });
export const renameScreen = (screenId: string, name: string) => updateDoc(doc(db, 'screens', screenId), { name: name.trim() || 'Pantalla' });
export const unlinkScreen = (screenId: string) => updateDoc(doc(db, 'screens', screenId), { ownerId: null, rankingId: null, pairedAt: null });
```

- [ ] **Step 2: Tipos**

Run: `npx tsc --noEmit -p . 2>&1 | grep clubScreens`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add services/screens/clubScreens.ts
git commit -m "feat(pantallas): vincular, asignar torneo, renombrar y desvincular desde el club"
```

---

### Task 5: Página de la tele y rutas

**Files:**
- Create: `pages/ScreenPage.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Página**

`pages/ScreenPage.tsx`:

```tsx
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
        startDeviceScreen((s) => { if (!cancelled) setScreen(s); })
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
```

- [ ] **Step 2: Rutas**

En `App.tsx`:
- Importa `import { ScreenPage } from './pages/ScreenPage';`
- En el bloque «Simple Routing», justo después de `const path = ...`, añade:

```tsx
  if (path === '/tv') return <ScreenPage />;
```

- En el `useEffect` inicial, antes de `if (migration === 'true')`, añade:

```tsx
    // A TV's QR opens /?vincular=CODE: remember the code for the Screens view after logging in
    const pairCode = params.get('vincular');
    if (pairCode) {
      try { sessionStorage.setItem('rg-pair-code', pairCode); } catch { /* typed by hand instead */ }
      window.history.replaceState(null, '', window.location.pathname);
    }
```

- [ ] **Step 3: Tipos**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "ScreenPage|App.tsx"`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add pages/ScreenPage.tsx App.tsx
git commit -m "feat(pantallas): página /tv con código, QR, espera y torneo"
```

---

### Task 6: Vista «Pantallas» del club

**Files:**
- Create: `components/screens/PairScreenModal.tsx`, `components/screens/ScreensView.tsx`
- Modify: `components/AdminLayout.tsx`

- [ ] **Step 1: Diálogo «Añadir pantalla»**

`components/screens/PairScreenModal.tsx`:

```tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Components';
import { pairScreen } from '../../services/screens/clubScreens';

interface Props {
    initialCode?: string;
    club: { clubId: string; clubName?: string; clubLogoUrl?: string };
    onClose: () => void;
}

export const PairScreenModal = ({ initialCode, club, onClose }: Props) => {
    const [code, setCode] = useState(initialCode || '');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await pairScreen(code, { ...club, name });
            onClose();
        } catch (err: any) {
            setError(err.message || 'No se ha podido vincular la pantalla.');
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full h-11 px-3 rounded-md border border-rg-control bg-white text-[15px] focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track';

    return (
        <div className="rg fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0F1729]/40 sm:p-4">
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="pair-title" className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-[0_12px_40px_rgba(15,23,41,0.2)] p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="pair-title" className="text-[18px] font-semibold">Añadir pantalla</h2>
                        <p className="text-[13px] text-rg-muted mt-0.5">En la tele, abre el navegador y entra en <span className="font-medium text-rg-ink">{window.location.host}/tv</span>.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-9 h-9 -mr-2 rounded-md grid place-items-center text-rg-muted hover:bg-rg-raised" aria-label="Cerrar"><X size={18} /></button>
                </div>
                <div>
                    <label htmlFor="pair-code" className="block text-[13px] font-medium mb-1.5">Código que sale en la tele</label>
                    <input id="pair-code" autoFocus={!initialCode} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={7} autoComplete="off" placeholder="AB3 K9Q"
                        className={`${field} text-[22px] font-semibold tracking-[0.2em] text-center font-mono`} />
                </div>
                <div>
                    <label htmlFor="pair-name" className="block text-[13px] font-medium mb-1.5">Nombre de la pantalla</label>
                    <input id="pair-name" autoFocus={!!initialCode} value={name} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo: Bar, Pista central" className={field} />
                </div>
                {error && <p role="alert" className="rounded-md bg-[#ffedea] px-3 py-2 text-[14px] text-rg-negative">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={busy || !code.trim()}>{busy ? 'Vinculando…' : 'Vincular'}</Button>
                </div>
            </form>
        </div>
    );
};
```

(Si `Button` no acepta `type`, comprueba su definición en `components/ui/Components.tsx` y pasa `type` como lo hagan otros formularios del proyecto.)

- [ ] **Step 2: Vista**

`components/screens/ScreensView.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Monitor, Plus, Unlink } from 'lucide-react';
import { Ranking } from '../../types';
import { Screen } from '../../types/screens';
import { Button } from '../ui/Components';
import { renameScreen, setScreenRanking, subscribeToClubScreens, unlinkScreen } from '../../services/screens/clubScreens';
import { screenStatus } from '../../services/screens/screenStatus';
import { PairScreenModal } from './PairScreenModal';

interface Props {
    clubId: string;
    clubName?: string;
    clubLogoUrl?: string;
    rankings: Ranking[];
    initialCode?: string;
}

export const ScreensView = ({ clubId, clubName, clubLogoUrl, rankings, initialCode }: Props) => {
    const [screens, setScreens] = useState<Screen[] | null>(null);
    const [pairing, setPairing] = useState(!!initialCode);
    const [now, setNow] = useState(Date.now());

    useEffect(() => subscribeToClubScreens(clubId, setScreens), [clubId]);
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

    const active = rankings.filter(r => r.status === 'activo' && !r.deletedAt);

    return (
        <div className="rg max-w-3xl mx-auto px-4 py-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold">Pantallas</h1>
                    <p className="text-[14px] text-rg-muted mt-0.5">Las teles del club que enseñan un torneo en directo. En la tele, abre el navegador y entra en <span className="font-medium text-rg-ink">{window.location.host}/tv</span>.</p>
                </div>
                <Button onClick={() => setPairing(true)}><Plus size={16} /> Añadir pantalla</Button>
            </div>

            {screens === null ? (
                <p className="text-[14px] text-rg-muted">Cargando…</p>
            ) : screens.length === 0 ? (
                <div className="rounded-lg border border-dashed border-rg-control px-5 py-8 text-center">
                    <Monitor className="mx-auto text-rg-control" size={28} />
                    <p className="mt-2 text-[15px] font-medium">Todavía no hay pantallas</p>
                    <p className="text-[14px] text-rg-muted">Abre {window.location.host}/tv en la tele y pulsa «Añadir pantalla».</p>
                </div>
            ) : (
                <ul className="bg-white border border-rg-line rounded-lg divide-y divide-rg-rule">
                    {screens.map(s => {
                        const status = screenStatus(s.lastSeenAt, now);
                        return (
                            <li key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <label htmlFor={`screen-${s.id}`} className="sr-only">Nombre de la pantalla</label>
                                    <input id={`screen-${s.id}`} defaultValue={s.name || ''} onBlur={(e) => e.target.value !== (s.name || '') && renameScreen(s.id, e.target.value)}
                                        className="w-full h-9 px-2.5 -ml-2.5 rounded-md border border-transparent hover:border-rg-control focus:border-court focus:ring-2 focus:ring-court-track focus:outline-none text-[15px] font-semibold bg-transparent" />
                                    <p className="text-[13px] text-rg-muted flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.online ? 'bg-rg-positive' : 'bg-rg-control'}`} aria-hidden="true" />
                                        {status.label}
                                    </p>
                                </div>
                                <label htmlFor={`screen-ranking-${s.id}`} className="sr-only">Qué enseña</label>
                                <select id={`screen-ranking-${s.id}`} value={s.rankingId || ''} onChange={(e) => setScreenRanking(s.id, e.target.value || null)}
                                    className="h-10 px-3 rounded-md border border-rg-control bg-white text-[14px] sm:w-64">
                                    <option value="">En espera (logo del club)</option>
                                    {active.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    {s.rankingId && !active.some(r => r.id === s.rankingId) && <option value={s.rankingId}>Torneo terminado o borrado</option>}
                                </select>
                                <button type="button" onClick={() => confirm(`¿Desvincular «${s.name || 'Pantalla'}»? La tele volverá a enseñar un código.`) && unlinkScreen(s.id)}
                                    className="h-10 px-3 rounded-md text-[14px] font-medium text-rg-negative hover:bg-[#ffedea] inline-flex items-center gap-1.5">
                                    <Unlink size={15} /> Desvincular
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {pairing && <PairScreenModal initialCode={initialCode} club={{ clubId, clubName, clubLogoUrl }} onClose={() => setPairing(false)} />}
        </div>
    );
};
```

- [ ] **Step 3: Conectar en `AdminLayout`**

En `components/AdminLayout.tsx`:
- Imports: `import { Monitor } from 'lucide-react';` (añádelo al import existente de lucide), `import { ScreensView } from './screens/ScreensView';`, `import { clubIdOf } from '../services/screens/clubScreens';`
- Añade `'screens'` a la unión de tipos de `view` (línea con `useState<'login' | 'dashboard' | ...>`).
- Estado para el código del QR, junto a los demás `useState`:

```tsx
    const [pendingPairCode] = useState<string | undefined>(() => {
        try { return sessionStorage.getItem('rg-pair-code') || undefined; } catch { return undefined; }
    });
```

- En el sitio donde, tras iniciar sesión, se hace `setView('dashboard')` (alrededor de la línea 190), cámbialo por:

```tsx
                setView(pendingPairCode ? 'screens' : 'dashboard');
```

- En el menú lateral, después del item «Jugadores»:

```tsx
                                    {!isPublicUser && item(view === 'screens', () => handleNavClick('screens'), Monitor, 'Pantallas')}
```

- Junto a los demás `{view === '…' && …}` del contenido:

```tsx
                    {view === 'screens' && effectiveUser && (
                        <ScreensView
                            clubId={clubIdOf(effectiveUser)}
                            clubName={effectiveUser.clubName}
                            clubLogoUrl={effectiveUser.branding?.logoUrl}
                            rankings={rankings}
                            initialCode={pendingPairCode}
                        />
                    )}
```

- Cuando `view === 'screens'` se haya mostrado con el código, bórralo para que no vuelva a abrir el diálogo:

```tsx
    useEffect(() => {
        if (view === 'screens' && pendingPairCode) { try { sessionStorage.removeItem('rg-pair-code'); } catch { /* ignore */ } }
    }, [view, pendingPairCode]);
```

Si `handleNavClick` tipa el nombre de vista con una unión propia, añade `'screens'` ahí también. Si `MobileBottomNav` tiene su lista de destinos, déjala como está (Pantallas es de uso ocasional).

- [ ] **Step 4: Tipos y pruebas**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "components/screens|AdminLayout"; npx vitest run`
Expected: sin errores nuevos; todas PASS.

- [ ] **Step 5: Commit**

```bash
git add components/screens/PairScreenModal.tsx components/screens/ScreensView.tsx components/AdminLayout.tsx
git commit -m "feat(pantallas): vista Pantallas del club con vincular, torneo, nombre y desvincular"
```

---

### Task 7: «Enseñar en una pantalla» desde el torneo

**Files:**
- Create: `components/screens/SendToScreenMenu.tsx`
- Modify: `components/RankingView.tsx` (cabecera, botón «Modo TV» ~línea 312)

- [ ] **Step 1: Menú**

`components/screens/SendToScreenMenu.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Check, Monitor } from 'lucide-react';
import { Screen } from '../../types/screens';
import { setScreenRanking, subscribeToClubScreens } from '../../services/screens/clubScreens';

// Sends this tournament to one of the club's TVs, or takes it off
export const SendToScreenMenu = ({ rankingId, clubId }: { rankingId: string; clubId: string }) => {
    const [open, setOpen] = useState(false);
    const [screens, setScreens] = useState<Screen[]>([]);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => subscribeToClubScreens(clubId, setScreens), [clubId]);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={box} className="relative">
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" title="Enseñar en una pantalla"
                className="w-10 h-10 grid place-items-center rounded-lg border border-rg-line bg-white text-rg-muted hover:text-rg-ink">
                <Monitor size={18} />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 mt-2 w-64 bg-white border border-rg-line rounded-lg shadow-[0_12px_40px_rgba(15,23,41,0.15)] py-1 z-50">
                    <p className="px-3 py-2 text-[12px] font-medium text-rg-muted">Enseñar en una pantalla</p>
                    {screens.length === 0 ? (
                        <p className="px-3 pb-3 text-[13px] text-rg-muted">No hay pantallas. Añádelas en «Pantallas».</p>
                    ) : screens.map(s => {
                        const showing = s.rankingId === rankingId;
                        return (
                            <button key={s.id} type="button" role="menuitemcheckbox" aria-checked={showing}
                                onClick={() => setScreenRanking(s.id, showing ? null : rankingId)}
                                className="w-full px-3 py-2 flex items-center gap-2 text-left text-[14px] hover:bg-rg-raised">
                                <span className="w-4">{showing && <Check size={15} className="text-court" />}</span>
                                <span className="flex-1 truncate">{s.name || 'Pantalla'}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Ponerlo en la cabecera**

En `components/RankingView.tsx`, importa `SendToScreenMenu` y, justo después del botón con `title="Modo TV"` de la cabecera de administración (el que abre `?tv=${ranking.id}`), añade:

```tsx
              {isAdmin && ranking.ownerId && <SendToScreenMenu rankingId={ranking.id} clubId={ranking.ownerId} />}
```

(Mira cómo se llama la variable de administrador en ese componente y úsala; si el botón Modo TV está en un bloque solo de admin, no hace falta repetir la condición.)

- [ ] **Step 3: Tipos**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "SendToScreenMenu|RankingView"`
Expected: solo los dos TS2367 previos de `RankingView`.

- [ ] **Step 4: Commit**

```bash
git add components/screens/SendToScreenMenu.tsx components/RankingView.tsx
git commit -m "feat(pantallas): enseñar un torneo en una pantalla desde su cabecera"
```

---

### Task 8: Google Cast (oculto sin App ID)

**Files:**
- Create: `services/screens/cast.ts`, `pages/CastReceiverPage.tsx`, `components/screens/CastButton.tsx`
- Modify: `App.tsx`, `components/RankingView.tsx`

- [ ] **Step 1: Constantes y carga de scripts**

`services/screens/cast.ts`:

```ts
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
```

- [ ] **Step 2: Receptor**

`pages/CastReceiverPage.tsx`:

```tsx
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
```

- [ ] **Step 3: Botón emisor**

`components/screens/CastButton.tsx`:

```tsx
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
```

Nota: `send()` en el efecto solo debe ejecutarse si ya hay sesión; `getCurrentSession()` devuelve `null` si no la hay, así que es seguro.

- [ ] **Step 4: Rutas y cabecera**

- `App.tsx`: importa `CastReceiverPage` y, junto a `if (path === '/tv') …`, añade:

```tsx
  if (new URLSearchParams(window.location.search).get('cast') === '1') return <CastReceiverPage />;
```

- `components/RankingView.tsx`: importa `CastButton` y añádelo justo después de `<SendToScreenMenu …/>`:

```tsx
              {isAdmin && <CastButton rankingId={ranking.id} />}
```

- [ ] **Step 5: Comprobar que sin App ID no cambia nada**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "Cast|App.tsx|RankingView"; npx vitest run`
Expected: solo los errores previos de `RankingView`; pruebas PASS. Sin `VITE_CAST_APP_ID` no se carga ningún script de Cast (verificable en la Task 9 con las peticiones de red).

- [ ] **Step 6: Commit**

```bash
git add services/screens/cast.ts pages/CastReceiverPage.tsx components/screens/CastButton.tsx App.tsx components/RankingView.tsx
git commit -m "feat(cast): receptor y botón de Google Cast, ocultos hasta tener VITE_CAST_APP_ID"
```

---

### Task 9: Comprobación con los emuladores

- [ ] **Step 1:** Emuladores arrancados y sembrados; `node scripts/checkScreenRules.mjs` en verde.
- [ ] **Step 2:** `preview_start` con `app-emulator`. Pestaña A: `http://localhost:3000/tv` → se ve un código y un QR.
- [ ] **Step 3:** Pestaña B: iniciar sesión con el admin de prueba, ir a **Pantallas**, «Añadir pantalla» con el código de A y nombre «Bar». A pasa a «En espera» con el nombre del club.
- [ ] **Step 4:** En B elegir un torneo para «Bar»: A enseña el modo TV de ese torneo sin recargar. Cambiarlo desde la cabecera del torneo con «Enseñar en una pantalla»: A cambia.
- [ ] **Step 5:** Recargar A: vuelve directamente al torneo.
- [ ] **Step 6:** En B desvincular: A vuelve a enseñar un código nuevo.
- [ ] **Step 7:** Abrir `http://localhost:3000/tv` en la misma pestaña B (con sesión de admin), volver a `http://localhost:3000/`: la sesión del admin sigue abierta.
- [ ] **Step 8:** `http://localhost:3000/?vincular=<código>` en B: tras entrar, se abre Pantallas con el diálogo y el código puesto.
- [ ] **Step 9:** Red: en la cabecera de un torneo no hay ninguna petición a `gstatic.com/cv/js/sender` (no hay App ID). `http://localhost:3000/?cast=1` muestra «Esperando torneo…».
- [ ] **Step 10:** `npx vitest run` completo en verde; captura de la tele vinculada y de la vista Pantallas.
