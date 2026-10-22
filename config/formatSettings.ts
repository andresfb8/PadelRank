import { Ranking, RankingConfig, RankingFormat, DEFAULT_TIE_BREAK_ORDER } from '../types';

/*
 * What each tournament format has to set. The creation wizard, the settings modal and
 * TV mode all read from here, so a format never shows or stores another format's settings.
 */

export type TVSlideKind = 'standings' | 'matches' | 'brackets' | 'schedule';

export interface FormatSettings {
    label: string;
    /** Singular, plural, and whether the word is feminine */
    unit: [string, string, boolean?];
    /** sets: points per result (2-0, 2-1…); points: points per match (16, 24, 32…); none: nothing to score */
    scoring: 'sets' | 'points' | 'none';
    /** The format's own settings tab */
    advance: 'promotion' | 'playoff' | 'brackets' | 'rotation' | null;
    /** Promotions only make sense with this many divisions or more */
    promotionMinDivisions?: number;
    /** Optional columns in the standings table */
    columns: 'all' | 'lostOnly' | 'none';
    /** Whether the format is played in sets, so golden point is worth telling players */
    goldenPoint: boolean | ((config: RankingConfig) => boolean);
    /** TV slides this format can show, one switch each in the settings */
    tvSlides: TVSlideKind[];
    /** Config the wizard starts from: only this format's settings */
    defaults: () => RankingConfig;
}

const points = (w20: number, w21: number, draw: number, l21: number, l20: number) => ({
    pointsPerWin2_0: w20, pointsPerWin2_1: w21, pointsDraw: draw, pointsPerLoss2_1: l21, pointsPerLoss2_0: l20,
});

const LEAGUE_TV: TVSlideKind[] = ['standings', 'matches'];

export const FORMAT_SETTINGS: Record<RankingFormat, FormatSettings> = {
    classic: {
        label: 'Liga clásica', unit: ['División', 'Divisiones', true], scoring: 'sets',
        advance: 'promotion', promotionMinDivisions: 1, columns: 'all', goldenPoint: true, tvSlides: LEAGUE_TV,
        // CPSJ scoring: 4 for 2-0, 3 for 2-1, 2 for a draw, 1 for 1-2, 0 for 0-2
        defaults: () => ({ ...points(4, 3, 2, 1, 0), promotionCount: 2, relegationCount: 2, courts: 2 }),
    },
    individual: {
        label: 'Liga individual', unit: ['División', 'Divisiones', true], scoring: 'sets',
        advance: 'promotion', promotionMinDivisions: 2, columns: 'all', goldenPoint: true, tvSlides: LEAGUE_TV,
        defaults: () => ({ ...points(4, 3, 2, 1, 0), promotionCount: 2, relegationCount: 2, courts: 2 }),
    },
    pairs: {
        label: 'Liga por parejas', unit: ['División', 'Divisiones', true], scoring: 'sets',
        advance: 'promotion', promotionMinDivisions: 2, columns: 'all', goldenPoint: true, tvSlides: LEAGUE_TV,
        defaults: () => ({ ...points(3, 2, 1, 1, 0), promotionCount: 0, relegationCount: 0, courts: 2 }),
    },
    americano: {
        label: 'Americano', unit: ['Grupo', 'Grupos'], scoring: 'points',
        advance: null, columns: 'lostOnly', goldenPoint: false, tvSlides: LEAGUE_TV,
        defaults: () => ({ scoringMode: '24', courts: 2 }),
    },
    mexicano: {
        label: 'Mexicano', unit: ['Grupo', 'Grupos'], scoring: 'points',
        advance: null, columns: 'lostOnly', goldenPoint: false, tvSlides: LEAGUE_TV,
        defaults: () => ({ scoringMode: '24', courts: 2 }),
    },
    elimination: {
        label: 'Eliminatoria', unit: ['Categoría', 'Categorías', true], scoring: 'none',
        advance: 'brackets', columns: 'none', goldenPoint: true, tvSlides: ['brackets', 'schedule'],
        defaults: () => ({ courts: 2, eliminationConfig: { consolation: true, thirdPlaceMatch: false, type: 'pairs' } }),
    },
    hybrid: {
        label: 'Liga + playoff', unit: ['Grupo', 'Grupos'], scoring: 'sets',
        advance: 'playoff', columns: 'all', goldenPoint: true, tvSlides: ['standings', 'matches', 'brackets'],
        defaults: () => ({ ...points(3, 2, 1, 1, 0), courts: 2, hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0 } }),
    },
    pozo: {
        label: 'Pozo', unit: ['Pista', 'Pistas', true], scoring: 'none',
        advance: 'rotation', columns: 'lostOnly',
        goldenPoint: (c) => (c.pozoConfig?.scoringMode ?? c.scoringMode ?? 'per-game') === 'per-game',
        tvSlides: LEAGUE_TV,
        defaults: () => ({ scoringMode: 'per-game', pozoConfig: { variant: 'individual', numCourts: 2, scoringMode: 'per-game' } }),
    },
};

export const getFormatSettings = (format?: RankingFormat): FormatSettings => FORMAT_SETTINGS[format || 'classic'];

/** Golden point setting applies to this format with this config */
export const goldenPointApplies = (format: RankingFormat | undefined, config: RankingConfig = {}): boolean => {
    const g = getFormatSettings(format).goldenPoint;
    return typeof g === 'function' ? g(config) : g;
};

/** Promotions and relegations mean something for this tournament (its format has them, with enough divisions) */
export const promotionApplies = (ranking: Pick<Ranking, 'format' | 'divisions'>): boolean => {
    const fs = getFormatSettings(ranking.format);
    return fs.advance === 'promotion' && (ranking.divisions?.length ?? 0) >= (fs.promotionMinDivisions ?? 1);
};

/** The tournament is played with golden point (tournaments made before 2026-10 kept it in pozoConfig) */
export const hasGoldenPoint = (ranking: Pick<Ranking, 'format' | 'config'>): boolean => {
    const config = ranking.config || {};
    return goldenPointApplies(ranking.format, config) && !!(config.goldenPoint ?? config.pozoConfig?.goldenPoint);
};

/** Wizard config after choosing a format: that format's defaults, keeping only what every format shares */
export const configForFormat = (format: RankingFormat, prev: RankingConfig): RankingConfig => ({
    ...getFormatSettings(format).defaults(),
    branding: prev.branding,
    tieBreakCriteria: DEFAULT_TIE_BREAK_ORDER,
    ...(prev.goldenPoint !== undefined && goldenPointApplies(format, getFormatSettings(format).defaults()) ? { goldenPoint: prev.goldenPoint } : {}),
});
