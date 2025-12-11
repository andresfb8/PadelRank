import React, { useState } from 'react';
import { Save, X, User as UserIcon, Calendar, Users, Trophy } from 'lucide-react';
import { Button, Card, Input } from './ui/Components';
import { Player, Ranking, Division, Match } from '../types';

interface Props {
  players: Record<string, Player>;
  onCancel: () => void;
  onSave: (ranking: Ranking) => void;
}

export const RankingCreator = ({ players, onCancel, onSave }: Props) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Masculino' | 'Femenino' | 'Mixto'>('Mixto');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [numDivisions, setNumDivisions] = useState(1);
  
  // State for player assignment: Record<divisionIndex, string[]>
  const [assignments, setAssignments] = useState<Record<number, string[]>>({ 0: ['', '', '', ''] });

  const handleDivisionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value) || 1;
    setNumDivisions(num);
    // Initialize assignments for new divisions
    const newAssignments = { ...assignments };
    for (let i = 0; i < num; i++) {
        if (!newAssignments[i]) newAssignments[i] = ['', '', '', ''];
    }
    setAssignments(newAssignments);
  };

  const handlePlayerSelect = (divIndex: number, playerIndex: number, playerId: string) => {
    const newAssignments = { ...assignments };
    newAssignments[divIndex][playerIndex] = playerId;
    setAssignments(newAssignments);
  };

  const generateCalendar = (playerIds: string[], divIndex: number): Match[] => {
    // Round Robin for 4 players logic
    const matches: Match[] = [];
    if (playerIds.length < 4) return matches;
    const [p0, p1, p2, p3] = playerIds;

    const createMatch = (jornada: number, p1Id: string, p2Id: string, p3Id: string, p4Id: string): Match => ({
        id: `m-${Date.now()}-${divIndex}-${jornada}-${Math.random().toString(36).substr(2, 9)}`,
        jornada,
        pair1: { p1Id, p2Id },
        pair2: { p1Id: p3Id, p2Id: p4Id },
        status: 'pendiente',
        points: { p1: 0, p2: 0 }
    });

    matches.push(createMatch(1, p0, p1, p2, p3));
    matches.push(createMatch(2, p0, p2, p1, p3));
    matches.push(createMatch(3, p0, p3, p1, p2));

    return matches;
  };

  const handleSave = () => {
    // Validate
    if (!name.trim()) return alert("El nombre es obligatorio");
    
    const divisions: Division[] = [];
    
    for (let i = 0; i < numDivisions; i++) {
        const divPlayers = assignments[i];
        if (!divPlayers || divPlayers.some(p => !p)) return alert(`Faltan jugadores en la División ${i + 1}`);
        // Check duplicates
        const unique = new Set(divPlayers);
        if (unique.size !== 4) return alert(`Hay jugadores duplicados en la División ${i + 1}`);

        divisions.push({
            id: `div-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            numero: i + 1,
            status: 'activa',
            players: divPlayers,
            matches: generateCalendar(divPlayers, i)
        });
    }

    const newRanking: Ranking = {
        id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre: name,
        categoria: category,
        fechaInicio: startDate,
        status: 'activo',
        divisions,
        publicUrl: `https://padelrank.app/ranking/r-${Date.now()}` // Mock URL
    };

    onSave(newRanking);
  };

  const availablePlayers = Object.values(players);

  // Helper to get used players across ALL divisions
  const getUsedPlayerIds = () => {
      const used = new Set<string>();
      Object.values(assignments).forEach(divPlayers => {
          divPlayers.forEach(pid => {
              if(pid) used.add(pid);
          });
      });
      return used;
  };

  const usedIds = getUsedPlayerIds();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-center sticky top-0 bg-gray-50 z-20 py-4 shadow-sm px-1">
            <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Ranking</h2>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button onClick={handleSave} className="px-6"><Save size={18} className="mr-2"/> Guardar y Generar</Button>
            </div>
        </div>

        <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2"><Trophy size={20} className="text-primary"/> Información General</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <Input label="Nombre del Torneo" placeholder="Ej: Liga Invierno 2025" value={name} onChange={(e: any) => setName(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        value={category}
                        onChange={(e: any) => setCategory(e.target.value)}
                    >
                        <option value="Mixto">Mixto</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                    <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
            </div>
        </Card>

        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Users size={20} className="text-primary"/> Configuración de Divisiones</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Nº Divisiones:</span>
                    <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-primary outline-none"
                        value={numDivisions}
                        onChange={handleDivisionChange}
                    />
                </div>
            </div>

            <div className="space-y-6">
                {Array.from({ length: numDivisions }).map((_, divIdx) => (
                    <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-3 flex justify-between">
                            <span>División {divIdx + 1}</span>
                            <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">4 Jugadores</span>
                        </h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            {[0, 1, 2, 3].map((playerIdx) => {
                                const currentValue = assignments[divIdx]?.[playerIdx] || '';
                                return (
                                <div key={playerIdx}>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Jugador {playerIdx + 1}</label>
                                    <select 
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-primary bg-white"
                                        value={currentValue}
                                        onChange={(e) => handlePlayerSelect(divIdx, playerIdx, e.target.value)}
                                    >
                                        <option value="">Seleccionar Jugador...</option>
                                        {availablePlayers.map(p => {
                                            // Show option if NOT used anywhere OR if it is the current value of THIS selector
                                            if (usedIds.has(p.id) && p.id !== currentValue) return null;
                                            return (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.apellidos}
                                                </option>
                                            );
                                        })}
                                        {/* Ensure current value is always visible even if logic is tricky */}
                                        {currentValue && !availablePlayers.find(p => p.id === currentValue) && (
                                            <option value={currentValue}>Unknown</option>
                                        )}
                                    </select>
                                </div>
                            )})}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    </div>
  );
};