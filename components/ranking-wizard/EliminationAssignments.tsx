import React from 'react';
import { SearchableSelect } from '../SearchableSelect';
import { FormatAssignmentsProps } from './types';

interface EliminationAssignmentsProps extends FormatAssignmentsProps {
    categories: string[];
}

export const EliminationAssignments = ({
    config,
    assignments,
    setAssignments,
    selectedPlayerIds,
    availablePlayers,
    categories,
    categorySizes = {},
    setCategorySizes,
}: EliminationAssignmentsProps) => {
    // Internal: self-contained assignment handler for pair slots
    const handleAssignment = (catIdx: number, pairIdx: number, val: string, slotsCount: number) => {
        const newA = { ...assignments };
        if (!newA[catIdx]) newA[catIdx] = Array(slotsCount).fill('');
        if (newA[catIdx].length < slotsCount) {
            newA[catIdx] = [...newA[catIdx], ...Array(slotsCount - newA[catIdx].length).fill('')];
        }
        newA[catIdx][pairIdx] = val;
        setAssignments(newA);
    };
    // Only pairs type is fully implemented for categories
    if (config.eliminationConfig?.type !== 'pairs') {
        return (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                La asignación individual por categorías estará disponible próximamente. Usa la modalidad <strong>Parejas</strong> para la inscripción por categorías.
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                <h3 className="font-bold text-gray-800">2. Inscripción de Parejas por Categoría</h3>
            </div>

            {categories.map((catName, catIdx) => {
                const slotCount = categorySizes[catIdx] || 8;
                const currentList = assignments[catIdx] || [];

                return (
                    <div key={catIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-primary">{catName}</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Parejas:</span>
                                <input
                                    type="number"
                                    min="2"
                                    max="64"
                                    value={slotCount}
                                    onChange={(e) =>
                                        setCategorySizes({ ...categorySizes, [catIdx]: parseInt(e.target.value) || 8 })
                                    }
                                    className="border p-1 w-12 text-center rounded text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {Array.from({ length: slotCount }).map((_, pairIdx) => {
                                const val = currentList[pairIdx] || '';
                                const [p1Id, p2Id] = val ? val.split('::') : ['', ''];

                                // Collect all used IDs across ALL categories (excluding the current pair being edited)
                                const used = new Set<string>();
                                Object.values(assignments).forEach((list: any) =>
                                    list?.forEach((pairStr: string) => {
                                        if (!pairStr || pairStr === val) return;
                                        const [u1, u2] = pairStr.split('::');
                                        if (u1) used.add(u1);
                                        if (u2) used.add(u2);
                                    })
                                );
                                if (p1Id) used.add(p1Id);
                                if (p2Id) used.add(p2Id);

                                const getOpts = (excludeId: string) => {
                                    const opts = availablePlayers.filter(p => !used.has(p.id) || p.id === excludeId);
                                    return opts
                                        .sort((a, b) => {
                                            const aSelected = selectedPlayerIds.includes(a.id);
                                            const bSelected = selectedPlayerIds.includes(b.id);
                                            if (aSelected && !bSelected) return -1;
                                            if (!aSelected && bSelected) return 1;
                                            return a.nombre.localeCompare(b.nombre);
                                        })
                                        .map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
                                };

                                return (
                                    <div key={pairIdx} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                        <span className="text-xs font-bold text-gray-400 w-16">Pareja {pairIdx + 1}</span>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <SearchableSelect
                                                options={getOpts(p1Id)}
                                                value={p1Id}
                                                onChange={(v) => {
                                                    const finalVal = (v || p2Id) ? `${v || ''}::${p2Id || ''}` : '';
                                                    handleAssignment(catIdx, pairIdx, finalVal, slotCount);
                                                }}
                                                placeholder="Jugador A"
                                            />
                                            <SearchableSelect
                                                options={getOpts(p2Id)}
                                                value={p2Id}
                                                onChange={(v) => {
                                                    const finalVal = (p1Id || v) ? `${p1Id || ''}::${v || ''}` : '';
                                                    handleAssignment(catIdx, pairIdx, finalVal, slotCount);
                                                }}
                                                placeholder="Jugador B"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
