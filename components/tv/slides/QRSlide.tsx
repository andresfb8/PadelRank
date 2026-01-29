import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Ranking } from '../../../types';
import { Smartphone } from 'lucide-react';

interface Props {
    ranking: Ranking;
}

export const QRSlide = ({ ranking }: Props) => {
    // Construct URL - in prod use env variable or window.location
    const url = ranking.publicUrl || (typeof window !== 'undefined' ? `${window.location.origin}/ranking/${ranking.id}` : '');

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 z-0" />

            <div className="z-10 bg-white p-6 rounded-3xl shadow-2xl mb-12">
                <QRCodeSVG value={url} size={400} level="H" includeMargin={true} />
            </div>

            <div className="z-10 text-center space-y-6">
                <h2 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    Sigue el torneo en vivo
                </h2>
                <div className="flex items-center justify-center gap-4 text-3xl text-gray-300">
                    <Smartphone size={40} />
                    <p>Escanea el código QR para ver resultados y estadísticas</p>
                </div>
                <p className="text-xl text-gray-500 mt-8 font-mono">{url}</p>
            </div>
        </div>
    );
};
