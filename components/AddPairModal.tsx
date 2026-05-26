import React, { useState } from 'react';
import { Player } from '../types';
import { Modal } from './ui/Components';
import { SearchableSelect } from './SearchableSelect';
import { Button } from './ui/Components';
import { UserPlus, X } from 'lucide-react';

export interface GuestPlayer {
    id: string;
    nombre: string;
    apellidos?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    players: Record<string, Player>;
    occupiedPlayerIds: string[];
    onAddPair: (p1Id: string, p2Id: string, newGuests?: GuestPlayer[]) => void;
}

export const AddPairModal = ({ isOpen, onClose, players, occupiedPlayerIds, onAddPair }: Props) => {
    const [p1Id, setP1Id] = useState('');
    const [p2Id, setP2Id] = useState('');

    // Guest players created inline, living only in this tournament (not in the DB)
    const [localGuests, setLocalGuests] = useState<GuestPlayer[]>([]);
    const [guestNombre, setGuestNombre] = useState('');
    const [guestApellidos, setGuestApellidos] = useState('');

    const reset = () => {
        setP1Id('');
        setP2Id('');
        setLocalGuests([]);
        setGuestNombre('');
        setGuestApellidos('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleCreateGuest = () => {
        const nombre = guestNombre.trim();
        if (!nombre) return;
        const guest: GuestPlayer = {
            id: `guest-${crypto.randomUUID()}`,
            nombre,
            apellidos: guestApellidos.trim(),
        };
        setLocalGuests(prev => [...prev, guest]);
        setGuestNombre('');
        setGuestApellidos('');
        // Auto-assign to the first empty slot for convenience
        if (!p1Id) setP1Id(guest.id);
        else if (!p2Id) setP2Id(guest.id);
    };

    const handleRemoveGuest = (id: string) => {
        setLocalGuests(prev => prev.filter(g => g.id !== id));
        if (p1Id === id) setP1Id('');
        if (p2Id === id) setP2Id('');
    };

    const handleAdd = () => {
        if (p1Id && p2Id && p1Id !== p2Id) {
            const usedGuests = localGuests.filter(g => g.id === p1Id || g.id === p2Id);
            onAddPair(p1Id, p2Id, usedGuests);
            reset();
            onClose();
        }
    };

    // DB players not already in another pair + guests created in this session
    const dbOptions = Object.values(players)
        .filter(p => !occupiedPlayerIds.includes(p.id))
        .map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
    const guestOptions = localGuests.map(g => ({
        id: g.id,
        label: `${g.nombre}${g.apellidos ? ' ' + g.apellidos : ''} (invitado)`,
    }));
    const allOptions = [...dbOptions, ...guestOptions];

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
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
                        options={allOptions.filter(o => o.id !== p2Id)}
                        value={p1Id}
                        onChange={setP1Id}
                        placeholder="Seleccionar jugador..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jugador 2</label>
                    <SearchableSelect
                        options={allOptions.filter(o => o.id !== p1Id)}
                        value={p2Id}
                        onChange={setP2Id}
                        placeholder="Seleccionar compañero..."
                    />
                </div>

                {/* Guest player creation: lives only in this tournament, not saved to the DB */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-800">
                        <UserPlus size={14} /> Crear jugador invitado (solo para este torneo)
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={guestNombre}
                            onChange={e => setGuestNombre(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGuest(); } }}
                            placeholder="Nombre"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <input
                            type="text"
                            value={guestApellidos}
                            onChange={e => setGuestApellidos(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGuest(); } }}
                            placeholder="Apellidos (opcional)"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <Button variant="secondary" onClick={handleCreateGuest} disabled={!guestNombre.trim()}>
                            Crear
                        </Button>
                    </div>
                    {localGuests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {localGuests.map(g => (
                                <span key={g.id} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full">
                                    {g.nombre}{g.apellidos ? ` ${g.apellidos}` : ''}
                                    <button onClick={() => handleRemoveGuest(g.id)} className="text-blue-400 hover:text-red-500">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleAdd} disabled={!p1Id || !p2Id || p1Id === p2Id}>
                        Añadir Pareja
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
