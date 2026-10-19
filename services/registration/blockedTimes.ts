import type { TournamentRegistration, TournamentRegistrationAvailability } from '../../types';
import type { DaySchedule } from '../scheduler/types';
import { localDateKey, parseTimeOnDate } from '../scheduler/timeGrid';

/** A row of the grid: half an hour, or less at an irregular opening/closing time. "HH:MM". */
export interface Slot {
    start: string;
    end: string;
}

const SLOT_MINUTES = 30;

const toMin = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toTime = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const byStart = (a: DaySchedule, b: DaySchedule) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

export const sortDays = (days: DaySchedule[]): DaySchedule[] => [...days].sort(byStart);

/** Half-hour rows of a tournament day, from opening to closing. Irregular edges give a shorter row (17:15–17:30). */
export const daySlots = (day: DaySchedule): Slot[] => {
    const close = toMin(day.endTime);
    const out: Slot[] = [];
    for (let t = toMin(day.startTime); t < close;) {
        const next = Math.min(close, (Math.floor(t / SLOT_MINUTES) + 1) * SLOT_MINUTES);
        out.push({ start: toTime(t), end: toTime(next) });
        t = next;
    }
    return out;
};

export const rangesOfDay = (ranges: DaySchedule[], date: string): DaySchedule[] =>
    ranges.filter(r => r.date === date).sort(byStart);

/** A row is blocked when any range of its day overlaps it. */
export const isSlotBlocked = (ranges: DaySchedule[], date: string, slot: Slot): boolean =>
    ranges.some(r => r.date === date && toMin(r.startTime) < toMin(slot.end) && toMin(r.endTime) > toMin(slot.start));

/** Joins consecutive blocked rows into ranges. */
export const slotsToRanges = (date: string, slots: Slot[]): DaySchedule[] => {
    const out: DaySchedule[] = [];
    [...slots].sort((a, b) => a.start.localeCompare(b.start)).forEach(s => {
        const last = out[out.length - 1];
        if (last && last.endTime === s.start) last.endTime = s.end;
        else out.push({ date, startTime: s.start, endTime: s.end });
    });
    return out;
};

const replaceDay = (ranges: DaySchedule[], date: string, dayRanges: DaySchedule[]): DaySchedule[] =>
    [...ranges.filter(r => r.date !== date), ...dayRanges].sort(byStart);

/** Blocks or unblocks one row. The day's ranges are rebuilt from its rows (always merged). */
export const toggleSlot = (ranges: DaySchedule[], day: DaySchedule, slot: Slot): DaySchedule[] => {
    const blocked = daySlots(day).filter(s => {
        const isTarget = s.start === slot.start;
        const was = isSlotBlocked(ranges, day.date, s);
        return isTarget ? !was : was;
    });
    return replaceDay(ranges, day.date, slotsToRanges(day.date, blocked));
};

export const blockWholeDay = (ranges: DaySchedule[], day: DaySchedule): DaySchedule[] =>
    replaceDay(ranges, day.date, [{ date: day.date, startTime: day.startTime, endTime: day.endTime }]);

export const clearDay = (ranges: DaySchedule[], day: DaySchedule): DaySchedule[] =>
    replaceDay(ranges, day.date, []);

/** Cuts every range to its day's hours; ranges on days that are no longer in the tournament are dropped. */
export const clipToDays = (ranges: DaySchedule[], days: DaySchedule[]): { kept: DaySchedule[]; droppedCount: number } => {
    const kept: DaySchedule[] = [];
    let droppedCount = 0;
    ranges.forEach(r => {
        const day = days.find(d => d.date === r.date);
        const start = day ? Math.max(toMin(r.startTime), toMin(day.startTime)) : 0;
        const end = day ? Math.min(toMin(r.endTime), toMin(day.endTime)) : 0;
        if (!day || end <= start) {
            droppedCount++;
            return;
        }
        kept.push({ date: r.date, startTime: toTime(start), endTime: toTime(end) });
    });
    return { kept: kept.sort(byStart), droppedCount };
};

/** Every row of every day is blocked. */
export const blocksWholeTournament = (ranges: DaySchedule[], days: DaySchedule[]): boolean =>
    days.length > 0 && days.every(d => daySlots(d).every(s => isSlotBlocked(ranges, d.date, s)));

