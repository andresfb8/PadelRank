import React, { useState } from 'react';
import { ArrowLeft, User as UserIcon, CreditCard, LifeBuoy, ExternalLink, Loader2 } from 'lucide-react';
import { User } from '../../types';
import { ProfileCard } from './ProfileCard';
import { SubscriptionCard } from './SubscriptionCard';
import { SupportTicketModal } from '../shared/SupportTicketModal';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { Button } from '../ui/Components';

interface AdminAccountViewProps {
    user: User;
    onBack: () => void;
    totalPlayers: number;
    activeTournaments: number;
}

export const AdminAccountView = ({ user, onBack, totalPlayers, activeTournaments }: AdminAccountViewProps) => {
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            const createPortalSession = httpsCallable(functions, 'createPortalSession');
            const result = await createPortalSession();
            const { url } = result.data as { url: string };
            window.location.href = url;
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Error al conectar con Stripe.");
        } finally {
            setPortalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 animate-fade-in pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-full transition-all"
                        >
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mi Cuenta</h1>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{user.clubName}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <Button 
                            variant="secondary" 
                            onClick={() => setIsSupportOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <LifeBuoy size={18} /> Soporte
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile */}
                    <div className="space-y-8">
                        <ProfileCard user={user} />
                        
                        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <LifeBuoy size={24} /> ¿Necesitas ayuda?
                            </h3>
                            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                                Si tienes algún problema técnico o quieres sugerir una mejora, nuestro equipo está a tu disposición.
                            </p>
                            <Button 
                                onClick={() => setIsSupportOpen(true)}
                                className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold"
                            >
                                Contactar Soporte
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Subscription & Billing */}
                    <div className="lg:col-span-2 space-y-8">
                        <SubscriptionCard
                            user={user}
                            totalPlayers={totalPlayers}
                            activeTournaments={activeTournaments}
                        />

                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <CreditCard size={24} className="text-indigo-600" />
                                        Facturación y Pagos
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-md">
                                        Descarga tus facturas, actualiza tu método de pago o gestiona tu suscripción de forma segura en el portal de Stripe.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleManageBilling}
                                    disabled={portalLoading}
                                    className="flex items-center gap-2 whitespace-nowrap min-w-[200px] h-14"
                                >
                                    {portalLoading ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        <>Gestionar en Stripe <ExternalLink size={18} /></>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SupportTicketModal 
                isOpen={isSupportOpen} 
                onClose={() => setIsSupportOpen(false)} 
                user={user}
            />
        </div>
    );
};
