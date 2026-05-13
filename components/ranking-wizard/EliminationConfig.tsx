import React from 'react';
import { Trophy, Plus, X } from 'lucide-react';
import { Button, Input } from '../ui/Components';
import { FormatConfigProps } from './types';

interface EliminationConfigProps extends FormatConfigProps {
    categories: string[];
    setCategories: (categories: string[]) => void;
    newCategoryName: string;
    setNewCategoryName: (name: string) => void;
}

export const EliminationConfig = ({
    config,
    setConfig,
    categories,
    setCategories,
    newCategoryName,
    setNewCategoryName,
}: EliminationConfigProps) => {
    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        if (categories.some(c => c.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            alert('La categoría ya existe');
            return;
        }
        setCategories([...categories, newCategoryName.trim()]);
        setNewCategoryName('');
    };

    return (
        <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Trophy size={18} /> Configuración del Torneo
            </h3>

            {/* Modalidad: Individual vs Parejas */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad</label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, type: 'individual' } })}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                                config.eliminationConfig?.type === 'individual'
                                    ? 'bg-white shadow-sm text-primary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Individual
                        </button>
                        <button
                            onClick={() => setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, type: 'pairs' } })}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                                config.eliminationConfig?.type === 'pairs'
                                    ? 'bg-white shadow-sm text-primary'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Parejas
                        </button>
                    </div>
                </div>

                {/* Consolation toggle */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.eliminationConfig?.consolation}
                            onChange={(e) =>
                                setConfig({ ...config, eliminationConfig: { ...config.eliminationConfig!, consolation: e.target.checked } })
                            }
                            className="w-5 h-5 text-primary rounded"
                        />
                        <span className="text-sm font-medium text-gray-700 font-bold">Cuadro de Consolación</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-7">
                        Los perdedores de la primera ronda juegan un torneo paralelo.
                    </p>
                </div>
            </div>

            {/* Courts */}
            <div className="mt-4 border-t pt-4">
                <Input
                    type="number"
                    label="Número de Pistas"
                    value={config.courts || 2}
                    onChange={(e: any) => setConfig({ ...config, courts: parseInt(e.target.value) || 2 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                    Importante para la generación de horarios en el calendario.
                </p>
            </div>

            {/* Categories */}
            <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Categorías del Torneo</label>
                <div className="flex gap-2 mb-2">
                    <Input
                        placeholder="Nueva Categoría (ej: 1ª Masculina)"
                        value={newCategoryName}
                        onChange={(e: any) => setNewCategoryName(e.target.value)}
                    />
                    <Button onClick={handleAddCategory}><Plus size={16} /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat, idx) => (
                        <div key={idx} className="bg-white border px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {cat}
                            <button
                                onClick={() => setCategories(categories.filter((_, i) => i !== idx))}
                                className="text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                {categories.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Debes añadir al menos una categoría.</p>
                )}
            </div>
        </div>
    );
};
