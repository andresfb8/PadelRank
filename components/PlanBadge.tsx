import React from 'react';
import { User } from '../types';
import { SUBSCRIPTION_PLANS, getPlanBadgeColor } from '../config/subscriptionPlans';
import { Crown, Users, Trophy } from 'lucide-react';
import { PlanComparisonModal } from './PlanComparisonModal';

interface Props {
    user: User;
    totalPlayers: number;
    activeTournaments: number;
}

export const PlanBadge = ({ user, totalPlayers, activeTournaments }: Props) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const plan = user.plan || 'pro';
    const planInfo = SUBSCRIPTION_PLANS[plan];

    const playerLimit = planInfo.maxPlayers;
    const tournamentLimit = planInfo.maxActiveTournaments;

    const playerPercentage = playerLimit === Infinity ? 0 : (totalPlayers / playerLimit) * 100;
    const tournamentPercentage = tournamentLimit === Infinity ? 0 : (activeTournaments / tournamentLimit) * 100;

    const isPlayerLimitClose = playerPercentage >= 80;
    const isTournamentLimitClose = tournamentPercentage >= 80;

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg">VER MÁS</div>
                </div>

                {/* Plan Name */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Crown className="text-yellow-500" size={18} />
                        <span className="text-sm font-bold text-gray-700">Plan Actual</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPlanBadgeColor(plan)}`}>
                        {planInfo.name}
                    </span>
                </div>

                {/* Usage Stats */}
                <div className="space-y-3">
                    {/* Players */}
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1 text-gray-600">
                                <Users size={12} />
                                <span>Jugadores</span>
                            </div>
                            <span className={`font-bold ${isPlayerLimitClose ? 'text-orange-600' : 'text-gray-700'}`}>
                                {totalPlayers} / {playerLimit === Infinity ? '∞' : playerLimit}
                            </span>
                        </div>
                        {playerLimit !== Infinity && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${isPlayerLimitClose ? 'bg-orange-500' : 'bg-indigo-500'
                                        }`}
                                    style={{ width: `${Math.min(playerPercentage, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Tournaments */}
                    <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1 text-gray-600">
                                <Trophy size={12} />
                                <span>Torneos Activos</span>
                            </div>
                            <span className={`font-bold ${isTournamentLimitClose ? 'text-orange-600' : 'text-gray-700'}`}>
                                {activeTournaments} / {tournamentLimit === Infinity ? '∞' : tournamentLimit}
                            </span>
                        </div>
                        {tournamentLimit !== Infinity && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${isTournamentLimitClose ? 'bg-orange-500' : 'bg-indigo-500'
                                        }`}
                                    style={{ width: `${Math.min(tournamentPercentage, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Warning if close to limit */}
                {(isPlayerLimitClose || isTournamentLimitClose) && (
                    <div className="mt-3 text-xs text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-200">
                        ⚠️ Cerca del límite de tu plan
                    </div>
                )}
            </div>

            <PlanComparisonModal
                isOpen={isModalOpen}
                onClose={(e) => {
                    e?.stopPropagation();
                    setIsModalOpen(false);
                }}
                currentPlan={plan as any}
            />
        </>
    );
};
