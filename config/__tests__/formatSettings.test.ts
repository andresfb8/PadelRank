import { describe, it, expect } from 'vitest';
import { FORMAT_SETTINGS, getFormatSettings, configForFormat, hasGoldenPoint } from '../formatSettings';
import { RankingFormat, DEFAULT_TIE_BREAK_ORDER } from '../../types';

const FORMATS: RankingFormat[] = ['classic', 'individual', 'pairs', 'americano', 'mexicano', 'elimination', 'hybrid', 'pozo'];
const OWN_KEY: Partial<Record<RankingFormat, string>> = { elimination: 'eliminationConfig', hybrid: 'hybridConfig', pozo: 'pozoConfig' };

describe('FORMAT_SETTINGS', () => {
    it('describes every format', () => {
        FORMATS.forEach(f => expect(FORMAT_SETTINGS[f].label).toBeTruthy());
        expect(getFormatSettings(undefined)).toBe(FORMAT_SETTINGS.classic);
    });

    it('each format starts with only its own namespaced config', () => {
        FORMATS.forEach(f => {
            const d = FORMAT_SETTINGS[f].defaults();
            Object.entries(OWN_KEY).forEach(([owner, key]) => {
                if (owner === f) expect(d).toHaveProperty(key!);
                else expect(d).not.toHaveProperty(key!);
            });
        });
    });

    it('only point-based formats carry a points-per-match mode', () => {
        FORMATS.forEach(f => {
            const d = FORMAT_SETTINGS[f].defaults();
            if (f === 'americano' || f === 'mexicano' || f === 'pozo') expect(d.scoringMode).toBeDefined();
            else expect(d.scoringMode).toBeUndefined();
        });
    });

    it('promotions only exist in leagues', () => {
        FORMATS.forEach(f => {
            const isLeague = f === 'classic' || f === 'individual' || f === 'pairs';
            expect(FORMAT_SETTINGS[f].advance === 'promotion').toBe(isLeague);
        });
        expect(FORMAT_SETTINGS.classic.promotionMinDivisions).toBe(1);
        expect(FORMAT_SETTINGS.individual.promotionMinDivisions).toBe(2);
        expect(FORMAT_SETTINGS.pairs.promotionMinDivisions).toBe(2);
    });

    it('TV switches follow what each format shows', () => {
        expect(FORMAT_SETTINGS.elimination.tvSlides).toEqual(['brackets', 'schedule']);
        expect(FORMAT_SETTINGS.hybrid.tvSlides).toEqual(['standings', 'matches', 'brackets']);
        expect(FORMAT_SETTINGS.classic.tvSlides).toEqual(['standings', 'matches']);
    });
});

describe('configForFormat', () => {
    it('drops everything from the previous format, keeps the logo', () => {
        const fromPozo = configForFormat('pozo', { branding: { logoUrl: 'logo.png' } });
        const classic = configForFormat('classic', fromPozo);
        expect(classic).not.toHaveProperty('pozoConfig');
        expect(classic.scoringMode).toBeUndefined();
        expect(classic.branding?.logoUrl).toBe('logo.png');
        expect(classic.pointsPerWin2_0).toBe(4);
        expect(classic.tieBreakCriteria).toEqual(DEFAULT_TIE_BREAK_ORDER);
    });

    it('resets points when moving between leagues', () => {
        const pairs = configForFormat('pairs', configForFormat('classic', {}));
        expect(pairs.pointsPerWin2_0).toBe(3);
        expect(configForFormat('individual', pairs).pointsPerWin2_0).toBe(4);
    });
});

describe('hasGoldenPoint', () => {
    it('is off unless the tournament says so', () => {
        expect(hasGoldenPoint({ format: 'classic', config: {} })).toBe(false);
        expect(hasGoldenPoint({ format: 'classic', config: { goldenPoint: true } })).toBe(true);
    });
    it('never applies to americano or mexicano', () => {
        expect(hasGoldenPoint({ format: 'americano', config: { goldenPoint: true } })).toBe(false);
    });
    it('pozo: only when played by games, and reads the old field', () => {
        expect(hasGoldenPoint({ format: 'pozo', config: { scoringMode: 'per-game', pozoConfig: { variant: 'individual', numCourts: 2, scoringMode: 'per-game', goldenPoint: true } } })).toBe(true);
        expect(hasGoldenPoint({ format: 'pozo', config: { scoringMode: '24', goldenPoint: true } })).toBe(false);
    });
});
