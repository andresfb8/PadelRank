
import React, { useState } from 'react';
import { LayoutDashboard, Users, Trophy, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { MOCK_PLAYERS, MOCK_RANKINGS, MOCK_DIVISION, MOCK_USERS } from './constants';
import { Player, Ranking, Match, Division, User } from './types';
import { RankingView } from './components/RankingView';
import { RankingList } from './components/RankingList';
import { RankingCreator } from './components/RankingCreator';
import { MatchModal } from './components/MatchModal';
import { PlayerList } from './components/PlayerList';
import { AdminProfile } from './components/AdminProfile';
import { AdminManagement } from './components/AdminManagement';
import { GeminiAssistant } from './components/GeminiAssistant';
import { Button } from './components/ui/Components';

const App = () => {
  const [view, setView] = useState<'login' | 'dashboard' | 'players' | 'ranking_list' | 'ranking_create' | 'ranking_detail' | 'profile' | 'admin_management'>('login');
  const [players, setPlayers] = useState(MOCK_PLAYERS);
  const [rankings, setRankings] = useState<Ranking[]>(MOCK_RANKINGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [activeRankingId, setActiveRankingId] = useState<string | null>(null);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Assuming logged in as Superadmin for MVP demo
  const currentUser = users.find(u => u.role === 'superadmin');
  const activeRanking = rankings.find(r => r.id === activeRankingId);

  // Mock Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setView('dashboard');
  };

  const handleSaveRanking = (newRanking: Ranking) => {
    setRankings([...rankings, newRanking]);
    setView('ranking_list');
  };

  const handleUpdateRanking = (updatedRanking: Ranking) => {
      setRankings(rankings.map(r => r.id === updatedRanking.id ? updatedRanking : r));
  };

  const handleRankingSelect = (ranking: Ranking) => {
    setActiveRankingId(ranking.id);
    setView('ranking_detail');
  };

  const handleCreatePlayer = () => {
    const id = `p${Date.now()}`;
    setPlayers({
        ...players,
        [id]: {
            id,
            nombre: 'Nuevo',
            apellidos: 'Jugador',
            email: 'nuevo@padel.com',
            telefono: '600000000',
            stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
        }
    });
  };

  const handleDeletePlayer = (id: string) => {
      const newPlayers = { ...players };
      delete newPlayers[id];
      setPlayers(newPlayers);
  };

  const handleDeletePlayers = (ids: string[]) => {
      const newPlayers = { ...players };
      ids.forEach(id => delete newPlayers[id]);
      setPlayers(newPlayers);
  };

  const handleAddDivision = (newDivision: Division) => {
      if (!activeRanking) return;
      const updatedRanking = {
          ...activeRanking,
          divisions: [...activeRanking.divisions, newDivision]
      };
      setRankings(rankings.map(r => r.id === activeRanking.id ? updatedRanking : r));
  };

  // --- Admin Management Logic ---
  const handleApproveAdmin = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'active' } : u));
    // Simulate email notification
    const user = users.find(u => u.id === id);
    if(user) alert(`✅ Solicitud aprobada. Se ha notificado a ${user.email}.`);
  };

  const handleRejectAdmin = (id: string) => {
    if(confirm('¿Rechazar esta solicitud?')) {
        setUsers(users.map(u => u.id === id ? { ...u, status: 'rejected' } : u));
    }
  };

  const handleDeleteAdmin = (id: string) => {
    if(confirm('¿Eliminar este administrador? Se perderá acceso a sus torneos.')) {
        setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleCreateAdmin = (userData: { name: string; email: string; clubName: string }) => {
      const newUser: User = {
          id: `u-${Date.now()}`,
          name: userData.name,
          email: userData.email,
          clubName: userData.clubName,
          role: 'admin',
          status: 'active'
      };
      setUsers([...users, newUser]);
      // Simulate Email Sending
      alert(`📧 Correo enviado a ${userData.email} con las credenciales de acceso y enlace de bienvenida.`);
  };
  // ------------------------------

  // Handle Match Save
  const handleMatchSave = (matchId: string, result: any) => {
    if (!activeRanking) return;

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

    const updatedRankings = rankings.map(r => 
      r.id === activeRanking.id ? { ...r, divisions: updatedDivisions } : r
    );
    
    setRankings(updatedRankings);
  };

  const openMatchModal = (m: Match) => {
    setSelectedMatch(m);
    setIsMatchModalOpen(true);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">PadelRank Pro</h1>
            <p className="text-blue-100">Sistema de Gestión</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" defaultValue="superadmin@padelrank.pro" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" defaultValue="password" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <Button className="w-full py-3 text-lg" onClick={() => {}}>Iniciar Sesión</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-center">
             <h2 className="text-xl font-bold text-primary flex items-center gap-2">
               <Trophy /> PadelRank
             </h2>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <LayoutDashboard size={20} /> Panel
            </button>
            <button onClick={() => setView('ranking_list')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${['ranking_list', 'ranking_create', 'ranking_detail'].includes(view) ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Trophy size={20} /> Mis Torneos
            </button>
            <button onClick={() => setView('players')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'players' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Users size={20} /> Jugadores
            </button>
            
            {/* Superadmin Only Link */}
            {currentUser?.role === 'superadmin' && (
                <button onClick={() => setView('admin_management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'admin_management' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <ShieldCheck size={20} /> Gestión Admins
                    {users.filter(u => u.status === 'pending').length > 0 && (
                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {users.filter(u => u.status === 'pending').length}
                        </span>
                    )}
                </button>
            )}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button onClick={() => setView('login')} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <LogOut size={20} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-gray-500">
            <Menu />
          </button>
          <div className="flex items-center gap-4 ml-auto">
             <div className="text-right hidden md:block">
                 <div className="text-sm font-bold text-gray-900">{currentUser?.name || 'Usuario'}</div>
                 <div className="text-xs text-primary font-medium capitalize">{currentUser?.role || 'Admin'}</div>
             </div>
             <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold hover:opacity-90 transition-opacity">
                 {currentUser?.role === 'superadmin' ? 'SA' : 'A'}
             </button>
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
                <h3 className="text-gray-500 text-sm font-medium mb-1">Total Jugadores</h3>
                <p className="text-3xl font-bold text-gray-900">{Object.keys(players).length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-sm font-medium mb-1">Partidos Pendientes</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {rankings.reduce((acc, r) => acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.filter(m => m.status === 'pendiente').length, 0), 0)}
                </p>
              </div>

              <div className="md:col-span-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">¡Hola, {currentUser?.name}!</h2>
                  <p className="text-blue-100 max-w-md">
                      {currentUser?.role === 'superadmin' 
                        ? 'Tienes control total sobre el sistema. Revisa las solicitudes de nuevos administradores.' 
                        : 'Gestiona tus torneos y mantén actualizados los resultados de tu club.'}
                  </p>
                  <Button onClick={() => setView('ranking_list')} className="mt-4 bg-white text-primary border-none hover:bg-blue-50">Gestionar Torneos</Button>
                </div>
                <Trophy className="absolute right-0 bottom-0 text-white opacity-10 w-48 h-48 -mr-10 -mb-10 transform rotate-12" />
              </div>
            </div>
          )}

          {view === 'players' && (
             <PlayerList 
                players={players} 
                onAddPlayer={handleCreatePlayer}
                onDeletePlayer={handleDeletePlayer}
                onDeletePlayers={handleDeletePlayers}
             />
          )}

          {view === 'ranking_list' && (
            <RankingList 
              rankings={rankings} 
              onSelect={handleRankingSelect}
              onCreateClick={() => setView('ranking_create')}
            />
          )}

          {view === 'ranking_create' && (
              <RankingCreator 
                players={players} 
                onCancel={() => setView('ranking_list')} 
                onSave={handleSaveRanking}
              />
          )}

          {view === 'ranking_detail' && activeRanking && (
            <RankingView 
              ranking={activeRanking} 
              players={players}
              isAdmin={true}
              onMatchClick={openMatchModal}
              onBack={() => setView('ranking_list')}
              onAddDivision={handleAddDivision}
              onUpdateRanking={handleUpdateRanking}
            />
          )}

          {view === 'admin_management' && currentUser?.role === 'superadmin' && (
              <AdminManagement 
                  users={users}
                  onApprove={handleApproveAdmin}
                  onReject={handleRejectAdmin}
                  onDelete={handleDeleteAdmin}
                  onCreate={handleCreateAdmin}
              />
          )}

          {view === 'profile' && (
              <AdminProfile onClose={() => setView('dashboard')} />
          )}
        </main>
      </div>

      <MatchModal 
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        match={selectedMatch}
        players={players}
        onSave={handleMatchSave}
      />
      
      <GeminiAssistant />
    </div>
  );
};

export default App;
