import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DaySchedule } from '../../../services/scheduler/types';
import { BlockedTimesPicker } from '../BlockedTimesPicker';

const FRI: DaySchedule = { date: '2026-10-23', startTime: '17:00', endTime: '22:00' };
const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const DAYS = [SAT, FRI]; // unsorted on purpose

describe('BlockedTimesPicker', () => {
    it('shows one tab per day in date order, with the number of blocked ranges', () => {
        render(<BlockedTimesPicker days={DAYS} value={[{ date: SAT.date, startTime: '09:00', endTime: '10:00' }, { date: SAT.date, startTime: '21:00', endTime: '22:00' }]} />);
        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['vie 23', 'sáb 24 · 2']);
        expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('switching tabs shows that day rows', () => {
        render(<BlockedTimesPicker days={DAYS} value={[]} />);
        expect(screen.getByRole('button', { name: '17:00–17:30' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /sáb 24/ }));
        expect(screen.getByRole('button', { name: '09:00–09:30' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /–/ })).toHaveLength(26); // 09:00–22:00
    });

    it('clicking a row emits merged ranges', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[{ date: FRI.date, startTime: '17:00', endTime: '17:30' }]} onChange={onChange} />);
        expect(screen.getByRole('button', { name: '17:00–17:30' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '17:30–18:00' }));
        expect(onChange).toHaveBeenCalledWith([{ date: FRI.date, startTime: '17:00', endTime: '18:00' }]);
    });

    it('whole-day and clear-day shortcuts', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[{ date: FRI.date, startTime: '18:00', endTime: '19:00' }]} onChange={onChange} />);
        fireEvent.click(screen.getByRole('button', { name: 'No podemos en todo el día' }));
        expect(onChange).toHaveBeenLastCalledWith([{ date: FRI.date, startTime: '17:00', endTime: '22:00' }]);
        fireEvent.click(screen.getByRole('button', { name: 'Borrar este día' }));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('read-only: no shortcuts and rows do nothing', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[]} onChange={onChange} readOnly />);
        expect(screen.queryByRole('button', { name: 'No podemos en todo el día' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '17:00–17:30' }));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('without days it says so', () => {
        render(<BlockedTimesPicker days={[]} value={[]} />);
        expect(screen.getByText('El torneo no tiene días configurados.')).toBeInTheDocument();
    });
});
