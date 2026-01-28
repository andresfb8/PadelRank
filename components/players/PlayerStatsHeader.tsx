import { Users, TrendingUp, UserPlus, Activity } from 'lucide-react';
import { Player } from '../../types';

interface PlayerStatsHeaderProps {
    players: Record<string, Player>;
}

export const PlayerStatsHeader = ({ players }: PlayerStatsHeaderProps) => {
    const playerArray = Object.values(players);
    const totalPlayers = playerArray.length;

    // Calculate active players (those who have played at least 1 match)
    const activePlayers = playerArray.filter(p => (p.stats?.pj ?? 0) > 0).length;

    // Calculate new players (created in last 30 days - mock for now)
    // In real implementation, would need createdAt field
    const newPlayers = 0; // Placeholder

    // Calculate average winrate
    const avgWinrate = totalPlayers > 0
        ? Math.round(playerArray.reduce((sum, p) => sum + (p.stats?.winrate ?? 0), 0) / totalPlayers)
        : 0;

    const stats = [
        {
            label: 'Total Jugadores',
            value: totalPlayers,
            icon: Users,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100'
        },
        {
            label: 'Jugadores Activos',
            value: activePlayers,
            icon: Activity,
            color: 'bg-green-50 text-green-600',
            iconBg: 'bg-green-100',
            subtitle: `${totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0}% del total`
        },
        {
            label: 'Nuevos (30 días)',
            value: newPlayers,
            icon: UserPlus,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100'
        },
        {
            label: 'Winrate Promedio',
            value: `${avgWinrate}%`,
            icon: TrendingUp,
            color: 'bg-indigo-50 text-indigo-600',
            iconBg: 'bg-indigo-100'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div key={index} className={`${stat.color} rounded-2xl p-4 border border-gray-100 shadow-sm`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className={`${stat.iconBg} p-2 rounded-xl`}>
                                <Icon size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold mb-1">{stat.value}</div>
                        <div className="text-xs font-medium opacity-80">{stat.label}</div>
                        {stat.subtitle && (
                            <div className="text-xs opacity-60 mt-1">{stat.subtitle}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
