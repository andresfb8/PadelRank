import React from 'react';
import { Settings, Info } from 'lucide-react';
import { Input } from '../ui/Components';
import { FormatConfigProps } from './types';
import {
    computeBracketSize,
    previewBracketBreakdown,
    formatBreakdown,
} from '../../services/crossGroupQualifiers';

type HybridConfigProps = Pick<
    FormatConfigProps,
    'config' | 'setConfig' | 'numDivisions'
>;

const BRACKET_SIZE_OPTIONS: { value: number | undefined; label: string }[] = [
    { value: undefined, label: 'Automático' },
    { value: 2, label: 'Final (2)' },
    { value: 4, label: 'Semifinales (4)' },
    { value: 8, label: 'Cuartos (8)' },
    { value: 16, label: 'Octavos (16)' },
    { value: 32, label: 'Dieciseisavos (32)' },
];

export const HybridConfig = ({ config, setConfig, numDivisions }: HybridConfigProps) => {
    const hc = config.hybridConfig!;
    const groupCount = Math.max(1, numDivisions || 1);
    const pairsPerGroup = hc?.pairsPerGroup || 4;

    const handleBracketSize = (value: number | undefined) => {
        setConfig({ ...config, hybridConfig: { ...hc, playoffBracketSize: value } });
    };
    const handleConsolationBracketSize = (value: number | undefined) => {
        setConfig({ ...config, hybridConfig: { ...hc, consolationBracketSize: value } });
    };

    const mainSize = computeBracketSize(hc?.playoffBracketSize, hc?.qualifiersPerGroup || 0, groupCount);
    const mainBreakdown = previewBracketBreakdown(groupCount, pairsPerGroup, mainSize, 0);
    const mainGuaranteed = (hc?.qualifiersPerGroup || 0) * groupCount;
    const consolationEnabled = (hc?.consolationQualifiersPerGroup || 0) > 0;
    const consolationSize = consolationEnabled
        ? computeBracketSize(hc?.consolationBracketSize, hc?.consolationQualifiersPerGroup || 0, groupCount)
        : 0;
    const consolationBreakdown = consolationEnabled
        ? previewBracketBreakdown(groupCount, pairsPerGroup, consolationSize, hc?.qualifiersPerGroup || 0)
        : null;

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
                <label className="md:col-span-3 flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={!!hc?.doubleRoundRobin}
                        onChange={(e) => setConfig({ ...config, hybridConfig: { ...hc, doubleRoundRobin: e.target.checked } })}
                    />
                    Liga con ida y vuelta
                    <span className="text-xs text-gray-500 font-normal">(cada pareja juega dos veces contra cada rival)</span>
                </label>
                <div className="md:col-span-3 grid md:grid-cols-2 gap-4 mt-1">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Tamaño Cuadro Principal</label>
                        <select
                            value={hc?.playoffBracketSize ?? ''}
                            onChange={(e) => handleBracketSize(e.target.value === '' ? undefined : parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium"
                        >
                            {BRACKET_SIZE_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Tamaño Cuadro Consolación</label>
                        <select
                            value={hc?.consolationBracketSize ?? ''}
                            onChange={(e) => handleConsolationBracketSize(e.target.value === '' ? undefined : parseInt(e.target.value))}
                            disabled={!consolationEnabled}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium disabled:opacity-50"
                        >
                            {BRACKET_SIZE_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="text-xs text-gray-600 mt-2 md:col-span-3 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <strong className="text-gray-800">Cuadro Principal ({mainSize} clasificados):</strong>{' '}
                    {formatBreakdown(mainBreakdown)}.
                    {mainSize > mainGuaranteed && mainGuaranteed > 0 && (
                        <span className="text-gray-500"> Los {mainSize - mainGuaranteed} huecos restantes se rellenan con el mejor rendimiento cruzado entre grupos.</span>
                    )}
                    {consolationBreakdown && (
                        <>
                            <br /><strong className="text-gray-800">Cuadro Consolación ({consolationSize} clasificados):</strong>{' '}
                            {formatBreakdown(consolationBreakdown)}.
                        </>
                    )}
                    <br /><span className="text-gray-500">Antes de generar los cuadros podrás ajustar manualmente los clasificados.</span>
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
