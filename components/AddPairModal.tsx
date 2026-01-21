import React, { useState } from 'react';
import { Player, Division } from '../types';
import { Modal } from './ui/Components';
import { SearchableSelect } from './SearchableSelect';
import { Button } from './ui/Components'; // Assuming Button component exists or using standard HTML button

interface Props {
    isOpen: boolean;
    onClose: () => void;
    players: Record<string, Player>;
    occupiedPlayerIds: string[];
    onAddPair: (p1Id: string, p2Id: string) => void;
}

export const AddPairModal = ({ isOpen, onClose, players, occupiedPlayerIds, onAddPair }: Props) => {
    const [p1Id, setP1Id] = useState('');
    const [p2Id, setP2Id] = useState('');

    const availablePlayers = Object.values(players).filter(p => !occupiedPlayerIds.includes(p.id));

    const handleAdd = () => {
        if (p1Id && p2Id && p1Id !== p2Id) {
            onAddPair(p1Id, p2Id);
            onClose();
            setP1Id('');
            setP2Id('');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Añadir Nueva Pareja"
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Selecciona dos jugadores para formar una nueva pareja.
                    Al añadirla, se regenerará el calendario de esta división si no hay partidos jugados.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jugador 1</label>
                    <SearchableSelect
                        options={availablePlayers.filter(p => p.id !== p2Id).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                        value={p1Id}
                        onChange={setP1Id}
                        placeholder="Seleccionar jugador..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jugador 2</label>
                    <SearchableSelect
                        options={availablePlayers.filter(p => p.id !== p1Id).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }))}
                        value={p2Id}
                        onChange={setP2Id}
                        placeholder="Seleccionar compañero..."
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleAdd} disabled={!p1Id || !p2Id}>
                        Añadir Pareja
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
