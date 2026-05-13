import React from 'react';
import { Input } from '../ui/Components';
import { FormatConfigProps } from './types';

interface LeagueConfigProps extends FormatConfigProps {
    format: 'individual' | 'pairs';
}

export const LeagueConfig = ({
    format,
    config,
    setConfig,
    numDivisions,
    setNumDivisions,
    individualMaxPlayers,
    setIndividualMaxPlayers,
}: LeagueConfigProps) => {
    return (
        <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sistema de Puntuación</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <Input type="number" label="Victoria 2-0" value={config.pointsPerWin2_0}
                    onChange={(e: any) => setConfig({ ...config, pointsPerWin2_0: parseInt(e.target.value) || 0 })} />
                <Input type="number" label="Victoria 2-1" value={config.pointsPerWin2_1}
                    onChange={(e: any) => setConfig({ ...config, pointsPerWin2_1: parseInt(e.target.value) || 0 })} />
                <Input type="number" label="Empate" value={config.pointsDraw}
                    onChange={(e: any) => setConfig({ ...config, pointsDraw: parseInt(e.target.value) || 0 })} />
                <Input type="number" label="Derrota 1-2" value={config.pointsPerLoss2_1}
                    onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_1: parseInt(e.target.value) || 0 })} />
                <Input type="number" label="Derrota 0-2" value={config.pointsPerLoss2_0}
                    onChange={(e: any) => setConfig({ ...config, pointsPerLoss2_0: parseInt(e.target.value) || 0 })} />
            </div>

            <div className="grid md:grid-cols-4 gap-4">
                <Input type="number" label="Nº Divisiones" value={numDivisions}
                    onChange={(e: any) => setNumDivisions(Math.max(1, parseInt(e.target.value) || 1))} />
                <Input
                    type="number"
                    label={format === 'pairs' ? 'Parejas/Div' : 'Jugadores/Div'}
                    value={individualMaxPlayers}
                    onChange={(e: any) => {
                        const newValue = Math.max(0, parseInt(e.target.value) || 0);
                        setIndividualMaxPlayers(newValue);
                        setConfig({ ...config, maxPlayersPerDivision: newValue });
                    }}
                />
                <Input type="number" label="Ascienden" value={config.promotionCount}
                    onChange={(e: any) => setConfig({ ...config, promotionCount: parseInt(e.target.value) || 0 })} />
                <Input type="number" label="Descienden" value={config.relegationCount}
                    onChange={(e: any) => setConfig({ ...config, relegationCount: parseInt(e.target.value) || 0 })} />
            </div>
        </div>
    );
};
