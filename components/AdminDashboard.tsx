
import { Trophy, Users, ShieldCheck, Activity, Plus, Calendar, ArrowRight, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { Ranking, Player } from '../types';
import { Button } from './ui/Components';

interface AdminDashboardProps {
    activeRankings: Ranking[];
    allRankings: Ranking[]; // Needed for pending matches calculation
    players: Record<string, Player>;
    userName?: string;
    onNavigate: (view: any) => void;
    onCreateTournament: () => void;
    onCreatePlayer: () => void;
}

export const AdminDashboard = ({
    activeRankings,
    allRankings,
    players,
    userName,
    onNavigate,
    onCreateTournament,
    onCreatePlayer
}: AdminDashboardProps) => {

    // Calculate Stats
    const totalPlayers = Object.keys(players).length;
    const pendingMatches = allRankings.reduce((acc, r) => acc + r.divisions.reduce((dAcc, d) => dAcc + d.matches.filter(m => m.status === 'pendiente').length, 0), 0);
    const activeTournamentsCount = activeRankings.length;

    // Helper for player list
    const playerList = Object.values(players);

    // Get current date for greeting
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString('es-ES', dateOptions);

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {userName ? `Hola, ${userName}` : 'Panel de Control'}
                        <span className="text-2xl ml-2">👋</span>
                    </h1>
                    <p className="text-gray-500 mt-1 capitalize">{dateString}</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={onCreateTournament} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                        <Plus size={18} className="mr-2" /> Nuevo Torneo
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    onClick={() => onNavigate('ranking_list')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Torneos Activos</p>
                            <h3 className="text-3xl font-bold text-gray-900">{activeTournamentsCount}</h3>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Trophy size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-blue-600 font-medium">
                        <span>Ver todos los torneos</span>
                        <ArrowRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div
                    onClick={() => onNavigate('players')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Jugadores del Club</p>
                            <h3 className="text-3xl font-bold text-gray-900">{totalPlayers}</h3>
                        </div>
                        <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
                        <span>Gestionar plantilla</span>
                        <ArrowRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Partidos Pendientes</p>
                            <h3 className="text-3xl font-bold text-gray-900">{pendingMatches}</h3>
                        </div>
                        <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-400">
                        En todos los torneos activos
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Tournament Progress */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="text-indigo-600" size={20} />
                                Progreso de Torneos
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Vista Lista"
                                    >
                                        <List size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Vista Cuadrícula"
                                    >
                                        <LayoutGrid size={16} />
                                    </button>
                                </div>
                                <Button variant="ghost" className="text-xs" onClick={() => onNavigate('ranking_list')}>Ver Todo</Button>
                            </div>
                        </div>

                        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                            {activeRankings.slice(0, viewMode === 'grid' ? 6 : 100).map(ranking => {
                                const totalMatches = ranking.divisions.reduce((acc, d) => acc + d.matches.length, 0);
                                const completedMatches = ranking.divisions.reduce((acc, d) => acc + d.matches.filter(m => m.status === 'finalizado').length, 0);
                                const percentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

                                const colorClass = ranking.format === 'mexicano' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                                    ranking.format === 'americano' ? 'bg-gradient-to-r from-violet-400 to-fuchsia-500' :
                                        ranking.format === 'hybrid' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                                            'bg-gradient-to-r from-blue-400 to-cyan-500';

                                if (viewMode === 'grid') {
                                    return (
                                        <div
                                            key={ranking.id}
                                            onClick={() => onNavigate('ranking_list')}
                                            className="group bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between h-full"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-gray-800 line-clamp-1" title={ranking.nombre}>{ranking.nombre}</h4>
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${ranking.format === 'mexicano' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            ranking.format === 'americano' ? 'bg-violet-50 text-violet-700 border-violet-100' :
                                                                'bg-blue-50 text-blue-700 border-blue-100'
                                                        }`}>
                                                        {ranking.format === 'americano' ? 'AME' :
                                                            ranking.format === 'mexicano' ? 'MEX' :
                                                                ranking.format === 'hybrid' ? 'HIB' :
                                                                    ranking.format === 'elimination' ? 'ELI' :
                                                                        ranking.format === 'pairs' ? 'PAR' :
                                                                            ranking.format === 'individual' ? 'IND' : 'LIG'}
                                                    </span>
                                                </div>
                                                <div className="relative pt-1">
                                                    <div className="flex mb-1 items-center justify-between">
                                                        <div className="text-xs font-semibold inline-block text-indigo-600">
                                                            {percentage}%
                                                        </div>
                                                    </div>
                                                    <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-indigo-50">
                                                        <div style={{ width: `${percentage}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colorClass}`}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                                                <span>{ranking.divisions.length} Div.</span>
                                                <span>{completedMatches}/{totalMatches}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={ranking.id} className="group relative bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl p-4 transition-all">
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-800">{ranking.nombre}</h4>
                                                <p className="text-xs text-gray-500 capitalize">{ranking.format} • {ranking.divisions.length} Divisiones</p>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                                                {percentage}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                            <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-gray-400">{completedMatches} de {totalMatches} partidos jugados</span>
                                            <button
                                                onClick={() => {
                                                    // This is a bit of a hack since we need to pass the ranking object to the parent
                                                    // Ideally we would emit an event "onSelectRanking(ranking)"
                                                    // But for now, let's navigate to list
                                                    onNavigate('ranking_list');
                                                }}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Gestionar &rarr;
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {activeRankings.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 col-span-full">
                                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                        <Trophy size={20} />
                                    </div>
                                    <p className="text-gray-500 font-medium">No hay torneos activos</p>
                                    <p className="text-xs text-gray-400 mt-1 mb-4">¡Crea tu primer torneo para empezar!</p>
                                    <Button onClick={onCreateTournament} variant="secondary" className="text-xs">
                                        Crear Torneo
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Tips or News (Placeholder for future "Club Hub" features) */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <ShieldCheck size={20} />
                                Consejo Pro
                            </h3>
                            <p className="text-indigo-100 text-sm mb-4">
                                ¿Sabías que puedes invitar jugadores rápidamente compartiendo el enlace público de tu torneo?
                            </p>
                            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs backdrop-blur-sm">
                                Ver documentación
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Top Players & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="text-green-600" size={20} />
                            Top Rendimiento
                        </h3>
                        <div className="space-y-3">
                            {playerList
                                .filter(p => p.stats && p.stats.pj >= 3) // Min 3 games needed
                                .sort((a, b) => b.stats.winrate - a.stats.winrate)
                                .slice(0, 5)
                                .map((player, idx) => (
                                    <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onNavigate('players')}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                    idx === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'bg-white border border-gray-200 text-gray-500'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                                                    {player.nombre} {player.apellidos}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {player.stats.pj} partidos
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900">{player.stats.winrate}%</span>
                                        </div>
                                    </div>
                                ))}

                            {playerList.filter(p => p.stats && p.stats.pj >= 3).length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-8 italic">
                                    Se necesitan más datos (mínimo 3 partidos jugados por jugador)
                                </p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <Button variant="secondary" className="w-full text-xs" onClick={() => onNavigate('players')}>
                                Ver Ranking Global
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-primary" /> Acciones Rápidas
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={onCreatePlayer}
                                className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-3 group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-400 group-hover:text-emerald-600 transition-colors">
                                    <Users size={18} />
                                </div>
                                <span className="font-medium text-sm">Registrar Nuevo Jugador</span>
                            </button>

                            <button
                                onClick={onCreateTournament}
                                className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-3 group"
                            >
                                <div className="bg-white p-2 rounded-lg shadow-sm text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <Calendar size={18} />
                                </div>
                                <span className="font-medium text-sm">Programar Evento</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
