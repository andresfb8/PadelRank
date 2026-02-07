import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 bg-indigo-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-600 text-white p-2 rounded-xl">
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className="font-bold text-slate-900">Privacidad y Cookies</h3>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        Utilizamos cookies propias y de terceros para mejorar tu experiencia y analizar el uso de nuestra web. Al continuar navegando, consideramos que aceptas su uso.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={acceptCookies}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-slate-200"
                        >
                            Aceptar
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="sm:px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
