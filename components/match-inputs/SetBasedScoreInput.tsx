import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export interface SetBasedScoreData {
    set1: { p1: number; p2: number };
    set2: { p1: number; p2: number };
    set3?: { p1: number; p2: number };
    isIncomplete?: boolean;
    finalizationType?: 'completo' | 'victoria_incompleta' | 'empate_diferencia' | 'empate_manual' | 'derrota_incompleta';
    description?: string;
}

interface SetBasedScoreInputProps {
    /** Initial score data (for editing) */
    initialData?: SetBasedScoreData;

    /** Callback when score changes */
    onChange: (data: SetBasedScoreData) => void;

    /** Point configuration for calculating match points */
    pointsConfig?: {
        pointsPerWin2_0: number;
        pointsPerWin2_1: number;
        pointsDraw: number;
        pointsPerLoss2_1: number;
        pointsPerLoss2_0: number;
    };
}

export const SetBasedScoreInput: React.FC<SetBasedScoreInputProps> = ({
    initialData,
    onChange,
    pointsConfig = {
        pointsPerWin2_0: 4,
        pointsPerWin2_1: 3,
        pointsDraw: 2,
        pointsPerLoss2_1: 1,
        pointsPerLoss2_0: 0
    }
}) => {
    const [set1P1, setSet1P1] = useState(initialData?.set1.p1 ?? 0);
    const [set1P2, setSet1P2] = useState(initialData?.set1.p2 ?? 0);
    const [set2P1, setSet2P1] = useState(initialData?.set2.p1 ?? 0);
    const [set2P2, setSet2P2] = useState(initialData?.set2.p2 ?? 0);
    const [set3P1, setSet3P1] = useState(initialData?.set3?.p1 ?? 0);
    const [set3P2, setSet3P2] = useState(initialData?.set3?.p2 ?? 0);
    const [isIncomplete, setIsIncomplete] = useState(initialData?.isIncomplete ?? false);
    const [description, setDescription] = useState(initialData?.description ?? '');

    // Calculate match result
    const calculateResult = () => {
        let p1Sets = 0;
        let p2Sets = 0;

        if (set1P1 > set1P2) p1Sets++;
        else if (set1P2 > set1P1) p2Sets++;

        if (set2P1 > set2P2) p1Sets++;
        else if (set2P2 > set2P1) p2Sets++;

        if (set3P1 > 0 || set3P2 > 0) {
            if (set3P1 > set3P2) p1Sets++;
            else if (set3P2 > set3P1) p2Sets++;
        }

        return { p1Sets, p2Sets };
    };

    const { p1Sets, p2Sets } = calculateResult();

    // Calculate match points
    const calculateMatchPoints = () => {
        if (p1Sets === 2 && p2Sets === 0) {
            return { p1: pointsConfig.pointsPerWin2_0, p2: pointsConfig.pointsPerLoss2_0 };
        }
        if (p1Sets === 2 && p2Sets === 1) {
            return { p1: pointsConfig.pointsPerWin2_1, p2: pointsConfig.pointsPerLoss2_1 };
        }
        if (p2Sets === 2 && p1Sets === 0) {
            return { p1: pointsConfig.pointsPerLoss2_0, p2: pointsConfig.pointsPerWin2_0 };
        }
        if (p2Sets === 2 && p1Sets === 1) {
            return { p1: pointsConfig.pointsPerLoss2_1, p2: pointsConfig.pointsPerWin2_1 };
        }
        if (p1Sets === 1 && p2Sets === 1) {
            return { p1: pointsConfig.pointsDraw, p2: pointsConfig.pointsDraw };
        }
        return { p1: 0, p2: 0 };
    };

    const matchPoints = calculateMatchPoints();

    // Determine finalization type
    const getFinalizationType = (): SetBasedScoreData['finalizationType'] => {
        if (isIncomplete) {
            if (p1Sets > p2Sets) return 'victoria_incompleta';
            if (p2Sets > p1Sets) return 'derrota_incompleta';
            return 'empate_diferencia';
        }
        if (p1Sets === 1 && p2Sets === 1) {
            if (set1P1 + set2P1 > set1P2 + set2P2) return 'empate_diferencia';
            if (set1P2 + set2P2 > set1P1 + set2P1) return 'empate_diferencia';
            return 'empate_manual';
        }
        return 'completo';
    };

    // Update parent whenever data changes
    useEffect(() => {
        const data: SetBasedScoreData = {
            set1: { p1: set1P1, p2: set1P2 },
            set2: { p1: set2P1, p2: set2P2 },
            isIncomplete,
            finalizationType: getFinalizationType(),
            description
        };

        if (set3P1 > 0 || set3P2 > 0) {
            data.set3 = { p1: set3P1, p2: set3P2 };
        }

        onChange(data);
    }, [set1P1, set1P2, set2P1, set2P2, set3P1, set3P2, isIncomplete, description]);

    const isValidScore = (p1Sets > 0 || p2Sets > 0) && (set1P1 > 0 || set1P2 > 0 || set2P1 > 0 || set2P2 > 0);

    return (
        <div className="space-y-4">
            {/* Set 1 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 1 - Pareja 1</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set1P1}
                        onChange={(e) => setSet1P1(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 1 - Pareja 2</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set1P2}
                        onChange={(e) => setSet1P2(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Set 2 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 2 - Pareja 1</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set2P1}
                        onChange={(e) => setSet2P1(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 2 - Pareja 2</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set2P2}
                        onChange={(e) => setSet2P2(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Set 3 (Optional) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 3 - Pareja 1 (Opcional)</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set3P1}
                        onChange={(e) => setSet3P1(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set 3 - Pareja 2 (Opcional)</label>
                    <input
                        type="number"
                        min="0"
                        max="7"
                        value={set3P2}
                        onChange={(e) => setSet3P2(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Incomplete Match Toggle */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                    type="checkbox"
                    id="incomplete"
                    checked={isIncomplete}
                    onChange={(e) => setIsIncomplete(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="incomplete" className="text-sm font-medium text-gray-700">
                    Partido incompleto (lesión, abandono, etc.)
                </label>
            </div>

            {/* Description */}
            {isIncomplete && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ej: Lesión de rodilla, abandono por tiempo..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={2}
                    />
                </div>
            )}

            {/* Preview */}
            {isValidScore && (
                <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Resultado:</span>
                        <span className="text-lg font-bold text-primary">
                            {p1Sets} - {p2Sets}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Puntos del partido:</span>
                        <span className="font-bold text-gray-900">
                            {matchPoints.p1} - {matchPoints.p2}
                        </span>
                    </div>
                    {isIncomplete && (
                        <div className="mt-2 flex items-center gap-2 text-amber-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-medium">Partido marcado como incompleto</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
