import React from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '../ui/Components';
import { SearchableSelect } from '../SearchableSelect';
import { FormatAssignmentsProps } from './types';

type LeagueFormat = 'classic' | 'individual' | 'pairs' | 'hybrid' | 'pozo';

interface LeagueAssignmentsProps extends FormatAssignmentsProps {
    format: LeagueFormat;
    setNumDivisions: (num: number) => void;
    setIndividualMaxPlayers: (num: number) => void;
}

export const LeagueAssignments = ({
    format,
    config,
    assignments,
    setAssignments,
    selectedPlayerIds,
    availablePlayers,
    numDivisions,
    setNumDivisions,
    individualMaxPlayers,
    setIndividualMaxPlayers,
}: LeagueAssignmentsProps) => {
    const isPozoFixedPairs = format === 'pozo' && config.pozoConfig?.variant === 'fixed-pairs';
    const isPairsMode = format === 'pairs' || format === 'hybrid' || isPozoFixedPairs;

    // Internal: self-contained assignment handler, no longer injected from parent
    const handleAssignment = (divIdx: number, pIdx: number, pId: string, maxP: number) => {
        const newA = { ...assignments };
        if (!newA[divIdx]) newA[divIdx] = Array(maxP).fill('');
        if (newA[divIdx].length < maxP) {
            newA[divIdx] = [...newA[divIdx], ...Array(maxP - newA[divIdx].length).fill('')];
        }
        newA[divIdx][pIdx] = pId;
        setAssignments(newA);
    };

    // ─── Auto-distribute: Individual ────────────────────────────────────────────
    const handleAutoDistributeIndividual = () => {
        const assignedPlayers = Object.values(assignments)
            .flat()
            .map((p: string) => (p.includes('::') ? p.split('::') : [p]))
            .flat()
            .filter(Boolean);
        const allPlayers = Array.from(new Set([...selectedPlayerIds, ...assignedPlayers]));
        if (allPlayers.length === 0) return alert('No hay jugadores seleccionados (ni en bolsa ni asignados).');
        if (numDivisions < 1) return alert('Define el número de divisiones');

        const shuffled = allPlayers.sort(() => Math.random() - 0.5);
        const baseSize = Math.floor(shuffled.length / numDivisions);
        const remainder = shuffled.length % numDivisions;
        const newAssignments: Record<number, string[]> = {};
        let idx = 0;
        for (let i = 0; i < numDivisions; i++) {
            const size = baseSize + (i < remainder ? 1 : 0);
            newAssignments[i] = shuffled.slice(idx, idx + size);
            idx += size;
        }
        setAssignments(newAssignments);
    };

    // ─── Auto-distribute: Pairs ──────────────────────────────────────────────────
    const handleAutoDistributePairs = () => {
        const assignedPlayers = Object.values(assignments)
            .flat()
            .map((p: string) => (p.includes('::') ? p.split('::') : [p]))
            .flat()
            .filter(Boolean);
        const allPlayers = Array.from(new Set([...selectedPlayerIds, ...assignedPlayers]));
        if (allPlayers.length === 0) return alert('No hay jugadores seleccionados (ni en bolsa ni asignados).');
        if (numDivisions < 1) return alert('Define el número de divisiones/grupos');

        const shuffled = allPlayers.sort(() => Math.random() - 0.5);
        const targetPairsPerGroup = format === 'hybrid'
            ? (config.hybridConfig?.pairsPerGroup || 4)
            : Math.max(2, individualMaxPlayers || 2);

        const newAssignments: Record<number, string[]> = {};
        let idx = 0;
        for (let i = 0; i < numDivisions; i++) {
            const totalPairs = Math.floor(shuffled.length / 2);
            const basePairs = Math.floor(totalPairs / numDivisions);
            const rem = totalPairs % numDivisions;
            const pairsForDiv = basePairs + (i < rem ? 1 : 0);
            const playersForDiv = pairsForDiv * 2;
            const chunk = shuffled.slice(idx, idx + playersForDiv);
            idx += playersForDiv;
            const pairStrings: string[] = [];
            for (let k = 0; k < chunk.length; k += 2) {
                const p1 = chunk[k], p2 = chunk[k + 1];
                if (p1 && p2) pairStrings.push(`${p1}::${p2}`);
                else if (p1) pairStrings.push(`${p1}::`);
            }
            newAssignments[i] = pairStrings;
        }
        setAssignments(newAssignments);
    };

    // ─── Individual mode ─────────────────────────────────────────────────────────
    if (!isPairsMode) {
        const slotsPerDiv = format === 'classic' || format === 'pozo' ? 4 : (individualMaxPlayers || 4);

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
                    {format === 'individual' && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Jugadores/Div:</span>
                            <input
                                type="number" min="2" max="100"
                                value={individualMaxPlayers || 4}
                                onChange={(e) => setIndividualMaxPlayers(parseInt(e.target.value) || 4)}
                                className="border p-1 w-16 text-center rounded"
                            />
                        </div>
                    )}
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
                    const slotsCount = Math.max(slotsPerDiv, currentList.length);
                    return (
                        <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                            <h4 className="font-bold mb-2">División {divIdx + 1}</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                                {Array.from({ length: slotsCount }).map((_, pIdx) => {
                                    const val = currentList[pIdx] || '';
                                    const used = new Set<string>();
                                    Object.values(assignments).forEach((arr: any) =>
                                        arr?.forEach((s: string) => {
                                            if (!s || s === val) return;
                                            s.includes('::')
                                                ? s.split('::').forEach(id => id && used.add(id))
                                                : used.add(s);
                                        })
                                    );
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

    // ─── Pairs mode ──────────────────────────────────────────────────────────────
    const isHybrid = format === 'hybrid';
    const groupLabel = (idx: number) =>
        isHybrid ? `Grupo ${String.fromCharCode(65 + idx)}` : `División ${idx + 1}`;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <h3 className="font-bold text-gray-800">2. {isHybrid ? 'Grupos (Parejas Fijas)' : 'Divisiones (Parejas)'}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{isHybrid ? 'Num. Grupos:' : 'Num. Divisiones:'}</span>
                    <input
                        type="number" min="1" max="20"
                        value={numDivisions}
                        onChange={(e) => setNumDivisions(parseInt(e.target.value) || 1)}
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
                const minSlots = isHybrid
                    ? (config.hybridConfig?.pairsPerGroup || 4)
                    : isPozoFixedPairs
                    ? 2
                    : Math.max(2, individualMaxPlayers || 2);
                const slotsCount = Math.max(minSlots, currentList.length);

                return (
                    <div key={divIdx} className="bg-gray-50 p-4 rounded-lg border mb-4">
                        <h4 className="font-bold mb-2">{groupLabel(divIdx)}</h4>
                        <div className="grid gap-4">
                            {Array.from({ length: slotsCount }).map((_, pairIdx) => {
                                const val = currentList[pairIdx] || '';
                                const [p1Id, p2Id] = val ? val.split('::') : ['', ''];
                                const used = new Set<string>();
                                Object.values(assignments).forEach((arr: any) =>
                                    arr?.forEach((s: string) => {
                                        if (!s || s === val) return;
                                        const [u1, u2] = s.split('::');
                                        if (u1) used.add(u1);
                                        if (u2) used.add(u2);
                                    })
                                );
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
