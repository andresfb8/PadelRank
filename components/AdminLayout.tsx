
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Trophy, LogOut, Menu, ShieldCheck, User as UserIcon } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, db, secondaryAuth } from '../services/firebase';
import { Player, Ranking, Match, Division, User } from '../types';
import { onSnapshot, collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { RankingView } from './RankingView';
import { RankingList } from './RankingList';
import { RankingWizard } from './RankingWizard';
import { MatchModal } from './MatchModal';
import { PlayerList } from './PlayerList';
import { PlayerDetailView } from './PlayerDetailView';
import { PairDetailView } from './PairDetailView';
import { AdminProfile } from './AdminProfile';
import { AdminManagement } from './AdminManagement';
import { PlayerModal } from './PlayerModal';
import { Button } from './ui/Components';
import {
    subscribeToPlayers,
    subscribeToRankings,
    subscribeToUsers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    importPlayersBatch,
    addRanking,
    updateRanking,
    deleteRanking,
    clearDatabase,
    addUser, // We still use this even though it might differ from Auth ID
    updateUser,
    deleteUser as deleteUserDB,
    subscribeToUserProfile,
    duplicateRanking
} from '../services/db';
import { migratePlayersStats } from '../services/migration';
import { MobileBottomNav } from './MobileBottomNav';


export const AdminLayout = () => {
    const [view, setView] = useState<'login' | 'dashboard' | 'players' | 'ranking_list' | 'ranking_create' | 'ranking_detail' | 'profile' | 'admin_management' | 'player_detail' | 'pair_detail'>('login');
    const [isRegistering, setIsRegistering] = useState(false);

    // Auth
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [users, setUsers] = useState<User[]>([]);

    // Data
    const [players, setPlayers] = useState<Record<string, Player>>({});
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [activeRankingId, setActiveRankingId] = useState<string | null>(null);

    // Derived User
    // Derived User State
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
    const activeRanking = rankings.find(r => r.id === activeRankingId);

    // Migration
    useEffect(() => {
        migratePlayersStats().catch(err => console.error("Migration error:", err));
    }, []);

    // Subscribe to Current User Profile (STRICT AUTH ID MATCH)
    useEffect(() => {
        if (!firebaseUser) {
            setCurrentUser(undefined);
            return;
        }

        const unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (user) => {
            if (user) {
                // FORCE SUPERADMIN: Setup self-healing for owner
                if (user.email === 'andresfb8@gmail.com' && user.role !== 'superadmin') {
                    console.log("Healing Superadmin Role...");
                    updateUser({ id: user.id, role: 'superadmin' } as any);
                }
                setCurrentUser(user);
            } else {
                // AUTO-FIX: If we have an Auth User but no Firestore Profile, CREATE IT.
                console.warn("User Profile missing for Auth ID. Auto-creating...");
                // Fire and forget to avoid async callback issues
                setDoc(doc(db, "users", firebaseUser.uid), {
                    email: firebaseUser.email || "",
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Usuario",
                    role: firebaseUser.email === 'andresfb8@gmail.com' ? 'superadmin' : 'admin',
                    status: 'pending',
                    createdAt: new Date()
                }).catch(err => console.error("Auto-creation failed:", err));
            }
        });
        return () => unsubscribeProfile();
    }, [firebaseUser]);

    // Subscribe Global Users (Only if SuperAdmin)
    useEffect(() => {
        if (currentUser?.role !== 'superadmin') {
            setUsers([]);
            return;
        }

        const unsubscribeUsers = subscribeToUsers((data) => {
            setUsers(data);
        });
        return () => unsubscribeUsers();
    }, [currentUser?.role]);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setFirebaseUser(user);
                setView('dashboard');
            } else {
                setFirebaseUser(null);
                setView('login');
            }
        });
        return () => unsubscribe();
    }, []);


    // Subscribe Data (Rankings/Players) based on Login
    useEffect(() => {
        if (!currentUser) {
            setPlayers({});
            setRankings([]);
            return;
        }

        const ownerIdFilter = currentUser.role === 'superadmin' ? undefined : currentUser.id;

        // Sub Players
        const unsubscribePlayers = subscribeToPlayers((data) => {
            // Client-Side Visibility Filter
            let visibleData = data;
            if (currentUser?.role !== 'superadmin') {
                visibleData = {};
                (Object.values(data) as Player[]).forEach(p => {
                    // Strict Ownership or Public (no owner)
                    if (!p.ownerId || p.ownerId === currentUser?.id) {
                        visibleData[p.id] = p;
                    }
                });
            }
            setPlayers(visibleData);
        }, ownerIdFilter);

        // Sub Rankings
        // Sub Rankings
        const unsubscribeRankings = subscribeToRankings((data) => {
            // Client-Side Visibility Filter: Show if Own, Public (no owner), or Superadmin
            let visibleData = data;
            if (currentUser?.role !== 'superadmin') {
                // Strict Ownership or Public
                visibleData = data.filter(r => !r.ownerId || r.ownerId === currentUser?.id);
            }
            setRankings(visibleData);
        }, ownerIdFilter);

        return () => {
            unsubscribePlayers();
            unsubscribeRankings();
        };
    }, [currentUser]);


    // UI State
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null); // New state
    const [selectedPairIdForDetail, setSelectedPairIdForDetail] = useState<string | null>(null);
    const [credentialsModal, setCredentialsModal] = useState<{ isOpen: boolean, email: string, pass: string } | null>(null);

    // Resize Listener
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handlers
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        try {
            await setPersistence(auth, browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Error al iniciar sesión: " + error);
        }
    };

    const handleLogout = () => signOut(auth);

    const handleSelectPlayer = (player: Player) => {
        setSelectedPlayerForDetail(player);
        setView('player_detail');
    };

    const handleNavClick = (viewName: any) => {
        setView(viewName);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };

    // --- Actions ---
    // Rankings
    const handleSaveRanking = async (newRanking: Ranking) => {
        try {
            const { id, ...rankingData } = newRanking;
            await addRanking({ ...rankingData, ownerId: firebaseUser?.uid } as any);
            alert("✅ Torneo creado correctamente.");
            setView('ranking_list');
        } catch (error) {
            console.error(error);
            alert("Error al guardar torneo.");
        }
    };
    const handleUpdateRanking = async (r: Ranking) => await updateRanking(r);
    const handleDeleteRanking = async (id: string) => {
        if (confirm('¿Borrar torneo?')) await deleteRanking(id);
    };
    const handleDuplicateRanking = async (id: string) => {
        if (!firebaseUser?.uid) return;
        if (confirm('¿Duplicar este torneo? Se creará una copia exacta.')) {
            try {
                await duplicateRanking(id, firebaseUser.uid);
                alert('✅ Torneo duplicado correctamente.');
            } catch (error) {
                console.error(error);
                alert('Error al duplicar el torneo.');
            }
        }
    };
    const handleRankingSelect = (r: Ranking) => {
        setActiveRankingId(r.id);
        setView('ranking_detail');
    };
    const handleAddDivision = (newDivisions: Division | Division[]) => {
        console.log('📥 handleAddDivision called with:', newDivisions);
        if (!activeRanking) {
            console.error('❌ No active ranking!');
            return;
        }

        // Normalize to array
        const divisionsArray = Array.isArray(newDivisions) ? newDivisions : [newDivisions];

        // Add all divisions at once to prevent race conditions
        const updated = {
            ...activeRanking,
            divisions: [...activeRanking.divisions, ...divisionsArray]
        };

        console.log('📥 Updating ranking with new divisions:', divisionsArray.length, 'division(s)');
        console.log('📥 Updated ranking:', updated);

        updateRanking(updated);
        console.log('✅ Ranking updated in DB');
    };

    // Players
    const handleSavePlayer = async (playerData: any) => {
        try {
            if (playerData.id) await updatePlayer(playerData);
            else {
                const { id, ...rest } = playerData;
                await addPlayer({ ...rest, ownerId: firebaseUser?.uid, stats: { pj: 0, pg: 0, pp: 0, winrate: 0 } } as any);
            }
            setIsPlayerModalOpen(false);
            setEditingPlayer(null);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };
    const handleImportPlayers = async (data: any[]) => {
        try {
            const toSave = data.map(p => ({ ...p, stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }, ownerId: firebaseUser?.uid }));
            await importPlayersBatch(toSave);
            alert("Importados correctamente.");
        } catch (e) { alert("Error importando."); }
    };
    const handleDeletePlayer = (id: string) => deletePlayer(id); // Use DB delete
    const handleDeletePlayers = (ids: string[]) => ids.forEach(id => deletePlayer(id));

    // Admin Mgmt
    // Admin Mgmt
    const handleCreateAdmin = async (d: { name: string, email: string, clubName: string, password?: string }) => {
        const tempPassword = d.password || "PadelPro2025!";
        try {
            // 1. Create User in Auth (Secondary App to avoid logout)
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, d.email, tempPassword);
            const newUid = userCred.user.uid;

            // 2. Create User Profile in Firestore
            await setDoc(doc(db, "users", newUid), {
                email: d.email,
                name: d.name,
                clubName: d.clubName,
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
                ownerId: firebaseUser?.uid // SuperAdmin is the creator
            });

            // 3. Force logout of the secondary auth
            await signOut(secondaryAuth);

            alert(`✅ Administrador creado correctamente.\n\n📧 Email: ${d.email}\n🔑 Clave: ${tempPassword}\n\nPor favor, entrega estas credenciales al usuario.`);
        } catch (error: any) {
            console.error("Error creating admin:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("Error: El email ya está registrado.");
            } else {
                alert("Error creando administrador: " + error.message);
            }
        }
    };

    // Match
    const handleMatchSave = (matchId: string, result: any) => {
        if (!activeRanking) return;
        // ... Copy logic from App.tsx ...
        const updatedDivisions = activeRanking.divisions.map(div => {
            const updatedMatches = div.matches.map(m => {
                if (m.id === matchId) {
                    return {
                        ...m,
                        status: 'finalizado' as const,
                        score: {
                            set1: result.set1,
                            set2: result.set2,
                            set3: result.set3,
                            isIncomplete: result.isIncomplete,
                            finalizationType: result.finalizationType,
                            description: result.description
                        },
                        points: result.points
                    };
                }
                return m;
            });
            return { ...div, matches: updatedMatches };
        });
        const updatedR = { ...activeRanking, divisions: updatedDivisions };
        updateRanking(updatedR);
    };

    // Handle Register
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const pass = (document.getElementById('password') as HTMLInputElement).value;
        const name = (document.getElementById('name') as HTMLInputElement)?.value || email.split('@')[0];

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            // Create User Profile in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email,
                name,
                role: 'public', // Default role for self-registration
                status: 'active',
                createdAt: new Date()
            });
            alert("Cuenta creada con éxito. Bienvenido.");
        } catch (error: any) {
            console.error(error);
            alert("Error al registrarse: " + error.message);
        }
    };


    // Render Login if no User
    if (!firebaseUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
                    <div className="text-center mb-6">
                        <div className="h-16 w-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
                            <Trophy size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">PadelRank Pro</h1>
                        <p className="text-gray-500 mt-2">Acceso a Gestión</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="email" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" placeholder="tu@email.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input type="password" id="password" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" placeholder="••••••••" />
                        </div>
                        <Button className="w-full py-3 text-lg">Entrar</Button>
                    </form>
                </div>
            </div>
        );
    }


    const isPublicUser = currentUser?.role === 'public';
    const playerList = Object.values(players) as Player[];
    const activeRankings = rankings.filter(r => r.status === 'activo');

    return (
        <div className="min-h-screen flex bg-[#F0F4F8] text-gray-900 relative">
            {/* Sidebar (Desktop Only) */}
            <aside className="hidden lg:block sticky top-0 h-screen w-64 bg-white border-r border-gray-100 z-30">
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-center">
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            <Trophy /> PadelRank
                        </h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
                        {!isPublicUser && (
                            <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Panel</button>
                        )}

                        <button onClick={() => handleNavClick('ranking_list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${['ranking_list', 'ranking_create', 'ranking_detail'].includes(view) ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><Trophy size={20} /> {isPublicUser ? 'Torneos' : 'Mis Torneos'}</button>

                        {!isPublicUser && (
                            <button onClick={() => handleNavClick('players')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'players' ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><Users size={20} /> Jugadores</button>
                        )}

                        {currentUser?.role === 'superadmin' && (
                            <button onClick={() => handleNavClick('admin_management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'admin_management' ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><ShieldCheck size={20} /> Gestión Admins</button>
                        )}
                    </nav>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} /> Cerrar Sesión</button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm lg:shadow-none">
                    <div className="lg:hidden text-primary font-bold flex items-center gap-2">
                        <Trophy size={24} /> PadelRank
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-gray-900">{currentUser?.name || currentUser?.email}</div>
                            <div className="mt-0.5 flex justify-end">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${currentUser?.role === 'superadmin' ? 'bg-purple-100/50 text-purple-700 border-purple-200' :
                                    currentUser?.role === 'admin' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                        'bg-gray-100/50 text-gray-600 border-gray-200'
                                    }`}>
                                    {isPublicUser ? 'Jugador' : currentUser?.role}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => !isPublicUser && setView('profile')} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold hover:opacity-90 transition-all ${isPublicUser ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-primary text-white shadow-md hover:shadow-lg'}`}>
                            {currentUser?.role === 'superadmin' ? 'SA' : isPublicUser ? <UserIcon size={20} /> : 'A'}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    {/* Welcome / Dashboard */}
                    {isPublicUser && view === 'dashboard' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                            <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center text-primary-600 mb-2">
                                <Trophy size={48} />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">¡Bienvenido, {currentUser?.name}!</h2>
                            <p className="text-gray-500 max-w-md">
                                Explora los <strong>"Torneos"</strong> disponibles para ver clasificaciones y estadísticas.
                            </p>
                            <Button onClick={() => setView('ranking_list')}>
                                Ver Torneos
                            </Button>
                        </div>
                    )}

                    {view === 'dashboard' && !isPublicUser && (
                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
                                    <div>
                                        <h3 className="text-secondary-500 text-sm font-semibold mb-1 uppercase tracking-wider">Torneos Activos</h3>
                                        <p className="text-4xl font-bold text-gray-900">{activeRankings.length}</p>
                                        <div className="h-14 w-14 bg-blue-50/80 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                                            <Trophy size={28} />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
                                    <div>
                                        <h3 className="text-secondary-500 text-sm font-semibold mb-1 uppercase tracking-wider">Jugadores</h3>
                                        <p className="text-4xl font-bold text-gray-900">{Object.keys(players).length}</p>
                                    </div>
                                    <div className="h-14 w-14 bg-green-50/80 rounded-2xl flex items-center justify-center text-green-600 shadow-sm">
                                        <Users size={28} />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
                                    <div>
                                        <h3 className="text-secondary-500 text-sm font-semibold mb-1 uppercase tracking-wider">Pendientes</h3>
                                        <p className="text-4xl font-bold text-gray-900">{rankings.reduce((acc, r) => acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.filter(m => m.status === 'pendiente').length, 0), 0)}</p>
                                    </div>
                                    <div className="h-14 w-14 bg-orange-50/80 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                                        <ShieldCheck size={28} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Trophy className="text-primary-600" size={24} />
                                        Progreso de Torneos
                                    </h3>
                                    <div className="space-y-6">
                                        {activeRankings.map(ranking => {
                                            const totalMatches = ranking.divisions.reduce((acc, d) => acc + d.matches.length, 0);
                                            const completedMatches = ranking.divisions.reduce((acc, d) => acc + d.matches.filter(m => m.status === 'finalizado').length, 0);
                                            const percentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
                                            const colorClass = ranking.format === 'mexicano' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                                ranking.format === 'americano' ? 'bg-gradient-to-r from-purple-400 to-indigo-500' :
                                                    'bg-gradient-to-r from-blue-400 to-cyan-500';
                                            return (
                                                <div key={ranking.id} className="bg-gray-50 rounded-lg p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium text-gray-800">{ranking.nombre}</span>
                                                        <span className="text-xs font-semibold text-gray-500">{percentage}% Completado</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-400 flex justify-between">
                                                        <span>{completedMatches} / {totalMatches} Partidos</span>
                                                        <span className="uppercase">{ranking.format}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {activeRankings.length === 0 && (
                                            <p className="text-center text-gray-400 py-4">No hay torneos activos</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Users className="text-accent-500" size={24} />
                                        Top Jugadores (Winrate)
                                    </h3>
                                    <div className="space-y-4">
                                        {playerList
                                            .filter(p => p.stats && p.stats.pj >= 5)
                                            .sort((a, b) => b.stats.winrate - a.stats.winrate)
                                            .slice(0, 5)
                                            .map((player, idx) => (
                                                <div key={player.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50' : idx === 1 ? 'bg-gray-100 text-gray-600 ring-2 ring-gray-50' : idx === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-50' : 'bg-gray-50 text-gray-400'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-700 truncate max-w-[140px]" title={`${player.nombre} ${player.apellidos}`}>
                                                            {player.nombre} {player.apellidos}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-bold text-gray-900">{player.stats.winrate}%</div>
                                                        <div className="text-xs text-secondary-400 font-medium">{player.stats.pg}W - {player.stats.pp}L</div>
                                                    </div>
                                                </div>
                                            ))}
                                        {playerList.filter(p => p.stats && p.stats.pj >= 5).length === 0 && (
                                            <p className="text-sm text-gray-400 text-center py-6 italic">Faltan datos (mín 5 partidos)</p>
                                        )}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                                        <button
                                            onClick={() => setView('players')}
                                            className="text-primary-600 text-sm font-semibold hover:text-primary-700 hover:underline transition-colors"
                                        >
                                            Ver Ranking Completo &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button onClick={() => setView('ranking_create')} className="bg-indigo-600 hover:bg-indigo-700 h-auto py-4 flex flex-col items-center gap-2">
                                    <Trophy size={24} />
                                    <span>Nuevo Torneo</span>
                                </Button>
                                <Button onClick={() => { setEditingPlayer(null); setIsPlayerModalOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700 h-auto py-4 flex flex-col items-center gap-2">
                                    <Users size={24} />
                                    <span>Nuevo Jugador</span>
                                </Button>
                            </div>
                        </div>
                    )}

                    {view === 'player_detail' && selectedPlayerForDetail && (
                        <PlayerDetailView
                            player={selectedPlayerForDetail}
                            players={players}
                            rankings={rankings}
                            onBack={() => {
                                setSelectedPlayerForDetail(null);
                                // Return to previous view - could be 'players' or 'ranking_detail'
                                if (activeRankingId) {
                                    setView('ranking_detail');
                                } else {
                                    setView('players');
                                }
                            }}
                        />
                    )}

                    {view === 'pair_detail' && selectedPairIdForDetail && (
                        <PairDetailView
                            pairId={selectedPairIdForDetail}
                            players={players}
                            rankings={rankings}
                            onBack={() => {
                                setSelectedPairIdForDetail(null);
                                setView('ranking_detail');
                            }}
                        />
                    )}

                    {view === 'players' && <PlayerList
                        players={players}
                        onAddPlayer={() => { setEditingPlayer(null); setIsPlayerModalOpen(true) }}
                        onEditPlayer={(p) => { setEditingPlayer(p); setIsPlayerModalOpen(true) }}
                        onDeletePlayer={handleDeletePlayer}
                        onDeletePlayers={handleDeletePlayers}
                        onImportPlayers={handleImportPlayers}
                        onSelectPlayer={handleSelectPlayer}
                    />}
                    {view === 'ranking_list' && <RankingList rankings={rankings} users={users} onSelect={handleRankingSelect} onCreateClick={() => setView('ranking_create')} onDelete={handleDeleteRanking} onDuplicate={handleDuplicateRanking} />}
                    {view === 'ranking_create' && <RankingWizard players={players} onCancel={() => setView('ranking_list')} onSave={handleSaveRanking} />}
                    {view === 'ranking_detail' && activeRanking && <RankingView
                        ranking={activeRanking}
                        players={players}
                        isAdmin={true}
                        onBack={() => setView('ranking_list')}
                        onAddDivision={handleAddDivision}
                        onUpdateRanking={handleUpdateRanking}
                        onPlayerClick={(playerId) => {
                            if (activeRanking.format === 'pairs') {
                                setSelectedPairIdForDetail(playerId); // playerId is actually pairId here
                                setView('pair_detail');
                            } else {
                                const player = players[playerId];
                                if (player) {
                                    setSelectedPlayerForDetail(player);
                                    setView('player_detail');
                                }
                            }
                        }}
                        onUpdatePlayerStats={async (pid, result) => {
                            const { updatePlayerStatsFull } = await import('../services/db');
                            if (result === 'draw') return;
                            await updatePlayerStatsFull(pid, result === 'win');
                        }}
                    />}

                    {view === 'admin_management' && currentUser?.role === 'superadmin' && (
                        <AdminManagement
                            users={users}
                            onApprove={(id) => updateUser({ id, status: 'active' })}
                            onReject={(id) => updateUser({ id, status: 'rejected' })}
                            onDelete={(id) => deleteUserDB(id)}
                            onBlock={(id) => updateUser({ id, status: 'blocked' })}
                            onUnblock={(id) => updateUser({ id, status: 'active' })}
                            onCreate={handleCreateAdmin}
                            onClearDB={clearDatabase}
                        />
                    )}

                    {view === 'profile' && <AdminProfile user={currentUser} onClose={() => setView('dashboard')} onLogout={handleLogout} />}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav
                currentView={view}
                onNavigate={handleNavClick}
                isAdmin={!isPublicUser}
                isSuperAdmin={currentUser?.role === 'superadmin'}
            />

            <PlayerModal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} onSave={handleSavePlayer} playerToEdit={editingPlayer} />
            {credentialsModal?.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-center mb-4">Credenciales</h3>
                        <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-center">
                            <p><strong>Email:</strong> {credentialsModal.email}</p>
                            <p><strong>Clave:</strong> {credentialsModal.pass}</p>
                        </div>
                        <Button className="w-full mt-4" onClick={() => setCredentialsModal(null)}>Cerrar</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
