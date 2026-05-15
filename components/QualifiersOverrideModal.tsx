import React, { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Shield, ArrowDown, AlertTriangle } from 'lucide-react';
import { Player } from '../types';
import { Button } from './ui/Components';

export type QualifierBucket = 'main' | 'consolation' | 'none';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (main: string[], consolation: string[]) => void;
    initialMain: string[];
    initialConsolation: string[];
    allGroupParticipants: string[]; // All pair IDs in group stage (format p1::p2 or playerId)
    mainBracketSize: number;
    consolationBracketSize: number;
    players: Record<string, Player>;
    guestPlayers?: { id: string; nombre: string; apellidos?: string }[];
}

const bucketIcon = (b: QualifierBucket) => {
    if (b === 'main') return <Trophy size={14} className="text-yellow-600" />;
    if (b === 'consolation') return <Shield size={14} className="text-blue-600" />;
    return <ArrowDown size={14} className="text-gray-400" />;
};

const bucketLabel = (b: QualifierBucket) => {
    if (b === 'main') return 'Principal';
    if (b === 'consolation') return 'Consolación';
    return 'No clasifica';
};

export const QualifiersOverrideModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialMain,
    initialConsolation,
    allGroupParticipants,
    mainBracketSize,
    consolationBracketSize,
    players,
    guestPlayers = [],
}: Props) => {
    const [assignment, setAssignment] = useState<Record<string, QualifierBucket>>({});

    useEffect(() => {
        if (!isOpen) return;
        const next: Record<string, QualifierBucket> = {};
        for (const id of allGroupParticipants) {
            if (initialMain.includes(id)) next[id] = 'main';
            else if (initialConsolation.includes(id)) next[id] = 'consolation';
            else next[id] = 'none';
        }
        setAssignment(next);
    }, [isOpen, initialMain, initialConsolation, allGroupParticipants]);

    const nameOf = (id: string) => {
        if (!id) return '';
        const p = players[id] || guestPlayers.find(g => g.id === id);
        return p ? `${p.nombre} ${p.apellidos || ''}`.trim() : id;
    };

    const pairLabel = (id: string) => {
        if (id.includes('::')) {
            const [p1, p2] = id.split('::');
            return `${nameOf(p1)} / ${nameOf(p2)}`;
        }
        return nameOf(id);
    };

    const setBucket = (id: string, bucket: QualifierBucket) => {
        setAssignment(prev => ({ ...prev, [id]: bucket }));
    };

    const mainCount = useMemo(() => Object.values(assignment).filter(b => b === 'main').length, [assignment]);
    const consolationCount = useMemo(() => Object.values(assignment).filter(b => b === 'consolation').length, [assignment]);

    const mainOk = mainCount === mainBracketSize;
    const consolationOk = consolationBracketSize === 0 || consolationCount === consolationBracketSize;
    const canConfirm = mainOk && consolationOk && mainCount >= 2;

    const handleConfirm = () => {
        const main: string[] = [];
        const consolation: string[] = [];
        // Preserve order of allGroupParticipants (which is already sorted by performance)
        for (const id of allGroupParticipants) {
            if (assignment[id] === 'main') main.push(id);
            else if (assignment[id] === 'consolation') consolation.push(id);
        }
        onConfirm(main, consolation);
    };

    if (!isOpen) return null;

    const groups: { label: string; bucket: QualifierBucket; ids: string[] }[] = [
        { label: 'Cuadro Principal', bucket: 'main', ids: allGroupParticipants.filter(id => assignment[id] === 'main') },
        { label: 'Cuadro Consolación', bucket: 'consolation', ids: allGroupParticipants.filter(id => assignment[id] === 'consolation') },
        { label: 'No clasifican', bucket: 'none', ids: allGroupParticipants.filter(id => assignment[id] === 'none') },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900">Ajustar Clasificados</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
                        Esta es la propuesta automática del sistema. Puedes mover parejas entre cuadros antes de generar los playoffs.
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className={`p-3 rounded-lg border ${mainOk ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <strong>Principal:</strong> {mainCount} / {mainBracketSize} {mainOk ? '✓' : <AlertTriangle size={14} className="inline" />}
                        </div>
                        {consolationBracketSize > 0 && (
                            <div className={`p-3 rounded-lg border ${consolationOk ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <strong>Consolación:</strong> {consolationCount} / {consolationBracketSize} {consolationOk ? '✓' : <AlertTriangle size={14} className="inline" />}
                            </div>
                        )}
                    </div>

                    {groups.map(g => (
                        <div key={g.bucket} className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 font-bold text-gray-700 text-sm">
                                {bucketIcon(g.bucket)} {g.label} <span className="text-xs text-gray-500 font-normal">({g.ids.length})</span>
                            </div>
                            {g.ids.length === 0 ? (
                                <div className="p-3 text-xs text-gray-400 italic">Vacío</div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {g.ids.map(id => (
                                        <li key={id} className="px-4 py-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-gray-800 truncate">{pairLabel(id)}</span>
                                            <select
                                                value={assignment[id]}
                                                onChange={e => setBucket(id, e.target.value as QualifierBucket)}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                                            >
                                                <option value="main">{bucketLabel('main')}</option>
                                                {consolationBracketSize > 0 && <option value="consolation">{bucketLabel('consolation')}</option>}
                                                <option value="none">{bucketLabel('none')}</option>
                                            </select>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                    <Button onClick={onClose} variant="secondary">Cancelar</Button>
                    <Button onClick={handleConfirm} variant="primary" disabled={!canConfirm}>Generar Playoffs</Button>
                </div>
            </div>
        </div>
    );
};
