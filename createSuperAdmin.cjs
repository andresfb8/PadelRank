const admin = require('firebase-admin');

// Use GOOGLE_APPLICATION_CREDENTIALS environment variable or default credentials
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const email = 'andresfb8@gmail.com';
const password = 'PadelRanPro2025@';

async function main() {
    console.log(`Starting strict provisioning for ${email}...`);

    // 1. Delete from Auth if exists
    try {
        const user = await auth.getUserByEmail(email);
        console.log(`Found existing Auth user (UID: ${user.uid}). Deleting...`);
        await auth.deleteUser(user.uid);
        console.log('✅ Deleted existing Auth user.');
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            console.log('Auth user does not exist (Clean state).');
        } else {
            console.error('Error checking Auth:', e);
        }
    }

    // 2. Delete from Firestore if exists (Search by email to catch ANY lingering profile)
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (!snapshot.empty) {
        console.log(`Found ${snapshot.size} existing Firestore documents for this email. Deleting...`);
        const batch = db.batch();
        snapshot.forEach(doc => {
            console.log(`Deleting doc ID: ${doc.id} (Role: ${doc.data().role})`);
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('✅ Deleted existing Firestore documents.');
    } else {
        console.log('No existing Firestore documents found.');
    }

    // 3. Create Auth User
    console.log('Creating new Auth user...');
    const newUser = await auth.createUser({
        email,
        password,
        displayName: 'Super Admin',
        emailVerified: true
    });
    console.log(`✅ Created new Auth user: ${newUser.uid}`);

    // 4. Create Firestore Document
    console.log('Creating Firestore profile...');
    await db.collection('users').doc(newUser.uid).set({
        email: email,
        name: 'Super Admin',
        role: 'superadmin',
        status: 'active',
        clubName: 'System',
        createdAt: new Date()
    });
    console.log('✅ Created Firestore profile with role: SUPERADMIN');
    console.log('------------------------------------------------');
    console.log('SUCCESS: Account fully provisioned.');
}

main().catch((error) => {
    console.error("FATAL ERROR:", error);
    process.exit(1);
});
