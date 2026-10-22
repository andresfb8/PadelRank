import React from 'react';
import { Input } from '../ui/Components';
import { ScoringMode } from '../../types';
import { FormatConfigProps } from './types';

type PozoConfigProps = Pick<FormatConfigProps, 'config' | 'setConfig'>;

export const PozoConfig = ({ config, setConfig }: PozoConfigProps) => {
    const pc = config.pozoConfig!;

    return (
        <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                Configuración de Pozo
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Variant */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variante</label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setConfig({ ...config, pozoConfig: { ...pc, variant: 'individual' } })}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                                pc?.variant === 'individual'
                                    ? 'bg-white text-rg-ink font-semibold'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Individual
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, pozoConfig: { ...pc, variant: 'fixed-pairs' } })}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                                pc?.variant === 'fixed-pairs'
                                    ? 'bg-white text-rg-ink font-semibold'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Parejas Fijas
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {pc?.variant === 'individual'
                            ? 'Se cambian parejas en cada partido.'
                            : 'Las parejas se mantienen fijas todo el torneo.'}
                    </p>
                </div>

                {/* Courts */}
                <Input
                    type="number"
                    label="Número de Pistas"
                    value={pc?.numCourts || 2}
                    onChange={(e: any) =>
                        setConfig({ ...config, pozoConfig: { ...pc, numCourts: Math.max(1, parseInt(e.target.value) || 1) } })
                    }
                />
            </div>

            {/* Scoring */}
            <div className="mt-4 bg-rg-raised p-4 rounded-lg">
                <h4 className="font-semibold text-[14px] mb-2">Puntuación</h4>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Puntuación</label>
                        <select
                            className="w-full border rounded p-2 text-sm bg-white"
                            value={config.scoringMode || 'per-game'}
                            onChange={(e: any) => {
                                const mode = e.target.value as ScoringMode;
                                setConfig({
                                    ...config,
                                    scoringMode: mode,
                                    pozoConfig: { ...pc, scoringMode: mode },
                                });
                            }}
                        >
                            <option value="per-game">Por Juego (Tradicional)</option>
                            <option value="16">16 Puntos</option>
                            <option value="21">21 Puntos</option>
                            <option value="24">24 Puntos</option>
                            <option value="31">31 Puntos</option>
                            <option value="32">32 Puntos</option>
                            <option value="custom">Puntos Personalizados</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {config.scoringMode === 'per-game'
                                ? 'Sistema tradicional: 6 juegos por set.'
                                : 'Los equipos acumulan puntos hasta alcanzar el total (o por tiempo).'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
