import React, { useState } from 'react';
import { Modal, Button } from './ui/Components';
import { Player, Division, Match } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nextDivisionNumber: number;
  players: Record<string, Player>;
  occupiedPlayerIds?: Set<string>;
  onSave: (division: Division) => void;
}

export const AddDivisionModal = ({ isOpen, onClose, nextDivisionNumber, players, occupiedPlayerIds = new Set(), onSave }: Props) => {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(['', '', '', '']);

  const handlePlayerSelect = (index: number, id: string) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = id;
    setSelectedPlayers(newSelected);
  };

  const generateCalendar = (playerIds: string[]): Match[] => {
    const matches: Match[] = [];
    const [p0, p1, p2, p3] = playerIds;
    const createMatch = (jornada: number, p1Id: string, p2Id: string, p3Id: string, p4Id: string): Match => ({
        id: `m-new-${Date.now()}-${jornada}-${Math.random().toString(36).substr(2, 9)}`,
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
    if (selectedPlayers.some(p => !p)) return alert("Selecciona 4 jugadores");
    if (new Set(selectedPlayers).size !== 4) return alert("Hay jugadores duplicados");

    const newDivision: Division = {
      id: `div-new-${Date.now()}`,
      numero: nextDivisionNumber,
      status: 'activa',
      players: selectedPlayers,
      matches: generateCalendar(selectedPlayers)
    };

    onSave(newDivision);
    onClose();
    setSelectedPlayers(['', '', '', '']);
  };

  // Filter logic: Player is available if NOT in occupiedPlayerIds AND NOT currently selected in another slot
  const getAvailablePlayers = (currentSlotIndex: number) => {
      return Object.values(players).filter(p => {
          const isOccupiedInTournament = occupiedPlayerIds.has(p.id);
          const isSelectedInThisModal = selectedPlayers.includes(p.id);
          const isCurrentSlotValue = selectedPlayers[currentSlotIndex] === p.id;
          
          if (isOccupiedInTournament) return false;
          if (isSelectedInThisModal && !isCurrentSlotValue) return false;
          
          return true;
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Añadir División ${nextDivisionNumber}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-4">
          Selecciona 4 jugadores para crear la nueva división. Solo aparecen jugadores que no están participando actualmente en el torneo.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const available = getAvailablePlayers(idx);
            return (
                <div key={idx}>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Jugador {idx + 1}</label>
                <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={selectedPlayers[idx]}
                    onChange={(e) => handlePlayerSelect(idx, e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {available.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                    ))}
                    {selectedPlayers[idx] && !available.some(p => p.id === selectedPlayers[idx]) && (
                         <option value={selectedPlayers[idx]}>
                            {players[selectedPlayers[idx]]?.nombre} {players[selectedPlayers[idx]]?.apellidos}
                         </option>
                    )}
                </select>
                </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
           <Button variant="secondary" onClick={onClose}>Cancelar</Button>
           <Button onClick={handleSave}>Crear División</Button>
        </div>
      </div>
    </Modal>
  );
};