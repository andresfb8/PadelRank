
export type SubscriptionPlan = 'basic' | 'pro' | 'star' | 'weekend' | 'trial';

export interface PlanFeatures {
    name: string;
    price: number; // EUR/month
    maxPlayers: number;
    maxActiveTournaments: number;
    maxDivisionsPerTournament: number;
    allowedFormats: Array<'americano' | 'mexicano' | 'individual' | 'pairs' | 'hybrid' | 'elimination' | 'classic' | 'pozo'>;
    allowsBranding: boolean;
    durationDays?: number; // For Weekend Warrior
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanFeatures> = {
    basic: {
        name: 'Básico',
        price: 19,
        maxPlayers: 50,
        maxActiveTournaments: 3,
        maxDivisionsPerTournament: 3,
        allowedFormats: ['americano', 'mexicano', 'individual', 'pairs'],
        allowsBranding: false
    },
    pro: {
        name: 'Pro',
        price: 39,
        maxPlayers: 150,
        maxActiveTournaments: Infinity,
        maxDivisionsPerTournament: Infinity,
        allowedFormats: ['americano', 'mexicano', 'individual', 'pairs', 'hybrid', 'pozo'],
        allowsBranding: true
    },
    star: {
        name: 'Star Point',
        price: 59,
        maxPlayers: Infinity,
        maxActiveTournaments: Infinity,
        maxDivisionsPerTournament: Infinity,
        allowedFormats: ['americano', 'mexicano', 'individual', 'pairs', 'hybrid', 'elimination', 'pozo'],
        allowsBranding: true
    },
    weekend: {
        name: 'Weekend Warrior',
        price: 39, // 39€ IVA incluido
        maxPlayers: Infinity,
        maxActiveTournaments: Infinity,
        maxDivisionsPerTournament: Infinity,
        allowedFormats: ['americano', 'mexicano', 'individual', 'pairs', 'hybrid', 'elimination', 'pozo'],
        allowsBranding: true,
        durationDays: 7
    },
    trial: {
        name: 'Prueba Gratuita',
        price: 0,
        maxPlayers: Infinity,
        maxActiveTournaments: Infinity,
        maxDivisionsPerTournament: Infinity,
        allowedFormats: ['americano', 'mexicano', 'individual', 'pairs', 'hybrid', 'elimination', 'pozo'],
        allowsBranding: true
    }
};

// Helper functions for checking limits
export function canCreateTournament(
    currentActiveTournaments: number,
    plan: SubscriptionPlan,
    isSuperAdmin?: boolean
): { allowed: boolean; message?: string } {
    if (isSuperAdmin) return { allowed: true };
    const limit = SUBSCRIPTION_PLANS[plan].maxActiveTournaments;

    if (currentActiveTournaments >= limit) {
        return {
            allowed: false,
            message: `Has alcanzado el límite de ${limit} torneos activos de tu plan ${SUBSCRIPTION_PLANS[plan].name}. Mejora tu plan para crear más torneos.`
        };
    }

    return { allowed: true };
}

export function canAddPlayer(
    currentTotalPlayers: number,
    plan: SubscriptionPlan,
    isSuperAdmin?: boolean
): { allowed: boolean; message?: string } {
    if (isSuperAdmin) return { allowed: true };
    const limit = SUBSCRIPTION_PLANS[plan].maxPlayers;

    if (currentTotalPlayers >= limit) {
        return {
            allowed: false,
            message: `Has alcanzado el límite de ${limit} jugadores de tu plan ${SUBSCRIPTION_PLANS[plan].name}. Mejora tu plan para añadir más jugadores.`
        };
    }

    return { allowed: true };
}

export function canUseFormat(
    format: string,
    plan: SubscriptionPlan,
    userEmail?: string,
    isSuperAdmin?: boolean
): { allowed: boolean; message?: string } {
    // SuperAdmins bypass all format restrictions
    if (isSuperAdmin) {
        return { allowed: true };
    }

    // Special restriction for CPSJ Classic format
    if (format === 'classic') {
        const isAuthorizedEmail = userEmail?.toLowerCase().includes('info@clubdepadelsanjavier');
        if (isAuthorizedEmail) {
            return { allowed: true };
        }
        return {
            allowed: false,
            message: 'Este es un formato exclusivo personalizado. Si deseas un formato a medida, contacta con soporte.'
        };
    }

    const allowedFormats = SUBSCRIPTION_PLANS[plan].allowedFormats;

    if (!allowedFormats.includes(format as any)) {
        return {
            allowed: false,
            message: `El formato "${format}" no está disponible en tu plan ${SUBSCRIPTION_PLANS[plan].name}. Mejora a un plan superior para acceder a este formato.`
        };
    }

    return { allowed: true };
}

export function canCreateDivision(
    currentDivisions: number,
    plan: SubscriptionPlan
): { allowed: boolean; message?: string } {
    const limit = SUBSCRIPTION_PLANS[plan].maxDivisionsPerTournament;

    if (currentDivisions >= limit) {
        return {
            allowed: false,
            message: `Has alcanzado el límite de ${limit} divisiones por torneo de tu plan ${SUBSCRIPTION_PLANS[plan].name}.`
        };
    }

    return { allowed: true };
}

export function getPlanBadgeColor(plan: SubscriptionPlan): string {
    switch (plan) {
        case 'basic':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        case 'pro':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'star':
            return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-300';
        case 'weekend':
            return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'trial':
            return 'bg-green-100 text-green-700 border-green-200';
        default:
            return 'bg-gray-100 text-gray-600';
    }
}
