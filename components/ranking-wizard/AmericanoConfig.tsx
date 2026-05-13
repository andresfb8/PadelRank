import React from 'react';
import { Settings } from 'lucide-react';
import { Button, Input } from '../ui/Components';
import { ScoringMode } from '../../types';
import { FormatConfigProps } from './types';

interface AmericanoConfigProps extends FormatConfigProps {
    format: 'americano' | 'mexicano';
}

export const AmericanoConfig = ({
    format,
    config,
    setConfig,
    setIndividualMaxPlayers,
}: AmericanoConfigProps) => {
    const variant = format === 'americano' ? config.americanoConfig?.variant : config.mexicanoConfig?.variant;

    const setVariant = (v: 'individual' | 'pairs') => {
        if (format === 'americano') {
            setConfig({ ...config, americanoConfig: { ...config.americanoConfig!, variant: v } });
        } else {
            setConfig({ ...config, mexicanoConfig: { ...config.mexicanoConfig!, variant: v } });
        }
        setIndividualMaxPlayers(v === 'pairs' ? 8 : 12);
    };

    return (
        <div className="border-t pt-4">
            {/* Modalidad de Juego */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad de Juego</label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setVariant('individual')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${variant === 'individual' || !variant
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Individual (Rotatorio)
                    </button>
                    <button
                        onClick={() => setVariant('pairs')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${variant === 'pairs'
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Parejas Fijas
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {variant === 'pairs'
                        ? 'Las parejas son fijas durante todo el torneo. Se enfrentan contra otras parejas.'
                        : 'Cada jugador juega individualmente cambiando de pareja en cada partido.'}
                </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings size={18} /> Configuración del Torneo
            </h3>

            {/* Courts */}
            <div className="mb-4">
                <Input
                    type="number"
                    label="Número de Pistas"
                    value={config.courts || 2}
                    onChange={(e: any) => setConfig({ ...config, courts: parseInt(e.target.value) || 2 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                    Determina cuántos partidos simultáneos se pueden jugar por ronda
                </p>
            </div>

            {/* Scoring Mode */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sistema de Puntuación</label>
                <select
                    className="input-field w-full border p-2 rounded-lg mb-2"
                    value={config.scoringMode || '24'}
                    onChange={(e: any) => setConfig({ ...config, scoringMode: e.target.value as ScoringMode })}
                >
                    <option value="16">16 Puntos</option>
                    <option value="21">21 Puntos</option>
                    <option value="24">24 Puntos</option>
                    <option value="31">31 Puntos</option>
                    <option value="32">32 Puntos</option>
                    <option value="custom">Puntos Personalizados</option>
                    <option value="per-game">Por Juego (Tradicional)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    {config.scoringMode === 'per-game'
                        ? 'Sistema tradicional: 6 juegos por set, mejor de 3 sets'
                        : 'Los equipos acumulan puntos hasta alcanzar el total. El sistema autorellena la puntuación del rival.'}
                </p>
            </div>
        </div>
    );
};
