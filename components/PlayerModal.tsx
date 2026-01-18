import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, X } from 'lucide-react';
import { Button } from './ui/Components';
import { Player } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (player: Omit<Player, 'id' | 'stats'> & { id?: string }) => void;
    playerToEdit?: Player | null;
}

export const PlayerModal = ({ isOpen, onClose, onSave, playerToEdit }: Props) => {
    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        email: '',
        telefono: '',
        fechaNacimiento: '',
    });
    const [stats, setStats] = useState({ pj: 0, pg: 0, pp: 0 });

    useEffect(() => {
        if (playerToEdit) {
            setFormData({
                nombre: playerToEdit.nombre,
                apellidos: playerToEdit.apellidos,
                email: playerToEdit.email,
                telefono: playerToEdit.telefono,
                fechaNacimiento: playerToEdit.fechaNacimiento || '',
            });
            setStats(playerToEdit.stats || { pj: 0, pg: 0, pp: 0 });
        } else {
            setFormData({ nombre: '', apellidos: '', email: '', telefono: '', fechaNacimiento: '' });
            setStats({ pj: 0, pg: 0, pp: 0 });
        }
    }, [playerToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const winrate = stats.pj > 0 ? Math.round((stats.pg / stats.pj) * 100) : 0;

        onSave({
            ...formData,
            id: playerToEdit?.id,
            // @ts-ignore - We are extending the type dynamically here to support stats editing
            stats: { ...stats, winrate }
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h3 className="text-xl font-bold text-gray-900">
                        {playerToEdit ? 'Editar Jugador' : 'Nuevo Jugador'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Apellidos"
                                value={formData.apellidos}
                                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                required
                                type="email"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="correo@ejemplo.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="tel"
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="600 000 000"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={formData.fechaNacimiento}
                            onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                        />
                    </div>

                    {/* Stats Editing (Admin Only - Implicit via user role but visible here for simplicity) */}
                    {playerToEdit && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-2">Estadísticas (Manual)</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Jugados</label>
                                    <input
                                        type="number"
                                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                        value={stats.pj}
                                        onChange={(e) => setStats({ ...stats, pj: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Ganados</label>
                                    <input
                                        type="number"
                                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                        value={stats.pg}
                                        onChange={(e) => setStats({ ...stats, pg: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Perdidos</label>
                                    <input
                                        type="number"
                                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                        value={stats.pp}
                                        onChange={(e) => setStats({ ...stats, pp: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2">
                        <Button variant="secondary" onClick={onClose} type="button" className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1">
                            Guardar Jugador
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
