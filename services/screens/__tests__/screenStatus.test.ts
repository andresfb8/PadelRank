import { describe, it, expect } from 'vitest';
import { screenStatus } from '../screenStatus';

const NOW = 1_800_000_000_000;
const min = 60_000;

describe('screenStatus', () => {
    it('is connected with a recent signal', () => {
        expect(screenStatus(NOW - 3 * min, NOW)).toEqual({ online: true, label: 'Conectada' });
    });
    it('says how long it has been silent', () => {
        expect(screenStatus(NOW - 25 * min, NOW).label).toBe('Sin señal desde hace 25 min');
        expect(screenStatus(NOW - 3 * 60 * min, NOW).label).toBe('Sin señal desde hace 3 h');
        expect(screenStatus(NOW - 24 * 60 * min, NOW).label).toBe('Sin señal desde hace 1 día');
        expect(screenStatus(NOW - 3 * 24 * 60 * min, NOW).label).toBe('Sin señal desde hace 3 días');
        expect(screenStatus(NOW - 25 * min, NOW).online).toBe(false);
    });
});
