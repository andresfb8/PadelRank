import { describe, it, expect } from 'vitest';
import { generatePairingCode, normalizePairingCode, isValidPairingCode, formatPairingCode, CODE_ALPHABET, CODE_LENGTH } from '../pairingCode';

describe('pairing codes', () => {
    it('are 6 characters from an alphabet without look-alikes', () => {
        const code = generatePairingCode();
        expect(code).toHaveLength(CODE_LENGTH);
        expect([...code].every(c => CODE_ALPHABET.includes(c))).toBe(true);
        expect(CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    });

    it('uses the given random source', () => {
        expect(generatePairingCode(() => 0)).toBe(CODE_ALPHABET[0].repeat(6));
    });

    it('accepts what people type', () => {
        expect(normalizePairingCode(' ab3-k9q ')).toBe('AB3K9Q');
        expect(isValidPairingCode('AB3K9Q')).toBe(true);
        expect(isValidPairingCode('AB3K9')).toBe(false);
        expect(isValidPairingCode('AB3K90')).toBe(false); // 0 is not in the alphabet
    });

    it('is shown in two halves', () => {
        expect(formatPairingCode('AB3K9Q')).toBe('AB3 K9Q');
    });
});
