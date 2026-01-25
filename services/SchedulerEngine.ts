import { Match, Division } from '../types';

export interface SchedulerConfig {
    courts: number;
    timeWindows: { start: string; end: string }[]; // e.g., ["09:00", "23:00"]
    slotDurationMinutes: number; // Default 90
    restMinutes: number; // Default 60
}

export interface PlayerAvailability {
    unavailableRanges: { start: string; end: string }[]; // ISO strings
}

/**
 * Core Scheduler Engine
 */
export class SchedulerEngine {

    /**
     * Adds minutes to a date and returns a new Date object
     */
    static addMinutes(date: Date, minutes: number): Date {
        return new Date(date.getTime() + minutes * 60000);
    }

    /**
     * Parses time string (HH:MM) to today's Date
     */
    static parseTime(timeStr: string, baseDate: Date = new Date()): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(baseDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    /**
     * Checks if two time ranges overlap
     */
    static doRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
        return start1 < end2 && start2 < end1;
    }

    /**
     * Checks if specific players are unavailable during a time range
     */
    static checkPlayerAvailability(
        startTime: Date,
        endTime: Date,
        playerIds: string[],
        allConstraints: Record<string, PlayerAvailability>
    ): { valid: boolean; conflictPlayerId?: string; conflictRange?: { start: string, end: string } } {
        if (!allConstraints) return { valid: true };

        for (const pid of playerIds) {
            if (!pid || !allConstraints[pid]) continue;

            for (const range of allConstraints[pid].unavailableRanges) {
                const busyStart = new Date(range.start);
                const busyEnd = new Date(range.end);

                if (this.doRangesOverlap(startTime, endTime, busyStart, busyEnd)) {
                    return { valid: false, conflictPlayerId: pid, conflictRange: range };
                }
            }
        }
        return { valid: true };
    }

    /**
     * Checks for specific resource conflict (Court overlap)
     */
    static checkMatchConflict(
        startTime: Date,
        endTime: Date,
        court: number,
        occupiedSlots: { start: Date; end: Date; court: number }[]
    ): boolean {
        return occupiedSlots.some(slot =>
            slot.court === court &&
            this.doRangesOverlap(startTime, endTime, slot.start, slot.end)
        );
    }

    /**
     * Validates if a slot is available for a match considering resources and constraints
     */
    static isValidSlot(
        startTime: Date,
        endTime: Date,
        config: SchedulerConfig,
        occupiedSlots: { start: Date; end: Date; court: number }[],
        playerConstraints: PlayerAvailability[]
    ): { valid: boolean; court?: number; reason?: string } {

        // 1. Check Player Availability
        for (const p of playerConstraints) {
            for (const range of p.unavailableRanges) {
                const busyStart = new Date(range.start);
                const busyEnd = new Date(range.end);

                // Rule of Margin: If busy at X, match must END before X
                // Actually, busy range usually means "cannot play between A and B".
                // So we check standard overlap.
                if (this.doRangesOverlap(startTime, endTime, busyStart, busyEnd)) {
                    return { valid: false, reason: 'Player unavailable' };
                }
            }
        }

        // 2. Find Available Court
        // We check courts 1 to N.
        for (let c = 1; c <= config.courts; c++) {
            const isCourtBusy = occupiedSlots.some(
                slot => slot.court === c && this.doRangesOverlap(startTime, endTime, slot.start, slot.end)
            );

            if (!isCourtBusy) {
                return { valid: true, court: c };
            }
        }

        return { valid: false, reason: 'No courts available' };
    }

    /**
     * Finds the next available slot for a match
     */
    static findNextSlot(
        minStartTime: Date,
        config: SchedulerConfig,
        occupiedSlots: { start: Date; end: Date; court: number }[],
        playerConstraints: PlayerAvailability[]
    ): { start: Date; court: number } | null {

        // Search window: e.g., next 7 days
        const searchEnd = this.addMinutes(minStartTime, 7 * 24 * 60);
        let current = new Date(minStartTime);

        // Round to next slot interval (e.g. 15 or 30 mins) for cleaner schedules
        const interval = 30;
        const remainder = current.getMinutes() % interval;
        if (remainder !== 0) current = this.addMinutes(current, interval - remainder);

        while (current < searchEnd) {
            const potentialEnd = this.addMinutes(current, config.slotDurationMinutes);

            // Check if within club operating hours
            // For simplicity V1, assumes single daily window. 
            // Real logic needs to handle multi-day iteration.

            const valid = this.isValidSlot(current, potentialEnd, config, occupiedSlots, playerConstraints);
            if (valid.valid && valid.court) {
                return { start: current, court: valid.court };
            }

            current = this.addMinutes(current, interval);
        }

        return null; // Unassigned
    }

