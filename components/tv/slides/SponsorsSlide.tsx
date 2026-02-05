import React from 'react';
import { Ranking } from '../../../types';
import { Heart } from 'lucide-react';

interface Props {
    ranking: Ranking;
}

export const SponsorsSlide = ({ ranking }: Props) => {
    const sponsors = ranking.tvConfig?.sponsors || [];

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-white text-slate-900 relative">
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-100 rounded-full mb-6">
                    <Heart className="text-red-500 fill-red-500" />
                    <span className="font-bold text-slate-600 uppercase tracking-widest text-sm">Patrocinadores Oficiales</span>
                </div>
                <h2 className="text-5xl font-black text-slate-900">
                    Gracias por hacer posible este torneo
                </h2>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-16 max-w-6xl">
                {sponsors.length > 0 ? (
                    sponsors.map(s => (
                        <div key={s.id} className="flex flex-col items-center gap-4">
                            {s.url ? (
                                <img src={s.url} alt={s.name} className="h-32 object-contain transition-all duration-500" />
                            ) : (
                                <div className="h-32 w-64 bg-gray-200 flex items-center justify-center rounded-xl font-bold text-gray-400 text-2xl">
                                    {s.name}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    /* Default / Placeholder Sponsors if none configured */
                    <div className="grid grid-cols-3 gap-12 opacity-50">
                        <div className="h-32 w-64 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-3xl text-gray-300">LOGO</div>
                        <div className="h-32 w-64 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-3xl text-gray-300">LOGO</div>
                        <div className="h-32 w-64 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-3xl text-gray-300">LOGO</div>
                    </div>
                )}
            </div>

            <div className="absolute bottom-12 text-slate-400 font-medium">
                Organizado con <strong className="text-primary">PadelRank</strong>
            </div>
        </div>
    );
};
