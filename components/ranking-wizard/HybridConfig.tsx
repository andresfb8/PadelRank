import React from 'react';
import { Settings, Info } from 'lucide-react';
import { Input } from '../ui/Components';
import { FormatConfigProps } from './types';

type HybridConfigProps = Pick<
    FormatConfigProps,
    'config' | 'setConfig'
>;

export const HybridConfig = ({ config, setConfig }: HybridConfigProps) => {
    const hc = config.hybridConfig!;

    const handleMainQualifiers = (mainQualifiers: number) => {
        const consolation = hc?.consolationQualifiersPerGroup || 0;
        const pairsPerGroup = hc?.pairsPerGroup || 4;
        if (mainQualifiers + consolation > pairsPerGroup) {
            alert(`Error: La suma de clasificados (Principal + Consolación) no puede superar el número de parejas por grupo (${pairsPerGroup}).`);
            return;
        }
        setConfig({ ...config, hybridConfig: { ...hc, qualifiersPerGroup: mainQualifiers } });
    };

    const handleConsolationQualifiers = (consolationQualifiers: number) => {
        const main = hc?.qualifiersPerGroup || 2;
        const pairsPerGroup = hc?.pairsPerGroup || 4;
        if (main + consolationQualifiers > pairsPerGroup) {
            alert(`Error: La suma de clasificados (Principal: ${main} + Consolación: ${consolationQualifiers}) no puede superar el número de parejas por grupo (${pairsPerGroup}).`);
            return;
        }
        setConfig({ ...config, hybridConfig: { ...hc, consolationQualifiersPerGroup: consolationQualifiers } });
    };

    const handlePairsPerGroup = (pairsPerGroup: number) => {
        const main = hc?.qualifiersPerGroup || 2;
        const consolation = hc?.consolationQualifiersPerGroup || 0;
        if (pairsPerGroup < main + consolation) {
            alert(`Error: El número de parejas por grupo debe ser mayor o igual que la suma de clasificados (${main + consolation}).`);
            return;
        }
        setConfig({ ...config, hybridConfig: { ...hc, pairsPerGroup } });
    };

    return (
        <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings size={18} /> Configuración de Fase de Grupos
            </h3>

            <div className="bg-pink-50 border border-pink-100 p-4 rounded-lg mb-4 text-sm text-pink-800">
                <Info size={16} className="inline mr-2 mb-1" />
                En este formato, los jugadores competirán primero en grupos (ligas pequeñas) y los mejores de cada grupo pasarán a una fase final eliminatoria.
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Input
                    type="number"
                    label="Clasifican a Principal (por grupo)"
                    value={hc?.qualifiersPerGroup || 2}
                    onChange={(e: any) => handleMainQualifiers(parseInt(e.target.value) || 1)}
                />
                <Input
                    type="number"
                    label="Clasifican a Consolación (por grupo)"
                    value={hc?.consolationQualifiersPerGroup || 0}
                    onChange={(e: any) => handleConsolationQualifiers(parseInt(e.target.value) || 0)}
                />
                <Input
                    type="number"
                    label="Parejas por Grupo"
                    value={hc?.pairsPerGroup || 4}
                    onChange={(e: any) => handlePairsPerGroup(parseInt(e.target.value) || 2)}
                />
                <div className="text-xs text-gray-500 mt-2 md:col-span-3">
                    <strong>Cuadro Principal:</strong> Los <strong>{hc?.qualifiersPerGroup || 2} primeros</strong> de cada grupo.
                    {(hc?.consolationQualifiersPerGroup || 0) > 0 && (
                        <>
                            <br /><strong>Cuadro Consolación:</strong> Los <strong>siguientes {hc?.consolationQualifiersPerGroup}</strong> de cada grupo.
                        </>
                    )}
                    <br />Ambos cuadros serán de eliminación simple. Todos los jugadores juegan al menos un partido.
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
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
        </div>
    );
};
