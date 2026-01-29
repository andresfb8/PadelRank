import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Trophy, ArrowUpCircle, ArrowDownCircle, Info, Hash, Target } from 'lucide-react';
import { Ranking, RankingConfig, ScoringMode } from '../types';
import { Button } from './ui/Components';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    onUpdateRanking?: (ranking: Ranking) => void;
    isAdmin?: boolean;
}

export const RankingSettingsModal = ({ isOpen, onClose, ranking, onUpdateRanking, isAdmin }: Props) => {
    const [config, setConfig] = useState<RankingConfig>(ranking.config || {});
    const [activeTab, setActiveTab] = useState<'general' | 'points' | 'promotions' | 'tv'>('general');

    useEffect(() => {
        if (isOpen) {
            setConfig(ranking.config || {});
        }
    }, [isOpen, ranking]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (onUpdateRanking) {
            const updatedRanking = {
                ...ranking,
                config: config
            };
            onUpdateRanking(updatedRanking);
            onClose();
        }
    };

    const handleChange = (key: keyof RankingConfig, value: any) => {
        setConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Defaults for display if undefined
    const defaults = {
        pointsPerWin2_0: 4,
        pointsPerWin2_1: 3,
        pointsDraw: 2,
        pointsPerLoss2_1: 1,
        pointsPerLoss2_0: 0,
        promotionCount: 2,
        relegationCount: 2,
        scoringMode: '32' as ScoringMode,
        customPoints: 32
    };

    const isReadOnly = !isAdmin || !onUpdateRanking;

    // Determine which tabs to show based on format
    const isElimination = ranking.format === 'elimination';
    const isAmericanoOrMexicano = ranking.format === 'americano' || ranking.format === 'mexicano';
    const isClassic = ranking.format === 'classic' || ranking.format === 'individual' || ranking.format === 'pairs';

    // Show Points if not Elimination (Elimination uses direct knockout)
    // Show Promotions only for Classic/Individual/Pairs (Americano is single-event usually)
    const showPointsTab = !isElimination;
    const showPromotionsTab = isClassic;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full text-primary">
                            {isReadOnly ? <Info size={24} /> : <Settings size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Configuración del Torneo</h2>
                            <p className="text-sm text-gray-500">
                                {isReadOnly ? 'Información sobre el formato y puntuación' : 'Ajusta los parámetros del torneo en tiempo real'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={16} /> General
                    </button>
                    {showPointsTab && (
                        <button
                            onClick={() => setActiveTab('points')}
                            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'points' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <Trophy size={16} /> Puntuación
                        </button>
                    )}
                    {showPromotionsTab && (
                        <button
                            onClick={() => setActiveTab('promotions')}
                            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'promotions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowUpCircle size={16} /> Ascensos/Descensos
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('tv')}
                        className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tv' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={16} /> Modo TV
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">

                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Hash size={18} className="text-gray-400" /> Formato del Torneo
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold">Tipo de Ranking</label>
                                        <div className="text-lg font-medium text-gray-900 capitalize mt-1">
                                            {ranking.format || 'Clásico (Individual)'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold">Categoría</label>
                                        <div className="text-lg font-medium text-gray-900 mt-1">
                                            {ranking.categoria}
                                        </div>
                                    </div>
                                    {isElimination && (
                                        <>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold">Consolación</label>
                                                <div className="text-lg font-medium text-gray-900 mt-1">
                                                    {ranking.config?.eliminationConfig?.consolation ? 'Sí' : 'No'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold">3er y 4to Puesto</label>
                                                <div className="text-lg font-medium text-gray-900 mt-1">
                                                    {ranking.config?.eliminationConfig?.thirdPlaceMatch ? 'Sí' : 'No'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'points' && showPointsTab && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <p className="text-sm text-blue-800 flex items-start gap-2">
                                    <Info size={16} className="mt-0.5 shrink-0" />
                                    {isAmericanoOrMexicano
                                        ? "Configura el sistema de puntuación total para los partidos."
                                        : "Estos valores determinan cuántos puntos obtiene cada jugador/pareja según el resultado del partido."}
                                </p>
                            </div>

                            {isAmericanoOrMexicano ? (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <Target size={18} className="text-blue-500" /> Puntos Totales por Partido
                                    </h3>
                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Puntuación</label>
                                            {isReadOnly ? (
                                                <div className="text-xl font-bold text-gray-900">
                                                    {config.scoringMode === 'custom'
                                                        ? `Personalizado (${config.customPoints || defaults.customPoints} pts)`
                                                        : `${config.scoringMode || defaults.scoringMode} Puntos`}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['16', '21', '24', '32', 'custom'].map((mode) => (
                                                        <button
                                                            key={mode}
                                                            onClick={() => handleChange('scoringMode', mode)}
                                                            className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all ${(config.scoringMode || defaults.scoringMode) === mode
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {mode === 'custom' ? 'Personalizado' : mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {config.scoringMode === 'custom' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Puntos personalizados</label>
                                                {isReadOnly ? (
                                                    <div className="text-xl font-bold text-gray-900">{config.customPoints || defaults.customPoints}</div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={config.customPoints || ''}
                                                        placeholder="Ej: 50"
                                                        onChange={(e) => handleChange('customPoints', parseInt(e.target.value))}
                                                        className="w-full text-xl font-bold p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                    />
                                                )}
                                                <p className="text-xs text-gray-500 mt-1">Los puntos de cada pareja sumarán exactamente esta cantidad al final del partido.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Classic Scoring Inputs
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Victoria 2-0</label>
                                        {isReadOnly ? (
                                            <div className="text-2xl font-bold text-primary">{config.pointsPerWin2_0 ?? defaults.pointsPerWin2_0} pts</div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={config.pointsPerWin2_0 ?? defaults.pointsPerWin2_0}
                                                onChange={(e) => handleChange('pointsPerWin2_0', parseInt(e.target.value))}
                                                className="w-full text-xl font-bold p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        )}
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Victoria 2-1</label>
                                        {isReadOnly ? (
                                            <div className="text-2xl font-bold text-primary">{config.pointsPerWin2_1 ?? defaults.pointsPerWin2_1} pts</div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={config.pointsPerWin2_1 ?? defaults.pointsPerWin2_1}
                                                onChange={(e) => handleChange('pointsPerWin2_1', parseInt(e.target.value))}
                                                className="w-full text-xl font-bold p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        )}
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Empate</label>
                                        {isReadOnly ? (
                                            <div className="text-2xl font-bold text-gray-600">{config.pointsDraw ?? defaults.pointsDraw} pts</div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={config.pointsDraw ?? defaults.pointsDraw}
                                                onChange={(e) => handleChange('pointsDraw', parseInt(e.target.value))}
                                                className="w-full text-xl font-bold p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        )}
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Derrota 1-2</label>
                                        {isReadOnly ? (
                                            <div className="text-2xl font-bold text-orange-600">{config.pointsPerLoss2_1 ?? defaults.pointsPerLoss2_1} pt</div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={config.pointsPerLoss2_1 ?? defaults.pointsPerLoss2_1}
                                                onChange={(e) => handleChange('pointsPerLoss2_1', parseInt(e.target.value))}
                                                className="w-full text-xl font-bold p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        )}
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Derrota 0-2</label>
                                        {isReadOnly ? (
                                            <div className="text-2xl font-bold text-red-600">{config.pointsPerLoss2_0 ?? defaults.pointsPerLoss2_0} pts</div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={config.pointsPerLoss2_0 ?? defaults.pointsPerLoss2_0}
                                                onChange={(e) => handleChange('pointsPerLoss2_0', parseInt(e.target.value))}
                                                className="w-full text-xl font-bold p-2 border rounded focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'promotions' && showPromotionsTab && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-4">
                                <p className="text-sm text-yellow-800 flex items-start gap-2">
                                    <Info size={16} className="mt-0.5 shrink-0" />
                                    ¡Atención! Cambiar estos valores a mitad de torneo afectará a cómo se calculan los ascensos en la siguiente fase.
                                </p>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <ArrowUpCircle size={100} className="text-green-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                                        <ArrowUpCircle size={20} /> Ascensos
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">Número de jugadores que suben de división automáticamente al finalizar la fase.</p>

                                    {isReadOnly ? (
                                        <div className="text-4xl font-bold text-green-600">{config.promotionCount ?? defaults.promotionCount}</div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleChange('promotionCount', Math.max(0, (config.promotionCount ?? defaults.promotionCount) - 1))}
                                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-xl"
                                            >-</button>
                                            <span className="text-3xl font-bold w-12 text-center">{config.promotionCount ?? defaults.promotionCount}</span>
                                            <button
                                                onClick={() => handleChange('promotionCount', (config.promotionCount ?? defaults.promotionCount) + 1)}
                                                className="w-10 h-10 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center font-bold text-xl"
                                            >+</button>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <ArrowDownCircle size={100} className="text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                                        <ArrowDownCircle size={20} /> Descensos
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-4">Número de jugadores que bajan de división automáticamente al finalizar la fase.</p>

                                    {isReadOnly ? (
                                        <div className="text-4xl font-bold text-red-600">{config.relegationCount ?? defaults.relegationCount}</div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleChange('relegationCount', Math.max(0, (config.relegationCount ?? defaults.relegationCount) - 1))}
                                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-xl"
                                            >-</button>
                                            <span className="text-3xl font-bold w-12 text-center">{config.relegationCount ?? defaults.relegationCount}</span>
                                            <button
                                                onClick={() => handleChange('relegationCount', (config.relegationCount ?? defaults.relegationCount) + 1)}
                                                className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center font-bold text-xl"
                                            >+</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tv' && (
                        <div className="space-y-6">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                                <p className="text-sm text-purple-800 flex items-start gap-2">
                                    <Info size={16} className="mt-0.5 shrink-0" />
                                    Configura el "Modo TV" para mostrar la clasificación y resultados en una pantalla grande.
                                </p>
                            </div>

                            {/* Enable/Disable + Main Logic */}
                            <div className="bg-white p-4 items-center gap-4 hidden">
                                {/* Disabled for MVP - always enabled via URL */}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg border">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Duración Diapositivas (segundos)</label>
                                    <input
                                        type="number"
                                        value={ranking.tvConfig?.slideDuration || 15}
                                        onChange={(e) => {
                                            const val = Math.max(5, parseInt(e.target.value) || 15);
                                            onUpdateRanking?.({
                                                ...ranking,
                                                tvConfig: {
                                                    ...(ranking.tvConfig || {
                                                        enabled: true,
                                                        showStandings: true,
                                                        showMatches: true,
                                                        showQR: true,
                                                        showSponsors: true,
                                                        sponsors: [],
                                                        slideDuration: 15
                                                    }),
                                                    slideDuration: val
                                                }
                                            });
                                        }}
                                        disabled={isReadOnly}
                                        className="w-full border rounded p-2"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Mínimo 5 segundos.</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border divide-y">
                                <h4 className="font-bold text-gray-800 mb-2">Contenido Visible</h4>

                                {[
                                    { key: 'showStandings', label: 'Mostrar Clasificación' },
                                    { key: 'showMatches', label: 'Mostrar Partidos' },
                                    { key: 'showQR', label: 'Mostrar Código QR' },
                                    { key: 'showSponsors', label: 'Mostrar Patrocinadores' }
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between py-3">
                                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                name={item.key}
                                                id={`toggle-${item.key}`}
                                                checked={(ranking.tvConfig?.[item.key as keyof import('../types').TVConfig] as boolean) ?? true}
                                                onChange={(e) => {
                                                    const val = e.target.checked;
                                                    onUpdateRanking?.({
                                                        ...ranking,
                                                        tvConfig: {
                                                            ...(ranking.tvConfig || {
                                                                enabled: true,
                                                                slideDuration: 15,
                                                                showStandings: true,
                                                                showMatches: true,
                                                                showQR: true,
                                                                showSponsors: true,
                                                                sponsors: []
                                                            }), // Defaults if null
                                                            [item.key]: val
                                                        }
                                                    });
                                                }}
                                                disabled={isReadOnly}
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                style={{
                                                    right: (ranking.tvConfig?.[item.key as keyof import('../types').TVConfig] as boolean) ?? true ? '0' : 'auto',
                                                    left: (ranking.tvConfig?.[item.key as keyof import('../types').TVConfig] as boolean) ?? true ? 'auto' : '0',
                                                    borderColor: (ranking.tvConfig?.[item.key as keyof import('../types').TVConfig] as boolean) ?? true ? '#3b82f6' : '#e5e7eb'
                                                }}
                                            />
                                            <label htmlFor={`toggle-${item.key}`} className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${(ranking.tvConfig?.[item.key as keyof import('../types').TVConfig] as boolean) ?? true ? 'bg-blue-500' : 'bg-gray-300'}`}></label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                        {isReadOnly ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!isReadOnly && (
                        <Button onClick={handleSave} className="flex items-center gap-2">
                            <Save size={18} /> Guardar Cambios
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
