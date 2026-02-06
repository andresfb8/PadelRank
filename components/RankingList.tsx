import React, { useState } from 'react';
import { Plus, Trophy, ChevronRight, Calendar, Trash2, User as UserIcon, Copy, LayoutGrid, List, Building, ArrowLeft, Search } from 'lucide-react';
import { Button } from './ui/Components';
import { Ranking, User } from '../types';

interface Props {
  rankings: Ranking[];
  users?: User[]; // Optional, mostly for Superadmin to map names
  onSelect: (ranking: Ranking) => void;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const RankingList = ({ rankings, users, onSelect, onCreateClick, onDelete, onDuplicate }: Props) => {

  const [tab, setTab] = React.useState<'activos' | 'historial'>('activos');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  // --- DERIVED STATE ---
  const isSuperAdmin = users && users.length > 0;

  // Decide if we show the Client Directory or the Tournament List
  // Show Directory if: SuperAdmin AND No Client Selected AND No Search Active
  const showClientDirectory = isSuperAdmin && selectedClientId === 'all' && !searchQuery;

  // Filter Rankings (Same logic as before, but only runs if we are NOT in directory mode)
  const filteredRankings = rankings.filter(r => {
    // 1. Tab Filter
    const matchesTab = tab === 'activos'
      ? (r.status === 'activo' || r.status === 'pausado')
      : r.status === 'finalizado';
    if (!matchesTab) return false;

    // 2. Client Filter (SuperAdmin)
    if (isSuperAdmin && selectedClientId !== 'all') {
      if (r.ownerId !== selectedClientId) return false;
    }

    // 3. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = r.nombre.toLowerCase().includes(query);
      const categoryMatches = r.categoria.toLowerCase().includes(query);

      // Also search by owner name if SuperAdmin
      let matchesOwner = false;
      if (isSuperAdmin && r.ownerId) {
        const owner = users.find(u => u.id === r.ownerId);
        matchesOwner = owner?.name.toLowerCase().includes(query) || owner?.email.toLowerCase().includes(query) || false;
      }

      return matchesName || categoryMatches || matchesOwner;
    }

    return true;
  });

