import React, { useState } from 'react';
import { Modal, Button } from '../ui/Components';
import { Send, Loader2, CheckCircle2, User, Mail, Building, Calendar, MessageSquare, CheckCheck } from 'lucide-react';
import { db, functions } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export interface FeedbackMessage {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    clubName: string;
    message: string;
    status: 'open' | 'resolved';
    createdAt: any;
    type: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    message: FeedbackMessage | null;
}

export const SupportMessageModal = ({ isOpen, onClose, message }: Props) => {
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [replySent, setReplySent] = useState(false);

    const handleClose = () => {
        setReply('');
        setReplySent(false);
        onClose();
    };

    const handleMarkResolved = async () => {
        if (!message) return;
        setResolving(true);
        try {
            await updateDoc(doc(db, 'feedback', message.id), {
                status: 'resolved',
                resolvedAt: serverTimestamp(),
            });
            handleClose();
        } catch (err) {
            console.error(err);
            alert('Error al marcar como resuelto. Inténtalo de nuevo.');
        } finally {
            setResolving(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() || !message) return;
        setSending(true);
        try {
            const sendReply = httpsCallable(functions, 'sendSupportReply');
            await sendReply({
                feedbackId: message.id,
                userEmail: message.userEmail,
                userName: message.userName,
                originalMessage: message.message,
                replyText: reply.trim(),
            });
            setReplySent(true);
            setReply('');
            setTimeout(() => {
                setReplySent(false);
                handleClose();
            }, 2000);
        } catch (err) {
            console.error(err);
            alert('Error al enviar la respuesta. Inténtalo de nuevo.');
        } finally {
            setSending(false);
        }
    };

    if (!message) return null;

    const formattedDate = message.createdAt?.toDate
        ? message.createdAt.toDate().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Fecha desconocida';

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Mensaje de Soporte" maxWidth="max-w-2xl">
            {replySent ? (
                <div className="py-12 text-center space-y-4">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Respuesta Enviada</h3>
                        <p className="text-gray-500 mt-2">El usuario ha recibido tu respuesta por email.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Message metadata */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                            <User size={16} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Usuario</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{message.userName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                            <Building size={16} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Club</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{message.clubName || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                            <Mail size={16} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{message.userEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                            <Calendar size={16} className="text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Fecha</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{formattedDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Original message */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <MessageSquare size={12} /> Mensaje
                        </p>
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {message.message}
                        </div>
                    </div>

                    {/* Reply form */}
                    <form onSubmit={handleSendReply} className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Send size={12} /> Tu Respuesta
                        </label>
                        <textarea
                            rows={4}
                            className="w-full border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm"
                            placeholder="Escribe tu respuesta aquí... Se enviará al email del usuario."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                        />
                        <div className="flex justify-between items-center gap-3 pt-2 border-t">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleMarkResolved}
                                disabled={resolving || message.status === 'resolved'}
                                className="flex items-center gap-2"
                            >
                                {resolving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <CheckCheck size={16} />
                                )}
                                {message.status === 'resolved' ? 'Ya resuelto' : 'Marcar Resuelto'}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="secondary" type="button" onClick={handleClose}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={sending || !reply.trim()}
                                    className="flex items-center gap-2 px-6"
                                >
                                    {sending ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                    Responder
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </Modal>
    );
};
