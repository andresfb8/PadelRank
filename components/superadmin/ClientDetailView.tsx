import React, { useMemo } from 'react';
import { Button, Card, Badge } from '../ui/Components';
import { User, Ranking, Player } from '../../types';
import { 
    ArrowLeft, 
    Building, 
    Mail, 
    Calendar, 
    Shield, 
    Trophy, 
    Users, 
    Activity, 
    ExternalLink,
    Zap,
    AlertCircle
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, getPlanBadgeColor } from '../../config/subscriptionPlans';

interface Props {
    user: User;
    rankings: Ranking[];
    players: Record<string, Player>;
    onBack: () => void;
    onImpersonate: (userId: string) => void;
    onUpdatePlan: (userId: string, plan: any) => void;
}

export const ClientDetailView = ({ 
    user, 
    rankings, 
    players, 
    onBack, 
    onImpersonate,
    onUpdatePlan
}: Props) => {
    
    const userRankings = useMemo(() => 
        rankings.filter(r => r.ownerId === user.id), 
    [rankings, user.id]);

    const userPlayers = useMemo(() => 
        Object.values(players).filter(p => p.ownerId === user.id),
    [players, user.id]);

    const stats = useMemo(() => {
        const totalMatches = userRankings.reduce((acc, r) => 
            acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.length, 0), 0
        );
        const completedMatches = userRankings.reduce((acc, r) => 
            acc + r.divisions.reduce((dAcc, d) => 
                dAcc + d.matches.filter(m => m.status === 'finalizado').length, 0
            ), 0
        );
        const occupationRate = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;
        
        return {
            totalTournaments: userRankings.length,
            activeTournaments: userRankings.filter(r => r.status === 'activo').length,
            totalPlayers: userPlayers.length,
            totalMatches,
            completedMatches,
            occupationRate
        };
    }, [userRankings, userPlayers]);

    const planInfo = SUBSCRIPTION_PLANS[(user.plan || 'pro') as keyof typeof SUBSCRIPTION_PLANS];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPlanBadgeColor(user.plan || 'pro')}`}>
                                Plan {planInfo.name}
                            </span>
                            <span className="text-gray-400 text-xs font-medium">•</span>
                            <span className="text-gray-500 text-xs font-medium flex items-center gap-1">
                                <Building size={12} /> {user.clubName || 'Sin club'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="secondary"
                        onClick={() => onImpersonate(user.id)}
                        className="flex items-center gap-2"
                    >
                        <Zap size={18} className="text-amber-500 fill-amber-500" />
                        Suplantar Identidad
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <Card className="lg:col-span-1 p-8 flex flex-col h-fit">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-24 h-24 bg-primary text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-xl shadow-primary/20 mb-4">
                            {user.name.charAt(0)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Información de Cuenta</label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Calendar size={14} /> Registro</span>
                                    <span className="font-bold text-gray-900">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Shield size={14} /> Estado</span>
                                    <Badge type={user.status === 'active' ? 'success' : 'danger'}>
                                        {user.status === 'active' ? 'Activo' : 'Bloqueado'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 flex items-center gap-2"><Activity size={14} /> Último Acceso</span>
                                    <span className="font-bold text-gray-900">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {user.internalNotes && (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">Notas Internas</label>
                                <p className="text-xs text-amber-800 leading-relaxed italic">"{user.internalNotes}"</p>
                            </div>
                        )}
                        
                        <div className="pt-6 border-t border-gray-100">
                             {user.stripeCustomerId && (
                                <a 
                                    href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-bold text-xs"
                                >
                                    <ExternalLink size={16} />
                                    Ver en Stripe
                                </a>
                             )}
                        </div>
                    </div>
                </Card>

                {/* Metrics & Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ocupación</p>
                            <h4 className={`text-2xl font-black ${
                                stats.occupationRate > 70 ? 'text-green-600' : 
                                stats.occupationRate > 40 ? 'text-yellow-600' : 
                                'text-red-600'
                            }`}>{stats.occupationRate}%</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Torneos</p>
                            <h4 className="text-2xl font-black text-gray-900">{stats.totalTournaments}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jugadores</p>
                            <h4 className="text-2xl font-black text-gray-900">{stats.totalPlayers}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Partidos</p>
                            <h4 className="text-2xl font-black text-gray-900">{stats.completedMatches}</h4>
                        </div>
                    </div>

                    {/* Tournaments List */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Trophy size={18} className="text-primary" />
                                Historial de Torneos
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {userRankings.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Trophy size={48} className="mx-auto mb-4 opacity-10" />
                                    <p>No ha creado torneos todavía</p>
                                </div>
                            ) : (
                                userRankings.map(ranking => (
                                    <div key={ranking.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                ranking.status === 'activo' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                <Trophy size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{ranking.nombre}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                                    <span>{ranking.categoria}</span>
                                                    <span>•</span>
                                                    <span>{ranking.format || 'Clásico'}</span>
                                                    <span>•</span>
                                                    <span>{new Date(ranking.fechaInicio).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {ranking.divisions.reduce((acc, d) => acc + d.matches.filter(m => m.status === 'finalizado').length, 0)} partidos
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">Finalizados</div>
                                            </div>
                                            <Badge type={ranking.status === 'activo' ? 'success' : ranking.status === 'pausado' ? 'warning' : 'default'}>
                                                {ranking.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
