import React, { useState } from 'react';
import { Modal, Button, Card } from '../ui/Components';
import { MessageSquare, Send, Loader2, CheckCircle2, LifeBuoy } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export const SupportTicketModal = ({ isOpen, onClose, user }: Props) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                clubName: user.clubName,
                message: message.trim(),
                status: 'open',
                createdAt: serverTimestamp(),
                type: 'support'
            });

            setSuccess(true);
            setMessage('');
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2500);
        } catch (err) {
            console.error(err);
            alert("Error al enviar el mensaje. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Soporte y Feedback">
            {success ? (
                <div className="py-12 text-center space-y-4">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">¡Mensaje Recibido!</h3>
                        <p className="text-gray-500 mt-2">Hemos recibido tu mensaje. Te contactaremos pronto por email.</p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-2xl">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white">
                            <LifeBuoy size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900 leading-tight">¿En qué podemos ayudarte?</p>
                            <p className="text-xs text-indigo-700 mt-1">Reporta un error, solicita una mejora o simplemente dinos qué tal va todo.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <MessageSquare size={16} /> Tu Mensaje
                        </label>
                        <textarea
                            required
                            rows={5}
                            className="w-full border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                            placeholder="Escribe aquí tu consulta o sugerencia..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="flex items-center gap-2 px-8">
                            {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar</>}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
