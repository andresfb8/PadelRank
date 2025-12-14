
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Trophy, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { Player, Ranking, Match, Division, User } from '../types';
import { onSnapshot, collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { RankingView } from './RankingView';
import { RankingList } from './RankingList';
import { RankingWizard } from './RankingWizard';
import { MatchModal } from './MatchModal';
import { PlayerList } from './PlayerList';
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
    subscribeToUserProfile
} from '../services/db';
import { migratePlayersStats } from '../services/migration';


export const AdminLayout = () => {
    const [view, setView] = useState<'login' | 'dashboard' | 'players' | 'ranking_list' | 'ranking_create' | 'ranking_detail' | 'profile' | 'admin_management'>('login');

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

        const unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, async (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                // AUTO-FIX: If we have an Auth User but no Firestore Profile, CREATE IT.
                // This handles "Start from 0" by establishing a valid profile for the Auth ID.
                console.warn("User Profile missing for Auth ID. Auto-creating...");
                try {
                    // We can't use 'addUser' because it generates a random ID. 
                    // We must use strict ID matching Auth UID.
                    // We need to import setDoc/doc from firestore or add a helper in db.ts.
                    // Let's assume we can use the 'setDoc' exported from db.ts (which I need to check if exported).
                    // Actually, db.ts exports setDoc. 
                    await setDoc(doc(db, "users", firebaseUser.uid), {
                        email: firebaseUser.email || "",
                        role: 'user', // Default role
                        createdAt: new Date()
                    });
                } catch (err) {
                    console.error("Auto-creation failed:", err);
                }
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
                Object.values(data).forEach(p => {
                    // Strict Ownership or Public (no owner)
                    if (!p.ownerId || p.ownerId === currentUser?.id) {
                        visibleData[p.id] = p;
                    }
                });
            }
            setPlayers(visibleData);
        }, undefined);

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
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Error al iniciar sesión: " + error);
        }
    };

    const handleLogout = () => signOut(auth);

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
    const handleRankingSelect = (r: Ranking) => {
        setActiveRankingId(r.id);
        setView('ranking_detail');
    };
    const handleAddDivision = (newDivision: Division) => {
        if (!activeRanking) return;
        const updated = { ...activeRanking, divisions: [...activeRanking.divisions, newDivision] };
        // Optimistic update not really needed as subscription catches it, 
        // but we usually just update the doc. Wait, this function 'handleAddDivision' 
        // in App.tsx was purely local state update? 
        // No, RankingView calls 'onAddDivision' which calls this.
        // AND RankingView updates logic? 
        // Actually, we must SAVE it to DB. 
        // The previous App.tsx implementation of handleAddDivision:
        // setRankings(rankings.map(r => r.id === activeRanking.id ? updatedRanking : r));
        // It ONLY updated local state? That seems like a bug in the old code if so, 
        // or maybe RankingView saved it? 
        // Checking old App.tsx code... 
        // It seems handleAddDivision ONLY updated local state: `setRankings(...)`.
        // It did NOT call `updateRanking`.
        // BUT `RankingView` has `onUpdateRanking`.
        // If `AddDivisionModal` returns a division, `RankingView` calls `onAddDivision`.
        // We should probably ensure persistence here to be safe.
        // I will add persistence.
        updateRanking(updated);
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
    const handleCreateAdmin = async (d: { name: string, email: string, clubName: string }) => {
        alert("Creación de administradores deshabilitada temporalmente en modo estricto.");
        // implement if needed later
    };

    // Match
    const handleMatchSave = (matchId: string, result: any) => {
        if (!activeRanking) return;
        // ... Copy logic from App.tsx ...
        const updatedDivisions = activeRanking.divisions.map(div => {
            if (!div.matches.some(m => m.id === matchId)) return div;
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


    // --- Render ---

    if (view === 'login') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-primary p-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">PadelRank Pro</h1>
                        <p className="text-blue-100">Acceso Administrativo</p>
                    </div>
                    <form onSubmit={handleLogin} className="p-8 space-y-4" autoComplete="off">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="email" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input type="password" id="password" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <Button className="w-full py-3 text-lg" onClick={() => { }}>Iniciar Sesión</Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-gray-50 text-gray-900 relative">
            {/* Sidebar */}
            <aside className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarOpen ? 'shadow-2xl lg:shadow-none' : ''}`}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-center">
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            <Trophy /> PadelRank
                        </h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Panel</button>
                        <button onClick={() => handleNavClick('ranking_list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${['ranking_list', 'ranking_create', 'ranking_detail'].includes(view) ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><Trophy size={20} /> Mis Torneos</button>
                        <button onClick={() => handleNavClick('players')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'players' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={20} /> Jugadores</button>
                        {currentUser?.role === 'superadmin' && (
                            <button onClick={() => handleNavClick('admin_management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin_management' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><ShieldCheck size={20} /> Gestión Admins</button>
                        )}
                    </nav>
                    <div className="p-4 border-t border-gray-100">
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20} /> Cerrar Sesión</button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm lg:shadow-none">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-500 p-2 -ml-2 hover:bg-gray-100 rounded-lg"><Menu /></button>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-gray-900">{currentUser?.name || currentUser?.email}</div>
                            <div className="mt-0.5 flex justify-end">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${currentUser?.role === 'superadmin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        currentUser?.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                    {currentUser?.role}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold hover:opacity-90">{currentUser?.role === 'superadmin' ? 'SA' : 'A'}</button>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    {view === 'dashboard' && (
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 text-sm font-medium mb-1">Torneos Activos</h3>
                                <p className="text-3xl font-bold text-gray-900">{rankings.filter(r => r.status === 'activo').length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 text-sm font-medium mb-1">Jugadores</h3>
                                <p className="text-3xl font-bold text-gray-900">{Object.keys(players).length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 text-sm font-medium mb-1">Pendientes</h3>
                                <p className="text-3xl font-bold text-gray-900">{rankings.reduce((acc, r) => acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.filter(m => m.status === 'pendiente').length, 0), 0)}</p>
                            </div>
                        </div>
                    )}

                    {view === 'players' && <PlayerList players={players} onAddPlayer={() => { setEditingPlayer(null); setIsPlayerModalOpen(true) }} onEditPlayer={(p) => { setEditingPlayer(p); setIsPlayerModalOpen(true) }} onDeletePlayer={handleDeletePlayer} onDeletePlayers={handleDeletePlayers} onImportPlayers={handleImportPlayers} />}
                    {view === 'ranking_list' && <RankingList rankings={rankings} onSelect={handleRankingSelect} onCreateClick={() => setView('ranking_create')} onDelete={handleDeleteRanking} />}
                    {view === 'ranking_create' && <RankingWizard players={players} onCancel={() => setView('ranking_list')} onSave={handleSaveRanking} />}
                    {view === 'ranking_detail' && activeRanking && <RankingView ranking={activeRanking} players={players} isAdmin={true} onBack={() => setView('ranking_list')} onAddDivision={handleAddDivision} onUpdateRanking={handleUpdateRanking} />}
                    {view === 'admin_management' && currentUser?.role === 'superadmin' && <AdminManagement users={users} onApprove={(id) => updateUser({ id, status: 'active' })} onReject={(id) => updateUser({ id, status: 'rejected' })} onDelete={(id) => deleteUserDB(id)} onBlock={(id) => updateUser({ id, status: 'blocked' })} onUnblock={(id) => updateUser({ id, status: 'active' })} onCreate={handleCreateAdmin} onClearDB={clearDatabase} />}
                    {view === 'profile' && <AdminProfile user={currentUser} onClose={() => setView('dashboard')} />}
                </main>
            </div>

            {/* Modals */}
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
