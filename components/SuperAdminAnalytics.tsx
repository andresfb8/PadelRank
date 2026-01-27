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
    Zap
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';

interface Props {
    users: User[];
    rankings: Ranking[];
    players: Record<string, Player>;
    onNavigate: (view: any) => void;
    onCreateClient: () => void;
    onViewClient: (userId: string) => void;
}

export const SuperAdminAnalytics = ({
    users,
    rankings,
    players,
    onNavigate,
    onCreateClient,
    onViewClient
}: Props) => {

    // Filter active admins
    const activeAdmins = users.filter(u => u.role === 'admin' && u.status === 'active');
    const pendingUsers = users.filter(u => u.status === 'pending');

    // Calculate SaaS Metrics
    const metrics = useMemo(() => {
        // MRR (Monthly Recurring Revenue)
        const mrr = activeAdmins.reduce((acc, user) => {
            const plan = (user.plan || 'pro') as keyof typeof SUBSCRIPTION_PLANS;
            return acc + (SUBSCRIPTION_PLANS[plan]?.price || 0);
        }, 0);

        // Total players across all clubs
        const totalPlayers = Object.keys(players).length;

        // Total tournaments
        const totalTournaments = rankings.length;
        const activeTournaments = rankings.filter(r => r.status === 'activo').length;

        // Total matches (all time)
        const totalMatches = rankings.reduce((acc, r) =>
            acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.length, 0), 0
        );

        // Completed matches
        const completedMatches = rankings.reduce((acc, r) =>
            acc + r.divisions.reduce((dAcc, d) =>
                dAcc + d.matches.filter(m => m.status === 'finalizado').length, 0
            ), 0
        );

        // Plan distribution
        const planDistribution: Record<string, number> = {};
        activeAdmins.forEach(user => {
            const plan = user.plan || 'pro';
            planDistribution[plan] = (planDistribution[plan] || 0) + 1;
        });

        // New clients this month (simplified - checking if createdAt exists and is recent)
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const newClientsThisMonth = activeAdmins.filter(user => {
            if (!user.createdAt) return false;
            const created = new Date(user.createdAt);
            return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
        }).length;

        // Churn rate (simplified - users who were active but are now blocked)
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
            churnRate
        };
    }, [activeAdmins, rankings, players, users]);

    // Detect "Clubs in Trouble"
    const clubsInTrouble = useMemo(() => {
        return activeAdmins.filter(user => {
            const userRankings = rankings.filter(r => r.ownerId === user.id);
            const pausedTournaments = userRankings.filter(r => r.status === 'pausado').length;
            const activeTournaments = userRankings.filter(r => r.status === 'activo').length;

            // Alert if: has paused tournaments OR no active tournaments but has data
            return pausedTournaments > 0 || (activeTournaments === 0 && userRankings.length > 0);
        }).slice(0, 5); // Top 5 alerts
    }, [activeAdmins, rankings]);

    // Top performing clubs (by active tournaments)
    const topClubs = useMemo(() => {
        return [...activeAdmins]
            .map(user => {
                const userRankings = rankings.filter(r => r.ownerId === user.id);
                const activeTournaments = userRankings.filter(r => r.status === 'activo').length;
                const totalPlayers = Object.values(players).filter(p => p.ownerId === user.id).length;
                return { user, activeTournaments, totalPlayers };
            })
            .sort((a, b) => b.activeTournaments - a.activeTournaments)
            .slice(0, 5);
    }, [activeAdmins, rankings, players]);

    // Recent activity (last 10 tournaments created)
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
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Crown className="text-yellow-500" size={28} />
                        Control Tower
                    </h1>
                    <p className="text-gray-500 mt-1">Vista global del negocio y operaciones</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={onCreateClient} className="flex items-center gap-2">
                        <Plus size={18} /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Top KPIs - Row 1: Business Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">MRR</p>
                            <h3 className="text-3xl font-bold text-gray-900">{metrics.mrr}€</h3>
                            <p className="text-xs text-gray-400 mt-1">Ingresos mensuales</p>
                        </div>
                        <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => onNavigate('admin_management')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Clientes</p>
                            <h3 className="text-3xl font-bold text-gray-900">{activeAdmins.length}</h3>
                            <p className="text-xs text-green-600 mt-1 font-medium">+{metrics.newClientsThisMonth} este mes</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Building size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Churn Rate</p>
                            <h3 className="text-3xl font-bold text-gray-900">{metrics.churnRate}%</h3>
                            <p className="text-xs text-gray-400 mt-1">Tasa de cancelación</p>
                        </div>
                        <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Engagement</p>
                            <h3 className="text-3xl font-bold text-gray-900">{Math.round((metrics.completedMatches / metrics.totalMatches) * 100) || 0}%</h3>
                            <p className="text-xs text-gray-400 mt-1">{metrics.completedMatches} / {metrics.totalMatches} partidos</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Activity size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Platform Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => onNavigate('ranking_list')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Torneos</p>
                            <h3 className="text-3xl font-bold text-gray-900">{metrics.activeTournaments}</h3>
                            <p className="text-xs text-gray-400 mt-1">{metrics.totalTournaments} totales</p>
                        </div>
                        <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Trophy size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Jugadores</p>
                            <h3 className="text-3xl font-bold text-gray-900">{metrics.totalPlayers}</h3>
                            <p className="text-xs text-gray-400 mt-1">En toda la plataforma</p>
                        </div>
                        <div className="h-12 w-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                            <Users size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Partidos</p>
                            <h3 className="text-3xl font-bold text-gray-900">{metrics.totalMatches}</h3>
                            <p className="text-xs text-gray-400 mt-1">Generados en total</p>
                        </div>
                        <div className="h-12 w-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
                            <Zap size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Alerts + Top Clubs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Clubs in Trouble Alert */}
                    {clubsInTrouble.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Clubes que Requieren Atención
                            </h3>
                            <div className="space-y-3">
                                {clubsInTrouble.map(user => {
                                    const userRankings = rankings.filter(r => r.ownerId === user.id);
                                    const pausedCount = userRankings.filter(r => r.status === 'pausado').length;
                                    const activeCount = userRankings.filter(r => r.status === 'activo').length;

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => onViewClient(user.id)}
                                            className="bg-white p-4 rounded-lg flex items-center justify-between hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold">
                                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{user.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {pausedCount > 0 && `${pausedCount} torneo(s) pausado(s)`}
                                                        {activeCount === 0 && userRankings.length > 0 && 'Sin torneos activos'}
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Top Performing Clubs */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Trophy className="text-yellow-500" size={20} />
                            Top Clubes por Actividad
                        </h3>
                        <div className="space-y-3">
                            {topClubs.map((item, idx) => (
                                <div
                                    key={item.user.id}
                                    onClick={() => onViewClient(item.user.id)}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                idx === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-white border border-gray-200 text-gray-500'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{item.user.name}</div>
                                            <div className="text-xs text-gray-400">{item.totalPlayers} jugadores</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900">{item.activeTournaments}</div>
                                        <div className="text-xs text-gray-400">torneos</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Activity className="text-indigo-600" size={20} />
                            Actividad Reciente
                        </h3>
                        <div className="space-y-3">
                            {recentActivity.map(({ ranking, owner }) => (
                                <div
                                    key={ranking.id}
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-900">
                                            <span className="font-semibold">{owner?.name || 'Usuario'}</span> creó{' '}
                                            <span className="font-semibold text-indigo-600">{ranking.nombre}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {ranking.fechaInicio} • {ranking.format}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Actions + Plan Distribution */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap size={20} className="text-primary" />
                            Acciones Rápidas
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={onCreateClient}
                                className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3 group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <UserPlus size={18} />
                                </div>
                                <span className="font-medium text-sm">Crear Nuevo Cliente</span>
                            </button>

                            {pendingUsers.length > 0 && (
                                <button
                                    onClick={() => onNavigate('admin_management')}
                                    className="w-full text-left p-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors flex items-center gap-3 group relative"
                                >
                                    <div className="bg-white p-2 rounded-lg shadow-sm text-orange-600 transition-colors">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <span className="font-medium text-sm">Ver Solicitudes Pendientes</span>
                                    <span className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {pendingUsers.length}
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={() => onNavigate('ranking_list')}
                                className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                                    <Search size={18} />
                                </div>
                                <span className="font-medium text-sm">Buscar Torneo Global</span>
                            </button>

                            <button
                                onClick={() => onNavigate('admin_management')}
                                className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-3 group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-400 group-hover:text-green-600 transition-colors">
                                    <Building size={18} />
                                </div>
                                <span className="font-medium text-sm">Gestionar Clientes</span>
                            </button>
                        </div>
                    </div>

                    {/* Plan Distribution */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Calendar size={20} className="text-purple-600" />
                            Distribución de Planes
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(metrics.planDistribution)
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .map(([planKey, count]) => {
                                    const planInfo = SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS];
                                    const percentage = Math.round(((count as number) / activeAdmins.length) * 100);

                                    return (
                                        <div key={planKey}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-gray-700">{planInfo?.name || planKey}</span>
                                                <span className="text-sm font-bold text-gray-900">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
