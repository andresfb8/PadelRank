import { useState } from 'react';
import { User, Shield, Mail, Building, Lock, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from './ui/Components';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';

interface Props {
    onClose: () => void;
}

export const AdminProfile = ({ onClose }: Props) => {
    const [isEditing, setIsEditing] = useState(false);
    const [email, setEmail] = useState(auth.currentUser?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState(''); // Needed for re-auth
    const [error, setError] = useState('');

    const handleUpdate = async () => {
        setError('');
        if (!currentPassword) return setError("Debes confirmar tu contraseña actual para hacer cambios.");
        if (!auth.currentUser) return;

        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            if (email !== auth.currentUser.email) {
                await updateEmail(auth.currentUser, email);
            }
            if (newPassword) {
                await updatePassword(auth.currentUser, newPassword);
            }
            alert("✅ Perfil actualizado correctamente.");
            setIsEditing(false);
            setNewPassword('');
            setCurrentPassword('');
        } catch (e: any) {
            console.error(e);
            setError("Error: " + (e.message || "No se pudo actualizar. Verifica tu contraseña actual."));
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in max-w-md mx-auto">
            <div className="bg-primary/10 p-8 flex flex-col items-center justify-center relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">✕</button>
                <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4 border-4 border-white shadow-lg">
                    SA
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Admin Usuario</h2>
                <div className="flex items-center gap-1 mt-1 text-primary font-semibold">
                    <Shield size={16} /> Super Admin
                </div>
            </div>

            <div className="p-6 space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nuevo Email</label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nueva Contraseña (Opcional)</label>
                            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="Dejar vacía para no cambiar" />
                        </div>
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-500 uppercase text-red-500">Contraseña Actual (Requerida)</label>
                            <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" placeholder="Confirma tu contraseña para guardar" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setIsEditing(false)} className="w-1/2">Cancelar</Button>
                            <Button onClick={handleUpdate} className="w-1/2">Guardar Cambios</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                            <Mail className="text-gray-400" />
                            <div className="overflow-hidden">
                                <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                                <p className="text-gray-900 font-medium truncate">{auth.currentUser?.email || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                            <Building className="text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Club Principal</p>
                                <p className="text-gray-900 font-medium">Club Central Pádel</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <Button onClick={() => setIsEditing(true)} variant="secondary" className="w-full flex items-center justify-center gap-2">
                                <Lock size={16} /> Cambiar Datos de Acceso
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
