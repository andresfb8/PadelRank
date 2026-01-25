import React, { useState } from 'react';
import { Modal, Button } from './ui/Components';
import { Player, Division, Match, RankingFormat } from '../types';
import { TournamentEngine } from '../services/TournamentEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nextDivisionNumber: number;
  players: Record<string, Player>;
  occupiedPlayerIds?: Set<string>;
  onSave: (division: Division | Division[]) => void;
  rankingFormat?: RankingFormat; // Add format to determine modal behavior
  hasConsolation?: boolean; // For elimination tournaments
}

export const AddDivisionModal = ({ isOpen, onClose, nextDivisionNumber, players, occupiedPlayerIds = new Set(), onSave, rankingFormat, hasConsolation = false }: Props) => {
  // League mode: 4 fixed players
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(['', '', '', '']);
  const [searchTerm, setSearchTerm] = useState('');

  // Elimination mode: manual pair formation
  const [categoryName, setCategoryName] = useState('');
  const [formedPairs, setFormedPairs] = useState<Array<{ p1Id: string; p2Id: string }>>([]);
  const [guestPairs, setGuestPairs] = useState<Array<{ p1Name: string; p2Name: string }>>([]);
  const [newPairP1, setNewPairP1] = useState(''); // Player 1 ID for new pair
  const [newPairP2, setNewPairP2] = useState(''); // Player 2 ID for new pair
  const [newGuestP1, setNewGuestP1] = useState('');
  const [newGuestP2, setNewGuestP2] = useState('');

  const isEliminationMode = rankingFormat === 'elimination';

  const handlePlayerSelect = (index: number, id: string) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = id;
    setSelectedPlayers(newSelected);
  };

  const handleAddFormedPair = () => {
    if (!newPairP1 || !newPairP2) {
      return alert("Selecciona ambos jugadores para formar la pareja");
    }
    if (newPairP1 === newPairP2) {
      return alert("Los jugadores deben ser diferentes");
    }

    // Check if either player is already in a formed pair
    const alreadyUsed = formedPairs.some(pair =>
      pair.p1Id === newPairP1 || pair.p2Id === newPairP1 ||
      pair.p1Id === newPairP2 || pair.p2Id === newPairP2
    );

    if (alreadyUsed) {
      return alert("Uno de los jugadores ya está en otra pareja");
    }

    setFormedPairs([...formedPairs, { p1Id: newPairP1, p2Id: newPairP2 }]);
    setNewPairP1('');
    setNewPairP2('');
  };

  const handleRemoveFormedPair = (index: number) => {
    setFormedPairs(formedPairs.filter((_, i) => i !== index));
  };

  const handleAddGuestPair = () => {
    if (!newGuestP1.trim() || !newGuestP2.trim()) {
      return alert("Ingresa ambos nombres de la pareja invitada");
    }

    setGuestPairs([...guestPairs, { p1Name: newGuestP1.trim(), p2Name: newGuestP2.trim() }]);
    setNewGuestP1('');
    setNewGuestP2('');
  };

  const handleRemoveGuestPair = (index: number) => {
    setGuestPairs(guestPairs.filter((_, i) => i !== index));
  };

  const generateCalendar = (playerIds: string[]): Match[] => {
    const matches: Match[] = [];
    const [p0, p1, p2, p3] = playerIds;
    const createMatch = (jornada: number, p1Id: string, p2Id: string, p3Id: string, p4Id: string): Match => ({
      id: `m-new-${crypto.randomUUID()}`,
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
    if (isEliminationMode) {
      console.log('🔧 Starting elimination mode save...');

      // Elimination mode validation
      if (!categoryName.trim()) return alert("Ingresa un nombre para la categoría");

      const totalPairs = formedPairs.length + guestPairs.length;
      console.log('🔧 Total pairs:', totalPairs, { formedPairs, guestPairs });

      if (totalPairs < 2) return alert("Forma al menos 2 parejas (o añade parejas invitadas)");

      // Process pairs into participant IDs for TournamentEngine
      // Format: "p1Id-p2Id" for existing pairs, generate guest IDs for guest pairs
      const participantIds: string[] = [];

      // Add formed pairs
      formedPairs.forEach(pair => {
        participantIds.push(`${pair.p1Id}-${pair.p2Id}`);
      });

      // Add guest pairs (generate IDs)
      guestPairs.forEach((guestPair) => {
        const guestP1Id = `guest-${crypto.randomUUID()}`;
        const guestP2Id = `guest-${crypto.randomUUID()}`;

        // Add to participant IDs
        participantIds.push(`${guestP1Id}-${guestP2Id}`);
      });

      console.log('🔧 Participant IDs:', participantIds);

      // Generate bracket using TournamentEngine
      try {
        const divisions = TournamentEngine.generateBracket(participantIds, hasConsolation);
        console.log('🔧 Generated divisions:', divisions);

        // Update the main division with category info
        if (divisions[0]) {
          divisions[0].numero = nextDivisionNumber;
          divisions[0].category = categoryName;
          divisions[0].name = categoryName;

          console.log('🔧 Saving main division:', divisions[0]);

          // Collect all divisions to save (main + consolation if exists)
          const divisionsToSave: Division[] = [divisions[0]];

          // If consolation exists, add it too
          if (divisions[1] && hasConsolation) {
            divisions[1].numero = nextDivisionNumber + 1;
            divisions[1].category = categoryName;
            divisions[1].name = `${categoryName} - Consolación`;

            console.log('🔧 Saving consolation division:', divisions[1]);
            divisionsToSave.push(divisions[1]);
          }

          // Save all divisions at once (single DB update for main + consolation)
          console.log('🔧 Total divisions to save:', divisionsToSave.length);
          onSave(divisionsToSave.length === 1 ? divisionsToSave[0] : divisionsToSave);
        } else {
          console.error('❌ No divisions generated!');
          alert('Error al generar el bracket. Por favor, intenta de nuevo.');
          return;
        }
      } catch (error) {
        console.error('❌ Error generating bracket:', error);
        alert('Error al generar el bracket: ' + (error as Error).message);
        return;
      }

      console.log('✅ Save complete, closing modal');
      onClose();
      setCategoryName('');
      setFormedPairs([]);
      setGuestPairs([]);
      setNewPairP1('');
      setNewPairP2('');
      setNewGuestP1('');
      setNewGuestP2('');
    } else {
      // League mode validation
      if (selectedPlayers.some(p => !p)) return alert("Selecciona 4 jugadores");
      if (new Set(selectedPlayers).size !== 4) return alert("Hay jugadores duplicados");

      const newDivision: Division = {
        id: `div-new-${crypto.randomUUID()}`,
        numero: nextDivisionNumber,
        status: 'activa',
        players: selectedPlayers,
        matches: generateCalendar(selectedPlayers)
      };

      onSave(newDivision);
      onClose();
      setSelectedPlayers(['', '', '', '']);
    }
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEliminationMode ? `Añadir Categoría ${nextDivisionNumber}` : `Añadir División ${nextDivisionNumber}`}>
      <div className="space-y-4">
        {isEliminationMode ? (
          /* ELIMINATION MODE: Category name + Participant selection */
          <>
            <p className="text-sm text-gray-500 mb-4">
              Crea una nueva categoría para el torneo de eliminación. Asigna un nombre y selecciona los participantes.
            </p>

            {/* Category Name Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre de la Categoría *</label>
              <input
                type="text"
                placeholder="Ej: Primera, Segunda, Mixta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            {/* Search Box */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Buscar Participantes</label>
              <input
                type="text"
                placeholder="Buscar por nombre o apellidos..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Manual Pair Formation */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Parejas Formadas ({formedPairs.length + guestPairs.length})
              </label>

              {/* Form a Pair - Select 2 players */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Formar Pareja con Jugadores Registrados:</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={newPairP1}
                    onChange={(e) => setNewPairP1(e.target.value)}
                  >
                    <option value="">Jugador 1...</option>
                    {Object.values(players)
                      .filter(p => !occupiedPlayerIds.has(p.id))
                      .filter(p => !formedPairs.some(pair => pair.p1Id === p.id || pair.p2Id === p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellidos}
                        </option>
                      ))}
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={newPairP2}
                    onChange={(e) => setNewPairP2(e.target.value)}
                  >
                    <option value="">Jugador 2...</option>
                    {Object.values(players)
                      .filter(p => !occupiedPlayerIds.has(p.id))
                      .filter(p => p.id !== newPairP1) // Cannot be the same as Player 1
                      .filter(p => !formedPairs.some(pair => pair.p1Id === p.id || pair.p2Id === p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellidos}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddFormedPair}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Añadir Pareja
                </button>
              </div>

              {/* Formed Pairs List */}
              {formedPairs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Parejas Registradas ({formedPairs.length}):</p>
                  <div className="space-y-1">
                    {formedPairs.map((pair, idx) => {
                      const p1 = players[pair.p1Id];
                      const p2 = players[pair.p2Id];
                      return (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm text-gray-700">
                            {p1?.nombre} {p1?.apellidos} / {p2?.nombre} {p2?.apellidos}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormedPair(idx)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guest Pairs Section */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Añadir Pareja Invitada:</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nombre Jugador 1"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={newGuestP1}
                    onChange={(e) => setNewGuestP1(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Nombre Jugador 2"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={newGuestP2}
                    onChange={(e) => setNewGuestP2(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddGuestPair}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Añadir
                  </button>
                </div>

                {/* Guest Pairs List */}
                {guestPairs.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <p className="text-xs text-gray-500 mb-1">Parejas Invitadas ({guestPairs.length}):</p>
                    {guestPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm text-gray-700">
                          {pair.p1Name} / {pair.p2Name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGuestPair(idx)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* LEAGUE MODE: Original 4-player interface */
          <>
            <p className="text-sm text-gray-500 mb-4">
              Selecciona 4 jugadores para crear la nueva división. Solo aparecen jugadores que no están participando actualmente en el torneo.
            </p>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar jugador por nombre or apellidos..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((idx) => {
                const available = getAvailablePlayers(idx);
                // Filter available by search term
                const filtered = available.filter(p =>
                  `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
                );

                // Limit to 5 results for performance/UX
                const displayedOptions = filtered.slice(0, 5);
                const currentSelectedId = selectedPlayers[idx];

                return (
                  <div key={idx}>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Jugador {idx + 1}</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={currentSelectedId}
                      onChange={(e) => handlePlayerSelect(idx, e.target.value)}
                    >
                      <option value="">Seleccionar...</option>

                      {/* Show Top 5 Matches */}
                      {displayedOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                      ))}

                      {/* Persistence: Show currently selected player if they are valid but NOT in the top 5 (e.g. filtered out by limit or search) */}
                      {currentSelectedId &&
                        !displayedOptions.some(p => p.id === currentSelectedId) &&
                        players[currentSelectedId] && (
                          <option value={currentSelectedId}>
                            {players[currentSelectedId].nombre} {players[currentSelectedId].apellidos} (Seleccionado)
                          </option>
                        )}
                    </select>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>
            {isEliminationMode ? 'Crear Categoría' : 'Crear División'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};