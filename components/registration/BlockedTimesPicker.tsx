import React, { useState } from 'react';
import type { DaySchedule } from '../../services/scheduler/types';
import {
    blockWholeDay, clearDay, dayLabel, daySlots, isSlotBlocked, rangesOfDay, sortDays, toggleSlot,
} from '../../services/registration/blockedTimes';

interface Props {
    /** Tournament days (schedulerConfig.dailySchedule). */
    days: DaySchedule[];
    /** Ranges in which the pair can NOT play. */
    value: DaySchedule[];
    onChange?: (ranges: DaySchedule[]) => void;
    readOnly?: boolean;
}

/** "When can you NOT play?": one tab per tournament day, one row per half hour. */
export const BlockedTimesPicker: React.FC<Props> = ({ days, value, onChange, readOnly = false }) => {
    const sorted = sortDays(days);
    const [activeDate, setActiveDate] = useState(sorted[0]?.date ?? '');
    const day = sorted.find(d => d.date === activeDate) ?? sorted[0];

    if (!day) {
        return <p className="text-xs text-slate-400">El torneo no tiene días configurados.</p>;
    }

    const change = (ranges: DaySchedule[]) => {
        if (!readOnly) onChange?.(ranges);
    };

    return (
        <div className="space-y-3">
            <div role="tablist" className="flex gap-1.5">
                {sorted.map(d => {
                    const count = rangesOfDay(value, d.date).length;
                    const active = d.date === day.date;
                    return (
                        <button
                            key={d.date}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveDate(d.date)}
                            className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold border transition ${
                                active
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {dayLabel(d.date)}{count > 0 ? ` · ${count}` : ''}
                        </button>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => change(blockWholeDay(value, day))}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-rose-500/60"
                    >
                        No podemos en todo el día
                    </button>
                    <button
                        type="button"
                        onClick={() => change(clearDay(value, day))}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-emerald-500/60"
                    >
                        Borrar este día
                    </button>
                </div>
            )}

            <div className="space-y-1">
                {daySlots(day).map(slot => {
                    const blocked = isSlotBlocked(value, day.date, slot);
                    const label = `${slot.start}–${slot.end}`;
                    return (
                        <button
                            key={slot.start}
                            type="button"
                            aria-label={label}
                            aria-pressed={blocked}
                            disabled={readOnly}
                            onClick={() => change(toggleSlot(value, day, slot))}
                            className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                        >
                            <span className="w-24 shrink-0 text-[11px] font-mono text-slate-400">{label}</span>
                            <span className={`h-6 flex-1 rounded-lg border text-[10px] font-bold leading-6 px-2 ${
                                blocked
                                    ? 'bg-rose-500/30 border-rose-500/60 text-rose-200'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300/60'
                            }`}>
                                {blocked ? 'No podemos' : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
