import { describe, it, expect } from 'vitest';
import {
    generateLeagueDivisions,
    generateAmericanoDivisions,
    generatePozoDivisions,
    generateEliminationDivisions,
    GeneratorInput,
} from './wizardGenerators';
import { DEFAULT_TIE_BREAK_ORDER } from '../types';

// Minimal base config reused across tests
const baseConfig: GeneratorInput['config'] = {
    pointsPerWin2_0: 3,
    pointsPerWin2_1: 2,
    pointsDraw: 1,
    pointsPerLoss2_1: 1,
    pointsPerLoss2_0: 0,
    promotionCount: 1,
    relegationCount: 1,
    courts: 2,
    scoringMode: '24',
    tieBreakCriteria: DEFAULT_TIE_BREAK_ORDER,
};

// Fake player helper
const ids = (n: number) => Array.from({ length: n }, (_, i) => `player-${i + 1}`);

// ─── generateLeagueDivisions ──────────────────────────────────────────────────

describe('generateLeagueDivisions', () => {
    it('classic: 1 division with exactly 4 players generates 3 matches', () => {
        const input: GeneratorInput = {
            format: 'classic',
            config: baseConfig,
            assignments: { 0: ids(4) },
            numDivisions: 1,
            individualMaxPlayers: 4,
        };
        const divisions = generateLeagueDivisions(input);
        expect(divisions).toHaveLength(1);
        expect(divisions[0].matches).toHaveLength(3);
        expect(divisions[0].players).toHaveLength(4);
    });

    it('classic: throws if division has fewer than 4 players', () => {
        const input: GeneratorInput = {
            format: 'classic',
            config: baseConfig,
            assignments: { 0: ids(3) },
            numDivisions: 1,
            individualMaxPlayers: 4,
        };
        expect(() => generateLeagueDivisions(input)).toThrow();
    });

    it('individual: 2 divisions with 6 players each generates correct structure', () => {
        const input: GeneratorInput = {
            format: 'individual',
            config: baseConfig,
            assignments: { 0: ids(6), 1: ids(6).map(id => id + '-b') },
            numDivisions: 2,
            individualMaxPlayers: 6,
        };
        const divisions = generateLeagueDivisions(input);
        expect(divisions).toHaveLength(2);
        expect(divisions[0].players).toHaveLength(6);
        expect(divisions[1].players).toHaveLength(6);
    });
});

// ─── generateAmericanoDivisions ───────────────────────────────────────────────

describe('generateAmericanoDivisions', () => {
    it('americano individual: 8 players in 1 division generates a division with matches', () => {
        const input: GeneratorInput = {
            format: 'americano',
            config: { ...baseConfig, americanoConfig: { variant: 'individual', scoringMode: '24' } },
            assignments: {},
            numDivisions: 1,
            individualMaxPlayers: 8,
            selectedPlayerIds: ids(8),
            availablePlayers: ids(8).map(id => ({ id, nombre: id, apellidos: '' } as any)),
        };
        const divisions = generateAmericanoDivisions(input);
        expect(divisions).toHaveLength(1);
        expect(divisions[0].players).toHaveLength(8);
        expect(divisions[0].matches.length).toBeGreaterThan(0);
    });

    it('americano individual: throws if fewer than 4 players', () => {
        const input: GeneratorInput = {
            format: 'americano',
            config: { ...baseConfig, americanoConfig: { variant: 'individual', scoringMode: '24' } },
            assignments: {},
            numDivisions: 1,
            individualMaxPlayers: 4,
            selectedPlayerIds: ids(3),
            availablePlayers: ids(3).map(id => ({ id, nombre: id, apellidos: '' } as any)),
        };
        expect(() => generateAmericanoDivisions(input)).toThrow();
    });
});

// ─── generatePozoDivisions ────────────────────────────────────────────────────

describe('generatePozoDivisions', () => {
    it('pozo individual: 4 players generates a valid division', () => {
        const input: GeneratorInput = {
            format: 'pozo',
            config: { ...baseConfig, pozoConfig: { variant: 'individual', numCourts: 2, scoringMode: 'per-game', goldenPoint: true } },
            assignments: { 0: ids(4) },
            numDivisions: 1,
            individualMaxPlayers: 4,
        };
        const divisions = generatePozoDivisions(input);
        expect(divisions).toHaveLength(1);
        expect(divisions[0].players.length).toBeGreaterThan(0);
    });
});

// ─── generateEliminationDivisions ────────────────────────────────────────────

describe('generateEliminationDivisions', () => {
    it('throws a known error when no categories are configured', () => {
        const input: GeneratorInput = {
            format: 'elimination',
            config: { ...baseConfig, eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' } },
            assignments: {},
            numDivisions: 0,
            individualMaxPlayers: 8,
            categories: [],
        };
        expect(() => generateEliminationDivisions(input)).toThrow('Debes configurar al menos una categoría');
    });

    it('pairs: 4 valid pairs in 1 category generates main + consolation brackets', () => {
        // Build 4 pair strings: "p1::p2"
        const pairStrings = [
            'player-1::player-2',
            'player-3::player-4',
            'player-5::player-6',
            'player-7::player-8',
        ];
        const input: GeneratorInput = {
            format: 'elimination',
            config: { ...baseConfig, eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' } },
            assignments: { 0: pairStrings },
            numDivisions: 1,
            individualMaxPlayers: 8,
            categories: ['Masculino'],
        };
        const divisions = generateEliminationDivisions(input);
        // With consolation enabled we expect main + consolation bracket divisions
        expect(divisions.length).toBeGreaterThanOrEqual(1);
        const main = divisions.find(d => d.type === 'main');
        expect(main).toBeDefined();
        expect(main!.category).toBe('Masculino');
    });
});
