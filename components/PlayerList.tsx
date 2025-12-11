import React, { useState, useMemo } from 'react';
import { Button } from './ui/Components';
import { Player } from '../types';
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  players: Record<string, Player>;
  onAddPlayer: () => void;
  onDeletePlayer: (id: string) => void;
  onDeletePlayers: (ids: string[]) => void;
}

type SortField = 'nombre' | 'pj' | 'pg' | 'pp' | 'winrate';
type SortDirection = 'asc' | 'desc';

export const PlayerList = ({ players, onAddPlayer, onDeletePlayer, onDeletePlayers }: Props) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(Object.keys(players)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (confirm(`¿Estás seguro de eliminar ${selectedIds.size} jugadores?`)) {
        onDeletePlayers(Array.from(selectedIds));
        setSelectedIds(new Set());
    }
  };

  const handleDeleteOne = (id: string) => {
    if (confirm('¿Eliminar este jugador?')) {
        onDeletePlayer(id);
    }
  };

  const sortedPlayers = useMemo(() => {
    return Object.values(players).sort((a, b) => {
      let valA: any = a[sortField as keyof Player];
      let valB: any = b[sortField as keyof Player];

      if (sortField === 'pj' || sortField === 'pg' || sortField === 'pp' || sortField === 'winrate') {
        valA = a.stats[sortField];
        valB = b.stats[sortField];
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [players, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 ml-1 inline" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-primary ml-1 inline" /> : <ArrowDown size={14} className="text-primary ml-1 inline" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Base de Datos de Jugadores</h2>
            <p className="text-gray-500 text-sm">
                {Object.keys(players).length} jugadores registrados
            </p>
        </div>
        <div className="flex gap-2">
            {selectedIds.size > 0 && (
                <Button variant="danger" onClick={handleDeleteSelected}>
                    <Trash2 size={16} /> Eliminar ({selectedIds.size})
                </Button>
            )}
            <Button onClick={onAddPlayer}>+ Nuevo Jugador</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500 border-b border-gray-100">
            <tr>
                <th className="px-6 py-4 w-10">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedIds.size === Object.keys(players).length && Object.keys(players).length > 0}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('nombre')}>
                    Nombre Completo <SortIcon field="nombre" />
                </th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pj')}>
                    PJ <SortIcon field="pj" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pg')}>
                    PG <SortIcon field="pg" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pp')}>
                    PP <SortIcon field="pp" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('winrate')}>
                    % Vic <SortIcon field="winrate" />
                </th>
                <th className="px-6 py-4 text-center w-10">Acciones</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {sortedPlayers.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-6 py-4">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(p.id)}
                        onChange={() => handleSelectOne(p.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                    {p.nombre} {p.apellidos}
                </td>
                <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{p.email}</div>
                    <div className="text-xs text-gray-500">{p.telefono}</div>
                </td>
                <td className="px-6 py-4 text-center text-gray-600 font-medium">{p.stats.pj}</td>
                <td className="px-6 py-4 text-center text-green-600 font-medium">{p.stats.pg}</td>
                <td className="px-6 py-4 text-center text-red-600 font-medium">{p.stats.pp}</td>
                <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${p.stats.winrate >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {p.stats.winrate}%
                    </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <button 
                        onClick={() => handleDeleteOne(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar Jugador"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
                </tr>
            ))}
            {sortedPlayers.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                        No se encontraron jugadores.
                    </td>
                </tr>
            )}
            </tbody>
        </table>
      </div>
    </div>
  );
};