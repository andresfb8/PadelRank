import { describe, it, expect } from 'vitest';
import { buildSlides } from '../buildSlides';
import { Ranking, TVConfig } from '../../../types';

const tv = (patch: Partial<TVConfig> = {}): TVConfig => ({ enabled: true, slideDuration: 15, showStandings: true, showMatches: true, showQR: false, showSponsors: false, ...patch });
const div = (id: string, extra: any = {}) => ({ id, numero: 1, name: `D ${id}`, status: 'activa', players: [], matches: [], ...extra });
const ranking = (patch: Partial<Ranking>): Ranking => ({ id: 'r', nombre: 'T', categoria: 'Mixto', fechaInicio: '2026-10-22', status: 'activo', divisions: [], ...patch } as Ranking);
const kinds = (r: Ranking, c: TVConfig) => buildSlides(r, c).map(s => s.type);

describe('buildSlides', () => {
    it('league: standings and matches per division, honouring the switches', () => {
        const r = ranking({ format: 'classic', divisions: [div('a'), div('b')] as any });
        expect(kinds(r, tv())).toEqual(['standings', 'standings', 'matches', 'matches']);
        expect(kinds(r, tv({ showMatches: false }))).toEqual(['standings', 'standings']);
    });

    it('elimination: brackets and schedule, each with its own switch', () => {
        const r = ranking({ format: 'elimination', divisions: [div('a')] as any });
        expect(kinds(r, tv())).toEqual(['bracket', 'schedule']);
        expect(kinds(r, tv({ showSchedule: false }))).toEqual(['bracket']);
        expect(kinds(r, tv({ showBrackets: false }))).toEqual(['schedule']);
        // standings/matches switches do not apply here
        expect(kinds(r, tv({ showStandings: false, showMatches: false }))).toEqual(['bracket', 'schedule']);
    });

    it('hybrid playoff: brackets only, no schedule', () => {
        const r = ranking({ format: 'hybrid', phase: 'playoff', divisions: [div('p', { stage: 'playoff', type: 'main' })] as any });
        expect(kinds(r, tv())).toEqual(['bracket']);
        expect(kinds(r, tv({ showBrackets: false }))).toEqual([]);
    });

    it('pozo: one overall standings slide, titled as such', () => {
        const r = ranking({ format: 'pozo', divisions: [div('a', { name: undefined })] as any });
        const slides = buildSlides(r, tv());
        expect(slides.map(s => s.type)).toEqual(['standings', 'matches']);
        expect(slides[0].title).toBe('Clasificación general');
        expect(slides[1].title).toBe('Partidos');
    });

    it('QR and sponsors go last', () => {
        const r = ranking({ format: 'classic', divisions: [div('a')] as any });
        expect(kinds(r, tv({ showQR: true, showSponsors: true })).slice(-2)).toEqual(['qr', 'sponsors']);
    });
});
