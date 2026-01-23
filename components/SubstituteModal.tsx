import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from './ui/Components';
import { Player } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubstitute: (data: { oldPlayerId: string, newPlayerId: string, nextPhaseDiv?: string }) => void;
    divisionPlayers: Player[];
    availablePlayers: Player[];
    currentDiv: number;
}

export const SubstituteModal = ({ isOpen, onClose, onSubstitute, divisionPlayers, availablePlayers, currentDiv }: Props) => {
    const [oldPlayerId, setOldPlayerId] = useState('');
    const [newPlayerId, setNewPlayerId] = useState('');
    const [nextPhaseDiv, setNextPhaseDiv] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubstitute({ oldPlayerId, newPlayerId, nextPhaseDiv });
        onClose();
    };

    if (!isOpen) return null;

    // Filter candidates (all available minus those in this division)
    const candidates = availablePlayers.filter(p => !divisionPlayers.some(dp => dp.id === p.id));

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Sustituir Jugador (Lesión/Baja)</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Step 1: Who leaves? */}
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <label className="block text-sm font-bold text-red-800 mb-2">1. Jugador que sale (Baja)</label>
                        <select
                            className="input-field w-full border p-2 rounded-lg bg-white"
                            value={oldPlayerId}
                            onChange={(e) => setOldPlayerId(e.target.value)}
                            required
                        >
                            <option value="">Seleccionar jugador...</option>
                            {divisionPlayers.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center -my-3 relative z-10">
                        <div className="bg-white p-1 rounded-full border shadow-sm text-gray-400">
                            <ArrowRight className="rotate-90" size={20} />
                        </div>
                    </div>

                    {/* Step 2: Who enters? */}
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <label className="block text-sm font-bold text-green-800 mb-2">2. Jugador que entra (Alta)</label>
                        <SearchableSelect
                            options={candidates.map(p => ({
                                id: p.id,
                                label: `${p.nombre} ${p.apellidos}`,
                                subLabel: `Winrate: ${p.stats?.winrate || 0}%`
                            }))}
                            value={newPlayerId}
                            onChange={(id) => setNewPlayerId(id)}
                            placeholder="Buscar sustituto..."
                        />
                        {newPlayerId && <p className="text-xs text-green-700 mt-2 font-medium">✅ Jugador seleccionado</p>}
                    </div>

                    {/* Step 3: Next Phase Config */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            División para la Siguiente Fase (Opcional)
                        </label>
                        <input
                            type="number"
                            className="input-field w-full border p-2 rounded-lg"
                            placeholder={`Ej: ${currentDiv} (Mantener) o ${currentDiv + 1} (Bajar)`}
                            value={nextPhaseDiv}
                            onChange={(e) => setNextPhaseDiv(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Si se deja vacío, se aplicarán las reglas normales de ascenso/descenso sobre el nuevo jugador.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={onClose} type="button" className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!oldPlayerId || !newPlayerId} className="flex-1 bg-gray-900 text-white hover:bg-black">
                            Confirmar Cambio
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
