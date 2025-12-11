import React from 'react';
import { Plus, Trophy, ChevronRight, Calendar } from 'lucide-react';
import { Button } from './ui/Components';
import { Ranking } from '../types';

interface Props {
  rankings: Ranking[];
  onSelect: (ranking: Ranking) => void;
  onCreateClick: () => void;
}

export const RankingList = ({ rankings, onSelect, onCreateClick }: Props) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis Torneos</h2>
          <p className="text-gray-500">Gestiona tus competiciones y rankings</p>
        </div>
        <Button onClick={onCreateClick} className="flex items-center gap-2">
          <Plus size={18} /> Nuevo Ranking
        </Button>
      </div>

      {rankings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Trophy size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No hay torneos creados</h3>
              <p className="text-gray-500 mb-4">Crea tu primer ranking para comenzar</p>
              <Button onClick={onCreateClick}>Crear Ranking</Button>
          </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rankings.map((ranking) => (
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
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${ranking.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {ranking.status === 'activo' ? 'Activo' : 'Finalizado'}
                    </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{ranking.nombre}</h3>
                <p className="text-gray-500 text-sm mb-4">{ranking.categoria} • {ranking.divisions.length} Divisiones</p>
                
                <div className="flex items-center text-sm text-gray-400 gap-2">
                    <Calendar size={14} />
                    <span>Iniciado: {ranking.fechaInicio}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-primary text-sm font-medium">
                    Ver Detalles <ChevronRight size={16} className="ml-1" />
                </div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};
