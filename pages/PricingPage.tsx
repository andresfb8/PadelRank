import React, { useState } from 'react';
import { Check, Star, Zap, Shield, Crown } from 'lucide-react';
import { createCheckoutSession } from '../services/stripeService';

const PLANS = [
    {
        id: 'basic',
        name: 'Básico',
        price: 19,
        period: '/ mes',
        description: 'Para pequeños clubes que están empezando',
        features: ['Hasta 2 torneos activos', 'Gestión básica de jugadores', 'Soporte por email'],
        priceId: 'price_1SyENKH0qNNQGErtnwAw3w9R', // Reemplazar con ID real
        color: 'from-blue-400 to-blue-600',
        icon: Shield
    },
    {
        id: 'pro',
        name: 'Profesional',
        price: 39,
        period: '/ mes',
        description: 'La opción más popular para clubes en crecimiento',
        features: ['Torneos ilimitados', 'Gestión avanzada', 'Rankings globales', 'Soporte prioritario', '1 mes de prueba gratis'],
        priceId: 'price_1SyENLH0qNNQGErtnn8H2yK7',
        popular: true,
        color: 'from-violet-500 to-purple-600',
        icon: Zap
    },
    {
        id: 'star',
        name: 'Star Point',
        price: 59,
        period: '/ mes',
        description: 'Potencia total para grandes organizaciones',
        features: ['Todo lo de Pro', 'Marca blanca (Logo propio)', 'TV Mode para pantallas', 'Gestor de cuenta dedicado', 'API Access'],
        priceId: 'price_1SyENLH0qNNQGErtanrpSTkh',
        color: 'from-amber-400 to-orange-500',
        icon: Crown
    },
    {
        id: 'weekend',
        name: 'Weekend Warrior',
        price: 29,
        period: '/ 7 días',
        description: 'Acceso completo temporal para eventos puntuales',
        features: ['Acceso total Plan Star', 'Válido por 7 días', 'Sin renovación automática', 'Ideal para torneos de fin de semana'],
        priceId: 'price_1SyENMH0qNNQGErtQsOQE9Yo',
        color: 'from-emerald-400 to-teal-600',
        icon: Star
    }
];

export default function PricingPage() {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleSubscribe = async (priceId: string, planId: string) => {
        // if (!user) { // Removed check to allow purchase-first flow
        //     alert("Por favor inicia sesión para suscribirte");
        //     return;
        // }

        setLoadingId(planId);
        try {
            const mode = planId === 'weekend' ? 'payment' : 'subscription';
            await createCheckoutSession(priceId, mode);
        } catch (error) {
            console.error(error);
            alert("Error iniciando el pago. Por favor intenta de nuevo.");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-base font-semibold text-purple-400 uppercase tracking-wide">Planes y Precios</h2>
                        <p className="mt-2 text-4xl font-extrabold text-white sm:text-5xl">
                            Elige el nivel perfecto para tu club
                        </p>
                        <p className="mt-4 max-w-2xl text-xl text-slate-400 mx-auto">
                            Desde gestión básica hasta soluciones completas de marca blanca.
                            Cancela cuando quieras.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-4">
                        {PLANS.map((plan) => {
                            const Icon = plan.icon;
                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col bg-slate-900/50 backdrop-blur-xl rounded-2xl border ${plan.popular ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-800'} p-6 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 -mr-1 -mt-1 w-24 h-24 overflow-hidden rounded-tr-2xl">
                                            <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-8 py-1 transform rotate-45 translate-x-4 translate-y-3 shadow-sm">
                                                POPULAR
                                            </div>
                                        </div>
                                    )}

                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                    <p className="mt-2 text-sm text-slate-400 flex-grow">{plan.description}</p>

                                    <div className="my-6">
                                        <span className="text-4xl font-extrabold text-white">{plan.price}€</span>
                                        <span className="text-slate-500 ml-1">{plan.period}</span>
                                        <p className="text-xs text-slate-500 mt-1">IVA incluido</p>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <Check className="h-5 w-5 text-emerald-400 shrink-0 mr-2" />
                                                <span className="text-sm text-slate-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSubscribe(plan.priceId, plan.id)}
                                        disabled={loadingId !== null}
                                        className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 
                      ${loadingId === plan.id
                                                ? 'bg-slate-700 cursor-not-allowed'
                                                : plan.popular
                                                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-purple-500/25'
                                                    : 'bg-slate-800 hover:bg-slate-700'
                                            }`}
                                    >
                                        {loadingId === plan.id ? 'Procesando...' :
                                            plan.id === 'pro' ? 'Empezar prueba gratis' : 'Seleccionar Plan'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

