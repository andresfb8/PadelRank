import React from 'react';
import { User } from '../types';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';
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
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full text-left bg-court-soft rounded-lg p-3 text-court-ink hover:bg-[#e3edfd] transition-colors"
                title="Ver y comparar planes"
            >
                <span className="flex items-center justify-between text-[13px] font-semibold">
                    <span>Plan {planInfo.name}</span>
                    <span className="font-medium text-court">Ver planes</span>
                </span>
                <span className="block mt-2 space-y-2 num">
                    {[
                        { label: 'Jugadores', used: totalPlayers, limit: playerLimit, pct: playerPercentage, close: isPlayerLimitClose },
                        { label: 'Torneos activos', used: activeTournaments, limit: tournamentLimit, pct: tournamentPercentage, close: isTournamentLimitClose },
                    ].map(u => (
                        <span key={u.label} className="block">
                            <span className="flex justify-between text-[12px]">
                                <span>{u.label}</span>
                                <span className={u.close ? 'text-[#92400e] font-semibold' : 'font-medium'}>{u.used} de {u.limit === Infinity ? 'sin límite' : u.limit}</span>
                            </span>
                            {u.limit !== Infinity && (
                                <span className="block h-1.5 rounded-full bg-court-track mt-1 overflow-hidden">
                                    <span className={`block h-full rounded-full ${u.close ? 'bg-[#d97706]' : 'bg-court'}`} style={{ width: `${Math.min(u.pct, 100)}%` }} />
                                </span>
                            )}
                        </span>
                    ))}
                </span>
                {(isPlayerLimitClose || isTournamentLimitClose) && (
                    <span className="block mt-2 text-[12px] text-[#92400e]">Estás cerca del límite de tu plan.</span>
                )}
            </button>

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
