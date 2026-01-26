import React, { useState } from 'react';
import { Plus, Trophy, ChevronRight, Calendar, Trash2, User as UserIcon, Copy } from 'lucide-react';
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

  const filteredRankings = rankings.filter(r => {
    if (tab === 'activos') return r.status === 'activo' || r.status === 'pausado';
    return r.status === 'finalizado';
  });

  // Helper to group by owner
  const groupedRankings = () => {
    if (!users || users.length === 0) return { 'Mis Torneos': filteredRankings };

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

  const groups = groupedRankings();
  const hasMultipleGroups = Object.keys(groups).length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Torneos</h2>
          <p className="text-gray-500">Gestiona las competiciones y rankings</p>
        </div>
        <div className="flex items-center gap-4">
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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupRankings.map((ranking) => (
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
                                    ranking.format === 'elimination' ? 'Eliminación Directa' :
                                      ranking.format === 'hybrid' ? 'Liga + Playoff' : 'Ranking clásica CPSJ'}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
