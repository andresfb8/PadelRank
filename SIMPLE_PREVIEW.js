/**
 * MIGRATION PREVIEW - VERSIÓN FINAL
 * 
 * INSTRUCCIONES:
 * 1. Abre http://localhost:3000
 * 2. Inicia sesión como SuperAdmin
 * 3. Abre la consola (F12)
 * 4. Copia y pega TODO este código
 * 5. Presiona Enter
 */

(async function migrationPreview() {
    console.clear();
    console.log('%c🚀 MIGRATION PREVIEW ', 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');
    console.log('');

    try {
        // Obtener Firestore desde el contexto global de React
        // Tu app ya tiene Firebase inicializado, solo necesitamos acceder a él

        // Método 1: Buscar en el DOM
        const appRoot = document.querySelector('#root');
        if (!appRoot) {
            throw new Error('No se encontró el root de la aplicación');
        }

        // Importar directamente desde el módulo de Vite
        const firebaseModule = await import('firebase/firestore');
        const { getFirestore, collection, getDocs } = firebaseModule;

        // Obtener la instancia de Firestore
        const { initializeApp, getApps } = await import('firebase/app');

        let db;
        const apps = getApps();
        if (apps.length > 0) {
            db = getFirestore(apps[0]);
        } else {
            throw new Error('Firebase no está inicializado');
        }

        console.log('✅ Conectado a Firestore\n');
        console.log('� Escaneando torneos...\n');

        // Obtener todos los rankings
        const rankingsRef = collection(db, 'rankings');
        const snapshot = await getDocs(rankingsRef);

        console.log(`� Total de torneos encontrados: ${snapshot.size}\n`);

        // Analizar cada torneo
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
                        nombre: ranking.nombre || 'Sin nombre',
                        format,
                        config: ranking.config || {}
                    });
                }
            }
        });

        // Mostrar resumen
        console.log('%c📊 RESUMEN ', 'background: #2196F3; color: white; font-size: 16px; padding: 5px;');
        console.log('');
        console.log(`✅ Ya migrados:          ${alreadyMigrated}`);
        console.log(`⚠️  Necesitan migración: ${needsMigration}`);
        console.log('');

        if (Object.keys(byFormat).length > 0) {
            console.log('%c📋 Por Formato ', 'background: #FF9800; color: white; font-size: 14px; padding: 5px;');
            console.table(byFormat);
            console.log('');
        }

        // Mostrar ejemplos
        if (examples.length > 0) {
            console.log('%c📝 Ejemplos de Migración ', 'background: #9C27B0; color: white; font-size: 14px; padding: 5px;');
            console.log('');

            examples.forEach((ex, i) => {
                console.log(`${i + 1}. ${ex.nombre} (${ex.format})`);
                console.log(`   ID: ${ex.id}`);
                console.log('   Config actual:', ex.config);
                console.log('');
            });
        }

        // Resultado final
        if (needsMigration > 0) {
            console.log('%c⚠️  ACCIÓN REQUERIDA ', 'background: #F44336; color: white; font-size: 16px; padding: 5px;');
            console.log('');
            console.log(`Hay ${needsMigration} torneos que necesitan migración.`);
            console.log('');
            console.log('Para continuar con la migración, contacta al desarrollador.');
            console.log('');
        } else {
            console.log('%c✅ TODO LISTO ', 'background: #4CAF50; color: white; font-size: 16px; padding: 5px;');
            console.log('');
            console.log('Todos los torneos ya están migrados.');
            console.log('');
        }

        return {
            total: snapshot.size,
            needsMigration,
            alreadyMigrated,
            byFormat,
            examples
        };

    } catch (error) {
        console.log('%c❌ ERROR ', 'background: #F44336; color: white; font-size: 16px; padding: 5px;');
        console.log('');
        console.error('Error:', error.message);
        console.log('');
        console.log('💡 Soluciones:');
        console.log('   1. Asegúrate de estar en http://localhost:3000');
        console.log('   2. Verifica que hayas iniciado sesión');
        console.log('   3. Recarga la página e intenta de nuevo');
        console.log('');

        throw error;
    }
})();
