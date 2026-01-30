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
        // Filter out 0s to keep it clean, unless we want to force 0?
        // Actually, 0 adjustment means no change usually.
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
                        {renderInput("Sets Ganados", "setsWon")}
                        {renderInput("Dif. Sets", "setsDiff")}
                        {renderInput("Juegos Ganados", "gamesWon")}
                        {renderInput("Dif. Juegos", "gamesDiff")}
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
