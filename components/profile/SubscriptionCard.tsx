import { Crown, Users, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Components';
import { createPortalSession } from '../../services/stripeService';

interface SubscriptionCardProps {
    user: User;
    totalPlayers: number;
    activeTournaments: number;
}

const PLAN_LIMITS = {
    basic: { players: 50, tournaments: 2, name: 'Básico' },
    pro: { players: 150, tournaments: 5, name: 'Pro' },
    star: { players: 999, tournaments: 999, name: 'Star' },
    weekend: { players: 50, tournaments: 1, name: 'Weekend' },
    trial: { players: 20, tournaments: 1, name: 'Prueba' }
};

export const SubscriptionCard = ({ user, totalPlayers, activeTournaments }: SubscriptionCardProps) => {
    const plan = user.plan || 'basic';
    const limits = PLAN_LIMITS[plan];
    const playerUsage = (totalPlayers / limits.players) * 100;
    const tournamentUsage = (activeTournaments / limits.tournaments) * 100;

    // Calculate renewal date (mock for now)
    const renewalDate = user.planExpiry
        ? new Date(user.planExpiry).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Sin fecha de renovación';

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-100 p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                        <Crown className="text-indigo-600" size={24} />
                        Plan Actual
                    </h2>
                    <p className="text-gray-600 text-sm">Gestiona tu suscripción</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-full border-2 border-indigo-200 shadow-sm">
                    <span className="text-indigo-700 font-bold text-lg">{limits.name}</span>
                </div>
            </div>

            {/* Usage Stats */}
            <div className="space-y-4 mb-6">
                {/* Players */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Users className="text-gray-400" size={18} />
                            <span className="text-sm font-medium text-gray-700">Jugadores Registrados</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                            {totalPlayers} / {limits.players === 999 ? '∞' : limits.players}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all ${playerUsage > 90 ? 'bg-red-500' :
                                playerUsage > 70 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(playerUsage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Tournaments */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Trophy className="text-gray-400" size={18} />
                            <span className="text-sm font-medium text-gray-700">Torneos Activos</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                            {activeTournaments} / {limits.tournaments === 999 ? '∞' : limits.tournaments}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all ${tournamentUsage > 90 ? 'bg-red-500' :
                                tournamentUsage > 70 ? 'bg-yellow-500' :
                                    'bg-indigo-500'
                                }`}
                            style={{ width: `${Math.min(tournamentUsage, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Renewal Info */}
            {user.planExpiry && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-indigo-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>Próxima renovación: <strong className="text-gray-900">{renewalDate}</strong></span>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={async () => {
                        try {
                            await createPortalSession();
                        } catch (err) {
                            alert("No se pudo abrir el portal de gestión. Por favor intenta de nuevo.");
                        }
                    }}
                >
                    <TrendingUp size={18} className="mr-2" />
                    Gestionar Suscripción
                </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
                La facturación y cambios de plan se gestionan de forma segura a través de Stripe
            </p>
        </div>
    );
};
