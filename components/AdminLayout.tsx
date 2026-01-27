
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
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminDashboard } from './AdminDashboard';
import { HelpCenter } from './HelpCenter';
import { PlanBadge } from './PlanBadge';
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
    // Impersonation State
    const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);

    // Derived User State
    const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

    // Effective User (The user we are "viewing as" or the actual user)
    const effectiveUser = impersonatedUserId
        ? (users.find(u => u.id === impersonatedUserId) || currentUser)
        : currentUser;

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
        if (!effectiveUser) {
            setPlayers({});
            setRankings([]);
            return;
        }

        // Logic:
        // 1. If SuperAdmin AND NOT impersonating -> Show ALL (undefined ownerIdFilter)
        // 2. If Impersonating -> Show ONLY that user's data (effectiveUser.id)
        // 3. If Normal Admin -> Show ONLY their data (effectiveUser.id)

        const ownerIdFilter = (currentUser?.role === 'superadmin' && !impersonatedUserId)
            ? undefined
            : effectiveUser.id;

        // Sub Players
        const unsubscribePlayers = subscribeToPlayers((data) => {
            // Client-Side Visibility Filter
            let visibleData = data;

            // If filtering by owner (Normal Admin or Impersonated View)
            if (ownerIdFilter) {
                visibleData = {};
                (Object.values(data) as Player[]).forEach(p => {
                    // Strict Ownership or Public (no owner)
                    if (!p.ownerId || p.ownerId === ownerIdFilter) {
                        visibleData[p.id] = p;
                    }
                });
            } else {
                // SuperAdmin Global View (No Impersonation)
                visibleData = data;
            }
            setPlayers(visibleData);
        }, ownerIdFilter);

        // Sub Rankings
        const unsubscribeRankings = subscribeToRankings((data) => {
            // Client-Side Visibility Filter
            let visibleData = data;
            if (ownerIdFilter) {
                // Strict Ownership or Public
                visibleData = data.filter(r => !r.ownerId || r.ownerId === ownerIdFilter);
            }
            // Else: SuperAdmin sees all
            setRankings(visibleData);
        }, ownerIdFilter);

        return () => {
            unsubscribePlayers();
            unsubscribeRankings();
        };
    }, [effectiveUser, impersonatedUserId, currentUser]); // Re-run if effectiveUser changes


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
            await addRanking({ ...rankingData, ownerId: effectiveUser?.id } as any); // Use effectiveUser
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
        if (!effectiveUser?.id) return;
        if (confirm('¿Duplicar este torneo? Se creará una copia exacta.')) {
            try {
                await duplicateRanking(id, effectiveUser.id);
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
                await addPlayer({ ...rest, ownerId: effectiveUser?.id, stats: { pj: 0, pg: 0, pp: 0, winrate: 0 } } as any);
            }
            setIsPlayerModalOpen(false);
            setEditingPlayer(null);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };
    const handleImportPlayers = async (data: any[]) => {
        try {
            const toSave = data.map(p => ({ ...p, stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }, ownerId: effectiveUser?.id }));
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
    // const playerList = Object.values(players) as Player[]; // Not used?
    const activeRankings = rankings.filter(r => r.status === 'activo');

    return (
        <div className="min-h-screen flex bg-[#F0F4F8] text-gray-900 relative">
            {/* IMPERSONATION BANNER */}
            {impersonatedUserId && (
                <div className="fixed top-0 left-0 right-0 h-10 bg-amber-400 z-50 flex items-center justify-between px-4 text-amber-900 font-bold shadow-md animate-in slide-in-from-top">
                    <div className="flex items-center gap-2">
                        <Users size={16} />
                        <span>Viendo como: {effectiveUser?.name || effectiveUser?.email}</span>
                    </div>
                    <button
                        onClick={() => setImpersonatedUserId(null)}
                        className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded text-xs transition-colors"
                    >
                        Salir de Vista Cliente
                    </button>
                </div>
            )}

            {/* Sidebar (Desktop Only) */}
            <aside className={`hidden lg:block sticky top-0 h-screen w-64 bg-white border-r border-gray-100 z-30 ${impersonatedUserId ? 'mt-10 h-[calc(100vh-2.5rem)]' : ''}`}>
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

                        <button onClick={() => handleNavClick('ranking_list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${['ranking_list', 'ranking_create', 'ranking_detail'].includes(view) ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                            <Trophy size={20} />
                            {currentUser?.role === 'superadmin' && !impersonatedUserId ? 'Control Central' : (isPublicUser ? 'Torneos' : 'Mis Torneos')}
                        </button>

                        {!isPublicUser && (
                            <button onClick={() => handleNavClick('players')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'players' ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><Users size={20} /> Jugadores</button>
                        )}

                        {currentUser?.role === 'superadmin' && !impersonatedUserId && (
                            <button onClick={() => handleNavClick('admin_management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'admin_management' ? 'bg-primary-50 text-primary font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}><ShieldCheck size={20} /> Gestión Admins</button>
                        )}

                        {/* Add Exit Impersonation Button in Sidebar too */}
                        {impersonatedUserId && (
                            <button onClick={() => setImpersonatedUserId(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-amber-600 bg-amber-50 hover:bg-amber-100 font-bold border border-amber-200">
                                <LogOut size={20} /> Salir de Vista
                            </button>
                        )}
                    </nav>
                    <div className="p-4 border-t border-gray-100 space-y-3">
                        {!isPublicUser && effectiveUser && (
                            <PlanBadge
                                user={effectiveUser}
                                totalPlayers={Object.keys(players).length}
                                activeTournaments={activeRankings.length}
                            />
                        )}
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={20} /> Cerrar Sesión</button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col min-w-0 pb-24 lg:pb-0 ${impersonatedUserId ? 'mt-10' : ''}`}>
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm lg:shadow-none">
                    <div className="lg:hidden text-primary font-bold flex items-center gap-2">
                        <Trophy size={24} /> PadelRank
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-gray-900">{effectiveUser?.name || effectiveUser?.email}</div>
                            <div className="mt-0.5 flex justify-end">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${effectiveUser?.role === 'superadmin' ? 'bg-purple-100/50 text-purple-700 border-purple-200' :
                                    effectiveUser?.role === 'admin' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                        'bg-gray-100/50 text-gray-600 border-gray-200'
                                    }`}>
                                    {isPublicUser ? 'Jugador' : effectiveUser?.role}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => !isPublicUser && setView('profile')} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold hover:opacity-90 transition-all ${isPublicUser ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-primary text-white shadow-md hover:shadow-lg'}`}>
                            {effectiveUser?.role === 'superadmin' ? 'SA' : isPublicUser ? <UserIcon size={20} /> : 'A'}
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
                            <h2 className="text-3xl font-bold text-gray-900">¡Bienvenido, {effectiveUser?.name}!</h2>
                            <p className="text-gray-500 max-w-md">
                                Explora los <strong>"Torneos"</strong> disponibles para ver clasificaciones y estadísticas.
                            </p>
                            <Button onClick={() => setView('ranking_list')}>
                                Ver Torneos
                            </Button>
                        </div>
                    )}

                    {view === 'dashboard' && !isPublicUser && (
                        <AdminDashboard
                            activeRankings={activeRankings}
                            allRankings={rankings}
                            players={players}
                            userName={effectiveUser?.name}
                            onNavigate={setView}
                            onCreateTournament={() => setView('ranking_create')}
                            onCreatePlayer={() => { setEditingPlayer(null); setIsPlayerModalOpen(true) }}
                        />
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
                        currentUser={effectiveUser}
                        onAddPlayer={() => { setEditingPlayer(null); setIsPlayerModalOpen(true) }}
                        onEditPlayer={(p) => { setEditingPlayer(p); setIsPlayerModalOpen(true) }}
                        onDeletePlayer={handleDeletePlayer}
                        onDeletePlayers={handleDeletePlayers}
                        onImportPlayers={handleImportPlayers}
                        onSelectPlayer={handleSelectPlayer}
                    />}
                    {view === 'ranking_list' && <RankingList rankings={rankings} users={users} onSelect={handleRankingSelect} onCreateClick={() => setView('ranking_create')} onDelete={handleDeleteRanking} onDuplicate={handleDuplicateRanking} />}
                    {view === 'ranking_create' && <RankingWizard
                        players={players}
                        currentUser={effectiveUser}
                        activeRankingsCount={rankings.filter(r => r.status === 'activo' && r.ownerId === effectiveUser?.id).length}
                        onCancel={() => setView('ranking_list')}
                        onSave={handleSaveRanking}
                    />}
                    {view === 'ranking_detail' && activeRanking && <RankingView
                        ranking={activeRanking}
                        players={players}
                        isAdmin={true}
                        onBack={() => setView('ranking_list')}
                        onAddDivision={handleAddDivision}
                        onUpdateRanking={handleUpdateRanking}
                        onPlayerClick={(playerId) => {
                            if (activeRanking.format === 'pairs' || activeRanking.format === 'hybrid') {
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
                        <SuperAdminDashboard
                            users={users}
                            rankings={rankings}
                            players={players}
                            onApprove={(id) => updateUser({ id, status: 'active', plan: 'pro' })}
                            onReject={(id) => updateUser({ id, status: 'rejected' })}
                            onDelete={(id) => deleteUserDB(id)}
                            onCreate={async (userData) => {
                                await handleCreateAdmin(userData);
                                // Set default plan to 'pro' for new users
                                const newUserId = users.find(u => u.email === userData.email)?.id;
                                if (newUserId) {
                                    updateUser({ id: newUserId, plan: 'pro' });
                                }
                            }}
                            onUpdatePlan={(userId, plan) => {
                                updateUser({ id: userId, plan });
                            }}
                            onViewClient={(userId) => {
                                setImpersonatedUserId(userId);
                                setView('dashboard');
                            }}
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

            <HelpCenter />
        </div>
    );
};
