import React, { useState, useEffect } from 'react';
import { Player, Ranking, Division } from '../types';
import { X, Save } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    players: Record<string, Player>;
    divisions: Division[];
    onImport: (matchData: {
        pair1: { p1Id: string, p2Id: string },
        pair2: { p1Id: string, p2Id: string },
        score: { set1: { p1: number, p2: number }, set2: { p1: number, p2: number }, set3?: { p1: number, p2: number } },
        divisionId: string
    }) => void;
}

export const AddManualMatchModal = ({ isOpen, onClose, players, divisions, onImport }: Props) => {
    const [selectedDivision, setSelectedDivision] = useState(divisions.length > 0 ? divisions[0].id : '');
    const [pair1P1, setPair1P1] = useState('');
    const [pair1P2, setPair1P2] = useState('');
    const [pair2P1, setPair2P1] = useState('');
    const [pair2P2, setPair2P2] = useState('');

    const [s1p1, setS1p1] = useState('');
    const [s1p2, setS1p2] = useState('');
    const [s2p1, setS2p1] = useState('');
    const [s2p2, setS2p2] = useState('');
    const [s3p1, setS3p1] = useState('');
    const [s3p2, setS3p2] = useState('');

    // Limpiar selecciones cuando cambie la división
    useEffect(() => {
        setPair1P1('');
        setPair1P2('');
        setPair2P1('');
        setPair2P2('');
    }, [selectedDivision]);

    if (!isOpen) return null;

    // Obtener la división seleccionada
    const selectedDivisionObj = divisions.find(d => d.id === selectedDivision);

    // Filtrar jugadores que pertenecen a la división seleccionada
    const playerList = selectedDivisionObj
        ? Object.values(players)
            .filter(p => selectedDivisionObj.players.includes(p.id))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        : [];

    const handleImport = () => {
        if (!pair1P1 || !pair1P2 || !pair2P1 || !pair2P2 || !selectedDivision) {
            alert("Por favor selecciona todos los jugadores y la división");
            return;
        }
        if (new Set([pair1P1, pair1P2, pair2P1, pair2P2]).size !== 4) {
            alert("Los jugadores deben ser distintos");
            return;
        }

        const score = {
            set1: { p1: parseInt(s1p1) || 0, p2: parseInt(s1p2) || 0 },
            set2: { p1: parseInt(s2p1) || 0, p2: parseInt(s2p2) || 0 },
            set3: s3p1 && s3p2 ? { p1: parseInt(s3p1), p2: parseInt(s3p2) } : undefined
        };

        onImport({
            divisionId: selectedDivision,
            pair1: { p1Id: pair1P1, p2Id: pair1P2 },
            pair2: { p1Id: pair2P1, p2Id: pair2P2 },
            score
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Importar Partido Pasado</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Division Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">División</label>
                        <select
                            value={selectedDivision}
                            onChange={e => setSelectedDivision(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        >
                            {divisions.map(d => <option key={d.id} value={d.id}>División {d.numero}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pair 1 */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <h3 className="font-semibold text-blue-800 mb-3 block text-center">Pareja 1</h3>
                            <div className="space-y-3">
                                <select className="w-full p-2 border rounded bg-white text-sm" value={pair1P1} onChange={e => setPair1P1(e.target.value)}>
                                    <option value="">Jugador 1...</option>
                                    {playerList.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                                </select>
                                <select className="w-full p-2 border rounded bg-white text-sm" value={pair1P2} onChange={e => setPair1P2(e.target.value)}>
                                    <option value="">Jugador 2...</option>
                                    {playerList.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Pair 2 */}
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <h3 className="font-semibold text-orange-800 mb-3 block text-center">Pareja 2</h3>
                            <div className="space-y-3">
                                <select className="w-full p-2 border rounded bg-white text-sm" value={pair2P1} onChange={e => setPair2P1(e.target.value)}>
                                    <option value="">Jugador 3...</option>
                                    {playerList.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                                </select>
                                <select className="w-full p-2 border rounded bg-white text-sm" value={pair2P2} onChange={e => setPair2P2(e.target.value)}>
                                    <option value="">Jugador 4...</option>
                                    {playerList.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-3 text-center">Resultado</h3>
                        <div className="flex justify-center gap-4 items-center">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">SET 1</div>
                                <div className="flex gap-1 items-center">
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="0" value={s1p1} onChange={e => setS1p1(e.target.value)} />
                                    <span>-</span>
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="0" value={s1p2} onChange={e => setS1p2(e.target.value)} />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">SET 2</div>
                                <div className="flex gap-1 items-center">
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="0" value={s2p1} onChange={e => setS2p1(e.target.value)} />
                                    <span>-</span>
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="0" value={s2p2} onChange={e => setS2p2(e.target.value)} />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">SET 3 (Opc)</div>
                                <div className="flex gap-1 items-center">
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="-" value={s3p1} onChange={e => setS3p1(e.target.value)} />
                                    <span>-</span>
                                    <input type="number" className="w-12 p-2 border rounded text-center" placeholder="-" value={s3p2} onChange={e => setS3p2(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium">Cancelar</button>
                    <button onClick={handleImport} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-md transition-all font-medium flex items-center gap-2">
                        <Save size={18} /> Importar Partido
                    </button>
                </div>
            </div>
        </div>
    );
};
