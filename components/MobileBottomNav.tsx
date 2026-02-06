import React from 'react';
import { LayoutDashboard, Trophy, Users, User, ShieldCheck } from 'lucide-react';

interface MobileBottomNavProps {
    currentView: string;
    onNavigate: (view: any) => void;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
}

export const MobileBottomNav = ({ currentView, onNavigate, isAdmin, isSuperAdmin }: MobileBottomNavProps) => {
    const navItems = [
        {
            id: 'dashboard',
            label: 'Inicio',
            icon: LayoutDashboard,
            show: isAdmin
        },
        {
            id: 'ranking_list',
            label: 'Torneos',
            icon: Trophy,
            show: true
        },
        {
            id: 'players',
            label: 'Jugadores',
            icon: Users,
            show: isAdmin
        },
        {
            id: 'admin_management',
            label: 'Admin',
            icon: ShieldCheck,
            show: isSuperAdmin
        },
        {
            id: 'profile',
            label: 'Perfil',
            icon: User,
            show: true // Public users technically have a profile button in header, giving them one here too for consistency
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-50 md:hidden pb-4">
            <div className="flex justify-around items-center">
                {navItems.filter(item => item.show).map((item) => {
                    const isActive = currentView === item.id || (item.id === 'ranking_list' && ['ranking_create', 'ranking_detail'].includes(currentView));
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex flex-col items-center justify-center py-1 transition-all duration-300 relative ${isActive
                                ? 'text-primary'
                                : 'text-gray-400 hover:text-gray-600 font-medium'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute -top-1 w-12 h-1 bg-primary rounded-full animate-fade-in" />
                            )}
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 mb-1' : 'mb-1'}`}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] uppercase tracking-wider font-bold transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
