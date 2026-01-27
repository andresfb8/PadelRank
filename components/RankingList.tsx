import React, { useState } from 'react';
import { Plus, Trophy, ChevronRight, Calendar, Trash2, User as UserIcon, Copy, LayoutGrid, List } from 'lucide-react';
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

  // Filter Rankings
  const filteredRankings = rankings.filter(r => {
    // 1. Tab Filter
    const matchesTab = tab === 'activos'
      ? (r.status === 'activo' || r.status === 'pausado')
      : r.status === 'finalizado';
    if (!matchesTab) return false;

    // 2. Client Filter (SuperAdmin)
    if (users && users.length > 0 && selectedClientId !== 'all') {
      if (r.ownerId !== selectedClientId) return false;
    }

    // 3. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = r.nombre.toLowerCase().includes(query);
      const categoryMatches = r.categoria.toLowerCase().includes(query);

      // Also search by owner name if SuperAdmin
      let matchesOwner = false;
      if (users && users.length > 0 && r.ownerId) {
        const owner = users.find(u => u.id === r.ownerId);
        matchesOwner = owner?.name.toLowerCase().includes(query) || owner?.email.toLowerCase().includes(query) || false;
      }

      return matchesName || categoryMatches || matchesOwner;
    }

    return true;
  });

  // Helper to group by owner
  const groupedRankings = () => {
    if (!users || users.length === 0) return { 'Mis Torneos': filteredRankings };

    // If filtering by specific client, don't group, just show that client's list (conceptually)
    // But keeping grouping logic is fine, it will just result in one group

    const groups: Record<string, Ranking[]> = {};
    const ownerMap = new Map(users.map(u => [u.id, u.name || u.email || 'Usuario Desconocido']));

    filteredRankings.forEach(r => {
      const ownerName = r.ownerId ? (ownerMap.get(r.ownerId) || 'Desconocido') : 'Sin Propietario';
      // If filtering by client, simplify group name? No, consisteny is better.
      const key = r.ownerId ? ownerName : 'Públicos / Sin Asignar';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return groups;
  };

  const groups = groupedRankings();
  const hasMultipleGroups = Object.keys(groups).length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Torneos</h2>
          <p className="text-gray-500">Gestiona las competiciones y rankings</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar torneo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none w-full md:w-64"
            />
          </div>

          {/* Client Filter (SuperAdmin) */}
          {users && users.length > 0 && (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none bg-white w-full md:w-auto"
            >
              <option value="all">Todos los Clientes</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          )}

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
              {hasMultipleGroups && (
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
                      className="group bg-white p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={64} className="text-primary" />
                      </div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${ranking.status === 'activo' ? 'bg-green-100 text-green-700' :
                              ranking.status === 'pausado' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                              {ranking.status === 'activo' ? 'Activo' : ranking.status === 'pausado' ? 'Pausado' : 'Finalizado'}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                              {ranking.format === 'americano' ? 'Americano' :
                                ranking.format === 'mexicano' ? 'Mexicano' :
                                  ranking.format === 'individual' ? 'Individual' :
                                    ranking.format === 'pairs' ? 'Ranking por Parejas' :
                                      ranking.format === 'elimination' ? 'Eliminación' :
                                        ranking.format === 'hybrid' ? 'Híbrido' : 'Ranking clásica'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate(ranking.id);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                              title="Duplicar torneo"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(ranking.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Eliminar torneo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{ranking.nombre}</h3>
                        <p className="text-gray-500 text-sm mb-4">
                          {ranking.categoria}
                          <span className="mx-2">•</span>
                          {ranking.divisions.reduce((acc, d) => acc + d.players.length, 0)} Jugadores
                        </p>

                        <div className="flex items-center text-sm text-gray-400 gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{ranking.fechaInicio}</span>
                          </div>
                          {ranking.rules && (
                            <div className="flex items-center gap-1 text-orange-600" title="Tiene normas específicas">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              <span>Normas</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-primary text-sm font-medium">
                          Ver Detalles <ChevronRight size={16} className="ml-1" />
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
                                        ranking.format === 'hybrid' ? 'Híbrido' : 'Liga'}
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
