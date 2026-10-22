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
