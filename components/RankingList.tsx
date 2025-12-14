import { Plus, Trophy, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { Button } from './ui/Components';
import { Ranking } from '../types';

interface Props {
  rankings: Ranking[];
  onSelect: (ranking: Ranking) => void;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
}

export const RankingList = ({ rankings, onSelect, onCreateClick, onDelete }: Props) => {
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
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${ranking.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {ranking.status === 'activo' ? 'Activo' : 'Finalizado'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                      {ranking.format === 'americano' ? 'Americano' :
                        ranking.format === 'mexicano' ? 'Mexicano' :
                          ranking.format === 'individual' ? 'Individual' : 'Clásico'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('¿Seguro que quieres eliminar este torneo?')) onDelete(ranking.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Eliminar torneo"
                  >
                    <Trash2 size={16} />
                  </button>
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
      )}
    </div>
  );
};
