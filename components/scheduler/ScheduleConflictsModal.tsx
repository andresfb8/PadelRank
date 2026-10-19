import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { Modal, Button } from '../ui/Components';
import { Match, Player, Ranking } from '../../types';
import { ANY_PAIR } from '../../services/SchedulerEngine';
import { pairLabel } from './pairLabel';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    players: Record<string, Player>;
    onMove: (match: Match) => void;
}

export const getConflictMatches = (ranking: Ranking): Match[] =>
    ranking.divisions.flatMap(d => d.matches)
        .filter(m => m.status === 'pendiente' && m.scheduleConflict?.length)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

export const ScheduleConflictsModal = ({ isOpen, onClose, ranking, players, onMove }: Props) => {
    const matches = getConflictMatches(ranking);
    const categoryOf = (m: Match) => {
        const div = ranking.divisions.find(d => d.matches.some(x => x.id === m.id));
        return div?.category || div?.name || '';
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Conflictos de horario (${matches.length})`} maxWidth="max-w-2xl">
            {matches.length === 0 ? (
                <p className="text-sm text-gray-500">No hay conflictos.</p>
            ) : (
                <ul className="space-y-3">
                    {matches.map(m => (
                        <li key={m.id} className="border border-red-100 bg-red-50 rounded-lg p-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0 text-sm">
                                <div className="font-semibold text-gray-800">
                                    {categoryOf(m)} · {m.roundName || `Ronda ${m.jornada}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {m.startTime
                                        ? new Date(m.startTime).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : 'Sin hora'}
                                    {m.court ? ` · Pista ${m.court}` : ''}
                                </div>
                                <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                                    {m.scheduleConflict!.map((c, i) => (
                                        <li key={i}>
                                            {c.pairKey === ANY_PAIR ? c.reason : `${pairLabel(c.pairKey, players)}: ${c.reason}`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => onMove(m)}>
                                <Calendar size={14} /> Mover
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
};
