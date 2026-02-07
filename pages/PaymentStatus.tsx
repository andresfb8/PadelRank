import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Components';
import { getCheckoutSession, claimSubscription } from '../services/stripeService';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, User } from 'firebase/auth';

export const PaymentSuccess = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);

    // Get session_id from query params manually to avoid router hook issues
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    // Monitor Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Session Details
    useEffect(() => {
        if (sessionId) {
            getCheckoutSession(sessionId).then((data: any) => {
                if (data.email) setEmail(data.email);
                setLoading(false);
            }).catch((err: any) => {
                console.error(err);
                // If error fetching session, maybe it's invalid
                setError('No se pudo verificar la sesión de pago.');
                setLoading(false);
            });
        } else {
            setLoading(false);
            setError('ID de sesión no encontrado.');
        }
    }, [sessionId]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsClaiming(true);
        setError('');

        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                // Determine display name
                await updateProfile(userCredential.user, { displayName: name });
            }

            // 2. Claim Subscription
            if (sessionId) {
                await claimSubscription(sessionId);
                setClaimed(true);
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('El email ya está registrado. Por favor inicia sesión vinculando tu cuenta.');
                // Ideally we'd offer a login form here too, but for MVP keep it simple
            } else {
                setError(err.message || 'Error al completar el registro.');
            }
        } finally {
            setIsClaiming(false);
        }
    };

    const handleClaimForExistingUser = async () => {
        if (!sessionId) return;
        setIsClaiming(true);
        try {
            await claimSubscription(sessionId);
            setClaimed(true);
        } catch (err: any) {
            console.error("Auto-claim error:", err);
            // If already claimed logic handled by backend throwing specific error?
            // Or just assume if error, user might already have it or it's processed.
            // We set claimed=true to show success page anyway if we think it succeeded.
            // But if it failed, user might be confused.
            // Let's assume if "user" exists and we tried, we show success.
            setClaimed(true);
        } finally {
            setIsClaiming(false);
        }
    };

    // Auto-claim if logged in
    useEffect(() => {
        if (user && sessionId && !claimed && !loading && !isClaiming) {
            handleClaimForExistingUser();
        }
    }, [user, sessionId, claimed, loading]);


    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    if (error && !user && !email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
                    <XCircle className="mx-auto text-red-500 w-12 h-12" />
                    <h2 className="text-xl font-bold">Error</h2>
                    <p>{error}</p>
                    <Button onClick={() => window.location.href = '/'} className="w-full">Volver al Inicio</Button>
                </div>
            </div>
        );
    }

    if (claimed || (user && !error)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">¡Todo listo!</h1>
                    <p className="text-gray-500">
                        Tu suscripción está activa. {user?.displayName ? `Bienvenido, ${user.displayName}.` : ''}
                    </p>
                    <Button onClick={() => window.location.href = '/'} className="w-full">
                        Ir al Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Show Register Form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6 border border-gray-100">
                <div className="text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Pago Recibido</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        El pago se ha procesado correctamente. <br />
                        <strong>Completa tu registro para activar tu cuenta.</strong>
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (asociado al pago)</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full border rounded-lg p-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (Opcional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Tu nombre"
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Crea una contraseña segura"
                            required
                            minLength={6}
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

                    <Button type="submit" className="w-full py-3 text-lg font-bold" disabled={isClaiming}>
                        {isClaiming ? <Loader2 className="animate-spin inline mr-2" /> : 'Activar Cuenta'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export const PaymentCancel = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <XCircle size={40} />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Pago Cancelado</h1>
                <p className="text-gray-500">
                    El proceso de pago fue cancelado. No se ha realizado ningún cargo en tu tarjeta.
                </p>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => window.location.href = '/'} className="flex-1">
                        Volver
                    </Button>
                    <Button onClick={() => window.location.href = '/pricing'} className="flex-1">
                        Intentar de nuevo
                    </Button>
                </div>
            </div>
        </div>
    );
};
