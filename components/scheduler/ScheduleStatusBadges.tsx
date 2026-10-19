import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Match, Ranking } from '../../types';
import { SchedulerEngine } from '../../services/SchedulerEngine';

interface Props {
    match: Match;
    ranking: Ranking;
    showConflicts: boolean;
    size?: number;
}

/** "· estimado" label for projected slots + red icon for availability, window or court conflicts. */
export const ScheduleStatusBadges = ({ match, ranking, showConflicts, size = 14 }: Props) => {
    if (!match.startTime) return null;
    const reasons = (match.scheduleConflict ?? []).map(c => c.reason);
    if (showConflicts && match.court) {
        const start = new Date(match.startTime);
        const end = SchedulerEngine.addMinutes(start, ranking.schedulerConfig?.slotDurationMinutes || 90);
        const occupied = SchedulerEngine.getAllOccupiedSlots(ranking, match.id);
        if (SchedulerEngine.checkMatchConflict(start, end, match.court, occupied)) reasons.push(`Pista ${match.court} ocupada`);
    }
    return (
        <>
            {match.scheduleEstimated && <span className="ml-1 italic font-medium text-amber-600">· estimado</span>}
            {showConflicts && reasons.length > 0 && (
                <span className="ml-2 text-red-500" title={reasons.join('\n')}>
                    <AlertTriangle size={size} />
                </span>
            )}
        </>
    );
};
