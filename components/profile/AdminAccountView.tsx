import { ArrowLeft, User as UserIcon, CreditCard, FileText, Shield } from 'lucide-react';
import { User } from '../../types';
import { ProfileCard } from './ProfileCard';
import { SubscriptionCard } from './SubscriptionCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { BillingHistory } from './BillingHistory';

interface AdminAccountViewProps {
    user: User;
    onBack: () => void;
    totalPlayers: number;
    activeTournaments: number;
}

export const AdminAccountView = ({ user, onBack, totalPlayers, activeTournaments }: AdminAccountViewProps) => {
    return (
        <div className="min-h-screen bg-gray-50 animate-fade-in">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Volver al Panel</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold uppercase shadow-lg">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
                            <p className="text-gray-500 mt-1">Gestiona tu perfil y suscripción</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Profile & Security */}
                    <div className="lg:col-span-2 space-y-6">
                        <ProfileCard user={user} />
                        <SubscriptionCard
                            user={user}
                            totalPlayers={totalPlayers}
                            activeTournaments={activeTournaments}
                        />
                    </div>

                    {/* Right Column: Billing */}
                    <div className="space-y-6">
                        <PaymentMethodCard user={user} />
                        <BillingHistory user={user} />
                    </div>
                </div>
            </div>
        </div>
    );
};