    /**
     * REACTIVE LOGIC: Schedules the next match(es) in the bracket
     */
    static scheduleNextMatches(
        finishedMatch: Match,
        ranking: import('../types').Ranking,
        divisionId: string
    ): import('../types').Division[] {
        const division = ranking.divisions.find(d => d.id === divisionId);
        if (!division) return ranking.divisions;

        // 1. Find the match where the winner/loser advanced to
        // We look for a match in the same division (or others?) that has the winning pair 
        // AND is in a future round (jornada > finishedMatch.jornada)
        // Actually, simple check: Look for matches where pair1 or pair2 matches the finishedMatch pairs
        // and status is 'pendiente' (or just check existence).

        let newDivisions = [...ranking.divisions];
        const schedulerConfig = ranking.schedulerConfig;
        if (!schedulerConfig) return newDivisions; // No scheduler configured

        // Helper to find dependent matches
        const findDependentMatch = (pairId: { p1Id: string, p2Id: string }, minJornada: number) => {
            return division.matches.find(m =>
                m.jornada > minJornada &&
                ((m.pair1.p1Id === pairId.p1Id && m.pair1.p2Id === pairId.p2Id) ||
                    (m.pair2.p1Id === pairId.p1Id && m.pair2.p2Id === pairId.p2Id))
            );
        };

        // Pairs involved in the finished match
        const p1 = finishedMatch.pair1;
        const p2 = finishedMatch.pair2;

        const nextMatchP1 = findDependentMatch(p1, finishedMatch.jornada);
        const nextMatchP2 = findDependentMatch(p2, finishedMatch.jornada);

        const matchesToSchedule = [nextMatchP1, nextMatchP2].filter(Boolean) as Match[];

        // Deduplicate (if both played each other next, rare in single elim but possible in groups?)
        const uniqueMatches = Array.from(new Set(matchesToSchedule.map(m => m.id)))
            .map(id => matchesToSchedule.find(m => m.id === id)!);

        for (const nextMatch of uniqueMatches) {
            // Check if ready (both opponents exist and are not BYE or null)
            const isReady = nextMatch.pair1.p1Id && nextMatch.pair2.p1Id;
            if (!isReady) continue;

            // Determine EPST (Earliest Possible Start Time)
            // We need the end time of the LATEST parent match.
            // We look for the last match played by BOTH pairs.

            const lastMatchPair1 = this.findLastMatchForPlayer(nextMatch.pair1, division.matches, nextMatch.id);
            const lastMatchPair2 = this.findLastMatchForPlayer(nextMatch.pair2, division.matches, nextMatch.id);

            // Helper to parse match end time or default to now
            const getEndTime = (m?: Match) => {
                if (!m) return new Date(); // Should not happen if coming from a finished match, but maybe for initial round?
                if (m.startTime) {
                    // Calculate end based on slots? Or use 'finished' time?
                    // For scheduling, we use projected end time based on slot duration.
                    // If actual endTime is stored, use it.
                    // Assuming slots for now.
                    const start = new Date(m.startTime);
                    return this.addMinutes(start, schedulerConfig.slotDurationMinutes);
                }
                return new Date(); // Fallback
            };

            const end1 = getEndTime(lastMatchPair1);
            const end2 = getEndTime(lastMatchPair2);

            const latestEnd = end1 > end2 ? end1 : end2;
            const minStartTime = this.addMinutes(latestEnd, schedulerConfig.restMinutes);

            // Calculate Occupied Slots
            // TODO: This should be global across ALL divisions if they share courts.
            const occupiedSlots = SchedulerEngine.getAllOccupiedSlots(ranking);

            const playerConstraints = ranking.playerConstraints ? Object.values(ranking.playerConstraints) : [];
            // Note: Filter constraints for ONLY the players in this match to optimize?
            // Actually isValidSlot iterates all constraints provided. Better to filter.
            const specificConstraints = [];
            if (ranking.playerConstraints) {
                [nextMatch.pair1.p1Id, nextMatch.pair1.p2Id, nextMatch.pair2.p1Id, nextMatch.pair2.p2Id].forEach(pid => {
                    if (ranking.playerConstraints![pid]) specificConstraints.push(ranking.playerConstraints![pid]);
                });
            }

            const slot = this.findNextSlot(minStartTime, schedulerConfig, occupiedSlots, specificConstraints as any);

            if (slot) {
                // Assign Slot
                nextMatch.startTime = slot.start.toISOString();
                nextMatch.court = slot.court;
                // Update match in division
                const mIndex = division.matches.findIndex(m => m.id === nextMatch.id);
                if (mIndex !== -1) division.matches[mIndex] = nextMatch;
            } else {
                // Mark unassigned or handle error
                console.log("Could not find slot for match", nextMatch.id);
            }
        }

        return newDivisions.map(d => d.id === division.id ? division : d);
    }

    private static findLastMatchForPlayer(pair: { p1Id: string, p2Id: string }, matches: Match[], excludeMatchId: string): Match | undefined {
        // Find matches where this pair played, sorted by jornada desc.
        // Exclude the current 'nextMatch'
        return matches
            .filter(m => m.id !== excludeMatchId &&
                (m.status === 'finalizado') && // Only consider finished matches for rest calculation
                ((m.pair1.p1Id === pair.p1Id && m.pair1.p2Id === pair.p2Id) ||
                    (m.pair2.p1Id === pair.p1Id && m.pair2.p2Id === pair.p2Id)))
            .sort((a, b) => b.jornada - a.jornada)[0];
    }

    static getAllOccupiedSlots(ranking: import('../types').Ranking, excludeMatchId?: string): { start: Date; end: Date; court: number }[] {
        const slots: { start: Date; end: Date; court: number }[] = [];
        const duration = ranking.schedulerConfig?.slotDurationMinutes || 90;

        ranking.divisions.forEach(div => {
            div.matches.forEach(m => {
                if (m.startTime && m.court && m.id !== excludeMatchId) {
                    slots.push({
                        start: new Date(m.startTime),
                        end: this.addMinutes(new Date(m.startTime), duration),
                        court: m.court
                    });
                }
            });
        });
        return slots;
    }
}
