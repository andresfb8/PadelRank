/**
 * MatchModal Integration Example
 * Shows how to use the specialized input components in a modal
 */

import React, { useState } from 'react';
import { Modal } from '../components/ui/Components';
import { SetBasedScoreInput, SetBasedScoreData } from '../components/match-inputs/SetBasedScoreInput';
import { PointBasedScoreInput, PointBasedScoreData } from '../components/match-inputs/PointBasedScoreInput';
import { RankingFormat, Match, RankingConfig } from '../types';

interface MatchModalProps {
    match: Match;
    format: RankingFormat;
    config: RankingConfig;
    onSave: (matchId: string, data: any) => void;
    onClose: () => void;
}

export function MatchModalExample({ match, format, config, onSave, onClose }: MatchModalProps) {
    const [scoreData, setScoreData] = useState<SetBasedScoreData | PointBasedScoreData | null>(null);

    // Determine which input component to use based on format
    const isSetBased = ['classic', 'individual', 'pairs', 'hybrid', 'elimination'].includes(format);
    const isPointBased = ['americano', 'mexicano', 'pozo'].includes(format);

    const handleSave = () => {
        if (!scoreData) return;

        if (isSetBased) {
            const setData = scoreData as SetBasedScoreData;
            // Calculate match points based on sets won
            const p1Sets = [
                setData.set1.p1 > setData.set1.p2 ? 1 : 0,
                setData.set2.p1 > setData.set2.p2 ? 1 : 0,
                setData.set3 && setData.set3.p1 > setData.set3.p2 ? 1 : 0
            ].reduce((a, b) => a + b, 0);

            const p2Sets = [
                setData.set1.p2 > setData.set1.p1 ? 1 : 0,
                setData.set2.p2 > setData.set2.p1 ? 1 : 0,
                setData.set3 && setData.set3.p2 > setData.set3.p1 ? 1 : 0
            ].reduce((a, b) => a + b, 0);

            // Get points from config
            const pointsConfig = config.classicConfig || config.individualConfig || config.pairsConfig || config.hybridConfig;
            let matchPoints = { p1: 0, p2: 0 };

            if (pointsConfig) {
                if (p1Sets === 2 && p2Sets === 0) {
                    matchPoints = { p1: pointsConfig.pointsPerWin2_0, p2: pointsConfig.pointsPerLoss2_0 };
                } else if (p1Sets === 2 && p2Sets === 1) {
                    matchPoints = { p1: pointsConfig.pointsPerWin2_1, p2: pointsConfig.pointsPerLoss2_1 };
                } else if (p2Sets === 2 && p1Sets === 0) {
                    matchPoints = { p1: pointsConfig.pointsPerLoss2_0, p2: pointsConfig.pointsPerWin2_0 };
                } else if (p2Sets === 2 && p1Sets === 1) {
                    matchPoints = { p1: pointsConfig.pointsPerLoss2_1, p2: pointsConfig.pointsPerWin2_1 };
                } else if (p1Sets === 1 && p2Sets === 1) {
                    matchPoints = { p1: pointsConfig.pointsDraw, p2: pointsConfig.pointsDraw };
                }
            }

            onSave(match.id, {
                ...setData,
                points: matchPoints,
                status: 'finalizado'
            });
        } else if (isPointBased) {
            const pointData = scoreData as PointBasedScoreData;
            onSave(match.id, {
                pointsScored: pointData.pointsScored,
                points: pointData.points,
                status: 'finalizado'
            });
        }

        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Registrar Resultado">
            <div className="p-6">
                {/* SET-BASED FORMATS */}
                {isSetBased && (
                    <SetBasedScoreInput
                        onChange={(data) => setScoreData(data)}
                        pointsConfig={
                            config.classicConfig ||
                            config.individualConfig ||
                            config.pairsConfig ||
                            config.hybridConfig
                        }
                    />
                )}

                {/* POINT-BASED FORMATS */}
                {isPointBased && (
                    <PointBasedScoreInput
                        onChange={(data) => setScoreData(data)}
                        scoringConfig={
                            format === 'americano' ? { mode: config.americanoConfig?.scoringMode || '32' } :
                                format === 'mexicano' ? { mode: config.mexicanoConfig?.scoringMode || '32' } :
                                    format === 'pozo' ? {
                                        mode: config.pozoConfig?.scoringMode || '32'
                                    } : { mode: '32' }
                        }
                    />
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!scoreData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex-1"
                    >
                        Guardar Resultado
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// Mock Data for Examples
const match: any = { id: 'm1' };
const handleSave = (id: string, data: any) => console.log('Save:', id, data);
const handleClose = () => console.log('Close');

/**
 * Usage Examples by Format
 */

// Classic Format
export function ClassicMatchModalUsage() {
    return (
        <MatchModalExample
            match={match}
            format="classic"
            config={{
                classicConfig: {
                    pointsPerWin2_0: 4,
                    pointsPerWin2_1: 3,
                    pointsDraw: 2,
                    pointsPerLoss2_1: 1,
                    pointsPerLoss2_0: 0,
                    promotionCount: 2,
                    relegationCount: 2,
                    maxPlayersPerDivision: 4
                }
            }}
            onSave={handleSave}
            onClose={handleClose}
        />
    );
}