  // Helper to group by owner (only used if showing list mode with 'all' clients, e.g. search results)
  const groupedRankings = () => {
    if (!isSuperAdmin) return { 'Mis Torneos': filteredRankings };

    const groups: Record<string, Ranking[]> = {};
    const ownerMap = new Map(users.map(u => [u.id, u.name || u.email || 'Usuario Desconocido']));

    filteredRankings.forEach(r => {
      const ownerName = r.ownerId ? (ownerMap.get(r.ownerId) || 'Desconocido') : 'Sin Propietario';
      const key = r.ownerId ? ownerName : 'Públicos / Sin Asignar';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return groups;
  };

  // Logic for Client Directory
  const getClientStats = (userId: string) => {
    const userRankings = rankings.filter(r => r.ownerId === userId);
    return {
      total: userRankings.length,
      active: userRankings.filter(r => r.status === 'activo').length,
      finalized: userRankings.filter(r => r.status === 'finalizado').length
    };
  };

  // Render Client Directory
  if (showClientDirectory && users) {
    // Sort users: Most active tournaments first
    const sortedUsers = [...users].sort((a, b) => {
      const statsA = getClientStats(a.id);
      const statsB = getClientStats(b.id);
      return statsB.active - statsA.active;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Control Central</h2>
            <p className="text-gray-500">Selecciona un cliente para gestionar sus torneos</p>
          </div>

          {/* Global Search in Directory */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar torneo global..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none w-full shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedUsers.map(user => {
            const stats = getClientStats(user.id);
            return (
              <div
                key={user.id}
                onClick={() => setSelectedClientId(user.id)}
                className="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-lg cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building size={80} className="text-primary" />
                </div>

                <div className="flex items-start gap-4 mb-4 relative z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${stats.active > 0 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate" title={user.name}>{user.name || 'Sin Nombre'}</h3>
                    <p className="text-xs text-gray-400 truncate" title={user.email}>{user.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border uppercase ${user.plan === 'pro' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                        {user.plan || 'Basic'}
                      </span>
                      {user.clubName && (
                        <span className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[100px]">
                          {user.clubName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                    <div className="text-lg font-bold text-gray-900">{stats.active}</div>
                    <div className="text-xs text-gray-500">Activos</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                    <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                    <div className="text-xs text-gray-500">Totales</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add 'All Public' Card if needed, or just handle users */}
        </div>
      </div>
    );
  }

  // --- TOURNAMENT LIST VIEW (Filtered or Standard) ---

  const groups = groupedRankings();
  const hasMultipleGroups = Object.keys(groups).length > 1;
  const activeClientName = users?.find(u => u.id === selectedClientId)?.name || users?.find(u => u.id === selectedClientId)?.email || 'Cliente';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* Breadcrumb / Back Button logic */}
          {isSuperAdmin && selectedClientId !== 'all' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedClientId('all');
                  setSearchQuery('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{activeClientName}</h2>
                <p className="text-gray-500 text-sm">Gestionando sus torneos</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">
                {searchQuery ? `Resultados: "${searchQuery}"` : 'Torneos'}
              </h2>
              <p className="text-gray-500">Gestiona las competiciones y rankings</p>
            </>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          {/* Search */}
          {/* Only show search if we are NOT in the specific client view (to avoid confusion) OR if we want to allow searching inside a client */}
          {/* Let's allow searching inside the client view too */}
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={selectedClientId !== 'all' ? "Filtrar estos torneos..." : "Buscar torneo..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none w-full md:w-64"
            />
          </div>

          <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setTab('activos')}
              className={`px-4 py-1.5 rounded-md transition-all ${tab === 'activos' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Activos
            </button>
            <button
              onClick={() => setTab('historial')}
              className={`px-4 py-1.5 rounded-md transition-all ${tab === 'historial' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Historial
            </button>
          </div>

          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vista Lista"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={20} />
            </button>
          </div>

          <Button onClick={onCreateClick} className="flex items-center gap-2">
            <Plus size={18} /> Nuevo Ranking
          </Button>
        </div>
      </div>

      {filteredRankings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No hay torneos en esta sección</h3>
          <p className="text-gray-500 mb-4">{tab === 'activos' ? 'Crea un nuevo torneo para comenzar' : 'Los torneos finalizados aparecerán aquí'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([groupName, groupRankings]) => (
            <div key={groupName} className="space-y-4">
              {/* Only show header if we are displaying multiple groups (i.e. Search Mode across all clients) */}
              {(hasMultipleGroups && selectedClientId === 'all') && (
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <UserIcon size={20} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-700">{groupName}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{groupRankings.length}</span>
                </div>
              )}

              <div className={viewMode === 'grid'
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "grid gap-3 grid-cols-1 md:grid-cols-2"
              }>
                {groupRankings.map((ranking) => (
                  viewMode === 'grid' ? (
                    <div
                      key={ranking.id}
                      onClick={() => onSelect(ranking)}
                      className="group bg-white p-6 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 cursor-pointer transition-all relative overflow-hidden flex flex-col h-full"
                    >
                      <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                        <Trophy size={80} className="text-primary" />
                      </div>

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${ranking.status === 'activo' ? 'bg-green-50 text-green-700 border-green-100' :
                              ranking.status === 'pausado' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'
                              }`}>
                              {ranking.status === 'activo' ? 'Activo' : ranking.status === 'pausado' ? 'Pausado' : 'Finalizado'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/5 text-primary border border-primary/10">
                              {ranking.format}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate(ranking.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                              title="Duplicar torneo"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(ranking.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar torneo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mb-auto">
                          <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-primary transition-colors">{ranking.nombre}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <span className="uppercase tracking-wide text-[11px] font-bold text-gray-400">{ranking.categoria}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>{ranking.divisions.reduce((acc, d) => acc + d.players.length, 0)} JUGADORES</span>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-400 font-bold gap-1 mt-1">
                            <Calendar size={14} className="opacity-50" />
                            <span>{ranking.fechaInicio}</span>
                          </div>
                          <div className="flex items-center text-primary text-xs font-black uppercase tracking-widest">
                            Entrar <ChevronRight size={16} className="ml-0.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={ranking.id}
                      onClick={() => onSelect(ranking)}
                      className="group bg-white p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-2 h-12 rounded-full ${ranking.status === 'activo' ? 'bg-green-500' :
                          ranking.status === 'pausado' ? 'bg-orange-400' : 'bg-gray-400'
                          }`}></div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-bold text-gray-900 truncate">{ranking.nombre}</h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 uppercase font-semibold">
                              {ranking.format === 'americano' ? 'Americano' :
                                ranking.format === 'mexicano' ? 'Mexicano' :
                                  ranking.format === 'individual' ? 'Individual' :
                                    ranking.format === 'pairs' ? 'Parejas' :
                                      ranking.format === 'elimination' ? 'Eliminación' :
                                        ranking.format === 'hybrid' ? 'Híbrido' :
                                          ranking.format === 'pozo' ? 'Pozo' : 'Liga'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={14} /> {ranking.fechaInicio}</span>
                            <span>•</span>
                            <span>{ranking.categoria}</span>
                            <span>•</span>
                            <span>{ranking.divisions.reduce((acc, d) => acc + d.players.length, 0)} Jugadores</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(ranking.id);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(ranking.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-primary" />
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

