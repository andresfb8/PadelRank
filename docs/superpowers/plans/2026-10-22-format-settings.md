# Ajustes por formato — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada formato muestra y guarda solo sus propios ajustes en el asistente, en el modal de Ajustes y en el modo TV, y el punto de oro pasa a ser un dato informativo común.

**Architecture:** Un catálogo puro (`config/formatSettings.ts`) describe cada formato: etiqueta, unidad, tipo de puntuación, pestaña propia, columnas, punto de oro, interruptores de TV y config inicial. El asistente, el modal y la TV leen de ahí. La construcción de diapositivas de la TV se extrae a una función pura (`components/tv/buildSlides.ts`) para poder probarla.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (jsdom), Tailwind.

Spec: `docs/superpowers/specs/2026-10-22-format-settings-design.md`

Comando de pruebas (desde `PadelRank/PadelRank`): `npx vitest run <ruta>`

---

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `config/formatSettings.ts` | Crear | Catálogo por formato + `configForFormat` + `hasGoldenPoint` |
| `config/__tests__/formatSettings.test.ts` | Crear | Pruebas del catálogo |
| `types.ts` | Modificar | `RankingConfig.goldenPoint`, `TVConfig.showBrackets/showSchedule` |
| `types/configs/HybridConfig.ts` | Modificar | Puntos opcionales en `HybridConfig` |
| `utils/configHelpers.ts` | Modificar | `getHybridConfig` toma los puntos del nivel superior |
| `utils/__tests__/configHelpers.test.ts` | Crear | Prueba de `getHybridConfig` |
| `components/RankingWizard.tsx` | Modificar | Config inicial y cambio de formato desde el catálogo; interruptor de punto de oro |
| `components/ranking-wizard/PozoConfig.tsx` | Modificar | Quitar el checkbox de punto de oro |
| `components/ranking-wizard/TieBreakConfig.tsx` | Modificar | Etiquetas «puntos» en formatos a puntos |
| `components/RankingSettingsModal.tsx` | Modificar | Leer del catálogo; punto de oro; ascensos según divisiones; interruptores TV por formato |
| `components/tv/buildSlides.ts` | Crear | Lista de diapositivas según formato y `TVConfig` |
| `components/tv/__tests__/buildSlides.test.ts` | Crear | Pruebas de diapositivas |
| `components/tv/TVLayout.tsx` | Modificar | Usar `buildSlides`; punto de oro en el pie |
| `components/tv/slides/StandingsSlide.tsx` | Modificar | Prop `title` opcional |
| `components/RankingView.tsx` | Modificar | «Punto de oro» en las dos cabeceras |

---

### Task 1: Tipos nuevos

**Files:**
- Modify: `types.ts` (interfaces `RankingConfig` y `TVConfig`)
- Modify: `types/configs/HybridConfig.ts`

- [ ] **Step 1: Añadir `goldenPoint` a `RankingConfig`**

En `types.ts`, dentro de `RankingConfig`, justo después de `visibleColumns?: string[];`:

```ts
  /** Golden point at deuce. Informative only: shown to players, never used to score. */
  goldenPoint?: boolean;
```

- [ ] **Step 2: Añadir interruptores de TV**

En `types.ts`, dentro de `TVConfig`, después de `showSponsors: boolean;`:

```ts
  /** Elimination and hybrid playoff: bracket slides. Default true. */
  showBrackets?: boolean;
  /** Elimination: schedule slide. Default true. */
  showSchedule?: boolean;
```

- [ ] **Step 3: Puntos opcionales en `HybridConfig`**

En `types/configs/HybridConfig.ts`, cambia las cinco propiedades de puntos de la interfaz a opcionales
(`pointsPerWin2_0?: number;`, `pointsPerWin2_1?: number;`, `pointsDraw?: number;`, `pointsPerLoss2_1?: number;`, `pointsPerLoss2_0?: number;`)
y añade encima de la primera el comentario:

```ts
    /** @deprecated Points live at the top level of RankingConfig; kept only for tournaments created before 2026-10 */
```

