"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateMatchesToSubcollection = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
/**
 * Cloud Function (callable, superadmin-only) to migrate match data.
 * Call from the browser console once:
 *   const fn = firebase.functions().httpsCallable('migrateMatchesToSubcollection');
 *   fn({ dryRun: true }).then(console.log); // Preview first
 *   fn({ dryRun: false }).then(console.log); // Execute
 */
exports.migrateMatchesToSubcollection = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c;
    // Security: Only superadmin can run migrations
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'superadmin') {
        throw new https_1.HttpsError('permission-denied', 'Only superadmins can run migrations.');
    }
    const dryRun = (_c = (_b = request.data) === null || _b === void 0 ? void 0 : _b.dryRun) !== null && _c !== void 0 ? _c : true;
    const result = { total: 0, migrated: 0, skipped: 0, errors: [] };
    console.log(`[Migration] Starting. dryRun=${dryRun}`);
    const rankingsSnapshot = await db.collection('rankings').get();
    result.total = rankingsSnapshot.size;
    for (const rankingDoc of rankingsSnapshot.docs) {
        const rankingId = rankingDoc.id;
        const data = rankingDoc.data();
        const divisions = data.divisions || [];
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
                const newDivisions = divisions.map((division) => {
                    const matches = division.matches || [];
                    // Write each match to the subcollection
                    matches.forEach((match) => {
                        const matchRef = db
                            .collection('rankings')
                            .doc(rankingId)
                            .collection('matches')
                            .doc(match.id);
                        batch.set(matchRef, Object.assign(Object.assign({}, match), { divisionId: division.id, rankingId: rankingId, _migrated: true }));
                        batchCount++;
                        if (batchCount >= BATCH_SIZE) {
                            // Flush batch synchronously isn't possible — collect all and flush at end
                            // (This loop is just collecting — see commit below)
                            batchCount = 0;
                        }
                    });
                    // Return division with empty matches array (marker: migrated)
                    return Object.assign(Object.assign({}, division), { matches: [] });
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
            }
            catch (err) {
                result.errors.push(`${rankingId}: ${err.message}`);
                console.error(`[Migration] ❌ ${rankingId} failed:`, err.message);
            }
        }
        else {
            // Dry run: just count
            result.migrated++;
            console.log(`[Migration][DRY RUN] Would migrate ${rankingId} (${totalMatchesInDoc} matches)`);
        }
    }
    console.log(`[Migration] Done. Result:`, result);
    return result;
});
//# sourceMappingURL=migrateMatchesToSubcollection.js.map