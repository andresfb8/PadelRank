import React, { useState, useMemo } from 'react';
import { Button } from './ui/Components';
import { Player } from '../types';
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown, Edit, Download, Upload } from 'lucide-react';

interface Props {
  players: Record<string, Player>;
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  onDeletePlayers: (ids: string[]) => void;
  onImportPlayers: (players: any[]) => void;
}

type SortField = 'nombre' | 'pj' | 'pg' | 'pp' | 'winrate';
type SortDirection = 'asc' | 'desc';

export const PlayerList = ({ players, onAddPlayer, onEditPlayer, onDeletePlayer, onDeletePlayers, onImportPlayers }: Props) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleExportCSV = () => {
    const headers = ['Nombre,Apellidos,Email,Telefono'];
    const rows = Object.values(players).map(p =>
      `"${p.nombre}","${p.apellidos}","${p.email}","${p.telefono}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jugadores_padel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    document.getElementById('csvInput')?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.trim()).filter(Boolean);
      // Skip header if present (simple check if first row contains "Nombre")
      const startIndex = rows[0]?.toLowerCase().includes('nombre') ? 1 : 0;

      const newPlayers = [];
      for (let i = startIndex; i < rows.length; i++) {
        // Handle quotes if exported from Excel, simplistic CSV parser
        const cols = rows[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2) {
          newPlayers.push({
            nombre: cols[0],
            apellidos: cols[1],
            email: cols[2] || '',
            telefono: cols[3] || ''
          });
        }
      }

      if (newPlayers.length > 0) {
        onImportPlayers(newPlayers);
      } else {
        alert('No se encontraron datos válidos en el CSV.');
      }
      // Reset input
      event.target.value = '';
    };
    reader.readAsText(file);
  };

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
    let filtered = Object.values(players);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.nombre.toLowerCase().includes(lower) ||
        p.apellidos.toLowerCase().includes(lower) ||
        p.email.toLowerCase().includes(lower)
      );
    }
    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof Player];
      let valB: any = b[sortField as keyof Player];

      if (sortField === 'pj' || sortField === 'pg' || sortField === 'pp' || sortField === 'winrate') {
        // Defensive: ensure stats exists
        valA = a.stats?.[sortField] ?? 0;
        valB = b.stats?.[sortField] ?? 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [players, sortField, sortDirection, searchTerm]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 ml-1 inline" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-primary ml-1 inline" /> : <ArrowDown size={14} className="text-primary ml-1 inline" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Header / Controls */}
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Base de Datos</h2>
          <p className="text-gray-500 text-sm">
            {Object.keys(players).length} jugadores registrados
          </p>
        </div>

        {/* Mobile: Search takes full width, Buttons scrollable or stacked */}
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar..."
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-64 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <input
              type="file"
              id="csvInput"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="secondary" onClick={handleImportClick} title="Importar CSV" className="whitespace-nowrap">
              <Upload size={18} /> <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="secondary" onClick={handleExportCSV} title="Exportar CSV" className="whitespace-nowrap">
              <Download size={18} /> <span className="hidden sm:inline">Exportar</span>
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="danger" onClick={handleDeleteSelected} className="whitespace-nowrap">
                <Trash2 size={18} /> <span className="hidden sm:inline">Borrar ({selectedIds.size})</span>
              </Button>
            )}
            {/* Desktop Only Add Button */}
            <div className="hidden md:block">
              <Button onClick={onAddPlayer}>+ Nuevo</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-0">

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-600 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.size === Object.keys(players).length && Object.keys(players).length > 0}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('nombre')}>
                  Nombre <SortIcon field="nombre" />
                </th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pj')}>
                  PJ <SortIcon field="pj" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pg')}>
                  PG <SortIcon field="pg" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pp')}>
                  PP <SortIcon field="pp" />
                </th>
                <th className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('winrate')}>
                  % Vic <SortIcon field="winrate" />
                </th>
                <th className="px-6 py-4 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedPlayers.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(p.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => handleSelectOne(p.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{p.nombre} {p.apellidos}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{p.email}</div>
                    <div className="text-xs text-secondary-400">{p.telefono}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-gray-700">{p.stats?.pj ?? 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-green-600">{p.stats?.pg ?? 0}</td>
                  <td className="px-6 py-4 text-center font-bold text-red-500">{p.stats?.pp ?? 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${(p.stats?.winrate ?? 0) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {p.stats?.winrate ?? 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditPlayer(p)}
                        className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteOne(p.id)}
                        className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 pb-20">
          {sortedPlayers.map(p => (
            <div key={p.id} className="bg-white border boundary-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{p.nombre} {p.apellidos}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${(p.stats?.winrate ?? 0) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.stats?.winrate ?? 0}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{p.email}</div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <div><span className="font-bold">{p.stats?.pj ?? 0}</span> PJ</div>
                  <div className="text-green-600"><span className="font-bold">{p.stats?.pg ?? 0}</span> W</div>
                  <div className="text-red-500"><span className="font-bold">{p.stats?.pp ?? 0}</span> L</div>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button onClick={() => onEditPlayer(p)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-primary-600">
                  <Edit size={20} />
                </button>
              </div>
            </div>
          ))}
          {sortedPlayers.length === 0 && (
            <div className="text-center py-10 text-gray-400 italic">No se encontraron jugadores</div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={onAddPlayer}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-600/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 ring-4 ring-white"
      >
        <span className="text-3xl font-light mb-1">+</span>
      </button>

    </div>
  );
};