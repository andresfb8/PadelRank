import { useState } from 'react';
import { User as UserIcon, Mail, Building, Lock, AlertCircle, Check } from 'lucide-react';
import { User } from '../../types';
import { Button, Input } from '../ui/Components';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { updateUser } from '../../services/db';

interface ProfileCardProps {
    user: User;
}

export const ProfileCard = ({ user }: ProfileCardProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name || '');
    const [clubName, setClubName] = useState(user.clubName || '');
    const [email, setEmail] = useState(auth.currentUser?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSave = async () => {
        setError('');
        setSuccess('');

        try {
            // Update Firestore profile
            await updateUser({
                id: user.id,
                name,
                clubName
            } as any);

            // If email or password changed, need re-auth
            if ((email !== auth.currentUser?.email || newPassword) && !currentPassword) {
                setError('Debes confirmar tu contraseña actual para cambiar email o contraseña.');
                return;
            }

            if (currentPassword && auth.currentUser) {
                const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);

                if (email !== auth.currentUser.email) {
                    await updateEmail(auth.currentUser, email);
                }
                if (newPassword) {
                    await updatePassword(auth.currentUser, newPassword);
                }
            }

            setSuccess('✅ Perfil actualizado correctamente.');
            setIsEditing(false);
            setCurrentPassword('');
            setNewPassword('');
        } catch (e: any) {
            console.error(e);
            setError('Error: ' + (e.message || 'No se pudo actualizar.'));
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <UserIcon className="text-primary" size={24} />
                    Información Personal
                </h2>
                {!isEditing && (
                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                        Editar
                    </Button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                    <Check size={16} />
                    {success}
                </div>
            )}

            {isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                        <Input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Nombre del club" />
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Lock size={16} />
                            Cambiar Credenciales (Opcional)
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                <Input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    type="password"
                                    placeholder="Dejar vacía para no cambiar"
                                />
                            </div>
                            {(email !== auth.currentUser?.email || newPassword) && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <label className="block text-sm font-bold text-yellow-800 mb-1">
                                        Contraseña Actual (Requerida)
                                    </label>
                                    <Input
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        type="password"
                                        placeholder="Confirma tu contraseña"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} className="flex-1">
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <UserIcon className="text-gray-400" size={20} />
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Nombre</p>
                            <p className="text-gray-900 font-medium">{user.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <Mail className="text-gray-400" size={20} />
                        <div className="overflow-hidden">
                            <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                            <p className="text-gray-900 font-medium truncate">{auth.currentUser?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <Building className="text-gray-400" size={20} />
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Club</p>
                            <p className="text-gray-900 font-medium">{user.clubName || 'Sin asignar'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
