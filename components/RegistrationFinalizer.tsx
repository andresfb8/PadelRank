import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui/Components';
import { Trophy, CheckCircle2, Loader2, Lock, Building, User } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const RegistrationFinalizer = () => {
    const [step, setStep] = useState<'verifying' | 'form' | 'success' | 'error'>('verifying');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<{ email: string; sessionId: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        clubName: '',
        password: '',
        confirmPassword: ''
    });

    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    useEffect(() => {
        if (!sessionId) {
            setStep('error');
            setError('Falta el ID de sesión. Si acabas de pagar, por favor contacta con soporte.');
            return;
        }

        const verifySession = async () => {
            try {
                const getCheckoutSession = httpsCallable(functions, 'getCheckoutSession');
                const result = await getCheckoutSession({ sessionId });
                const data = result.data as any;

                if (data.payment_status === 'paid') {
                    setSessionData({ email: data.email, sessionId });
                    setStep('form');
                } else {
                    setStep('error');
                    setError('El pago aún no ha sido confirmado por Stripe.');
                }
            } catch (err: any) {
                console.error(err);
                setStep('error');
                setError('Error al verificar la sesión de pago.');
            }
        };

        verifySession();
    }, [sessionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return setError('Las contraseñas no coinciden.');
        }
        if (formData.password.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres.');
        }

        setLoading(true);
        setError(null);

        try {
            const finalizeRegistration = httpsCallable(functions, 'finalizeRegistration');
            await finalizeRegistration({
                sessionId,
                name: formData.name,
                clubName: formData.clubName,
                password: formData.password
            });

            // Auto Login
            await signInWithEmailAndPassword(auth, sessionData!.email, formData.password);
            
            setStep('success');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al crear la cuenta.');
            setLoading(false);
        }
    };

    if (step === 'verifying') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                    <h2 className="text-xl font-bold text-slate-900">Verificando tu suscripción...</h2>
                    <p className="text-slate-500">Un momento, estamos confirmando tu pago con Stripe.</p>
                </div>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <XCircle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Vaya, algo ha fallado</h2>
                        <p className="text-slate-500 mt-2">{error}</p>
                    </div>
                    <Button onClick={() => window.location.href = 'https://www.racketgrid.com'} className="w-full">
                        Volver a la Web
                    </Button>
                </Card>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 text-white text-center">
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                        <CheckCircle2 size={48} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black italic">¡TODO LISTO!</h2>
                        <p className="text-indigo-100 mt-2 text-lg">Tu cuenta ha sido creada. Entrando en tu club...</p>
                    </div>
                    <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-xl w-full">
                <div className="text-center mb-8">
                    <div className="bg-indigo-600 p-3 rounded-2xl w-fit mx-auto shadow-xl shadow-indigo-100 mb-4">
                        <Trophy className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">¡Bienvenido a Racket Grid!</h1>
                    <p className="text-slate-500 mt-2">Completa tu perfil para empezar a gestionar tus torneos.</p>
                </div>

                <Card className="p-8 shadow-2xl border-none">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-4 mb-2">
                            <div className="bg-white p-2 rounded-lg text-indigo-600">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider leading-none">Email Confirmado</p>
                                <p className="text-slate-900 font-bold">{sessionData?.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <User size={16} /> Tu Nombre
                                </label>
                                <Input
                                    required
                                    placeholder="Ej: Juan Pérez"
                                    value={formData.name}
                                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Building size={16} /> Nombre del Club
                                </label>
                                <Input
                                    required
                                    placeholder="Ej: Padel Center Madrid"
                                    value={formData.clubName}
                                    onChange={(e: any) => setFormData({ ...formData, clubName: e.target.value })}
                                />
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Lock size={16} /> Contraseña
                                </label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={formData.password}
                                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Lock size={16} /> Confirmar Contraseña
                                </label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="Repite tu contraseña"
                                    value={formData.confirmPassword}
                                    onChange={(e: any) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
                                <XCircle size={18} />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>Crear mi cuenta <Trophy size={20} /></>
                            )}
                        </Button>
                    </form>
                </Card>
                <p className="text-center text-slate-400 text-xs mt-8 px-12 leading-relaxed">
                    Al crear tu cuenta, aceptas nuestros Términos de Servicio y Política de Privacidad.
                    Recibirás un email de confirmación con los detalles de tu suscripción.
                </p>
            </div>
        </div>
    );
};

const XCircle = ({ size, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
);
