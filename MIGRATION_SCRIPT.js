/**
 * MIGRATION PREVIEW SCRIPT - BROWSER CONSOLE VERSION
 * 
 * INSTRUCCIONES:
 * 1. Abre http://localhost:3000 en tu navegador
 * 2. Inicia sesión como SuperAdmin
 * 3. Abre la consola del navegador (F12)
 * 4. Copia y pega TODO este código en la consola
 * 5. Presiona Enter
 */

(async function () {
    console.clear();
    console.log('🚀 MIGRATION PREVIEW TOOL');
    console.log('========================\n');

    try {
        // Acceder a Firebase desde window (ya está cargado en tu app)
        const { getFirestore, collection, getDocs, doc, writeBatch } = window.firebase || {};

        if (!getFirestore) {
            throw new Error('Firebase no está disponible. Asegúrate de estar en la aplicación.');
        }

        const db = getFirestore();

        console.log('📊 Escaneando torneos en Firestore...\n');

        const rankingsRef = collection(db, 'rankings');
        const snapshot = await getDocs(rankingsRef);

        console.log(`✅ Total de torneos encontrados: ${snapshot.size}\n`);

        let needsMigration = 0;
        let alreadyMigrated = 0;
        const byFormat = {};
        const examples = [];

        snapshot.docs.forEach(docSnap => {
            const ranking = docSnap.data();
            const format = ranking.format || 'classic';

            // Verificar si ya tiene la nueva estructura
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
                alreadyMigrated++;
            } else {
                needsMigration++;
                byFormat[format] = (byFormat[format] || 0) + 1;

                // Guardar primeros 3 ejemplos
                if (examples.length < 3) {
                    examples.push({
                        id: docSnap.id,
                        nombre: ranking.nombre,
                        format,
                        config: ranking.config
                    });
                }
            }
        });

        // Mostrar resumen
        console.log('📈 RESUMEN DE MIGRACIÓN');
        console.log('======================\n');
        console.log(`✅ Ya migrados: ${alreadyMigrated}`);
        console.log(`⚠️  Necesitan migración: ${needsMigration}\n`);

        if (Object.keys(byFormat).length > 0) {
            console.log('📊 Torneos por formato que necesitan migración:');
            Object.entries(byFormat).forEach(([format, count]) => {
                console.log(`   ${format}: ${count}`);
            });
            console.log('');
        }

        // Mostrar ejemplos
        if (examples.length > 0) {
            console.log('📝 EJEMPLOS DE MIGRACIÓN (primeros 3):');
            console.log('=====================================\n');

            examples.forEach((example, index) => {
                console.log(`${index + 1}. ${example.nombre} (${example.format})`);
                console.log(`   ID: ${example.id}`);
                console.log('   Config actual:');
                console.table(example.config);
                console.log('');
            });
        }

        // Mostrar cómo se vería la migración
        if (examples.length > 0) {
            console.log('📋 EJEMPLO DE CÓMO SE VERÍA DESPUÉS DE LA MIGRACIÓN:');
            console.log('===================================================\n');

            const firstExample = examples[0];
            console.log(`Torneo: ${firstExample.nombre} (${firstExample.format})`);
            console.log('\nANTES:');
            console.table(firstExample.config);

            console.log('\nDESPUÉS:');
            const migratedExample = getMigratedConfig(firstExample.config, firstExample.format);
            console.table(migratedExample);
            console.log('');
        }

        // Mostrar siguiente paso
        if (needsMigration > 0) {
            console.log('⚠️  SIGUIENTE PASO:');
            console.log('==================\n');
            console.log('Si todo se ve correcto, copia y pega el siguiente comando:');
            console.log('%c runLiveMigration() ', 'background: #f00; color: #fff; font-size: 16px; padding: 5px;');
            console.log('\n⚠️  ADVERTENCIA: Esto modificará la base de datos!');
            console.log('   Asegúrate de tener un backup antes de continuar.\n');

            // Guardar función para migración
            window.runLiveMigration = createMigrationFunction(db, snapshot.docs);
        } else {
            console.log('✅ Todos los torneos ya están migrados!');
        }

        return {
            total: snapshot.size,
            needsMigration,
            alreadyMigrated,
            byFormat
        };

    } catch (error) {
        console.error('❌ Error durante el preview:', error);
        console.error('\n💡 Posibles soluciones:');
        console.error('   1. Asegúrate de estar en http://localhost:3000');
        console.error('   2. Verifica que hayas iniciado sesión');
        console.error('   3. Recarga la página e intenta de nuevo');
        throw error;
    }
})();

