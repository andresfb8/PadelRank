
const admin = require('firebase-admin');
const fs = require('fs');

if (!fs.existsSync('./padelrank-pro-app-2025-firebase-adminsdk-fbsvc-cc9aa0f7b1.json')) {
    console.error("Error: Service account file not found.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync('./padelrank-pro-app-2025-firebase-adminsdk-fbsvc-cc9aa0f7b1.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const setSuperAdmin = async (email) => {
    try {
        console.log(`Searching for user with email: ${email}...`);

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            console.log("User not found in 'users' collection. Creating one...");
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                await db.collection('users').doc(userRecord.uid).set({
                    email: email,
                    role: 'superadmin',
                    name: userRecord.displayName || 'Super Admin',
                    status: 'active',
                    createdAt: new Date()
                });
                console.log(`✅ User ${email} created as SUPERADMIN.`);
            } catch (e) {
                console.error("User not found in Auth either. Please register first.", e);
            }
        } else {
            snapshot.forEach(async (doc) => {
                await doc.ref.update({ role: 'superadmin' });
                console.log(`✅ User ${email} (ID: ${doc.id}) updated to SUPERADMIN.`);
            });
        }

    } catch (error) {
        console.error("Error:", error);
    }
};

setSuperAdmin('andresfb8@gmail.com');
