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
    /** 'dark' for the admin modals, 'light' for the public registration page */
    tone?: 'dark' | 'light';
}

const TONES = {
    dark: {
        empty: 'text-xs text-slate-400',
        tabOn: 'bg-emerald-500/20 border-emerald-500 text-emerald-300',
        tabOff: 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200',
        tab: 'flex-1 rounded-xl px-2 py-2 text-xs font-bold border transition',
        action: 'flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300',
        label: 'w-24 shrink-0 text-[11px] font-mono text-slate-400',
        slot: 'h-6 flex-1 rounded-lg border text-[10px] font-bold leading-6 px-2',
        slotOn: 'bg-rose-500/30 border-rose-500/60 text-rose-200',
        slotOff: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300/60',
        rows: 'space-y-1',
    },
    light: {
        empty: 'text-sm text-rg-muted',
        tabOn: 'bg-rg-ink border-rg-ink text-white',
        tabOff: 'bg-white border-rg-line text-rg-muted',
        tab: 'flex-1 h-10 rounded-full px-2 text-[13px] font-medium border transition-colors num',
        action: 'flex-1 min-h-10 py-1.5 leading-tight rounded-lg border border-rg-control bg-white px-2 text-[13px] font-medium text-rg-ink active:bg-rg-raised',
        label: 'w-28 shrink-0 text-[13px] text-rg-muted num',
        slot: 'h-9 flex-1 rounded-lg border text-[13px] font-medium leading-9 px-3 transition-colors',
        slotOn: 'bg-[#ffedea] border-[#f5c2bd] text-[#831c1e]',
        slotOff: 'bg-white border-rg-line text-transparent',
        rows: 'space-y-1.5',
    },
};

/** "When can you NOT play?": one tab per tournament day, one row per half hour. */
export const BlockedTimesPicker: React.FC<Props> = ({ days, value, onChange, readOnly = false, tone = 'dark' }) => {
    const t = TONES[tone];
    const sorted = sortDays(days);
    const [activeDate, setActiveDate] = useState(sorted[0]?.date ?? '');
    const day = sorted.find(d => d.date === activeDate) ?? sorted[0];

    if (!day) {
        return <p className={t.empty}>El torneo no tiene días configurados.</p>;
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
                            className={`${t.tab} ${active ? t.tabOn : t.tabOff}`}
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
                        className={`${t.action} ${tone === 'dark' ? 'hover:border-rose-500/60' : ''}`}
                    >
                        No podemos en todo el día
                    </button>
                    <button
                        type="button"
                        onClick={() => change(clearDay(value, day))}
                        className={`${t.action} ${tone === 'dark' ? 'hover:border-emerald-500/60' : ''}`}
                    >
                        Borrar este día
                    </button>
                </div>
            )}

            <div className={t.rows}>
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
                            <span className={t.label}>{label}</span>
                            <span className={`${t.slot} ${blocked ? t.slotOn : t.slotOff}`}>
                                {blocked ? 'No podemos' : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