- [ ] **Step 4: Comprobar tipos**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "HybridConfig|useHybridLogic|configHelpers" | head`
Expected: puede haber errores en `useHybridLogic.ts` por puntos `number | undefined`; se arreglan en la Task 2. Ningún otro error nuevo.

- [ ] **Step 5: Commit**

```bash
git add types.ts types/configs/HybridConfig.ts
git commit -m "feat(types): punto de oro informativo e interruptores de cuadros y horarios en TV"
```

---

### Task 2: Liga + playoff con los puntos en un solo sitio

**Files:**
- Modify: `utils/configHelpers.ts` (`getHybridConfig`)
- Test: `utils/__tests__/configHelpers.test.ts`

- [ ] **Step 1: Prueba que falla**

Crea `utils/__tests__/configHelpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getHybridConfig } from '../configHelpers';

describe('getHybridConfig', () => {
    it('takes points from the top level, where results read them', () => {
        const hc = getHybridConfig({
            pointsPerWin2_0: 5, pointsPerWin2_1: 4, pointsDraw: 3, pointsPerLoss2_1: 2, pointsPerLoss2_0: 1,
            hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0, pointsPerWin2_0: 3, pointsPerWin2_1: 2, pointsDraw: 1, pointsPerLoss2_1: 1, pointsPerLoss2_0: 0 },
        });
        expect([hc.pointsPerWin2_0, hc.pointsPerWin2_1, hc.pointsDraw, hc.pointsPerLoss2_1, hc.pointsPerLoss2_0]).toEqual([5, 4, 3, 2, 1]);
        expect(hc.qualifiersPerGroup).toBe(2);
    });

    it('falls back to the old copy inside hybridConfig', () => {
        const hc = getHybridConfig({ hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0, pointsPerWin2_0: 3, pointsPerWin2_1: 2, pointsDraw: 1, pointsPerLoss2_1: 1, pointsPerLoss2_0: 0 } });
        expect(hc.pointsPerWin2_0).toBe(3);
        expect(hc.pointsDraw).toBe(1);
    });

    it('uses defaults when there is nothing', () => {
        expect(getHybridConfig(undefined).pointsPerWin2_0).toBe(4);
    });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run utils/__tests__/configHelpers.test.ts`
Expected: FAIL en el primer test (devuelve 3 en vez de 5).

- [ ] **Step 3: Implementar**

En `utils/configHelpers.ts`, sustituye el cuerpo de `getHybridConfig`:

```ts
export function getHybridConfig(config: RankingConfig | undefined): HybridConfig & Required<Pick<HybridConfig, 'pointsPerWin2_0' | 'pointsPerWin2_1' | 'pointsDraw' | 'pointsPerLoss2_1' | 'pointsPerLoss2_0'>> {
    const hc = { ...DEFAULT_HYBRID_CONFIG, ...(config?.hybridConfig || {}) };
    // Results are scored with the top-level points; the copy inside hybridConfig is only for old tournaments
    return {
        ...hc,
        pointsPerWin2_0: config?.pointsPerWin2_0 ?? hc.pointsPerWin2_0 ?? 4,
        pointsPerWin2_1: config?.pointsPerWin2_1 ?? hc.pointsPerWin2_1 ?? 3,
        pointsDraw: config?.pointsDraw ?? hc.pointsDraw ?? 2,
        pointsPerLoss2_1: config?.pointsPerLoss2_1 ?? hc.pointsPerLoss2_1 ?? 1,
        pointsPerLoss2_0: config?.pointsPerLoss2_0 ?? hc.pointsPerLoss2_0 ?? 0,
    };
}
```

- [ ] **Step 4: Ver que pasa, junto con lo existente**

Run: `npx vitest run utils hooks`
Expected: PASS. `npx tsc --noEmit -p . 2>&1 | grep -E "useHybridLogic|configHelpers"` sin salida.

- [ ] **Step 5: Commit**

```bash
git add utils/configHelpers.ts utils/__tests__/configHelpers.test.ts
git commit -m "fix(hybrid): los puntos se leen del nivel superior del config"
```

---

### Task 3: Catálogo de formatos

**Files:**
- Create: `config/formatSettings.ts`
- Test: `config/__tests__/formatSettings.test.ts`

- [ ] **Step 1: Pruebas que fallan**

Crea `config/__tests__/formatSettings.test.ts`:

```ts
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
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run config/__tests__/formatSettings.test.ts`
Expected: FAIL «Failed to resolve import "../formatSettings"».

- [ ] **Step 3: Implementar**

Crea `config/formatSettings.ts`:

```ts
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
        defaults: () => ({ ...points(4, 3, 2, 1, 0), promotionCount: 2, relegationCount: 2 }),
    },
    individual: {
        label: 'Liga individual', unit: ['División', 'Divisiones', true], scoring: 'sets',
        advance: 'promotion', promotionMinDivisions: 2, columns: 'all', goldenPoint: true, tvSlides: LEAGUE_TV,
        defaults: () => ({ ...points(4, 3, 2, 1, 0), promotionCount: 2, relegationCount: 2 }),
    },
    pairs: {
        label: 'Liga por parejas', unit: ['División', 'Divisiones', true], scoring: 'sets',
        advance: 'promotion', promotionMinDivisions: 2, columns: 'all', goldenPoint: true, tvSlides: LEAGUE_TV,
        defaults: () => ({ ...points(3, 2, 1, 1, 0), promotionCount: 0, relegationCount: 0 }),
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
        defaults: () => ({ ...points(3, 2, 1, 1, 0), hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0 } }),
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
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run config/__tests__/formatSettings.test.ts`
Expected: PASS (todas).

- [ ] **Step 5: Commit**

```bash
git add config/formatSettings.ts config/__tests__/formatSettings.test.ts
git commit -m "feat: catálogo de ajustes por formato"
```

---

### Task 4: Asistente — cada formato guarda solo lo suyo

**Files:**
- Modify: `components/RankingWizard.tsx:52-90` (estado inicial), `:188-273` (cambio de formato), `:316-330` (paso 2)
- Modify: `components/ranking-wizard/PozoConfig.tsx:93-106`

- [ ] **Step 1: Estado inicial desde el catálogo**

En `RankingWizard.tsx` añade el import:

```ts
import { configForFormat, goldenPointApplies } from '../config/formatSettings';
```

Sustituye el `useState<RankingConfig>({ ... })` de las líneas 52-77 por:

```ts
    const [config, setConfig] = useState<RankingConfig>(() =>
        configForFormat('classic', { branding: { logoUrl: currentUser?.branding?.logoUrl } }));