// Función auxiliar para mostrar cómo se vería la migración
function getMigratedConfig(config, format) {
    const defaults = {
        classic: {
            pointsPerWin2_0: 4,
            pointsPerWin2_1: 3,
            pointsDraw: 2,
            pointsPerLoss2_1: 1,
            pointsPerLoss2_0: 0,
            maxPlayersPerDivision: 4,
            promotionCount: 2,
            relegationCount: 2
        },
        individual: {
            pointsPerWin2_0: 4,
            pointsPerWin2_1: 3,
            pointsDraw: 2,
            pointsPerLoss2_1: 1,
            pointsPerLoss2_0: 0
        },
        pairs: {
            pointsPerWin2_0: 4,
            pointsPerWin2_1: 3,
            pointsDraw: 2,
            pointsPerLoss2_1: 1,
            pointsPerLoss2_0: 0
        },
        americano: {
            scoringMode: '32'
        },
        mexicano: {
            scoringMode: '32'
        }
    };

    const formatDefaults = defaults[format] || {};
    const migratedConfig = { ...config };

    // Crear la configuración específica del formato
    if (format === 'classic') {
        migratedConfig.classicConfig = {
            pointsPerWin2_0: config.pointsPerWin2_0 ?? formatDefaults.pointsPerWin2_0,
            pointsPerWin2_1: config.pointsPerWin2_1 ?? formatDefaults.pointsPerWin2_1,
            pointsDraw: config.pointsDraw ?? formatDefaults.pointsDraw,
            pointsPerLoss2_1: config.pointsPerLoss2_1 ?? formatDefaults.pointsPerLoss2_1,
            pointsPerLoss2_0: config.pointsPerLoss2_0 ?? formatDefaults.pointsPerLoss2_0,
            maxPlayersPerDivision: config.maxPlayersPerDivision ?? formatDefaults.maxPlayersPerDivision,
            promotionCount: config.promotionCount ?? formatDefaults.promotionCount,
            relegationCount: config.relegationCount ?? formatDefaults.relegationCount
        };
    } else if (format === 'americano') {
        migratedConfig.americanoConfig = {
            scoringMode: config.scoringMode ?? formatDefaults.scoringMode,
            totalPoints: config.customPoints
        };
    } else if (format === 'mexicano') {
        migratedConfig.mexicanoConfig = {
            scoringMode: config.scoringMode ?? formatDefaults.scoringMode,
            totalPoints: config.customPoints
        };
    }

    return migratedConfig;
}

// Función para crear la migración en vivo
function createMigrationFunction(db, docs) {
    return async function runLiveMigration() {
        const confirmed = confirm(
            '⚠️ ADVERTENCIA ⚠️\n\n' +
            'Esto modificará TODOS los torneos en la base de datos.\n\n' +
            '¿Tienes un backup de Firestore?\n\n' +
            'Haz clic en OK solo si estás seguro.'
        );

        if (!confirmed) {
            console.log('❌ Migración cancelada por el usuario');
            return;
        }

        console.clear();
        console.log('🚀 MIGRACIÓN EN VIVO');
        console.log('===================\n');

        try {
            const { doc, writeBatch } = window.firebase;
            const batch = writeBatch(db);
            let batchCount = 0;
            let migratedCount = 0;
            let skippedCount = 0;

            for (const docSnap of docs) {
                const ranking = docSnap.data();
                const format = ranking.format || 'classic';

                // Verificar si ya está migrado
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
                    console.log(`⏭️  Saltando ${docSnap.id} (${format}) - ya migrado`);
                    skippedCount++;
                    continue;
                }

                // Migrar
                const migratedConfig = getMigratedConfig(ranking.config, format);
                const rankingRef = doc(db, 'rankings', docSnap.id);
                batch.update(rankingRef, { config: migratedConfig });
                batchCount++;
                migratedCount++;

                console.log(`✅ Migrando ${docSnap.id} (${format})`);

                // Commit cada 500 (límite de Firestore)
                if (batchCount >= 500) {
                    await batch.commit();
                    console.log(`💾 Batch de ${batchCount} actualizaciones guardado`);
                    batchCount = 0;
                }
            }

            // Commit final
            if (batchCount > 0) {
                await batch.commit();
                console.log(`💾 Batch final de ${batchCount} actualizaciones guardado`);
            }

            console.log('\n✅ MIGRACIÓN COMPLETADA!');
            console.log('======================\n');
            console.log(`   Migrados: ${migratedCount}`);
            console.log(`   Saltados: ${skippedCount}`);
            console.log(`   Total: ${docs.length}\n`);

            return { migratedCount, skippedCount, total: docs.length };

        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            throw error;
        }
    };
}
