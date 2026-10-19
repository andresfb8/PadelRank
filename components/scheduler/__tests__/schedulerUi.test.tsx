import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Match, Ranking } from '../../../types';
import { ScheduleStatusBadges } from '../ScheduleStatusBadges';
import { ScheduleConflictsModal, getConflictMatches } from '../ScheduleConflictsModal';
import { GenerateScheduleModal } from '../GenerateScheduleModal';
import { pairLabel } from '../pairLabel';

const match = (overrides: Partial<Match> = {}): Match => ({
    id: 'm1', jornada: 1, roundName: 'Cuartos',
    pair1: { p1Id: 'a', p2Id: 'b' }, pair2: { p1Id: 'c', p2Id: 'd' },
    points: { p1: 0, p2: 0 }, status: 'pendiente',
    startTime: new Date(2026, 5, 6, 17, 0).toISOString(), court: 1,
    ...overrides,
});

const ranking = (matches: Match[]): Ranking => ({
    id: 'r', nombre: 'T', categoria: 'Masculino', fechaInicio: '', status: 'activo', format: 'elimination',
    divisions: [{ id: 'd', numero: 1, status: 'activa', players: [], matches, category: '1ª Masc' }],
    schedulerConfig: { courts: 2, slotDurationMinutes: 90, restMinutes: 60, timeWindows: [] },
});

const players = {
    a: { id: 'a', nombre: 'Ana', apellidos: 'García' },
    b: { id: 'b', nombre: 'Bea', apellidos: 'López' },
} as any;

describe('scheduler UI', () => {
    it('ScheduleStatusBadges shows the estimated label and the conflict reasons', () => {
        const m = match({ scheduleEstimated: true, scheduleConflict: [{ pairKey: 'a::b', reason: 'No disponible sáb 17:00–19:00' }] });
        const { container } = render(<ScheduleStatusBadges match={m} ranking={ranking([m])} showConflicts />);
        expect(screen.getByText('· estimado')).toBeInTheDocument();
        expect(container.querySelector('[title="No disponible sáb 17:00–19:00"]')).not.toBeNull();
    });

    it('ScheduleStatusBadges hides conflicts from non-admins', () => {
        const m = match({ scheduleConflict: [{ pairKey: 'a::b', reason: 'X' }] });
        const { container } = render(<ScheduleStatusBadges match={m} ranking={ranking([m])} showConflicts={false} />);
        expect(container.querySelector('[title="X"]')).toBeNull();
    });

    it('ScheduleStatusBadges shows nothing for a played match', () => {
        const m = match({ status: 'finalizado', scheduleEstimated: true, scheduleConflict: [{ pairKey: 'a::b', reason: 'X' }] });
        const { container } = render(<ScheduleStatusBadges match={m} ranking={ranking([m])} showConflicts />);
        expect(container.innerHTML).toBe('');
    });

    it('pairLabel omits the initial when there is no surname', () => {
        expect(pairLabel('a::z', { ...players, z: { id: 'z', nombre: 'Zoe', apellidos: '' } })).toBe('Ana G. / Zoe');
    });

    it('ScheduleConflictsModal lists conflicts with pair names and opens the move dialog', () => {
        const m = match({ scheduleConflict: [{ pairKey: 'a::b', reason: 'No disponible sáb 17:00–19:00' }] });
        const r = ranking([m, match({ id: 'm2' })]);
        expect(getConflictMatches(r)).toHaveLength(1);
        const onMove = vi.fn();
        render(<ScheduleConflictsModal isOpen onClose={() => {}} ranking={r} players={players} onMove={onMove} />);
        expect(screen.getByText('Ana G. / Bea L.: No disponible sáb 17:00–19:00')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Mover'));
        expect(onMove).toHaveBeenCalledWith(m);
    });

    it('GenerateScheduleModal shows warnings and generates on confirm', () => {
        const onGenerate = vi.fn();
        render(<GenerateScheduleModal isOpen onClose={() => {}} warnings={[{ message: 'Semifinales no cabe' }]}
            hasLocked={false} onGenerate={onGenerate} onConfigure={() => {}} />);
        expect(screen.getByText('Semifinales no cabe')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Generar igualmente'));
        expect(onGenerate).toHaveBeenCalledWith(false);
    });
});