/** "sáb 24" */
export const dayLabel = (date: string): string => {
    const d = parseTimeOnDate('12:00', date);
    return `${d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')} ${d.getDate()}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sáb 24: no 09:00–10:30, 21:30–22:00 • Dom 25: no 09:00–14:00", or "Disponibles todo el torneo". */
export const summarize = (ranges: DaySchedule[], days: DaySchedule[]): string => {
    const { kept } = clipToDays(ranges, days);
    if (!kept.length) return 'Disponibles todo el torneo';
    return sortDays(days)
        .filter(d => kept.some(r => r.date === d.date))
        .map(d => `${capitalize(dayLabel(d.date))}: no ${rangesOfDay(kept, d.date).map(r => `${r.startTime}–${r.endTime}`).join(', ')}`)
        .join(' • ');
};

/** availabilityNotes: the summary plus the free-text note, if any. */
export const notesWithSummary = (summary: string, note?: string): string =>
    note?.trim() ? `${summary} • Nota: ${note.trim()}` : summary;

/** The free-text note of a registration (legacy ones keep it in availability.notes). */
export const registrationNote = (reg: Pick<TournamentRegistration, 'availability' | 'availabilityNotes'>): string =>
    reg.availability?.notes ?? reg.availabilityNotes?.match(/• Nota: (.*)$/)?.[1] ?? '';

/** Friday, Saturday and Sunday dates of the tournament (from its days, else from fechaInicio). */
const weekendDates = (days: DaySchedule[], fechaInicio?: string) => {
    let friday = '';
    let saturday = '';
    let sunday = '';
    days.forEach(day => {
        const dayOfWeek = parseTimeOnDate('12:00', day.date).getDay();
        if (dayOfWeek === 5) friday = day.date;
        else if (dayOfWeek === 6) saturday = day.date;
        else if (dayOfWeek === 0) sunday = day.date;
    });
    if (!friday && fechaInicio) {
        const start = parseTimeOnDate('12:00', fechaInicio);
        const diffToFriday = (5 - start.getDay() + 7) % 7;
        const fri = new Date(start);
        fri.setDate(start.getDate() + (diffToFriday > 3 ? diffToFriday - 7 : diffToFriday));
        const sat = new Date(fri);
        sat.setDate(fri.getDate() + 1);
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        friday = localDateKey(fri);
        saturday = localDateKey(sat);
        sunday = localDateKey(sun);
    }
    return { friday, saturday, sunday };
};

/** Legacy Friday/Saturday/Sunday availability as blocked ranges (moved unchanged from RegistrationManagerModal). */
export const legacyAvailabilityToRanges = (
    availability: TournamentRegistrationAvailability,
    days: DaySchedule[],
    fechaInicio?: string
): DaySchedule[] => {
    const { friday: fridayDate, saturday: saturdayDate, sunday: sundayDate } = weekendDates(days, fechaInicio);
    const out: DaySchedule[] = [];
    const block = (date: string, startTime: string, endTime: string) => out.push({ date, startTime, endTime });
    const { friday, saturday, sunday } = availability;

    if (fridayDate && friday) {
        if (friday.status === 'unavailable') block(fridayDate, '00:00', '23:59');
        else if (friday.status === 'from_time' && friday.fromTime) block(fridayDate, '00:00', friday.fromTime);
    }
    if (saturdayDate && saturday) {
        if (saturday.status === 'unavailable') block(saturdayDate, '00:00', '23:59');
        else if (saturday.status === 'morning_only') block(saturdayDate, '15:00', '23:59');
        else if (saturday.status === 'afternoon_only') block(saturdayDate, '00:00', '15:00');
        else if (saturday.status === 'custom') {
            if (saturday.fromTime) block(saturdayDate, '00:00', saturday.fromTime);
            if (saturday.untilTime) block(saturdayDate, saturday.untilTime, '23:59');
        }
    }
    if (sundayDate && sunday) {
        if (sunday.status === 'unavailable') block(sundayDate, '00:00', '23:59');
        else if (sunday.status === 'morning_only') block(sundayDate, '15:00', '23:59');
        else if (sunday.status === 'afternoon_only') block(sundayDate, '00:00', '15:00');
    }
    return out;
};

/** The registration's blocked ranges: the new field, else the legacy availability converted, else none. */
export const effectiveBlockedRanges = (
    reg: Pick<TournamentRegistration, 'blockedRanges' | 'availability'>,
    days: DaySchedule[],
    fechaInicio?: string
): DaySchedule[] => {
    if (reg.blockedRanges) return reg.blockedRanges;
    if (reg.availability) return legacyAvailabilityToRanges(reg.availability, days, fechaInicio);
    return [];
};
