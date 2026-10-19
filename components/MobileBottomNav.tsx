import React from 'react';
import { LayoutDashboard, Trophy, Users, User, ShieldCheck } from 'lucide-react';

interface MobileBottomNavProps {
    currentView: string;
    onNavigate: (view: any) => void;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
}

/** Thumb navigation for phones and tablets: the sidebar takes over from 1024px */
export const MobileBottomNav = ({ currentView, onNavigate, isAdmin, isSuperAdmin }: MobileBottomNavProps) => {
    const navItems = [
        { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, show: isAdmin, also: [] as string[] },
        { id: 'ranking_list', label: 'Torneos', icon: Trophy, show: true, also: ['ranking_create', 'ranking_detail'] },
        { id: 'players', label: 'Jugadores', icon: Users, show: isAdmin, also: ['player_detail', 'pair_detail'] },
        { id: 'admin_management', label: 'Admins', icon: ShieldCheck, show: !!isSuperAdmin, also: [] },
        { id: 'profile', label: 'Mi cuenta', icon: User, show: true, also: [] },
    ].filter(item => item.show);

    return (
        <nav
            className="rg lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-rg-line grid"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)`, paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Secciones"
        >
            {navItems.map(item => {
                const isActive = currentView === item.id || item.also.includes(currentView);
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`h-16 flex flex-col items-center justify-center gap-1 text-[11.5px] transition-colors ${isActive ? 'text-court font-semibold' : 'text-rg-muted active:text-rg-ink'}`}
                    >
                        <Icon size={20} strokeWidth={1.75} />
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
};
