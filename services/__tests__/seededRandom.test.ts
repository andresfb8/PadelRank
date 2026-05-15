import { describe, it, expect } from 'vitest';
import { seededShuffle, mulberry32 } from '../seededRandom';

describe('seededRandom', () => {
    it('mulberry32 produces deterministic sequence for same seed', () => {
        const rng1 = mulberry32(42);
        const rng2 = mulberry32(42);
        const seq1 = [rng1(), rng1(), rng1()];
        const seq2 = [rng2(), rng2(), rng2()];
        expect(seq1).toEqual(seq2);
    });

    it('mulberry32 produces different sequences for different seeds', () => {
        const rng1 = mulberry32(1);
        const rng2 = mulberry32(2);
        expect(rng1()).not.toEqual(rng2());
    });

    it('seededShuffle returns same order for same seed', () => {
        const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const r1 = seededShuffle(arr, 123);
        const r2 = seededShuffle(arr, 123);
        expect(r1).toEqual(r2);
    });

    it('seededShuffle returns different order for different seeds', () => {
        const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const r1 = seededShuffle(arr, 1);
        const r2 = seededShuffle(arr, 2);
        expect(r1).not.toEqual(r2);
    });

    it('seededShuffle does not mutate the input array', () => {
        const arr = ['a', 'b', 'c', 'd'];
        const original = [...arr];
        seededShuffle(arr, 99);
        expect(arr).toEqual(original);
    });

    it('seededShuffle preserves all elements', () => {
        const arr = ['a', 'b', 'c', 'd', 'e'];
        const result = seededShuffle(arr, 7);
        expect(result.sort()).toEqual([...arr].sort());
    });
});
