import React from 'react';
import { X, Check, Crown, Users, Trophy, ExternalLink, Layers } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../config/subscriptionPlans';
import { Button } from './ui/Components';

interface Props {
    isOpen: boolean;
    onClose: (e?: React.MouseEvent) => void;
    currentPlan: SubscriptionPlan;
}

export const PlanComparisonModal = ({ isOpen, onClose, currentPlan }: Props) => {
    if (!isOpen) return null;

    const plans = [
        { id: 'basic', icon: Users, color: 'text-gray-400' },
        { id: 'pro', icon: Trophy, color: 'text-blue-500' },
        { id: 'star', icon: Crown, color: 'text-yellow-500' }
    ];

    const formats = [
        { id: 'americano', label: 'Americano' },
        { id: 'mexicano', label: 'Mexicano' },
        { id: 'individual', label: 'Ranking Individual' },
        { id: 'pairs', label: 'Ranking por Parejas' },
        { id: 'hybrid', label: 'Híbrido (Liga + Playoff)' },
        { id: 'elimination', label: 'Eliminación Directa' }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom border border-gray-100">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            Compara nuestros planes
                        </h2>
                        <p className="text-gray-500">Encuentra el plan perfecto para potenciar tu club</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-x-auto p-4 md:p-8">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="p-4 bg-gray-50/50 rounded-tl-2xl border-b border-gray-100 font-bold text-gray-400 uppercase text-xs tracking-wider">Características</th>
                                {plans.map((p) => {
                                    const info = SUBSCRIPTION_PLANS[p.id as SubscriptionPlan];
                                    const isCurrent = currentPlan === p.id;
                                    return (
                                        <th key={p.id} className={`p-4 text-center border-b border-gray-100 relative ${isCurrent ? 'bg-indigo-50/30' : ''}`}>
                                            {isCurrent && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full shadow-sm">
                                                    TU PLAN
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900">{info.name}</p>
                                                <p className="text-2xl font-black text-primary">
                                                    {info.price}€<span className="text-xs text-gray-400 font-normal">/mes</span>
                                                </p>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* Player Limit */}
                            <tr className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 flex items-center gap-2 font-semibold text-gray-700">
                                    <Users size={16} className="text-gray-400" /> Jugadores Máximos
                                </td>
                                {plans.map(p => (
                                    <td key={p.id} className="p-4 text-center text-sm font-bold text-gray-600">
                                        {SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxPlayers === Infinity ? 'Ilimitados' : SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxPlayers}
                                    </td>
                                ))}
                            </tr>
                            {/* Tournament Limit */}
                            <tr className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 flex items-center gap-2 font-semibold text-gray-700">
                                    <Trophy size={16} className="text-gray-400" /> Torneos Activos
                                </td>
                                {plans.map(p => (
                                    <td key={p.id} className="p-4 text-center text-sm font-bold text-gray-600">
                                        {SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxActiveTournaments === Infinity ? 'Ilimitados' : SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxActiveTournaments}
                                    </td>
                                ))}
                            </tr>
                            {/* Divisions Limit */}
                            <tr className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 flex items-center gap-2 font-semibold text-gray-700">
                                    <Layers size={16} className="text-gray-400" /> Categorías / Divisiones
                                </td>
                                {plans.map(p => (
                                    <td key={p.id} className="p-4 text-center text-sm font-bold text-gray-600">
                                        {SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxDivisionsPerTournament === Infinity ? 'Ilimitadas' : SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].maxDivisionsPerTournament}
                                    </td>
                                ))}
                            </tr>
                            {/* Branding */}
                            <tr className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 flex items-center gap-2 font-semibold text-gray-700">
                                    <Check size={16} className="text-green-500" /> Logo de Club (Branding)
                                </td>
                                {plans.map(p => (
                                    <td key={p.id} className="p-4 text-center">
                                        {SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].allowsBranding ? <Check className="mx-auto text-green-500" size={20} /> : <X className="mx-auto text-gray-300" size={18} />}
                                    </td>
                                ))}
                            </tr>
                            {/* Formats Section Header */}
                            <tr>
                                <td colSpan={4} className="p-4 pt-8 pb-4 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50/30">
                                    Formatos de Juego
                                </td>
                            </tr>
                            {formats.map(format => (
                                <tr key={format.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 text-sm font-medium text-gray-600">{format.label}</td>
                                    {plans.map(p => {
                                        const isAllowed = SUBSCRIPTION_PLANS[p.id as SubscriptionPlan].allowedFormats.includes(format.id as any);
                                        return (
                                            <td key={p.id} className="p-4 text-center">
                                                {isAllowed ? <Check className="mx-auto text-green-500" size={20} /> : <X className="mx-auto text-gray-300" size={18} />}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500 max-w-sm text-center md:text-left font-medium">
                        ¿Necesitas un formato a medida para tu club?
                        <span className="text-primary font-bold ml-1">Contacta con nosotros</span>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button variant="secondary" onClick={onClose} className="flex-1 md:flex-none">Cerrar</Button>
                        <Button className="flex-1 md:flex-none">Mejorar Plan <ExternalLink size={16} className="ml-2" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
