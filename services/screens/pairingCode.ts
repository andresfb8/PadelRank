// Codes a TV shows so the club can pair it. No 0/O, 1/I/L: they look alike on a TV across the room.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000;

const cryptoRandom = () => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
};

export const generatePairingCode = (random: () => number = cryptoRandom) =>
    Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');

export const normalizePairingCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidPairingCode = (code: string) =>
    code.length === CODE_LENGTH && [...code].every(c => CODE_ALPHABET.includes(c));

export const formatPairingCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
