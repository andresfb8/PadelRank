import { describe, it, expect } from 'vitest';
import { StandingRow } from '../../types';
import {
    nextPowerOf2,
    computeBracketSize,
    selectByCrossGroupPosition,
} from '../crossGroupQualifiers';

const row = (id: string, pos: number, pts: number, setsDiff = 0, gamesDiff = 0): StandingRow => ({
    playerId: id,
    pos,
    pj: 3,
    pg: 0,
    pp: 0,
    pts,
    setsWon: 0,
    setsLost: 0,
    setsDiff,
    gamesWon: 0,
    gamesLost: 0,
    gamesDiff,
    winRate: 0,
});

describe('nextPowerOf2', () => {
    it('returns 2 for n ≤ 2', () => {
        expect(nextPowerOf2(0)).toBe(2);
        expect(nextPowerOf2(1)).toBe(2);
        expect(nextPowerOf2(2)).toBe(2);
    });
    it('rounds up to next power of 2', () => {
        expect(nextPowerOf2(3)).toBe(4);
        expect(nextPowerOf2(5)).toBe(8);
        expect(nextPowerOf2(8)).toBe(8);
        expect(nextPowerOf2(9)).toBe(16);
        expect(nextPowerOf2(17)).toBe(32);
    });
});

describe('computeBracketSize', () => {
    it('uses configured size when provided', () => {
        expect(computeBracketSize(8, 2, 3)).toBe(8);
        expect(computeBracketSize(4, 2, 4)).toBe(4);
    });
    it('falls back to next power of 2 when undefined', () => {
        expect(computeBracketSize(undefined, 2, 3)).toBe(8); // 6 → 8
        expect(computeBracketSize(undefined, 2, 4)).toBe(8); // 8 → 8
        expect(computeBracketSize(undefined, 2, 5)).toBe(16); // 10 → 16
    });
});

describe('selectByCrossGroupPosition', () => {
    it('takes top of each group first, then next position cross-group', () => {
        // 3 groups, 4 pairs each. Bracket size = 8.
        // Position 1: A1 (10pts), B1 (9pts), C1 (8pts) → all 3 pass
        // Position 2: A2 (7pts), B2 (6pts), C2 (5pts) → all 3 pass
        // Position 3: A3 (4pts), B3 (3pts), C3 (2pts) → only 2 best pass
        const groupA = [row('A1', 1, 10), row('A2', 2, 7), row('A3', 3, 4), row('A4', 4, 1)];
        const groupB = [row('B1', 1, 9), row('B2', 2, 6), row('B3', 3, 3), row('B4', 4, 0)];
        const groupC = [row('C1', 1, 8), row('C2', 2, 5), row('C3', 3, 2), row('C4', 4, 0)];
        const result = selectByCrossGroupPosition([groupA, groupB, groupC], 8);
        expect(result.length).toBe(8);
        // Top of each group always present
        expect(result).toContain('A1');
        expect(result).toContain('B1');
        expect(result).toContain('C1');
        // 2nds also present
        expect(result).toContain('A2');
        expect(result).toContain('B2');
        expect(result).toContain('C2');
        // Best 2 thirds: A3 (4pts) and B3 (3pts) — C3 (2pts) excluded
        expect(result).toContain('A3');
        expect(result).toContain('B3');
        expect(result).not.toContain('C3');
        expect(result).not.toContain('A4');
    });

    it('respects excludeIds (used for consolation after main)', () => {
        const groupA = [row('A1', 1, 10), row('A2', 2, 5)];
        const groupB = [row('B1', 1, 9), row('B2', 2, 4)];
        const main = new Set(['A1', 'B1']);
        const consolation = selectByCrossGroupPosition([groupA, groupB], 2, main);
        expect(consolation.length).toBe(2);
        expect(consolation).toContain('A2');
        expect(consolation).toContain('B2');
    });

    it('breaks ties by setsDiff then gamesDiff', () => {
        // Two pairs at position 2 with same points: B2 (setsDiff=3) beats A2 (setsDiff=1)
        const groupA = [row('A1', 1, 10), row('A2', 2, 5, 1, 5)];
        const groupB = [row('B1', 1, 9), row('B2', 2, 5, 3, 2)];
        const groupC = [row('C1', 1, 8), row('C2', 2, 1)];
        // Bracket size 4 → top 3 firsts + 1 best second
        const result = selectByCrossGroupPosition([groupA, groupB, groupC], 4);
        expect(result.length).toBe(4);
        expect(result).toContain('A1');
        expect(result).toContain('B1');
        expect(result).toContain('C1');
        expect(result).toContain('B2'); // wins tie-break on setsDiff
        expect(result).not.toContain('A2');
    });

    it('handles bracket size larger than total pairs available', () => {
        const groupA = [row('A1', 1, 10), row('A2', 2, 5)];
        const groupB = [row('B1', 1, 9), row('B2', 2, 4)];
        const result = selectByCrossGroupPosition([groupA, groupB], 16);
        expect(result.length).toBe(4); // can't exceed total
    });

    it('returns empty when size is 0', () => {
        const groupA = [row('A1', 1, 10)];
        expect(selectByCrossGroupPosition([groupA], 0)).toEqual([]);
    });
});
