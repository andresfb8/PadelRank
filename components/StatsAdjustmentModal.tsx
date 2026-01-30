import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Components';
import { ManualStatsAdjustment } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialStats: ManualStatsAdjustment;
    playerName: string;
    onSave: (stats: ManualStatsAdjustment) => void;
}

export const StatsAdjustmentModal = ({ isOpen, onClose, initialStats, playerName, onSave }: Props) => {
    const [stats, setStats] = useState<ManualStatsAdjustment>(initialStats || {});

    useEffect(() => {
        if (isOpen) {
            setStats(initialStats || {});
        }
    }, [isOpen, initialStats]);

    if (!isOpen) return null;

    const handleChange = (key: keyof ManualStatsAdjustment, value: string) => {
        const numValue = parseInt(value);
        setStats(prev => ({
            ...prev,
            [key]: isNaN(numValue) ? 0 : numValue
        }));
    };

    const handleSave = () => {
        const cleanedStats: ManualStatsAdjustment = {};
        if (stats.pts) cleanedStats.pts = stats.pts;
        if (stats.pj) cleanedStats.pj = stats.pj;
        if (stats.pg) cleanedStats.pg = stats.pg;
        if (stats.setsWon) cleanedStats.setsWon = stats.setsWon;
        if (stats.setsDiff) cleanedStats.setsDiff = stats.setsDiff;
        if (stats.gamesWon) cleanedStats.gamesWon = stats.gamesWon;
        if (stats.gamesDiff) cleanedStats.gamesDiff = stats.gamesDiff;

        onSave(cleanedStats);
        onClose();
    };

    // Calculate derived "Lost" stats for the UI
    const pp_val = (stats.pj || 0) - (stats.pg || 0);
    const setsLost_val = (stats.setsWon || 0) - (stats.setsDiff || 0);
    const gamesLost_val = (stats.gamesWon || 0) - (stats.gamesDiff || 0);

    const handleLostChange = (type: 'pp' | 'setsLost' | 'gamesLost', value: string) => {
        const numValue = parseInt(value);
        const safeVal = isNaN(numValue) ? 0 : numValue;

        setStats(prev => {
            const current = { ...prev };

            if (type === 'pp') {
                // PP changed. We update PJ. PJ = PG + PP.
                // We keep PG constant.
                const pg = current.pg || 0;
                current.pj = pg + safeVal;
            } else if (type === 'setsLost') {
                // Sets Lost changed. We update Sets Diff. Diff = Won - Lost.
                // We keep Won constant.
                const won = current.setsWon || 0;
                current.setsDiff = won - safeVal;
            } else if (type === 'gamesLost') {
                // Games Lost changed. We update Games Diff. Diff = Won - Lost.
                const won = current.gamesWon || 0;
                current.gamesDiff = won - safeVal;
            }
            return current;
        });
    };

    const renderInput = (label: string, key: keyof ManualStatsAdjustment, colorClass: string = 'text-gray-700') => (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className={`block text-xs font-bold uppercase mb-1 ${colorClass}`}>{label}</label>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleChange(key, ((stats[key] || 0) - 1).toString())}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-600"
                >-</button>
                <input
                    type="number"
                    value={stats[key] || 0}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`w-full text-center font-bold text-lg bg-transparent outline-none ${stats[key] ? 'text-gray-900' : 'text-gray-400'}`}
                />
                <button
                    onClick={() => handleChange(key, ((stats[key] || 0) + 1).toString())}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-600"
                >+</button>
            </div>
        </div>
    );

    const renderDerivedInput = (label: string, value: number, onChange: (val: string) => void, colorClass: string = 'text-red-600') => (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className={`block text-xs font-bold uppercase mb-1 ${colorClass}`}>{label}</label>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange((value - 1).toString())}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-600"
                >-</button>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full text-center font-bold text-lg bg-transparent outline-none ${value !== 0 ? 'text-gray-900' : 'text-gray-400'}`}
                />
                <button
                    onClick={() => onChange((value + 1).toString())}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-gray-600"
                >+</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Ajuste Manual de Estadísticas</h2>
                        <p className="text-sm text-primary font-medium">{playerName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-6 flex gap-3 text-amber-800 text-sm">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <p>
                            Estos ajustes se <strong>suman</strong> a los valores calculados automáticamente.
                            Usa valores negativos para restar.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="col-span-2">
                            {renderInput("Puntos Totales", "pts", "text-blue-600")}
                        </div>
                        {renderInput("Partidos Jugados (PJ)", "pj")}
                        {renderInput("Partidos Ganados (PG)", "pg", "text-green-600")}

                        {/* Derived Match Stats */}
                        {renderDerivedInput("Partidos Perdidos (PP)", pp_val, (v) => handleLostChange('pp', v))}

                        <div className="col-span-2 border-t my-2"></div>

                        {renderInput("Sets Ganados", "setsWon", "text-green-600")}
                        {renderDerivedInput("Sets Perdidos", setsLost_val, (v) => handleLostChange('setsLost', v))}
                        {renderInput("Dif. Sets", "setsDiff", "text-gray-500")}

                        <div className="col-span-2 border-t my-2"></div>

                        {renderInput("Juegos Ganados", "gamesWon", "text-green-600")}
                        {renderDerivedInput("Juegos Perdidos", gamesLost_val, (v) => handleLostChange('gamesLost', v))}
                        {renderInput("Dif. Juegos", "gamesDiff", "text-gray-500")}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} className="flex items-center gap-2">
                        <Save size={18} /> Guardar Ajustes
                    </Button>
                </div>
            </div>
        </div>
    );
};
