import React, { useMemo } from 'react';
import { Button } from './ui/Components';
import { User, Ranking, Player } from '../types';
import {
    Building,
    Users,
    Trophy,
    TrendingUp,
    DollarSign,
    Activity,
    AlertTriangle,
    Plus,
    Search,
    UserPlus,
    Calendar,
    ArrowRight,
    Crown,
    Zap,
    ExternalLink,
    MessageSquare
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';

interface Props {
    users: User[];
    rankings: Ranking[];
    players: Record<string, Player>;
    feedback: any[];
    onNavigate: (view: any) => void;
    onCreateClient: () => void;
    onViewClient: (userId: string) => void;
}

export const SuperAdminAnalytics = ({
    users,
    rankings,
    players,
    feedback,
    onNavigate,
    onCreateClient,
    onViewClient
}: Props) => {

    // Filter active admins
    const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'active');
    const pendingUsers = users.filter(u => u.status === 'pending');

    // Calculate SaaS Metrics
    const metrics = useMemo(() => {
        // ... (existing metrics calculations)
        const mrr = activeAdmins.reduce((acc, user) => {
            const plan = (user.plan || 'pro') as keyof typeof SUBSCRIPTION_PLANS;
            return acc + (SUBSCRIPTION_PLANS[plan]?.price || 0);
        }, 0);

        const totalPlayers = Object.keys(players).length;
        const totalTournaments = rankings.length;
        const activeTournaments = rankings.filter(r => r.status === 'activo').length;

        const totalMatches = rankings.reduce((acc, r) =>
            acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.length, 0), 0
        );

        const completedMatches = rankings.reduce((acc, r) =>
            acc + r.divisions.reduce((dAcc, d) =>
                dAcc + d.matches.filter(m => m.status === 'finalizado').length, 0
            ), 0
        );

        const planDistribution: Record<string, number> = {};
        activeAdmins.forEach(user => {
            const plan = user.plan || 'pro';
            planDistribution[plan] = (planDistribution[plan] || 0) + 1;
        });

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const newClientsThisMonth = activeAdmins.filter(user => {
            if (!user.createdAt) return false;
            const created = new Date(user.createdAt);
            return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
        }).length;

        // Daily Growth (Last 7 days)
        const dailyGrowth = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = activeAdmins.filter(u => {
                if (!u.createdAt) return false;
                const createdDate = (u.createdAt as any).toDate ? (u.createdAt as any).toDate() : new Date(u.createdAt as any);
                return createdDate.toISOString().split('T')[0] === dateStr;
            }).length;
            return { date: dateStr, count };
        }).reverse();

        const blockedUsers = users.filter(u => u.role === 'admin' && u.status === 'blocked').length;
        const churnRate = activeAdmins.length > 0
            ? Math.round((blockedUsers / (activeAdmins.length + blockedUsers)) * 100)
            : 0;

        return {
            mrr,
            totalPlayers,
            totalTournaments,
            activeTournaments,
            totalMatches,
            completedMatches,
            planDistribution,
            newClientsThisMonth,
            churnRate,
            dailyGrowth
        };
    }, [activeAdmins, rankings, players, users]);

    // ... (rest of memos: clubsInTrouble, topClubs, recentActivity)
    const clubsInTrouble = useMemo(() => {
        return activeAdmins.filter(user => {
            const userRankings = rankings.filter(r => r.ownerId === user.id);
            if (userRankings.length === 0) return false;

            const activeTournaments = userRankings.filter(r => r.status === 'activo').length;
            
            // Calculation: Occupation Rate for this club
            const totalMatches = userRankings.reduce((acc, r) => 
                acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.length, 0), 0
            );
            const completedMatches = userRankings.reduce((acc, r) => 
                acc + r.divisions.reduce((dAcc, d) => 
                    dAcc + d.matches.filter(m => m.status === 'finalizado').length, 0
                ), 0
            );
            const occupationRate = totalMatches > 0 ? (completedMatches / totalMatches) : 1;

            // Inactivity: Last created tournament date
            const lastTournament = userRankings.sort((a, b) => 
                new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
            )[0];
            const daysSinceLastTournament = lastTournament 
                ? (new Date().getTime() - new Date(lastTournament.fechaInicio).getTime()) / (1000 * 3600 * 24)
                : 999;

            // Flag if: No active tournaments OR low occupation (<30%) OR inactive (>20 days)
            return activeTournaments === 0 || (occupationRate < 0.3 && totalMatches > 10) || daysSinceLastTournament > 20;
        }).slice(0, 5);
    }, [activeAdmins, rankings]);

    const topClubs = useMemo(() => {
        return [...activeAdmins]
            .map(user => {
                const userRankings = rankings.filter(r => r.ownerId === user.id);
                const activeTournaments = userRankings.filter(r => r.status === 'activo').length;
                const totalPlayers = Object.values(players).filter(p => p.ownerId === user.id).length;
                
                // Calculate occupation for top clubs
                const totalMatches = userRankings.reduce((acc, r) => 
                    acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.length, 0), 0
                );
                const completedMatches = userRankings.reduce((acc, r) => 
                    acc + r.divisions.reduce((dAcc, d) => 
                        dAcc + d.matches.filter(m => m.status === 'finalizado').length, 0
                    ), 0
                );
                const occupationRate = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

                return { user, activeTournaments, totalPlayers, occupationRate };
            })
            .sort((a, b) => b.activeTournaments - a.activeTournaments)
            .slice(0, 5);
    }, [activeAdmins, rankings, players]);

    const recentActivity = useMemo(() => {
        return [...rankings]
            .sort((a, b) => {
                const dateA = new Date(a.fechaInicio || '2000-01-01');
                const dateB = new Date(b.fechaInicio || '2000-01-01');
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 10)
            .map(ranking => {
                const owner = users.find(u => u.id === ranking.ownerId);
                return { ranking, owner };
            });
    }, [rankings, users]);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                        <Crown className="text-yellow-500" size={32} />
                        Control Tower
                    </h1>
                    <p className="text-gray-500 font-medium">Vista global del negocio y operaciones</p>
                </div>
                <div className="flex gap-3">
                    <a
                        href="https://dashboard.stripe.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
                    >
                        <ExternalLink size={18} />
                        Stripe
                    </a>
                    <Button onClick={onCreateClient} className="flex items-center gap-2 px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100">
                        <Plus size={18} /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">MRR Estimado</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-4xl font-black text-gray-900">{metrics.mrr}€</h3>
                        <span className="text-xs font-bold text-green-500">/mes</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Clientes Activos</p>
                    <h3 className="text-4xl font-black text-gray-900">{activeAdmins.length}</h3>
                    <p className="text-xs text-green-600 mt-1 font-bold">+{metrics.newClientsThisMonth} este mes</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Churn Rate</p>
                    <h3 className="text-4xl font-black text-gray-900">{metrics.churnRate}%</h3>
                    <p className="text-xs text-gray-400 mt-1 font-bold">Histórico</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Engagement</p>
                    <h3 className="text-4xl font-black text-gray-900">{Math.round((metrics.completedMatches / metrics.totalMatches) * 100) || 0}%</h3>
                    <p className="text-xs text-gray-400 mt-1 font-bold">Uso de plataforma</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Growth Chart (Simple CSS) */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                        <TrendingUp size={24} className="text-indigo-600" />
                        Crecimiento Semanal (Altas)
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-4 px-4">
                        {metrics.dailyGrowth.map((day, i) => {
                            const max = Math.max(...metrics.dailyGrowth.map(d => d.count), 1);
                            const height = (day.count / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                    <div className="relative w-full">
                                        <div 
                                            className="w-full bg-indigo-500 rounded-t-xl transition-all duration-500 group-hover:bg-indigo-600"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        >
                                            {day.count > 0 && (
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {day.count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase rotate-45 md:rotate-0">
                                        {day.date.split('-').slice(1).reverse().join('/')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Feedback / Support Messages */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <MessageSquare size={24} className="text-indigo-600" />
                        Feedback y Soporte
                    </h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {feedback.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Activity size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No hay mensajes todavía</p>
                            </div>
                        ) : (
                            feedback.map((msg) => (
                                <div key={msg.id} className="p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-xs text-indigo-600 truncate max-w-[150px]">
                                            {msg.userName} ({msg.clubName})
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold">
                                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : 'Hoy'}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed italic">"{msg.message}"</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Clubs in Trouble */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" size={24} />
                        Clubes con Baja Actividad
                    </h3>
                    <div className="space-y-3">
                        {clubsInTrouble.map(user => (
                            <div
                                key={user.id}
                                onClick={() => onViewClient(user.id)}
                                className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black">
                                        {user.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{user.name}</div>
                                        <div className="text-xs text-gray-400">Requiere contacto preventivo</div>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-gray-300 group-hover:text-orange-500 transition-all" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Clubs */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={24} />
                        Top Clubes (Actividad)
                    </h3>
                    <div className="space-y-3">
                        {topClubs.map((item, idx) => (
                            <div
                                key={item.user.id}
                                onClick={() => onViewClient(item.user.id)}
                                className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                                        idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{item.user.name}</div>
                                        <div className="text-xs text-gray-400">{item.activeTournaments} torneos activos</div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-black text-indigo-600">{item.totalPlayers}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Jugadores</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                            item.occupationRate > 70 ? 'bg-green-100 text-green-700' :
                                            item.occupationRate > 40 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {item.occupationRate}% Ocupación
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
