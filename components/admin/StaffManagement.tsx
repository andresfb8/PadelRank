import React, { useState } from 'react';
import { Card, Button, Input, Modal, Badge } from '../ui/Components';
import { User, Mail, Plus, Trash2, Shield, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface Props {
    staffMembers: any[];
    onDelete: (id: string) => void;
}

export const StaffManagement = ({ staffMembers, onDelete }: Props) => {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState({ name: '', email: '' });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const inviteStaff = httpsCallable(functions, 'inviteStaff');
            await inviteStaff(inviteData);
            setSuccessMessage(`Invitación enviada a ${inviteData.email}`);
            setInviteData({ name: '', email: '' });
            setTimeout(() => {
                setIsInviteModalOpen(false);
                setSuccessMessage(null);
            }, 2000);
        } catch (err: any) {
            alert(err.message || "Error al enviar la invitación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="text-indigo-600" size={24} />
                        Gestión de Staff
                    </h2>
                    <p className="text-sm text-gray-500">Administra quién puede ayudarte a gestionar el club.</p>
                </div>
                <Button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2">
                    <UserPlus size={18} /> Invitar Personal
                </Button>
            </div>

            <Card className="overflow-hidden border-none shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Estado</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {staffMembers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                    No hay miembros del staff registrados todavía.
                                </td>
                            </tr>
                        ) : (
                            staffMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{member.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Mail size={14} />
                                            {member.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge type={member.status === 'active' ? 'success' : 'warning'}>
                                            {member.status === 'active' ? 'Activo' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar a ${member.name} del equipo?`)) {
                                                        onDelete(member.id);
                                                    }
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                title="Invitar Nuevo Staff"
            >
                {successMessage ? (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <p className="font-bold text-gray-900">{successMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Nombre Completo</label>
                            <Input
                                required
                                value={inviteData.name}
                                onChange={(e: any) => setInviteData({ ...inviteData, name: e.target.value })}
                                placeholder="Ej: Entrenador Carlos"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Email</label>
                            <Input
                                required
                                type="email"
                                value={inviteData.email}
                                onChange={(e: any) => setInviteData({ ...inviteData, email: e.target.value })}
                                placeholder="ej: carlos@club.com"
                            />
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                            <strong>Nota:</strong> Se enviará un email al colaborador para que cree su propia contraseña y acepte la vinculación con el club.
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : "Enviar Invitación"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};
