import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Users, Wand2, Plus, X } from 'lucide-react';
import { Button } from '../ui/Components';
import { RankingConfig, TieBreakCriterion, DEFAULT_TIE_BREAK_ORDER } from '../../types';

interface TieBreakConfigProps {
    config: RankingConfig;
    setConfig: (config: RankingConfig) => void;
}

const AVAILABLE_CRITERIA: TieBreakCriterion[] = [
    'pts', 'setsDiff', 'gamesDiff', 'pg', 'setsWon', 'gamesWon', 'winRate', 'directEncounter', 'random'
];

const LABELS: Record<string, string> = {
    pts: 'Puntos',
    setsDiff: 'Diferencia de Sets',
    gamesDiff: 'Diferencia de Juegos',
    pg: 'Partidos Ganados',
    setsWon: 'Sets Ganados',
    gamesWon: 'Juegos Ganados',
    winRate: '% Victorias',
    directEncounter: 'Enfrentamiento Directo',
    random: 'Sorteo (Aleatorio)',
};

export const TieBreakConfig = ({ config, setConfig }: TieBreakConfigProps) => {
    const currentCriteria = config.tieBreakCriteria || DEFAULT_TIE_BREAK_ORDER;

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newCriteria = [...currentCriteria];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCriteria.length) return;
        [newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]];
        setConfig({ ...config, tieBreakCriteria: newCriteria });
    };

    const removeItem = (item: TieBreakCriterion) => {
        setConfig({ ...config, tieBreakCriteria: currentCriteria.filter(c => c !== item) });
    };

    const addItem = (item: TieBreakCriterion) => {
        if (currentCriteria.includes(item)) return;
        setConfig({ ...config, tieBreakCriteria: [...currentCriteria, item] });
    };

    return (
        <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArrowUpDown size={18} /> Criterios de Desempate
            </h3>
            <p className="text-sm text-gray-500 mb-4">Define el orden de prioridad para desempatar la clasificación.</p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="space-y-2 mb-4">
                    {currentCriteria.map((criterion, idx) => {
                        const isSpecial = criterion === 'directEncounter' || criterion === 'random';
                        return (
                            <div key={criterion} className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm transition-all ${isSpecial ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                                <div className={`font-bold text-sm min-w-[30px] text-center ${isSpecial ? 'text-blue-600' : 'text-gray-400'}`}>{idx + 1}º</div>
                                <div className="flex-1 font-medium text-gray-700 flex items-center gap-2">
                                    {criterion === 'directEncounter' && <Users size={16} className="text-blue-500" />}
                                    {criterion === 'random' && <Wand2 size={16} className="text-purple-500" />}
                                    {LABELS[criterion]}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"><ArrowUp size={16} /></button>
                                    <button onClick={() => moveItem(idx, 'down')} disabled={idx === currentCriteria.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"><ArrowDown size={16} /></button>
                                    <button onClick={() => removeItem(criterion)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-2 transition-colors"><X size={16} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {AVAILABLE_CRITERIA.length > currentCriteria.length && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Añadir Criterio Adicional</label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_CRITERIA.filter(c => !currentCriteria.includes(c)).map(c => (
                                <Button key={c} variant="secondary" onClick={() => addItem(c)}
                                    className="text-xs py-1 h-auto bg-white border border-gray-300 hover:border-primary hover:text-primary transition-colors">
                                    <Plus size={12} className="mr-1" /> {LABELS[c]}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
