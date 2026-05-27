import React, { useState, useMemo } from 'react';
import { Modal, Button } from './ui/Components';
import { SearchableSelect } from './SearchableSelect';
import { Ranking, Player } from '../types';
import { makePairKey } from '../services/SchedulerEngine';
import { ArrowDown, UserPlus, X, AlertTriangle } from 'lucide-react';

export interface GuestPlayer {
    id: string;
    nombre: string;
    apellidos?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    players: Record<string, Player>;
    onSubstitute: (outgoingPairKey: string, incoming: { p1Id: string; p2Id?: string }, newGuests: GuestPlayer[]) => void;
}

export const SubstitutePairModal = ({ isOpen, onClose, ranking, players, onSubstitute }: Props) => {
    const [outgoingKey, setOutgoingKey] = useState('');
    const [inP1, setInP1] = useState('');
    const [inP2, setInP2] = useState('');

    const [localGuests, setLocalGuests] = useState<GuestPlayer[]>([]);
    const [guestNombre, setGuestNombre] = useState('');
    const [guestApellidos, setGuestApellidos] = useState('');

    // Pairs currently present in the bracket (across all divisions)
    const bracketPairs = useMemo(() => {
        const map = new Map<string, { key: string; label: string }>();
        ranking.divisions.forEach(div => div.matches.forEach(m => {
            ([m.pair1, m.pair2] as { p1Id: string; p2Id?: string }[]).forEach(pair => {
                if (!pair.p1Id || pair.p1Id === 'BYE') return;
                const key = makePairKey(pair.p1Id, pair.p2Id || undefined);
                if (!map.has(key)) {
                    const n1 = players[pair.p1Id] ? `${players[pair.p1Id].nombre} ${players[pair.p1Id].apellidos.charAt(0)}.` : pair.p1Id;
                    const n2 = pair.p2Id ? (players[pair.p2Id] ? `${players[pair.p2Id].nombre} ${players[pair.p2Id].apellidos.charAt(0)}.` : pair.p2Id) : '';
                    map.set(key, { key, label: n2 ? `${n1} / ${n2}` : n1 });
                }
            });
        }));
        return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [ranking.divisions, players]);

    const reset = () => {
        setOutgoingKey(''); setInP1(''); setInP2('');
        setLocalGuests([]); setGuestNombre(''); setGuestApellidos('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleCreateGuest = () => {
        const nombre = guestNombre.trim();
        if (!nombre) return;
        const guest: GuestPlayer = {
            id: `guest-${crypto.randomUUID()}`,
            nombre,
            apellidos: guestApellidos.trim(),
        };
        setLocalGuests(prev => [...prev, guest]);
        setGuestNombre(''); setGuestApellidos('');
        if (!inP1) setInP1(guest.id);
        else if (!inP2) setInP2(guest.id);
    };

    const handleRemoveGuest = (id: string) => {
        setLocalGuests(prev => prev.filter(g => g.id !== id));
        if (inP1 === id) setInP1('');
        if (inP2 === id) setInP2('');
    };

    const playerOptions = useMemo(() => {
        const db = Object.values(players).map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
        const guests = localGuests.map(g => ({ id: g.id, label: `${g.nombre}${g.apellidos ? ' ' + g.apellidos : ''} (invitado)` }));
        return [...db, ...guests];
    }, [players, localGuests]);

    const canSubmit = !!outgoingKey && !!inP1 && inP1 !== inP2;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const usedGuests = localGuests.filter(g => g.id === inP1 || g.id === inP2);
        onSubstitute(outgoingKey, { p1Id: inP1, p2Id: inP2 || undefined }, usedGuests);
        reset();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Sustituir Pareja (Lesión/Baja)">
            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                        Reemplaza una pareja del cuadro por otra (existente o invitada) en todas sus
                        posiciones. Pensado para bajas antes de empezar. Los resultados ya jugados no se recalculan.
                    </span>
                </div>

                {/* Outgoing pair */}
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <label className="block text-sm font-bold text-red-700 mb-1">1. Pareja que sale (Baja)</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                        value={outgoingKey}
                        onChange={e => setOutgoingKey(e.target.value)}
                    >
                        <option value="">Seleccionar pareja del cuadro...</option>
                        {bracketPairs.map(p => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-center">
                    <div className="p-2 rounded-full border border-gray-200 text-gray-400">
                        <ArrowDown size={16} />
                    </div>
                </div>

                {/* Incoming pair */}
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-3">
                    <label className="block text-sm font-bold text-green-700">2. Pareja que entra (Alta)</label>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Jugador 1</label>
                        <SearchableSelect
                            options={playerOptions.filter(o => o.id !== inP2)}
                            value={inP1}
                            onChange={setInP1}
                            placeholder="Buscar jugador..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Jugador 2</label>
                        <SearchableSelect
                            options={playerOptions.filter(o => o.id !== inP1)}
                            value={inP2}
                            onChange={setInP2}
                            placeholder="Buscar compañero..."
                        />
                    </div>

                    {/* Inline guest creation */}
                    <div className="bg-white border border-green-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-800">
                            <UserPlus size={13} /> Crear pareja invitada (no está en la base de datos)
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text" value={guestNombre}
                                onChange={e => setGuestNombre(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGuest(); } }}
                                placeholder="Nombre"
                                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                            <input
                                type="text" value={guestApellidos}
                                onChange={e => setGuestApellidos(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGuest(); } }}
                                placeholder="Apellidos (opcional)"
                                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                            <Button variant="secondary" onClick={handleCreateGuest} disabled={!guestNombre.trim()}>
                                Crear
                            </Button>
                        </div>
                        {localGuests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {localGuests.map(g => (
                                    <span key={g.id} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs px-2 py-1 rounded-full">
                                        {g.nombre}{g.apellidos ? ` ${g.apellidos}` : ''}
                                        <button onClick={() => handleRemoveGuest(g.id)} className="text-green-400 hover:text-red-500">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>Confirmar Cambio</Button>
                </div>
            </div>
        </Modal>
    );
};
