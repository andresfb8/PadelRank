import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export const ConsentManager = () => {
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
        <div className="relative z-[100] lg:fixed lg:bottom-8 lg:left-8 lg:max-w-md">
            {/* taste-skill-ignore: a floating notice, a real overlay */}
            <div className="bg-white lg:rounded-xl lg:float-card p-5 relative text-rg-ink">
                

                <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-court">
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className="font-semibold">Privacidad y cookies</h3>
                    </div>

                    <p className="text-[15px] leading-relaxed mb-5">
                        Utilizamos cookies propias y de terceros para mejorar tu experiencia y analizar el uso de nuestra web. Al continuar navegando, consideramos que aceptas su uso.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={acceptCookies}
                            className="flex-1 h-11 bg-rg-ink hover:bg-rg-night-2 text-white font-semibold px-6 rounded-full transition-colors"
                        >
                            Aceptar
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="sm:px-6 h-11 text-[15px] font-medium text-rg-muted hover:text-rg-ink transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-rg-muted hover:text-rg-ink transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
