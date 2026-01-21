import React from 'react';
import { Player, Division, Ranking } from '../types';
import { Modal } from './ui/Components';

interface SubstituteData {
    oldPlayerId: string;
    newPlayerName: string;
    newPlayerEmail: string;
    nextPhaseDiv: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    players: Record<string, Player>;
    divisions: Division[];
    data: SubstituteData;
    onChange: (field: keyof SubstituteData, value: string) => void;
    onConfirm: () => void;
}

export const SubstituteModal = ({ isOpen, onClose, players, divisions, data, onChange, onConfirm }: Props) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sustituir Jugador (Lesión/Abandono)"
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jugador a Sustituir</label>
                    <select
                        className="w-full p-2 border rounded-md"
                        value={data.oldPlayerId}
                        onChange={(e) => onChange('oldPlayerId', e.target.value)}
                    >
                        <option value="">Seleccionar jugador...</option>
                        {/* Show only players from active divisions for substitution */}
                        {/* In a real scenario we'd filter this better passed from parent, but using all is fine for now */}
                        {Object.values(players).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                        ))}
                    </select>
                </div>

                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Nuevo Jugador</label>
                    <div className="grid gap-3">
                        <input
                            type="text"
                            placeholder="Nombre del nuevo jugador"
                            className="w-full p-2 border rounded-md"
                            value={data.newPlayerName}
                            onChange={(e) => onChange('newPlayerName', e.target.value)}
                        />
                        <input
                            type="email"
                            placeholder="Email (opcional)"
                            className="w-full p-2 border rounded-md"
                            value={data.newPlayerEmail}
                            onChange={(e) => onChange('newPlayerEmail', e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Este jugador entrará en lugar del anterior, heredando su posición en los partidos pendientes.
                    </p>
                </div>

                <div className="border-t pt-4 bg-yellow-50 p-3 rounded-md">
                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                        División Próxima Fase (Opcional - Override manual)
                    </label>
                    <p className="text-xs text-yellow-700 mb-2">
                        Si quieres forzar que este jugador empiece en una división concreta en la siguiente fase, indícalo aquí.
                        Si lo dejas en blanco, el sistema decidirá automáticamente según sus puntos.
                    </p>
                    <input
                        type="number"
                        min="1"
                        max={divisions.length}
                        placeholder="Ej: 3 (Para forzar División 3)"
                        className="w-full p-2 border border-yellow-300 rounded-md"
                        value={data.nextPhaseDiv}
                        onChange={(e) => onChange('nextPhaseDiv', e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
                    >
                        Confirmar Sustitución
                    </button>
                </div>
            </div>
        </Modal>
    );
};
