import React from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '../ui/Components';
import { SearchableSelect } from '../SearchableSelect';
import { FormatAssignmentsProps } from './types';

interface AmericanoAssignmentsProps extends FormatAssignmentsProps {
    format: 'americano' | 'mexicano';
    setNumDivisions: (num: number) => void;
    setIndividualMaxPlayers: (num: number) => void;
    handleAssignment: (divIdx: number, pIdx: number, val: string, slotsCount: number) => void;
}

export const AmericanoAssignments = ({
    format,
    config,
    setConfig,
    assignments,
    setAssignments,
    selectedPlayerIds,
    availablePlayers,
    numDivisions,
    setNumDivisions,
    individualMaxPlayers,
    setIndividualMaxPlayers,
    handleAssignment,
}: AmericanoAssignmentsProps) => {
    const variant = format === 'americano' ? config.americanoConfig?.variant : config.mexicanoConfig?.variant;
    const isPairs = variant === 'pairs';

    const handleAutoDistributeIndividual = () => {
        const assignedPlayers = Object.values(assignments).flat().map((p: string) =>
            p.includes('::') ? p.split('::') : [p]
        ).flat().filter(Boolean);
        const allPlayers = Array.from(new Set([...selectedPlayerIds, ...assignedPlayers]));
        if (allPlayers.length === 0) return alert('No hay jugadores seleccionados (ni en bolsa ni asignados).');
        if (numDivisions < 1) return alert('Define el número de divisiones');
        const shuffled = allPlayers.sort(() => Math.random() - 0.5);
        const baseSize = Math.floor(shuffled.length / numDivisions);
        const remainder = shuffled.length % numDivisions;
        const newAssignments: Record<number, string[]> = {};
        let currentIndex = 0;
        for (let i = 0; i < numDivisions; i++) {
            const size = baseSize + (i < remainder ? 1 : 0);
            const chunk = shuffled.slice(currentIndex, currentIndex + size);
            newAssignments[i] = chunk;
            currentIndex += size;
        }
        setAssignments(newAssignments);
    };

    const handleAutoDistributePairs = () => {
        const assignedPlayers = Object.values(assignments).flat().map((p: string) =>
            p.includes('::') ? p.split('::') : [p]
        ).flat().filter(Boolean);
        const allPlayers = Array.from(new Set([...selectedPlayerIds, ...assignedPlayers]));
        if (allPlayers.length === 0) return alert('No hay jugadores seleccionados (ni en bolsa ni asignados).');
        if (numDivisions < 1) return alert('Define el número de divisiones/grupos');
        const shuffled = allPlayers.sort(() => Math.random() - 0.5);
        const newAssignments: Record<number, string[]> = {};
        let currentIndex = 0;
        for (let i = 0; i < numDivisions; i++) {
            const totalPairs = Math.floor(shuffled.length / 2);
            const basePairsPerDiv = Math.floor(totalPairs / numDivisions);
            const remainderPairs = totalPairs % numDivisions;
            const pairsForThisDiv = basePairsPerDiv + (i < remainderPairs ? 1 : 0);
            const playersForThisDiv = pairsForThisDiv * 2;
            const chunk = shuffled.slice(currentIndex, currentIndex + playersForThisDiv);
            currentIndex += playersForThisDiv;
            const pairStrings: string[] = [];
            for (let k = 0; k < chunk.length; k += 2) {
                const p1 = chunk[k];
                const p2 = chunk[k + 1];
                if (p1 && p2) pairStrings.push(`${p1}::${p2}`);
                else if (p1) pairStrings.push(`${p1}::`);
            }
            newAssignments[i] = pairStrings;
        }
        setAssignments(newAssignments);
    };

    if (!isPairs) {
        // --- Individual Variant ---
        return (
            <div>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <h3 className="font-bold text-gray-800">2. Grupos / Divisiones (Manual)</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Num. Divisiones:</span>
                        <input
                            type="number" min="1" max="20"
                            value={numDivisions}
                            onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)}
                            className="border p-1 w-16 text-center rounded"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Jugadores/Div:</span>
                        <input
                            type="number" min="2" max="100"
                            value={individualMaxPlayers || 4}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 4;
                                setIndividualMaxPlayers(val);
                                setConfig({ ...config, maxPlayersPerDivision: val });
                            }}
                            className="border p-1 w-16 text-center rounded"
                        />
                    </div>
                    <Button
                        onClick={handleAutoDistributeIndividual}
                        variant="secondary"
                        className="ml-2 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
                    >
                        <Wand2 size={14} className="mr-1" /> Distribución Aleatoria
                    </Button>
                </div>

                {Array.from({ length: numDivisions }).map((_, divIdx) => {
                    const currentList = assignments[divIdx] || [];
                    const slotsCount = Math.max(individualMaxPlayers || 4, currentList.length);
                    return (
                        <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                            <h4 className="font-bold mb-2">División {divIdx + 1}</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                                {Array.from({ length: slotsCount }).map((_, pIdx) => {
                                    const val = currentList[pIdx] || '';
                                    const used = new Set<string>();
                                    Object.values(assignments).forEach((arr: any) => arr?.forEach((pairStr: string) => {
                                        if (!pairStr || pairStr === val) return;
                                        if (pairStr.includes('::')) {
                                            const [u1, u2] = pairStr.split('::');
                                            if (u1) used.add(u1);
                                            if (u2) used.add(u2);
                                        } else {
                                            used.add(pairStr);
                                        }
                                    }));
                                    const options = availablePlayers
                                        .filter(p => !used.has(p.id))
                                        .map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
                                    return (
                                        <div key={pIdx}>
                                            <label className="text-xs text-gray-500">Jugador {pIdx + 1}</label>
                                            <SearchableSelect
                                                options={options}
                                                value={val}
                                                onChange={(v) => handleAssignment(divIdx, pIdx, v, slotsCount)}
                                                placeholder="Seleccionar..."
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // --- Pairs Variant ---
    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <h3 className="font-bold text-gray-800">2. Divisiones (Parejas)</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Num. Divisiones:</span>
                    <input
                        type="number" min="1" max="20"
                        value={numDivisions}
                        onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)}
                        className="border p-1 w-16 text-center rounded"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Parejas/Div:</span>
                    <input
                        type="number" min="2" max="50"
                        value={individualMaxPlayers || 4}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 4;
                            setIndividualMaxPlayers(val);
                            setConfig({ ...config, maxPlayersPerDivision: val });
                        }}
                        className="border p-1 w-16 text-center rounded"
                    />
                </div>
                <Button
                    onClick={handleAutoDistributePairs}
                    variant="secondary"
                    className="ml-2 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
                >
                    <Wand2 size={14} className="mr-1" /> Distribución Aleatoria
                </Button>
            </div>

            {Array.from({ length: numDivisions }).map((_, divIdx) => {
                const currentList = assignments[divIdx] || [];
                const slotsCount = Math.max(Math.max(2, individualMaxPlayers || 2), currentList.length);
                return (
                    <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                        <h4 className="font-bold mb-2">División {divIdx + 1}</h4>
                        <div className="grid gap-4">
                            {Array.from({ length: slotsCount }).map((_, pairIdx) => {
                                const val = currentList[pairIdx] || '';
                                const [p1Id, p2Id] = val ? val.split('::') : ['', ''];
                                const used = new Set<string>();
                                Object.values(assignments).forEach((arr: any) => arr?.forEach((pairStr: string) => {
                                    if (!pairStr || pairStr === val) return;
                                    const [u1, u2] = pairStr.split('::');
                                    if (u1) used.add(u1);
                                    if (u2) used.add(u2);
                                }));
                                if (p1Id) used.add(p1Id);
                                if (p2Id) used.add(p2Id);
                                const getOpts = (excludeId: string) =>
                                    availablePlayers
                                        .filter(p => !used.has(p.id) || p.id === excludeId)
                                        .map(p => ({ id: p.id, label: `${p.nombre} ${p.apellidos}` }));
                                return (
                                    <div key={pairIdx} className="flex gap-2 items-center bg-white p-2 rounded border">
                                        <span className="text-xs font-bold text-gray-400 w-16">Pareja {pairIdx + 1}</span>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <SearchableSelect
                                                options={getOpts(p1Id || '')}
                                                value={p1Id}
                                                onChange={(v) => {
                                                    const finalVal = (v || p2Id) ? `${v || ''}::${p2Id || ''}` : '';
                                                    handleAssignment(divIdx, pairIdx, finalVal, slotsCount);
                                                }}
                                                placeholder="Jugador A"
                                            />
                                            <SearchableSelect
                                                options={getOpts(p2Id || '')}
                                                value={p2Id}
                                                onChange={(v) => {
                                                    const finalVal = (p1Id || v) ? `${p1Id || ''}::${v || ''}` : '';
                                                    handleAssignment(divIdx, pairIdx, finalVal, slotsCount);
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
