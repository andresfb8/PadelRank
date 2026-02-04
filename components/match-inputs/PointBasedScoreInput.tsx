import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';

export interface PointBasedScoreData {
    pointsScored: { p1: number; p2: number };
    points: { p1: number; p2: number }; // Match points (1 for winner, 0 for loser)
}

interface PointBasedScoreInputProps {
    /** Initial score data (for editing) */
    initialData?: PointBasedScoreData;

    /** Callback when score changes */
    onChange: (data: PointBasedScoreData) => void;

    /** Scoring configuration */
    scoringConfig?: {
        mode: '24' | '32' | 'per-game' | 'custom';
        totalPoints?: number;
    };
}

export const PointBasedScoreInput: React.FC<PointBasedScoreInputProps> = ({
    initialData,
    onChange,
    scoringConfig = { mode: '32' }
}) => {
    const [p1Points, setP1Points] = useState(initialData?.pointsScored.p1 ?? 0);
    const [p2Points, setP2Points] = useState(initialData?.pointsScored.p2 ?? 0);
    const [inputMode, setInputMode] = useState<'single' | 'both'>('single');

    // Get total points based on mode
    const getTotalPoints = () => {
        if (scoringConfig.mode === 'custom' && scoringConfig.totalPoints) {
            return scoringConfig.totalPoints;
        }
        if (scoringConfig.mode === '24') return 24;
        if (scoringConfig.mode === '32') return 32;
        return 32; // Default
    };

    const totalPoints = getTotalPoints();

    // Auto-calculate P2 points in single input mode
    useEffect(() => {
        if (inputMode === 'single' && scoringConfig.mode !== 'per-game') {
            setP2Points(totalPoints - p1Points);
        }
    }, [p1Points, inputMode, totalPoints, scoringConfig.mode]);

    // Calculate match points (winner gets 1, loser gets 0)
    const calculateMatchPoints = () => {
        if (p1Points > p2Points) return { p1: 1, p2: 0 };
        if (p2Points > p1Points) return { p1: 0, p2: 1 };
        return { p1: 0, p2: 0 }; // Tie (shouldn't happen in normal play)
    };

    const matchPoints = calculateMatchPoints();

    // Update parent whenever data changes
    useEffect(() => {
        const data: PointBasedScoreData = {
            pointsScored: { p1: p1Points, p2: p2Points },
            points: matchPoints
        };
        onChange(data);
    }, [p1Points, p2Points]);

    const isValidScore = p1Points > 0 || p2Points > 0;
    const winner = p1Points > p2Points ? 1 : p2Points > p1Points ? 2 : null;

    return (
        <div className="space-y-4">
            {/* Scoring Mode Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">
                        {scoringConfig.mode === 'per-game'
                            ? 'Puntuación por juego (sin límite total)'
                            : `Partido a ${totalPoints} puntos totales`
                        }
                    </span>
                </div>
            </div>

            {/* Input Mode Toggle */}
            {scoringConfig.mode !== 'per-game' && (
                <div className="flex gap-2 p-2 bg-gray-100 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setInputMode('single')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMode === 'single'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Entrada Simple
                    </button>
                    <button
                        type="button"
                        onClick={() => setInputMode('both')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${inputMode === 'both'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Entrada Manual
                    </button>
                </div>
            )}

            {/* Score Inputs */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Puntos Pareja 1
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={scoringConfig.mode === 'per-game' ? undefined : totalPoints}
                        value={p1Points}
                        onChange={(e) => setP1Points(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Puntos Pareja 2
                    </label>
                    <input
                        type="number"
                        min="0"
                        max={scoringConfig.mode === 'per-game' ? undefined : totalPoints}
                        value={p2Points}
                        onChange={(e) => setP2Points(parseInt(e.target.value) || 0)}
                        disabled={inputMode === 'single' && scoringConfig.mode !== 'per-game'}
                        className={`w-full px-4 py-3 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${inputMode === 'single' && scoringConfig.mode !== 'per-game'
                                ? 'bg-gray-100 cursor-not-allowed'
                                : ''
                            }`}
                    />
                </div>
            </div>

            {/* Validation Warning */}
            {scoringConfig.mode !== 'per-game' && p1Points + p2Points !== totalPoints && isValidScore && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle size={16} />
                        <span className="text-sm font-medium">
                            La suma de puntos ({p1Points + p2Points}) no coincide con el total esperado ({totalPoints})
                        </span>
                    </div>
                </div>
            )}

            {/* Preview */}
            {isValidScore && (
                <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Resultado:</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-2xl font-bold ${winner === 1 ? 'text-green-600' : 'text-gray-400'}`}>
                                {p1Points}
                            </span>
                            <span className="text-gray-400">-</span>
                            <span className={`text-2xl font-bold ${winner === 2 ? 'text-green-600' : 'text-gray-400'}`}>
                                {p2Points}
                            </span>
                        </div>
                    </div>

                    {winner && (
                        <div className="flex items-center gap-2 text-green-600">
                            <Trophy size={16} />
                            <span className="text-sm font-medium">
                                Ganador: Pareja {winner}
                            </span>
                        </div>
                    )}

                    {!winner && (
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle size={16} />
                            <span className="text-sm font-medium">
                                Empate - No hay ganador
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Helper Text */}
            {inputMode === 'single' && scoringConfig.mode !== 'per-game' && (
                <p className="text-xs text-gray-500 text-center">
                    💡 En modo "Entrada Simple", solo necesitas ingresar los puntos de una pareja.
                    Los puntos de la otra se calculan automáticamente.
                </p>
            )}
        </div>
    );
};