```

- [ ] **Step 2: Cambio de formato**

En el `onClick` de cada tarjeta de formato (líneas 193-265), deja `setFormat`, los cinco `set…` de reinicio de jugadores y el bloque de `setIsOfficial`, y sustituye toda la cadena `if (f.id === 'pairs') { … } else if … pozo { … }` por:

```ts
                                setConfig(prev => configForFormat(f.id as RankingFormat, prev));
                                // How many players or pairs go in each division by default
                                const MAX_PER_DIVISION: Partial<Record<RankingFormat, number>> = { pairs: 6, classic: 4, elimination: 8, hybrid: 4 };
                                if (MAX_PER_DIVISION[f.id as RankingFormat]) setIndividualMaxPlayers(MAX_PER_DIVISION[f.id as RankingFormat]!);
```

(Las llamadas `setNumDivisions(1)` dentro de los `if` ya las cubre el `setNumDivisions(1)` común de la línea 196.)

- [ ] **Step 3: Interruptor común de punto de oro**

En `renderStep2`, justo después del `</label>` del interruptor «Cuenta para las estadísticas» (línea 330), añade:

```tsx
            {goldenPointApplies(format, config) && (
                <label className="flex items-start gap-4 p-4 rounded-lg bg-rg-raised cursor-pointer">
                    <span className="flex-1">
                        <span className="block text-[15px] font-semibold">Se juega con punto de oro</span>
                        <span className="block text-[14px] text-rg-muted mt-0.5">Solo informativo: los jugadores lo verán en la vista pública y en la TV.</span>
                    </span>
                    <input type="checkbox" role="switch" checked={!!config.goldenPoint} onChange={(e) => setConfig(prev => ({ ...prev, goldenPoint: e.target.checked }))} className="sr-only peer" />
                    <span aria-hidden="true" className={`mt-1 w-10 h-6 rounded-full flex-none relative transition-colors ${config.goldenPoint ? 'bg-court' : 'bg-rg-control'} peer-focus-visible:ring-2 peer-focus-visible:ring-court-track`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.goldenPoint ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </span>
                </label>
            )}
```

- [ ] **Step 4: Quitar el checkbox de Pozo**

En `components/ranking-wizard/PozoConfig.tsx` borra el bloque `{config.scoringMode === 'per-game' && ( <div> … Activar Punto de Oro … </div> )}` (líneas 93-106). En el texto de ayuda de la línea 89 cambia `'Sistema tradicional: 6 juegos por set, con o sin punto de oro.'` por `'Sistema tradicional: 6 juegos por set.'`.

- [ ] **Step 5: Tipos y pruebas**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "RankingWizard|PozoConfig" ; npx vitest run`
Expected: sin errores de esos archivos; todas las pruebas PASS.

- [ ] **Step 6: Commit**

```bash
git add components/RankingWizard.tsx components/ranking-wizard/PozoConfig.tsx
git commit -m "feat(wizard): cada formato empieza y guarda solo sus ajustes; punto de oro común"
```

---

### Task 5: Desempates con etiquetas de puntos

**Files:**
- Modify: `components/ranking-wizard/TieBreakConfig.tsx:19-29, 68, 87`

- [ ] **Step 1: Etiquetas por tipo de puntuación**

Debajo de `const LABELS = { … };` añade:

```ts
// Americano and mexicano count points, not games
const POINT_LABELS: Partial<Record<TieBreakCriterion, string>> = {
    gamesDiff: 'Diferencia de puntos',
    gamesWon: 'Puntos a favor',
};
```

Dentro del componente, al principio:

```ts
    const label = (c: TieBreakCriterion) => (pointBased && POINT_LABELS[c]) || LABELS[c];
```

y sustituye los dos `{LABELS[criterion]}` / `{LABELS[c]}` por `{label(criterion)}` y `{label(c)}`.

- [ ] **Step 2: Comprobar**

Run: `npx tsc --noEmit -p . 2>&1 | grep TieBreakConfig`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add components/ranking-wizard/TieBreakConfig.tsx
git commit -m "fix(desempates): americano y mexicano hablan de puntos, no de juegos"
```

---

### Task 6: Diapositivas de la TV como función pura

**Files:**
- Create: `components/tv/buildSlides.ts`
- Test: `components/tv/__tests__/buildSlides.test.ts`

- [ ] **Step 1: Pruebas que fallan**

Crea `components/tv/__tests__/buildSlides.test.ts`:

```ts
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
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run components/tv/__tests__/buildSlides.test.ts`
Expected: FAIL «Failed to resolve import "../buildSlides"».

- [ ] **Step 3: Implementar**

Crea `components/tv/buildSlides.ts` (la lógica de cuadros es la de `TVLayout.tsx:58-106`, movida tal cual):

```ts
import { Ranking, TVConfig } from '../../types';

export type SlideType = 'standings' | 'matches' | 'bracket' | 'schedule' | 'qr' | 'sponsors';

export type Slide = {
    type: SlideType;
    divisionId?: string;
    bracketType?: 'main' | 'consolation';
    title?: string;
};

/** The slides TV mode cycles through, from the tournament's format and its TV switches */
export const buildSlides = (ranking: Ranking, config: TVConfig): Slide[] => {
    const list: Slide[] = [];
    const divisions = ranking.divisions || [];
    const isElimination = ranking.format === 'elimination';
    const isHybridPlayoff = ranking.format === 'hybrid' && ranking.phase === 'playoff';
    const showBrackets = config.showBrackets ?? true;
    const showSchedule = config.showSchedule ?? true;

    if (isElimination || isHybridPlayoff) {
        if (showBrackets) {
            divisions.forEach(d => {
                const isMainType = d.type === 'main' || !d.type || d.type === 'consolation' || (isElimination && d.type !== 'league-consolation-main');
                const isConsolationType = d.type === 'league-consolation-main';

                if (isMainType) {
                    const hasMainMatches = d.matches.some(m => !m.roundName?.includes('(Cons.)'));
                    if (hasMainMatches || d.matches.length === 0) {
                        list.push({ type: 'bracket', bracketType: 'main', divisionId: d.id, title: d.name ? `Cuadro ${d.name}` : 'Cuadro Principal' });
                    }
                    if (d.matches.some(m => m.roundName?.includes('(Cons.)'))) {
                        list.push({ type: 'bracket', bracketType: 'consolation', divisionId: d.id, title: d.name ? `Consolación ${d.name}` : 'Cuadro Consolación' });
                    }
                }
                if (isConsolationType) {
                    list.push({ type: 'bracket', bracketType: 'consolation', divisionId: d.id, title: d.name || 'Cuadro Consolación' });
                }
            });
        }
        if (isElimination && showSchedule) list.push({ type: 'schedule', title: 'Horarios' });
    } else {
        // Pozo plays everything in one division: one overall table
        const isPozo = ranking.format === 'pozo';
        const groups = divisions.filter(d => !d.stage || d.stage === 'group');
        const titleOf = (d: typeof divisions[number], kind: 'standings' | 'matches') =>
            isPozo ? (kind === 'standings' ? 'Clasificación general' : 'Partidos') : (d.name || `División ${d.numero}`);

        (['standings', 'matches'] as const).forEach(kind => {
            const on = kind === 'standings' ? config.showStandings : config.showMatches;
            if (!on) return;
            if (divisions.length === 0) list.push({ type: kind });
            else groups.forEach(d => list.push({ type: kind, divisionId: d.id, title: titleOf(d, kind) }));
        });
    }

    if (config.showQR) list.push({ type: 'qr' });
    if (config.showSponsors) list.push({ type: 'sponsors' });
    return list;
};
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run components/tv/__tests__/buildSlides.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/tv/buildSlides.ts components/tv/__tests__/buildSlides.test.ts
git commit -m "feat(tv): diapositivas según el formato, con interruptores de cuadros y horarios"
```

---

### Task 7: TV usa `buildSlides` y enseña el punto de oro

**Files:**
- Modify: `components/tv/TVLayout.tsx:1-149, 205-206, 226-236`
- Modify: `components/tv/slides/StandingsSlide.tsx:6-10, 48`

- [ ] **Step 1: TVLayout**

En `TVLayout.tsx`:
- Añade imports: `import { buildSlides, Slide, SlideType } from './buildSlides';` y `import { hasGoldenPoint } from '../../config/formatSettings';`
- Borra la línea `type SlideType = …` (16), el bloque `type ExtendedSlide = {…}` (43-49) y sustituye todo el `useMemo` de `slides` (51-149) por:

```ts
    const slides: Slide[] = React.useMemo(() => buildSlides(ranking, config), [config, ranking]);
```

- En `renderSlide`, caso `'standings'`, pasa el título: `<StandingsSlide ranking={ranking} players={players} divisionId={slide.divisionId} title={slide.title} />`
- En el pie, justo después del `<h1>` con `{ranking.nombre}`, añade:

```tsx
                    {hasGoldenPoint(ranking) && <span className="text-amber-300 text-sm font-semibold whitespace-nowrap">Punto de oro</span>}
```

- [ ] **Step 2: StandingsSlide acepta título**

En `StandingsSlide.tsx` añade `title?: string;` a `Props`, recibe `title` en la desestructuración, y en la línea 48 cambia el `<h2>` a:

```tsx
                <h2 className="text-4xl font-bold tracking-tight">{ranking.format === 'pozo' && title ? title : `Clasificación - ${division.name || `División ${division.numero}`}`}</h2>
```

- [ ] **Step 3: Comprobar**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "TVLayout|StandingsSlide"; npx vitest run components/tv`
Expected: sin errores; PASS.

- [ ] **Step 4: Commit**

```bash
git add components/tv/TVLayout.tsx components/tv/slides/StandingsSlide.tsx
git commit -m "feat(tv): usa el catálogo de diapositivas y avisa del punto de oro"
```

---

### Task 8: Modal de Ajustes desde el catálogo

**Files:**
- Modify: `components/RankingSettingsModal.tsx`

- [ ] **Step 1: Leer del catálogo**

- Añade `import { getFormatSettings, goldenPointApplies, TVSlideKind } from '../config/formatSettings';`
- Borra las constantes `FORMAT_LABEL` y `UNIT` (30-40).
- Sustituye las líneas 104-116 por:

```ts
    const format = ranking.format || 'classic';
    const fs = getFormatSettings(format);
    const isPointBased = fs.scoring === 'points';
    const isHybrid = format === 'hybrid';
    const isPozo = format === 'pozo';
    const showGoldenPoint = goldenPointApplies(format, config);
    const showPromotion = fs.advance === 'promotion' && ranking.divisions.length >= (fs.promotionMinDivisions ?? 1);

    const sections = useMemo(() => ([
        { id: 'win' as Section, label: 'Puntuación', show: fs.scoring !== 'none' || showGoldenPoint },
        { id: 'advance' as Section, label: { promotion: 'Ascensos y descensos', playoff: 'Playoff', brackets: 'Cuadros', rotation: 'Rotación de pistas' }[fs.advance as string] || '', show: fs.advance !== null && (fs.advance !== 'promotion' || showPromotion) },
        { id: 'setup' as Section, label: 'Estructura', show: true },
        { id: 'look' as Section, label: 'Presentación', show: true },
    ].filter(s => s.show)), [fs, showGoldenPoint, showPromotion]);
```

- Sustituye `const [unit, units, feminine] = UNIT[format] || UNIT.classic;` por `const [unit, units, feminine] = fs.unit;`
- Sustituye los dos `FORMAT_LABEL[format] || format` por `fs.label`.
- En `handleSave`, `const rescore = pointsChanged && fs.scoring === 'sets';`
- En `setPoints`, deja solo `setConfig(prev => ({ ...prev, [key]: v }));` y borra el comentario de la copia del híbrido (Task 2 ya lee los puntos del nivel superior).

- [ ] **Step 2: Pestaña Puntuación**

En `renderWin`, envuelve el contenido actual para que no se pinte en formatos sin puntuación y añade el punto de oro al final:

```tsx
    const renderWin = () => (
        <div className="space-y-7">
            {fs.scoring !== 'none' && (<>
                {/* … bloques actuales de puntos, avisos y <TieBreakConfig …/> sin cambios … */}
            </>)}
            {showGoldenPoint && (
                <div className="bg-white border border-rg-line rounded-lg px-4">
                    <Switch label="Se juega con punto de oro" description="Solo informativo: sale en la vista pública y en la TV."
                        checked={!!(config.goldenPoint ?? config.pozoConfig?.goldenPoint)} onChange={(v) => set({ goldenPoint: v })} disabled={isReadOnly} />
                </div>
            )}
        </div>
    );
```

- [ ] **Step 3: Pestaña propia**

En `renderAdvance` cambia la condición `{isLeague && (` por `{fs.advance === 'promotion' && (`, `{isElimination && (` por `{fs.advance === 'brackets' && (` y `{isPozo && (` por `{fs.advance === 'rotation' && (`. Borra la variable `isLeague` y `isElimination` si ya no se usan (en `renderSetup` cambia `isElimination` por `format === 'elimination'`).

En `renderSetup`, dentro del bloque «El torneo», justo después del `<Fact label="Modalidad" …/>`, añade el sistema de Pozo (informativo):

```tsx
                    {isPozo && <Fact label="Puntuación" value={(config.pozoConfig?.scoringMode ?? config.scoringMode ?? 'per-game') === 'per-game' ? 'Por juegos, 1 set' : `A ${config.pozoConfig?.scoringMode ?? config.scoringMode} puntos`} note="Se decide al crear el torneo" />}
```

- [ ] **Step 4: Columnas y TV por formato**

En `renderLook`:
- `const columnOptions = fs.columns === 'lostOnly' ? [...] : [...]` (misma lista que ahora) y la condición del bloque `{!isElimination && (` pasa a `{fs.columns !== 'none' && (`.
- Sustituye los cuatro `<Switch>` de TV de Clasificación/Partidos por:

```tsx
                        {fs.tvSlides.map((kind: TVSlideKind) => {
                            const key = ({ standings: 'showStandings', matches: 'showMatches', brackets: 'showBrackets', schedule: 'showSchedule' } as const)[kind];
                            const label = { standings: 'Clasificación', matches: 'Partidos', brackets: 'Cuadros', schedule: 'Horarios' }[kind];
                            const note = isHybrid ? (kind === 'brackets' ? 'En el playoff' : 'En la fase de grupos') : undefined;
                            return <Switch key={kind} label={label} description={note} checked={tv[key] ?? true} onChange={(v) => setTv(prev => ({ ...prev, [key]: v }))} disabled={isReadOnly} />;
                        })}
```

dejando los `<Switch>` de QR y Patrocinadores como están.

- [ ] **Step 5: Comprobar**

Run: `npx tsc --noEmit -p . 2>&1 | grep RankingSettingsModal; npx vitest run`
Expected: sin errores; todas PASS.

- [ ] **Step 6: Commit**

```bash
git add components/RankingSettingsModal.tsx
git commit -m "feat(ajustes): cada formato muestra solo sus ajustes, punto de oro e interruptores de TV propios"
```

---

### Task 9: Punto de oro en la vista pública

**Files:**
- Modify: `components/RankingView.tsx:300-302, 1593-1595`

- [ ] **Step 1: Añadir el dato**

Importa `import { hasGoldenPoint } from '../config/formatSettings';` y, en las dos cabeceras, justo después de `<span aria-hidden="true">·</span><span>{ranking.categoria}</span>`, añade:

```tsx
              {hasGoldenPoint(ranking) && <><span aria-hidden="true">·</span><span>Punto de oro</span></>}
```

- [ ] **Step 2: Comprobar**

Run: `npx tsc --noEmit -p . 2>&1 | grep RankingView`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add components/RankingView.tsx
git commit -m "feat(público): la cabecera del torneo avisa del punto de oro"
```

---

### Task 10: Comprobación en el navegador

- [ ] **Step 1:** Arranca el servidor de desarrollo con `preview_start` (configuración de `.claude/launch.json`; si no existe, `npm run dev` en el puerto 5173).
- [ ] **Step 2:** Asistente: elegir Pozo, luego Clásica, crear. En la consola del navegador, comprueba con el objeto guardado (red/Firestore) que el `config` no tiene `pozoConfig`, `eliminationConfig`, `hybridConfig` ni `scoringMode`.
- [ ] **Step 3:** Ajustes de un torneo de cada formato:
  - Eliminatoria: no hay pestaña Puntuación salvo el punto de oro; TV muestra «Cuadros» y «Horarios».
  - Americano: desempates sin sets, con «Diferencia de puntos»; sin punto de oro.
  - Individual con una división: sin pestaña «Ascensos y descensos».
  - Liga + playoff: cambiar puntos y comprobar que la clasificación de grupos se recalcula.
- [ ] **Step 4:** Activar punto de oro en una liga y comprobar la cabecera pública y el pie de `/tv/<id>`.
- [ ] **Step 5:** `npx vitest run` completo en verde; captura de pantalla del modal de Ajustes como prueba.
