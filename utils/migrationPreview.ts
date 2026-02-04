/**
 * Migration Preview Utility
 * Scans Firestore for rankings that need config migration
 */
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { migrateRankingConfig } from './configMigration';
import { Ranking } from '../types';

export interface MigrationPreviewResult {
    id: string;
    name: string;
    format: string;
    needsMigration: boolean;
    oldConfig?: any;
    newConfig?: any;
}

export async function previewMigration(): Promise<MigrationPreviewResult[]> {
    const results: MigrationPreviewResult[] = [];
    const rankingsRef = collection(db, 'rankings');
    const snapshot = await getDocs(rankingsRef);

    for (const docSnapshot of snapshot.docs) {
        const ranking = docSnapshot.data() as Ranking;
        const format = ranking.format || 'classic';

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
            results.push({
                id: docSnapshot.id,
                name: ranking.nombre || 'Unnamed Ranking',
                format,
                needsMigration: false
            });
            continue;
        }

        // Generate migration preview
        const migratedConfig = migrateRankingConfig(ranking.config, format);

        results.push({
            id: docSnapshot.id,
            name: ranking.nombre || 'Unnamed Ranking',
            format,
            needsMigration: true,
            oldConfig: ranking.config,
            newConfig: migratedConfig
        });
    }

    return results;
}
