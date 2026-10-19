// Seeds the local Firebase emulators (npm run emulators) with a test admin and players.
// Only talks to 127.0.0.1: never use it against production.
//
//   npm run emulators        (terminal 1)
//   npm run seed:emulator    (terminal 2, once per emulator start)
//   npm run dev:emulator     (terminal 2) → log in with the credentials below

const PROJECT = 'demo-padelrank';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

// Emulator-only test credentials
export const TEST_EMAIL = 'admin@padelrank.test';
export const TEST_PASSWORD = 'emulator-only-123';

const toValue = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
};

const setDoc = async (path, data) => {
    const res = await fetch(`${FIRESTORE}/${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields: toValue(data).mapValue.fields }),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
};

const authCall = async (method, body) => {
    const res = await fetch(`${AUTH}/accounts:${method}?key=demo-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, returnSecureToken: true }),
    });
    return res.json();
};

const signUpOrIn = async () => {
    const created = await authCall('signUp', { email: TEST_EMAIL, password: TEST_PASSWORD });
    if (created.localId) return created.localId;
    const signedIn = await authCall('signInWithPassword', { email: TEST_EMAIL, password: TEST_PASSWORD });
    if (!signedIn.localId) throw new Error(`Auth emulator: ${JSON.stringify(created.error ?? signedIn.error)}`);
    return signedIn.localId;
};

const NAMES = ['Ana', 'Bea', 'Carla', 'Diana', 'Elena', 'Fátima', 'Gema', 'Helena', 'Irene', 'Julia', 'Laura', 'Marta',
    'Nuria', 'Olga', 'Paula', 'Rosa', 'Álex', 'Bruno', 'Carlos', 'David', 'Eduardo', 'Fernando', 'Gonzalo', 'Hugo',
    'Iván', 'Javier', 'Luis', 'Mario', 'Nicolás', 'Óscar', 'Pablo', 'Raúl'];
const SURNAMES = ['García', 'López', 'Martín', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Díaz'];

const main = async () => {
    const uid = await signUpOrIn();
    await setDoc(`users/${uid}`, {
        id: uid, email: TEST_EMAIL, name: 'Admin Pruebas', clubName: 'Club Emulador',
        role: 'admin', status: 'active', plan: 'star', subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
    });
    for (let i = 0; i < NAMES.length; i++) {
        const id = `test-player-${String(i + 1).padStart(2, '0')}`;
        await setDoc(`players/${id}`, {
            id, nombre: NAMES[i], apellidos: SURNAMES[i % SURNAMES.length], email: `${id}@padelrank.test`, telefono: '',
            stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }, ownerId: uid,
        });
    }
    // An elimination tournament with its days configured and public registration open
    // (public link: /?inscripcion=test-registration-tournament)
    await setDoc('rankings/test-registration-tournament', {
        id: 'test-registration-tournament', nombre: 'Torneo Inscripciones', categoria: 'Mixto',
        fechaInicio: '2026-10-23', status: 'activo', format: 'elimination', ownerId: uid,
        divisions: [],
        schedulerConfig: {
            courts: 3, slotDurationMinutes: 90, restMinutes: 60, mode: 'full', timeWindows: [],
            dailySchedule: [
                { date: '2026-10-23', startTime: '17:00', endTime: '22:00' },
                { date: '2026-10-24', startTime: '09:00', endTime: '22:00' },
                { date: '2026-10-25', startTime: '09:00', endTime: '14:00' },
            ],
        },
        registrationConfig: { isOpen: true, categories: ['Primera', 'Segunda'] },
    });
    console.log(`Seeded admin ${TEST_EMAIL} (uid ${uid}), ${NAMES.length} players and the tournament test-registration-tournament.`);
};

main().catch(err => {
    console.error(err.message);
    console.error('Are the emulators running? (npm run emulators)');
    process.exit(1);
});
