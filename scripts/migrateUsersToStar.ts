import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin configuration
const serviceAccountPath = path.resolve(__dirname, '../functions/service-account-key.json');

// Check if service account exists
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Service account key not found at:", serviceAccountPath);
    console.error("Please ensure you have a service-account-key.json in the project root.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrateUsers() {
    console.log("🚀 Starting migration of users to Star Plan (Legacy)...");

    try {
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            console.log("⚠️ No users found in database.");
            return;
        }

        console.log(`Found ${usersSnapshot.size} user(s). Processing...`);

        const batchSize = 500;
        let batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        usersSnapshot.docs.forEach((doc) => {
            const userData = doc.data();

            // Only migrate if not already on a specific plan or if specifically targeted
            // Strategy: Update EVERYONE who doesn't have a plan or is standard user, 
            // ensuring they get the Star benefits.

            // Define update payload
            const updates: any = {
                plan: 'star',
                subscriptionStatus: 'active',
                isLegacyFree: true,
                // Optional: set a default start date or similar if needed for records
                updatedAt: new Date().toISOString()
            };

            currentBatch.update(doc.ref, updates);
            operationCount++;

            if (operationCount >= batchSize) {
                batches.push(currentBatch.commit());
                currentBatch = db.batch();
                operationCount = 0;
            }
        });

        if (operationCount > 0) {
            batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
        console.log(`✅ Successfully migrated ${usersSnapshot.size} users to Star Plan.`);

    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateUsers().then(() => {
    console.log("🏁 Migration script finished.");
    process.exit(0);
});
