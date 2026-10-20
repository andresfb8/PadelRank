import React from 'react';
import { ArrowUp, ArrowDown, Users, Wand2, Plus, X } from 'lucide-react';
import { Button } from '../ui/Components';
import { RankingConfig, TieBreakCriterion, DEFAULT_TIE_BREAK_ORDER } from '../../types';

interface TieBreakConfigProps {
    config: RankingConfig;
    setConfig: (config: RankingConfig) => void;
    /** Americano and mexicano: every match is a single set, so set criteria say nothing */
    pointBased?: boolean;
}

const SET_CRITERIA: TieBreakCriterion[] = ['setsDiff', 'setsWon'];

const ALL_CRITERIA: TieBreakCriterion[] = [
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

export const TieBreakConfig = ({ config, setConfig, pointBased }: TieBreakConfigProps) => {
    const applies = (c: TieBreakCriterion) => !pointBased || !SET_CRITERIA.includes(c);
    const currentCriteria = (config.tieBreakCriteria || DEFAULT_TIE_BREAK_ORDER).filter(applies);
    const AVAILABLE_CRITERIA = ALL_CRITERIA.filter(applies);

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
        <div className="border-t border-rg-rule pt-5 mt-5">
            <h3 className="text-[15px] font-semibold">Desempates</h3>
            <p className="text-[13px] text-rg-muted mt-0.5 mb-3">Si hay empate a puntos, se mira cada criterio en este orden.</p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="space-y-2 mb-4">
                    {currentCriteria.map((criterion, idx) => {
                        const isSpecial = criterion === 'directEncounter' || criterion === 'random';
                        return (
                            <div key={criterion} className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${isSpecial ? 'bg-court-soft border-court-track' : 'bg-white border-rg-line'}`}>
                                <div className={`font-semibold text-[14px] min-w-[30px] text-center num ${isSpecial ? 'text-court-ink' : 'text-rg-muted'}`}>{idx + 1}º</div>
                                <div className="flex-1 font-medium text-gray-700 flex items-center gap-2">
                                    {criterion === 'directEncounter' && <Users size={16} className="text-court" />}
                                    {criterion === 'random' && <Wand2 size={16} className="text-court" />}
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
                    <div className="mt-4 p-4 bg-rg-raised rounded-lg">
                        <label className="block text-[13px] font-medium text-rg-muted mb-2">Añadir otro criterio</label>
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
