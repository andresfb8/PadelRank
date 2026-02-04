import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader, Database } from 'lucide-react';
import { previewMigration } from '../../utils/migrationPreview';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { migrateRankingConfig } from '../../utils/configMigration';
import { Ranking } from '../../types';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const MigrationTool: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'previewing' | 'migrating' | 'done'>('idle');
    const [preview, setPreview] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, needsMigration: 0, migrated: 0, errors: 0 });
    const [logs, setLogs] = useState<string[]>([]);

    // Auth State
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setLoginError('');
        } catch (err: any) {
            setLoginError('Login failed: ' + err.message);
        }
    };

    const handlePreview = async () => {
        if (!currentUser) return;

        setStatus('previewing');
        setLogs([]);
        addLog(`👤 User: ${currentUser.email} (${currentUser.uid})`);
        addLog('🔍 Starting migration preview...');

        try {
            const previews = await previewMigration();
            setPreview(previews);

            const needsMigration = previews.filter(p => p.needsMigration).length;
            const alreadyMigrated = previews.filter(p => !p.needsMigration).length;

            setStats({
                total: previews.length,
                needsMigration,
                migrated: alreadyMigrated,
                errors: 0
            });

            addLog(`✅ Preview complete: ${needsMigration} rankings need migration`);
        } catch (error: any) {
            addLog(`❌ Error during preview: ${error.message}`);
        }
    };

    const handleMigrate = async () => {
        if (!currentUser) return;
        setStatus('migrating');
        addLog('🚀 Starting live migration...');

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        try {
            const rankingsRef = collection(db, 'rankings');
            const snapshot = await getDocs(rankingsRef);

            for (const docSnapshot of snapshot.docs) {
                try {
                    const ranking = docSnapshot.data() as Ranking;
                    const format = ranking.format || 'classic';

                    // Check ownership
                    if (currentUser && ranking.ownerId && ranking.ownerId !== currentUser.uid) {
                        addLog(`⏭️ Skipping ${docSnapshot.id} (${format}) - Not owner`);
                        skippedCount++;
                        continue;
                    }

                    // Check if already migrated
                    const hasNewStructure =
                        ranking.config?.classicConfig ||
                        ranking.config?.pozoConfig ||
                        ranking.config?.americanoConfig ||
                        ranking.config?.mexicanoConfig;

                    if (hasNewStructure) {
                        addLog(`⏭️ Skipping ${docSnapshot.id} (${format}) - already migrated`);
                        skippedCount++;
                        continue;
                    }

                    // Migrate
                    const migratedConfig = migrateRankingConfig(ranking.config, format);
                    const rankingRef = doc(db, 'rankings', docSnapshot.id);

                    // Sequential update
                    await updateDoc(rankingRef, { config: migratedConfig });

                    migratedCount++;
                    addLog(`✅ Migrated ${docSnapshot.id} (${format})`);

                } catch (error: any) {
                    addLog(`❌ Error migrating ${docSnapshot.id}: ${error.message}`);
                    errorCount++;
                }
            }

            setStats({
                total: snapshot.size,
                needsMigration: 0,
                migrated: migratedCount + skippedCount,
                errors: errorCount
            });

            if (errorCount === 0) {
                setStatus('done');
                addLog('✨ Migration completed successfully!');
            } else {
                setStatus('idle');
                addLog(`⚠️ Migration completed with ${errorCount} errors.`);
            }

        } catch (error: any) {
            addLog(`❌ Critical error: ${error.message}`);
            setStatus('idle');
        }
    };

    if (!currentUser) {
        return (
            <div className="max-w-md mx-auto p-8 mt-20 bg-white rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center mb-6">
                    <div className="h-12 w-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-primary-600">
                        <Database size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Migration Tool Login</h2>
                    <p className="text-sm text-gray-500">Please authenticate to run migration</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="mail@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {loginError && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            {loginError}
                        </div>
                    )}
                    <button type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200">
                        Login securely
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-4">
                        This tool connects directly to your Firestore database.
                    </p>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <Database className="text-blue-600" />
                            Configuration Migration Tool
                        </h1>
                        <p className="text-gray-500 mt-1">Migrate tournament configs to namespaced structure</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{currentUser.email}</div>
                        <div className="text-xs text-gray-500 font-mono">{currentUser.uid}</div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-blue-600 font-medium mb-1">Total Rankings</div>
                        <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div className="text-amber-600 font-medium mb-1">Need Migration</div>
                        <div className="text-3xl font-bold text-amber-900">{stats.needsMigration}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="text-green-600 font-medium mb-1">Migrated</div>
                        <div className="text-3xl font-bold text-green-900">{stats.migrated}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="text-red-600 font-medium mb-1">Errors</div>
                        <div className="text-3xl font-bold text-red-900">{stats.errors}</div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handlePreview}
                        disabled={status !== 'idle' && status !== 'done'}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
                    >
                        {status === 'previewing' ? <Loader className="animate-spin" /> : <AlertCircle size={20} />}
                        Preview Migration (Dry Run)
                    </button>

                    <button
                        onClick={handleMigrate}
                        disabled={status !== 'idle' && status !== 'previewing'}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-200"
                    >
                        {status === 'migrating' ? <Loader className="animate-spin" /> : <CheckCircle size={20} />}
                        Run Migration (Live)
                    </button>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 shadow-xl overflow-hidden">
                <div className="h-96 overflow-y-auto font-mono text-sm space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-4">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic">Ready to start...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={`${log.includes('✅') ? 'text-green-400' :
                                    log.includes('❌') ? 'text-red-400' :
                                        log.includes('⚠️') ? 'text-amber-400' :
                                            log.includes('⏭️') ? 'text-blue-300' :
                                                'text-gray-300'
                                }`}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
