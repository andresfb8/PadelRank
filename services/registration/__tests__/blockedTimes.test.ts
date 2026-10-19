import { describe, it, expect } from 'vitest';
import type { DaySchedule } from '../../scheduler/types';
import {
    blockWholeDay, blocksWholeTournament, clearDay, clipToDays, dayLabel, daySlots, effectiveBlockedRanges,
    isSlotBlocked, legacyAvailabilityToRanges, notesWithSummary, registrationNote, slotsToRanges, summarize, toggleSlot,
} from '../blockedTimes';

// Friday 23, Saturday 24 and Sunday 25 October 2026
const FRI: DaySchedule = { date: '2026-10-23', startTime: '17:00', endTime: '22:00' };
const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const SUN: DaySchedule = { date: '2026-10-25', startTime: '09:00', endTime: '14:00' };
const DAYS = [FRI, SAT, SUN];

const r = (date: string, startTime: string, endTime: string): DaySchedule => ({ date, startTime, endTime });

describe('blockedTimes', () => {
    it('daySlots: half hours from opening to closing', () => {
        const slots = daySlots(SUN);
        expect(slots).toHaveLength(10);
        expect(slots[0]).toEqual({ start: '09:00', end: '09:30' });
        expect(slots[9]).toEqual({ start: '13:30', end: '14:00' });
    });

    it('daySlots: irregular opening and closing give shorter edge rows', () => {
        const slots = daySlots({ date: FRI.date, startTime: '17:15', endTime: '18:45' });
        expect(slots).toEqual([
            { start: '17:15', end: '17:30' },
            { start: '17:30', end: '18:00' },
            { start: '18:00', end: '18:30' },
            { start: '18:30', end: '18:45' },
        ]);
    });

    it('slotsToRanges joins consecutive rows', () => {
        expect(slotsToRanges(SAT.date, [
            { start: '10:00', end: '10:30' }, { start: '09:00', end: '09:30' }, { start: '09:30', end: '10:00' },
            { start: '21:30', end: '22:00' },
        ])).toEqual([r(SAT.date, '09:00', '10:30'), r(SAT.date, '21:30', '22:00')]);
    });

    it('isSlotBlocked: any overlap with a range of the same day', () => {
        const ranges = [r(SAT.date, '09:10', '09:20')];
        expect(isSlotBlocked(ranges, SAT.date, { start: '09:00', end: '09:30' })).toBe(true);
        expect(isSlotBlocked(ranges, SAT.date, { start: '09:30', end: '10:00' })).toBe(false);
        expect(isSlotBlocked(ranges, SUN.date, { start: '09:00', end: '09:30' })).toBe(false);
    });

    it('toggleSlot blocks, merges with neighbours and leaves other days alone', () => {
        let ranges = [r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '09:30')];
        ranges = toggleSlot(ranges, SAT, { start: '09:30', end: '10:00' });
        expect(ranges).toEqual([r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '10:00')]);
    });

    it('toggleSlot in the middle of a range splits it', () => {
        const ranges = toggleSlot([r(SAT.date, '09:00', '10:30')], SAT, { start: '09:30', end: '10:00' });
        expect(ranges).toEqual([r(SAT.date, '09:00', '09:30'), r(SAT.date, '10:00', '10:30')]);
    });

    it('blockWholeDay and clearDay only touch their day', () => {
        const base = [r(FRI.date, '17:00', '18:00'), r(SAT.date, '12:00', '13:00')];
        expect(blockWholeDay(base, SAT)).toEqual([r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '22:00')]);
        expect(clearDay(base, SAT)).toEqual([r(FRI.date, '17:00', '18:00')]);
    });

    it('clipToDays cuts ranges to the day hours and drops days that are gone', () => {
        const { kept, droppedCount } = clipToDays([
            r(SAT.date, '00:00', '15:00'),       // cut to 09:00–15:00
            r(SUN.date, '15:00', '23:59'),       // after closing: dropped
            r('2026-10-26', '10:00', '12:00'),   // not a tournament day: dropped
        ], DAYS);
        expect(kept).toEqual([r(SAT.date, '09:00', '15:00')]);
        expect(droppedCount).toBe(2);
    });

    it('blocksWholeTournament', () => {
        expect(blocksWholeTournament(DAYS.map(d => r(d.date, d.startTime, d.endTime)), DAYS)).toBe(true);
        expect(blocksWholeTournament([r(SAT.date, '09:00', '22:00')], DAYS)).toBe(false);
        expect(blocksWholeTournament([], [])).toBe(false);
    });

    it('dayLabel and summarize', () => {
        expect(dayLabel(SAT.date)).toBe('sáb 24');
        expect(summarize([], DAYS)).toBe('Disponibles todo el torneo');
        expect(summarize([r(SUN.date, '09:00', '14:00'), r(SAT.date, '21:30', '22:00'), r(SAT.date, '09:00', '10:30')], DAYS))
            .toBe('Sáb 24: no 09:00–10:30, 21:30–22:00 • Dom 25: no 09:00–14:00');
    });

    it('notesWithSummary and registrationNote round-trip the free-text note', () => {
        const notes = notesWithSummary('Disponibles todo el torneo', ' Salgo a las 19h ');
        expect(notes).toBe('Disponibles todo el torneo • Nota: Salgo a las 19h');
        expect(registrationNote({ availabilityNotes: notes })).toBe('Salgo a las 19h');
        expect(registrationNote({ availability: { notes: 'legado' }, availabilityNotes: 'x' })).toBe('legado');
        expect(notesWithSummary('Disponibles todo el torneo', '')).toBe('Disponibles todo el torneo');
    });

    it('legacyAvailabilityToRanges keeps the old conversion', () => {
        expect(legacyAvailabilityToRanges({
            friday: { status: 'from_time', fromTime: '19:00' },
            saturday: { status: 'custom', fromTime: '10:00', untilTime: '20:00' },
            sunday: { status: 'morning_only' },
        }, DAYS)).toEqual([
            r(FRI.date, '00:00', '19:00'),
            r(SAT.date, '00:00', '10:00'),
            r(SAT.date, '20:00', '23:59'),
            r(SUN.date, '15:00', '23:59'),
        ]);
        expect(legacyAvailabilityToRanges({
            friday: { status: 'unavailable' }, saturday: { status: 'afternoon_only' }, sunday: { status: 'all_day' },
        }, DAYS)).toEqual([r(FRI.date, '00:00', '23:59'), r(SAT.date, '00:00', '15:00')]);
    });

    it('legacyAvailabilityToRanges falls back to the weekend of fechaInicio', () => {
        expect(legacyAvailabilityToRanges({ saturday: { status: 'unavailable' } }, [], '2026-10-24'))
            .toEqual([r(SAT.date, '00:00', '23:59')]);
    });

    it('effectiveBlockedRanges prefers the new field', () => {
        expect(effectiveBlockedRanges({ blockedRanges: [r(SAT.date, '09:00', '10:00')], availability: { friday: { status: 'unavailable' } } }, DAYS))
            .toEqual([r(SAT.date, '09:00', '10:00')]);
        expect(effectiveBlockedRanges({ availability: { friday: { status: 'unavailable' } } }, DAYS))
            .toEqual([r(FRI.date, '00:00', '23:59')]);
        expect(effectiveBlockedRanges({}, DAYS)).toEqual([]);
    });
});
