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
    });

    useEffect(() => {
        if (playerToEdit) {
            setFormData({
                nombre: playerToEdit.nombre,
                apellidos: playerToEdit.apellidos,
                email: playerToEdit.email,
                telefono: playerToEdit.telefono,
            });
        } else {
            setFormData({ nombre: '', apellidos: '', email: '', telefono: '' });
        }
    }, [playerToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: playerToEdit?.id,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">
                        {playerToEdit ? 'Editar Jugador' : 'Nuevo Jugador'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                    <div className="pt-4 flex gap-3">
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
