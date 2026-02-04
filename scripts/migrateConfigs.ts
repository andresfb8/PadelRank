/**
 * Firebase Configuration Migration Script
 * Migrates existing rankings from flat config structure to namespaced format-specific configs
 * 
 * Usage:
 * 1. Run this script once to migrate all existing rankings
 * 2. The script is idempotent - safe to run multiple times
 * 3. Original data is preserved in legacy fields for backward compatibility
 */

import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { migrateRankingConfig } from '../utils/configMigration';
import { Ranking, RankingFormat } from '../types';

interface MigrationStats {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    byFormat: Record<RankingFormat, number>;
}

async function migrateAllRankings(dryRun: boolean = true): Promise<MigrationStats> {
    const stats: MigrationStats = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: 0,
        byFormat: {
            classic: 0,
            individual: 0,
            pairs: 0,
            americano: 0,
            mexicano: 0,
            pozo: 0,
            hybrid: 0,
            elimination: 0
        }
    };

    console.log(`🚀 Starting migration (${dryRun ? 'DRY RUN' : 'LIVE MODE'})...`);

    try {
        // Get all rankings
        const rankingsRef = collection(db, 'rankings');
        const snapshot = await getDocs(rankingsRef);

        stats.total = snapshot.size;
        console.log(`📊 Found ${stats.total} rankings to process`);

        const batch = writeBatch(db);
        let batchCount = 0;
        const BATCH_SIZE = 500; // Firestore batch limit

        for (const docSnapshot of snapshot.docs) {
            const ranking = docSnapshot.data() as Ranking;
            const format = ranking.format || 'classic'; // Default to classic for old rankings

            try {
                // Check if already migrated
                const hasNewStructure =
                    ranking.config?.classicConfig ||
                    ranking.config?.individualConfig ||
                    ranking.config?.pairsConfig ||
                    ranking.config?.americanoConfig ||
                    ranking.config?.mexicanoConfig ||
                    ranking.config?.pozoConfig ||
                    ranking.config?.hybridConfig ||
                    ranking.config?.eliminationConfig;

                if (hasNewStructure) {
                    console.log(`⏭️  Skipping ${docSnapshot.id} (${format}) - already migrated`);
                    stats.skipped++;
                    continue;
                }

                // Migrate config
                const migratedConfig = migrateRankingConfig(ranking.config, format);

                console.log(`✅ Migrating ${docSnapshot.id} (${format})`);
                console.log(`   Old config:`, JSON.stringify(ranking.config, null, 2));
                console.log(`   New config:`, JSON.stringify(migratedConfig, null, 2));

                if (!dryRun) {
                    const rankingRef = doc(db, 'rankings', docSnapshot.id);
                    batch.update(rankingRef, { config: migratedConfig });
                    batchCount++;

                    // Commit batch if we hit the limit
                    if (batchCount >= BATCH_SIZE) {
                        await batch.commit();
                        console.log(`💾 Committed batch of ${batchCount} updates`);
                        batchCount = 0;
                    }
                }

                stats.migrated++;
                stats.byFormat[format]++;

            } catch (error) {
                console.error(`❌ Error migrating ${docSnapshot.id}:`, error);
                stats.errors++;
            }
        }

        // Commit remaining batch
        if (!dryRun && batchCount > 0) {
            await batch.commit();
            console.log(`💾 Committed final batch of ${batchCount} updates`);
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   Total rankings: ${stats.total}`);
        console.log(`   Migrated: ${stats.migrated}`);
        console.log(`   Skipped: ${stats.skipped}`);
        console.log(`   Errors: ${stats.errors}`);
        console.log('\n📊 By Format:');
        Object.entries(stats.byFormat).forEach(([format, count]) => {
            if (count > 0) {
                console.log(`   ${format}: ${count}`);
            }
        });

    } catch (error) {
        console.error('💥 Fatal error during migration:', error);
        throw error;
    }

    return stats;
}

/**
 * Migrate a single ranking by ID
 */
async function migrateSingleRanking(rankingId: string, dryRun: boolean = true): Promise<void> {
    console.log(`🚀 Migrating single ranking: ${rankingId} (${dryRun ? 'DRY RUN' : 'LIVE MODE'})`);

    try {
        const rankingRef = doc(db, 'rankings', rankingId);
        const docSnapshot = await getDocs(collection(db, 'rankings'));
        const rankingDoc = docSnapshot.docs.find(d => d.id === rankingId);

        if (!rankingDoc) {
            console.error(`❌ Ranking ${rankingId} not found`);
            return;
        }

        const ranking = rankingDoc.data() as Ranking;
        const format = ranking.format || 'classic';

        const migratedConfig = migrateRankingConfig(ranking.config, format);

        console.log(`✅ Migrated config for ${rankingId} (${format})`);
        console.log(`   Old:`, JSON.stringify(ranking.config, null, 2));
        console.log(`   New:`, JSON.stringify(migratedConfig, null, 2));

        if (!dryRun) {
            await updateDoc(rankingRef, { config: migratedConfig });
            console.log(`💾 Saved to Firestore`);
        }

    } catch (error) {
        console.error(`❌ Error:`, error);
        throw error;
    }
}

/**
 * Rollback migration (restore legacy fields as primary)
 * Use this if something goes wrong
 */
async function rollbackMigration(rankingId?: string): Promise<void> {
    console.log(`🔄 Rolling back migration${rankingId ? ` for ${rankingId}` : ' for all rankings'}...`);

    // This would restore the legacy flat structure
    // Implementation depends on whether you kept backups
    console.warn('⚠️  Rollback not implemented - ensure you have database backups!');
}

// CLI Interface
// Force execution for now to ensure it runs
const isMainModule = true;

console.log('DEBUG: Script execution started');

if (isMainModule) {
    const args = process.argv.slice(2);
    const command = args[0];
    const dryRun = !args.includes('--live');

    if (dryRun) {
        console.log('⚠️  Running in DRY RUN mode. Use --live to apply changes.');
    }

    switch (command) {
        case 'all':
            migrateAllRankings(dryRun)
                .then(() => console.log('✅ Migration complete'))
                .catch(err => console.error('💥 Migration failed:', err));
            break;

        case 'single':
            const rankingId = args[1];
            if (!rankingId) {
                console.error('❌ Usage: npm run migrate single <rankingId> [--live]');
                process.exit(1);
            }
            migrateSingleRanking(rankingId, dryRun)
                .then(() => console.log('✅ Migration complete'))
                .catch(err => console.error('💥 Migration failed:', err));
            break;

        case 'rollback':
            const rollbackId = args[1];
            rollbackMigration(rollbackId)
                .then(() => console.log('✅ Rollback complete'))
                .catch(err => console.error('💥 Rollback failed:', err));
            break;

        default:
            console.log('Usage:');
            console.log('  npm run migrate all [--live]       - Migrate all rankings');
            console.log('  npm run migrate single <id> [--live] - Migrate single ranking');
            console.log('  npm run migrate rollback [<id>]    - Rollback migration');
            process.exit(1);
    }
}

export { migrateAllRankings, migrateSingleRanking, rollbackMigration };
