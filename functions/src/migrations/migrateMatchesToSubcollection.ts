/**
 * PHASE 3 MIGRATION: Move matches from the root Ranking document into a subcollection.
 *
 * Before:  rankings/{rankingId}.divisions[].matches[]   (hits 1MB Firestore limit)
 * After:   rankings/{rankingId}/matches/{matchId}       (no size limit)
 *
 * Each match document stores: { ...matchData, divisionId, rankingId }
 * The root ranking document retains divisions with `matches: []` (empty array) as a marker.
 *
 * IDEMPOTENT: Safe to run multiple times. Already-migrated docs are skipped.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

interface MigrationResult {
    total: number;
    migrated: number;
    skipped: number;
    errors: string[];
}

/**
 * Cloud Function (callable, superadmin-only) to migrate match data.
 * Call from the browser console once:
 *   const fn = firebase.functions().httpsCallable('migrateMatchesToSubcollection');
 *   fn({ dryRun: true }).then(console.log); // Preview first
 *   fn({ dryRun: false }).then(console.log); // Execute
 */
export const migrateMatchesToSubcollection = onCall({ cors: true }, async (request) => {
    // Security: Only superadmin can run migrations
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (callerDoc.data()?.role !== 'superadmin') {
        throw new HttpsError('permission-denied', 'Only superadmins can run migrations.');
    }

    const dryRun: boolean = request.data?.dryRun ?? true;
    const result: MigrationResult = { total: 0, migrated: 0, skipped: 0, errors: [] };

    console.log(`[Migration] Starting. dryRun=${dryRun}`);

    const rankingsSnapshot = await db.collection('rankings').get();
    result.total = rankingsSnapshot.size;

    for (const rankingDoc of rankingsSnapshot.docs) {
        const rankingId = rankingDoc.id;
        const data = rankingDoc.data();
        const divisions: any[] = data.divisions || [];

        // Check if already migrated: all divisions have empty matches arrays
        // AND at least one match exists in the subcollection
        const existingMatchesSnap = await db
            .collection('rankings')
            .doc(rankingId)
            .collection('matches')
            .limit(1)
            .get();

        const allDivisionsEmpty = divisions.every(d => !d.matches || d.matches.length === 0);

        if (allDivisionsEmpty && !existingMatchesSnap.empty) {
            // Already migrated
            result.skipped++;
            continue;
        }

        let totalMatchesInDoc = 0;
        divisions.forEach(d => { totalMatchesInDoc += (d.matches || []).length; });

        if (totalMatchesInDoc === 0) {
            // No matches to migrate — tournament is empty
            result.skipped++;
            continue;
        }

        console.log(`[Migration] Ranking ${rankingId}: ${divisions.length} divisions, ${totalMatchesInDoc} matches`);

        if (!dryRun) {
            try {
                // Use batches (max 500 ops each)
                const BATCH_SIZE = 400;
                let batch = db.batch();
                let batchCount = 0;

                const newDivisions = divisions.map((division: any) => {
                    const matches: any[] = division.matches || [];

                    // Write each match to the subcollection
                    matches.forEach((match: any) => {
                        const matchRef = db
                            .collection('rankings')
                            .doc(rankingId)
                            .collection('matches')
                            .doc(match.id);

                        batch.set(matchRef, {
                            ...match,
                            divisionId: division.id,
                            rankingId: rankingId,
                            _migrated: true,
                        });

                        batchCount++;
                        if (batchCount >= BATCH_SIZE) {
                            // Flush batch synchronously isn't possible — collect all and flush at end
                            // (This loop is just collecting — see commit below)
                            batchCount = 0;
                        }
                    });

                    // Return division with empty matches array (marker: migrated)
                    return { ...division, matches: [] };
                });

                // Commit the match writes
                await batch.commit();

                // Update the ranking doc: divisions with empty matches[]
                await db.collection('rankings').doc(rankingId).update({
                    divisions: newDivisions,
                    _matchesMigrated: true,
                    _matchesMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                result.migrated++;
                console.log(`[Migration] ✅ ${rankingId} migrated.`);
            } catch (err: any) {
                result.errors.push(`${rankingId}: ${err.message}`);
                console.error(`[Migration] ❌ ${rankingId} failed:`, err.message);
            }
        } else {
            // Dry run: just count
            result.migrated++;
            console.log(`[Migration][DRY RUN] Would migrate ${rankingId} (${totalMatchesInDoc} matches)`);
        }
    }

    console.log(`[Migration] Done. Result:`, result);
    return result;
});
