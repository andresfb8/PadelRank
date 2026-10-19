# Motor de horarios v2 (torneos de fin de semana): plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** sustituir el `SchedulerEngine` voraz por un motor de dos fases (plan por rondas y asignación de partidos) que dé horarios estables (modo completo o por día), un reparto equilibrado entre categorías y respeto a la disponibilidad de las parejas, con los conflictos marcados.

**Arquitectura:** el motor pasa a vivir en `services/scheduler/`, repartido en módulos pequeños y puros: tipos, rejilla de tiempo, disponibilidad, parejas candidatas, planificador de rondas, asignador y fachada `SchedulerEngine`. `services/SchedulerEngine.ts` queda como un simple reexport, para que no cambie ningún import. La interfaz añade un modal de generación con avisos, un panel de conflictos, insignias de estado y el botón "Fijar día siguiente".

**Stack:** React 19 + TypeScript, Vite, Vitest 4 (jsdom, `@testing-library/react`), Firebase.

**Spec:** `docs/superpowers/specs/2026-10-19-weekend-scheduler-design.md`

**Desviaciones respecto al spec (decididas al prototipar):**
- `onResultEntered(ranking)` recibe solo el ranking: revisa todos los partidos con hora y las dos parejas conocidas. No necesita ni el partido ni la división.
- La prioridad de la fase 2 usa `latestStart` de la ronda (el inicio más tardío posible). Es equivalente a ordenar por holgura, ya que en un mismo instante IT es común a todos los candidatos.
- Un partido fijado en un día que se ha eliminado de la configuración pierde la fijación y se recoloca al regenerar. Como el nuevo hueco es válido, no se le añade el motivo "Día eliminado".
- `strictAvailabilityUntilRound` no tiene campo en la interfaz: usa `'Cuartos'` por defecto y solo se puede cambiar en los datos.

**Todo el código de este plan está verificado:** se prototipó completo sobre esta rama, con 130/130 tests en verde y sin errores nuevos de `tsc`, y después se revirtió. Cópialo tal cual.

**Comandos** (desde `PadelRank/PadelRank`, en la rama `feature/weekend-scheduler-v2`):
- Un test: `npx vitest run <ruta>`
- Toda la suite: `npx vitest run`
- Tipos: `npx tsc --noEmit -p .`. Hay **2 errores previos** en `components/RankingView.tsx` (comparaciones `'mexicano'`/`'americano'`, hacia las líneas 1087 y 1143). Se ignoran; no tiene que aparecer ninguno más.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `services/scheduler/types.ts` | Crear | Tipos de configuración y conflictos, `makePairKey` independiente del orden, `normalizePairConstraints`, `normalizeRoundName`, `roundRank` |
| `services/scheduler/timeGrid.ts` | Crear | Rejilla de 15 min en hora local, intervalos operativos y de fase, `localDateKey` |
| `services/scheduler/availability.ts` | Crear | Minutos de solape con las restricciones y texto del motivo |
| `services/scheduler/candidates.ts` | Crear | Índice de partidos, parejas candidatas y dependencias (incluida la consolación con BYE) |
| `services/scheduler/roundPlanner.ts` | Crear | Fase 1: IT, `latestStart` y FT por ronda, avisos de viabilidad |
| `services/scheduler/matchAssigner.ts` | Crear | Fase 2: recorrido cronológico, prioridades, respaldo con conflicto |
| `services/scheduler/index.ts` | Crear | Fachada `SchedulerEngine`: generación, modos, `lockNextDay`, `onResultEntered` y helpers para la interfaz |
| `services/SchedulerEngine.ts` | Reemplazar | `export * from './scheduler';` |
| `services/__tests__/SchedulerEngine.test.ts` | Borrar | Probaba la API antigua; queda cubierto por los tests nuevos |
| `services/scheduler/__tests__/*` | Crear | `fixtures.ts` y un test por módulo, más el de integración |
| `types.ts` | Modificar | `Match.scheduleLocked` y `Match.scheduleConflict` |
| `components/SchedulerConfigModal.tsx` | Modificar | Selector de modo, opción de 75 min, claves normalizadas, `roundRank` |
| `components/scheduler/pairLabel.ts` | Crear | Nombre legible de una pareja a partir de su clave |
| `components/scheduler/ScheduleStatusBadges.tsx` | Crear | Etiqueta "estimado" e icono de conflicto (compartido por la lista y el cuadro) |
| `components/scheduler/ScheduleConflictsModal.tsx` | Crear | Panel de conflictos con el botón "Mover" |
| `components/scheduler/GenerateScheduleModal.tsx` | Crear | Avisos antes de generar y casilla "regenerar también los fijados" |
| `components/scheduler/__tests__/schedulerUi.test.tsx` | Crear | Tests de los componentes nuevos |
| `components/ScheduleModal.tsx` | Reemplazar | Arreglo del valor de `datetime-local` y conflictos por pareja y franja |
| `components/RankingView.tsx` | Modificar | Flujo de generación, fijar día, conflictos, aviso tras resultado, movimiento manual que fija |
| `components/BracketView.tsx` | Modificar | Usa `ScheduleStatusBadges` |
| `components/ScheduleGridModal.tsx` | Modificar | Borde rojo en los partidos con conflicto |

---

### Tarea 1: Tipos base y claves de pareja

**Archivos:**
- Crear: `services/scheduler/types.ts`
- Modificar: `types.ts` (interfaz `Match`, debajo de `scheduleEstimated`)
- Test: `services/scheduler/__tests__/types.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makePairKey, normalizePairConstraints, normalizeRoundName, pairKeyOf, roundRank } from '../types';

describe('scheduler types', () => {
    it('pair keys are order-independent', () => {
        expect(makePairKey('zeta', 'alfa')).toBe('alfa::zeta');
        expect(makePairKey('alfa', 'zeta')).toBe('alfa::zeta');
        expect(makePairKey('solo')).toBe('solo');
        expect(pairKeyOf({ p1Id: 'zeta', p2Id: 'alfa' })).toBe('alfa::zeta');
        expect(pairKeyOf({ p1Id: 'BYE', p2Id: '' })).toBeNull();
        expect(pairKeyOf({ p1Id: '', p2Id: '' })).toBeNull();
    });

    it('legacy keys are normalized and merged', () => {
        const merged = normalizePairConstraints({
            'zeta::alfa': { unavailableRanges: [{ date: '2026-06-06', startTime: '09:00', endTime: '10:00' }] },
            'alfa::zeta': { unavailableRanges: [{ date: '2026-06-07', startTime: '09:00', endTime: '10:00' }] },
        });
        expect(Object.keys(merged)).toEqual(['alfa::zeta']);
        expect(merged['alfa::zeta'].unavailableRanges).toHaveLength(2);
        expect(normalizePairConstraints(undefined)).toEqual({});
    });

    it('round names and play order', () => {
        expect(normalizeRoundName('Final (Cons.)')).toBe('Final');
        expect(roundRank('Ronda de 32')).toBeLessThan(roundRank('Octavos'));
        expect(roundRank('Octavos')).toBeLessThan(roundRank('Cuartos'));
        expect(roundRank('Semifinales (Cons.)')).toBeLessThan(roundRank('Final'));
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/types.test.ts`
Esperado: FALLA con `Failed to resolve import "../types"`.

- [ ] **Paso 3: Implementar**

`services/scheduler/types.ts`:
```ts
import type { MatchPair } from '../../types';

export interface DaySchedule {
    date: string;      // "YYYY-MM-DD"
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
}

export interface RoundWindow extends DaySchedule {
    roundName: string; // normalized round name, e.g. "Final", "Semifinales"
}

export interface SchedulerConfig {
    courts: number;
    slotDurationMinutes: number; // 60 | 75 | 90 | 120
    restMinutes: number;
    /** 'full': everything is locked on generation. 'daily': only the current day is locked. Default 'full'. */
    mode?: 'full' | 'daily';
    /** From this round on (inclusive), availability of not-yet-known pairs is a preference. Default 'Cuartos'. */
    strictAvailabilityUntilRound?: string;
    /** Multi-day schedule: one entry per tournament day with operating hours */
    dailySchedule?: DaySchedule[];
    /** Legacy: single daily time window (kept for backward compat) */
    timeWindows: { start: string; end: string }[];
    /** Per-round time windows; several entries with the same roundName are allowed. */
    roundWindows?: RoundWindow[];
}

/** @deprecated Use PairAvailability with pairConstraints on Ranking */
export interface PlayerAvailability {
    unavailableRanges: { start: string; end: string }[];
}

/** Per-pair blocked intervals, keyed by makePairKey() */
export interface PairAvailability {
    unavailableRanges: DaySchedule[];
}

export interface ScheduleConflict {
    pairKey: string; // a pair key, or ANY_PAIR for window/capacity problems
    reason: string;
}

export interface FeasibilityWarning {
    roundKey?: string;
    message: string;
}

export const ANY_PAIR = '*';

/** Order-independent pair key: the two IDs are sorted before joining. */
export const makePairKey = (p1Id: string, p2Id?: string): string => {
    if (!p2Id) return p1Id;
    return p1Id <= p2Id ? `${p1Id}::${p2Id}` : `${p2Id}::${p1Id}`;
};

export const pairKeyOf = (pair: MatchPair): string | null =>
    !pair.p1Id || pair.p1Id === 'BYE' ? null : makePairKey(pair.p1Id, pair.p2Id || undefined);

/** Rewrites legacy order-dependent keys and merges duplicates. */
export const normalizePairConstraints = (
    constraints?: Record<string, PairAvailability>
): Record<string, PairAvailability> => {
    const result: Record<string, PairAvailability> = {};
    Object.entries(constraints ?? {}).forEach(([key, avail]) => {
        const [a, b] = key.split('::');
        const normalized = makePairKey(a, b || undefined);
        result[normalized] = {
            unavailableRanges: [...(result[normalized]?.unavailableRanges ?? []), ...(avail?.unavailableRanges ?? [])],
        };
    });
    return result;
};

/** Strips the consolation suffix so round names align across brackets. */
export const normalizeRoundName = (name?: string): string =>
    (name || '').replace(/\s*\(Cons\.\)\s*$/i, '').trim();

/** Play order of a round name: higher = later in the bracket. */
export const roundRank = (name?: string): number => {
    const n = normalizeRoundName(name);
    if (n === 'Final') return 5000;
    if (n === 'Semifinales') return 4000;
    if (n === 'Cuartos') return 3000;
    if (n === 'Octavos') return 2000;
    const m = n.match(/Ronda de (\d+)/);
    if (m) return 1000 - Number(m[1]);
    return 0;
};
```

En `types.ts`, interfaz `Match`, sustituye la línea de `scheduleEstimated` por:
```ts
  scheduleEstimated?: boolean; // true when startTime is a projection (pairs not yet decided), not a confirmed slot
  scheduleLocked?: boolean; // locked slot: the scheduler never moves it on its own
  scheduleConflict?: import('./services/scheduler/types').ScheduleConflict[]; // availability / window problems of the current slot
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/types.test.ts`
Esperado: PASA (3 tests).

- [ ] **Paso 5: Commit**

```bash
git add services/scheduler/types.ts services/scheduler/__tests__/types.test.ts types.ts
git commit -m "feat(scheduler): tipos base y claves de pareja independientes del orden

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: Rejilla de tiempo (15 min, hora local) y fixtures de test

**Archivos:**
- Crear: `services/scheduler/timeGrid.ts`
- Crear: `services/scheduler/__tests__/fixtures.ts` (lo usan todas las tareas siguientes)
- Test: `services/scheduler/__tests__/timeGrid.test.ts`

- [ ] **Paso 1: Crear los fixtures**

`services/scheduler/__tests__/fixtures.ts`:
```ts
import { TournamentEngine } from '../../TournamentEngine';
import type { Division, Ranking } from '../../../types';
import type { PairAvailability, SchedulerConfig } from '../types';

export const makeConfig = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
    courts: 2,
    slotDurationMinutes: 90,
    restMinutes: 60,
    timeWindows: [{ start: '09:00', end: '22:00' }],
    dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
    ...overrides,
});

export const makeRanking = (
    divisions: Division[],
    config: SchedulerConfig,
    pairConstraints: Record<string, PairAvailability> = {}
): Ranking => ({
    id: 'r1', nombre: 'Test', categoria: 'Masculino',
    fechaInicio: '', status: 'activo', format: 'elimination',
    divisions, schedulerConfig: config, pairConstraints,
});

/** Pair ids "<prefix>1a::<prefix>1b", ... for `n` pairs. */
export const pairIds = (prefix: string, n: number): string[] =>
    Array.from({ length: n }, (_, i) => `${prefix}${i + 1}a::${prefix}${i + 1}b`);

/** One category = main (+ consolation) bracket, tagged with `category`. */
export const makeCategory = (prefix: string, n: number, consolation = false): Division[] =>
    TournamentEngine.generateBracket(pairIds(prefix, n), consolation)
        .filter(d => consolation || d.type !== 'consolation')
        .map(d => ({ ...d, category: prefix }));

export const at = (date: string, time: string): Date => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi);
};

export const allMatches = (divisions: Division[]) => divisions.flatMap(d => d.matches);

export const endOf = (startIso: string, minutes = 90) => new Date(new Date(startIso).getTime() + minutes * 60000);
```

- [ ] **Paso 2: Escribir el test que falla**

`services/scheduler/__tests__/timeGrid.test.ts`. La primera línea fija la zona horaria antes de cualquier import: vitest ejecuta cada archivo en su propio proceso, así que no afecta a otros tests.
```ts
process.env.TZ = 'Europe/Madrid';

import { describe, it, expect } from 'vitest';
import { alignUp, getRoundIntervals, getStartTimes, localDateKey, parseTimeOnDate, STEP_MINUTES } from '../timeGrid';
import { makeConfig } from './fixtures';

describe('timeGrid', () => {
    it('uses a 15-minute grid and only returns starts where the whole match fits', () => {
        const starts = getStartTimes([{ start: parseTimeOnDate('09:00', '2026-06-06'), end: parseTimeOnDate('12:00', '2026-06-06') }], 75);
        expect(STEP_MINUTES).toBe(15);
        expect(starts[0].getHours()).toBe(9);
        expect(starts[1].getMinutes()).toBe(15);
        const last = starts[starts.length - 1];
        expect(`${last.getHours()}:${last.getMinutes()}`).toBe('10:45'); // 10:45 + 75 = 12:00
    });

    it('localDateKey uses local time (00:30 Madrid is still the local day, not the UTC one)', () => {
        const d = new Date(2026, 5, 7, 0, 30);
        expect(localDateKey(d)).toBe('2026-06-07');
        expect(d.toISOString().startsWith('2026-06-06')).toBe(true); // the old bug
    });

    it('handles the October DST change day', () => {
        const starts = getStartTimes([{ start: parseTimeOnDate('09:00', '2026-10-25'), end: parseTimeOnDate('12:00', '2026-10-25') }], 90);
        expect(starts.map(s => `${s.getHours()}:${String(s.getMinutes()).padStart(2, '0')}`))
            .toEqual(['9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30']);
        expect(starts.every(s => localDateKey(s) === '2026-10-25')).toBe(true);
    });

    it('alignUp rounds to the next 15-minute boundary', () => {
        expect(alignUp(new Date(2026, 5, 6, 9, 1)).getMinutes()).toBe(15);
        expect(alignUp(new Date(2026, 5, 6, 9, 15)).getMinutes()).toBe(15);
    });

    it('round intervals = phase windows ∩ operating hours', () => {
        const config = makeConfig({
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '21:00' }],
            roundWindows: [{ roundName: 'Final', date: '2026-06-06', startTime: '19:00', endTime: '23:00' }],
        });
        const iv = getRoundIntervals('Final (Cons.)', config);
        expect(iv).toHaveLength(1);
        expect(iv[0].start.getHours()).toBe(19);
        expect(iv[0].end.getHours()).toBe(21);
        expect(getRoundIntervals('Semifinales', config)[0].start.getHours()).toBe(9);
    });
});
```

- [ ] **Paso 3: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/timeGrid.test.ts`
Esperado: FALLA con `Failed to resolve import "../timeGrid"`.

- [ ] **Paso 4: Implementar**

`services/scheduler/timeGrid.ts`:
```ts
import type { SchedulerConfig } from './types';
import { normalizeRoundName } from './types';

/** Resolution of the scheduling grid in minutes. */
export const STEP_MINUTES = 15;

export interface Interval {
    start: Date;
    end: Date;
}

export const addMinutes = (date: Date, minutes: number): Date =>
    new Date(date.getTime() + minutes * 60000);

/** Parses "HH:MM" on a "YYYY-MM-DD" date as LOCAL time. */
export const parseTimeOnDate = (time: string, date: string): Date => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi, 0, 0);
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of a date in LOCAL time (never use toISOString for this). */
export const localDateKey = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const overlapMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number =>
    Math.max(0, (Math.min(aEnd.getTime(), bEnd.getTime()) - Math.max(aStart.getTime(), bStart.getTime())) / 60000);

export const fitsIn = (start: Date, end: Date, intervals: Interval[]): boolean =>
    intervals.some(iv => start >= iv.start && end <= iv.end);

/** Rounds up to the next grid boundary (multiples of STEP_MINUTES past the hour). */
export const alignUp = (date: Date): Date => {
    const d = new Date(date);
    if (d.getSeconds() || d.getMilliseconds()) {
        d.setSeconds(0, 0);
        d.setMinutes(d.getMinutes() + 1);
    }
    const rem = d.getMinutes() % STEP_MINUTES;
    return rem ? addMinutes(d, STEP_MINUTES - rem) : d;
};

/** Operating hours of every tournament day, sorted chronologically. */
export const getOperatingIntervals = (config: SchedulerConfig): Interval[] =>
    [...(config.dailySchedule ?? [])]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({ start: parseTimeOnDate(d.startTime, d.date), end: parseTimeOnDate(d.endTime, d.date) }))
        .filter(iv => iv.end > iv.start);

export const intersectIntervals = (a: Interval[], b: Interval[]): Interval[] => {
    const out: Interval[] = [];
    a.forEach(x => b.forEach(y => {
        const start = x.start > y.start ? x.start : y.start;
        const end = x.end < y.end ? x.end : y.end;
        if (end > start) out.push({ start, end });
    }));
    return out.sort((p, q) => p.start.getTime() - q.start.getTime());
};

const roundWindowIntervals = (roundName: string | undefined, config: SchedulerConfig): Interval[] => {
    const target = normalizeRoundName(roundName);
    if (!target) return [];
    return (config.roundWindows ?? [])
        .filter(rw => normalizeRoundName(rw.roundName) === target)
        .map(rw => ({ start: parseTimeOnDate(rw.startTime, rw.date), end: parseTimeOnDate(rw.endTime, rw.date) }));
};

export const hasRoundWindows = (roundName: string | undefined, config: SchedulerConfig): boolean =>
    roundWindowIntervals(roundName, config).length > 0;

/** Where a round may be played: its phase windows ∩ operating hours, or just operating hours. */
export const getRoundIntervals = (roundName: string | undefined, config: SchedulerConfig): Interval[] => {
    const operating = getOperatingIntervals(config);
    const windows = roundWindowIntervals(roundName, config);
    return windows.length ? intersectIntervals(windows, operating) : operating;
};

/** Every grid start such that the whole match [start, start + duration] fits in one interval. Sorted. */
export const getStartTimes = (intervals: Interval[], durationMinutes: number): Date[] => {
    const out: Date[] = [];
    intervals.forEach(iv => {
        let t = alignUp(iv.start);
        while (addMinutes(t, durationMinutes) <= iv.end) {
            out.push(t);
            t = addMinutes(t, STEP_MINUTES);
        }
    });
    return out.sort((a, b) => a.getTime() - b.getTime());
};
```

- [ ] **Paso 5: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/timeGrid.test.ts`
Esperado: PASA (5 tests).

- [ ] **Paso 6: Commit**

```bash
git add services/scheduler/timeGrid.ts services/scheduler/__tests__/timeGrid.test.ts services/scheduler/__tests__/fixtures.ts
git commit -m "feat(scheduler): rejilla de 15 minutos en hora local

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: Disponibilidad de parejas

**Archivos:**
- Crear: `services/scheduler/availability.ts`
- Test: `services/scheduler/__tests__/availability.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/availability.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { describeViolation, getViolations, violatingPairCount, violationMinutes } from '../availability';
import { at } from './fixtures';

const constraints = { 'a::b': { unavailableRanges: [{ date: '2026-06-06', startTime: '17:00', endTime: '19:00' }] } };
const check = (time: string) => {
    const start = at('2026-06-06', time);
    return getViolations(start, new Date(start.getTime() + 90 * 60000), ['a::b'], constraints);
};

describe('availability', () => {
    it('counts the overlap of the whole match, not only its start', () => {
        expect(violationMinutes(check('16:45'))).toBe(75); // 16:45–18:15 overlaps 17:00–18:15
        expect(violationMinutes(check('15:30'))).toBe(0);  // ends exactly at 17:00
        expect(violationMinutes(check('19:00'))).toBe(0);
    });

    it('counts distinct violating pairs', () => {
        const start = at('2026-06-06', '17:00');
        const v = getViolations(start, new Date(start.getTime() + 90 * 60000), ['a::b', 'c::d'], {
            ...constraints,
            'c::d': { unavailableRanges: [{ date: '2026-06-06', startTime: '18:00', endTime: '20:00' }] },
        });
        expect(violatingPairCount(v)).toBe(2);
    });

    it('describes a violation in Spanish', () => {
        expect(describeViolation(check('16:45')[0])).toBe('No disponible sáb 17:00–19:00');
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/availability.test.ts`
Esperado: FALLA con `Failed to resolve import "../availability"`.

- [ ] **Paso 3: Implementar**

`services/scheduler/availability.ts`:
```ts
import type { PairAvailability } from './types';
import { overlapMinutes, parseTimeOnDate } from './timeGrid';

export interface PairViolation {
    pairKey: string;
    minutes: number;
    date: string;
    startTime: string;
    endTime: string;
}

/** Every blocked range of the given pairs that overlaps the match [start, end]. */
export const getViolations = (
    start: Date,
    end: Date,
    pairKeys: Iterable<string>,
    constraints: Record<string, PairAvailability>
): PairViolation[] => {
    const out: PairViolation[] = [];
    for (const pairKey of pairKeys) {
        for (const r of constraints[pairKey]?.unavailableRanges ?? []) {
            const minutes = overlapMinutes(start, end, parseTimeOnDate(r.startTime, r.date), parseTimeOnDate(r.endTime, r.date));
            if (minutes > 0) out.push({ pairKey, minutes, date: r.date, startTime: r.startTime, endTime: r.endTime });
        }
    }
    return out;
};

export const violationMinutes = (violations: PairViolation[]): number =>
    violations.reduce((sum, v) => sum + v.minutes, 0);

export const violatingPairCount = (violations: PairViolation[]): number =>
    new Set(violations.map(v => v.pairKey)).size;

/** "No disponible sáb 17:00–19:00" */
export const describeViolation = (v: PairViolation): string => {
    const weekday = parseTimeOnDate('12:00', v.date).toLocaleDateString('es-ES', { weekday: 'short' });
    return `No disponible ${weekday} ${v.startTime}–${v.endTime}`;
};
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/availability.test.ts`
Esperado: PASA (3 tests).

- [ ] **Paso 5: Commit**

```bash
git add services/scheduler/availability.ts services/scheduler/__tests__/availability.test.ts
git commit -m "feat(scheduler): cálculo de incumplimientos de disponibilidad

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: Parejas candidatas y dependencias

Contexto: `TournamentEngine.generateBracket` enlaza cada partido con el siguiente mediante `nextMatchId`/`nextMatchSlot`, y cada partido de primera ronda del cuadro principal con la consolación mediante `consolationMatchId`/`consolationSlot`. Los partidos con BYE quedan `finalizado` con `score.description === 'BYE'` y sin hora. Un cabeza de serie con BYE juega su primer partido real en la ronda 2; si lo pierde, baja a la consolación (`moveLoserToConsolation`).

**Archivos:**
- Crear: `services/scheduler/candidates.ts`
- Test: `services/scheduler/__tests__/candidates.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/candidates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildMatchIndex, getCandidatePairs, getDependencies } from '../candidates';
import { makeCategory, pairIds } from './fixtures';

describe('candidates', () => {
    it('the final can be reached by every pair of the category', () => {
        const divs = makeCategory('A', 8);
        const index = buildMatchIndex(divs);
        const final = divs[0].matches.find(m => m.roundName === 'Final')!;
        expect(getCandidatePairs(final, index).size).toBe(8);
        const semi = divs[0].matches.find(m => m.roundName === 'Semifinales')!;
        expect(getCandidatePairs(semi, index).size).toBe(4);
    });

    it('known pairs only when both are set', () => {
        const divs = makeCategory('A', 4);
        const index = buildMatchIndex(divs);
        const r1 = divs[0].matches.find(m => m.jornada === 1)!;
        expect(Array.from(getCandidatePairs(r1, index))).toHaveLength(2);
    });

    it('consolation includes bye-seeds and depends on their round-2 match', () => {
        // 6 pairs in an 8 bracket → seeds 1 and 2 have a BYE in round 1
        const [main, cons] = makeCategory('A', 6, true);
        const index = buildMatchIndex([main, cons]);
        const consR1 = cons.matches.filter(m => m.jornada === 1);
        const allCandidates = new Set(consR1.flatMap(m => Array.from(getCandidatePairs(m, index))));
        const seed1 = pairIds('A', 6)[0];
        expect(allCandidates.has(seed1)).toBe(true);

        const seedConsMatch = consR1.find(m => getCandidatePairs(m, index).has(seed1))!;
        const deps = getDependencies(seedConsMatch, index);
        expect(deps.some(d => d.jornada === 2)).toBe(true); // the bye-seed's first real match
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/candidates.test.ts`
Esperado: FALLA con `Failed to resolve import "../candidates"`.

- [ ] **Paso 3: Implementar**

`services/scheduler/candidates.ts`:
```ts
import type { Division, Match } from '../../types';
import { pairKeyOf } from './types';

export interface MatchIndex {
    byId: Map<string, Match>;
    divisionOf: Map<string, Division>;
    /** nextMatchId → matches whose winner goes there */
    winnerFeeders: Map<string, Match[]>;
    /** consolationMatchId → main matches whose loser goes there */
    loserFeeders: Map<string, Match[]>;
    /** Stable bracket order (division order, then match order) */
    order: Map<string, number>;
}

export const buildMatchIndex = (divisions: Division[]): MatchIndex => {
    const index: MatchIndex = {
        byId: new Map(), divisionOf: new Map(), winnerFeeders: new Map(), loserFeeders: new Map(), order: new Map(),
    };
    const push = (map: Map<string, Match[]>, key: string, m: Match) => map.set(key, [...(map.get(key) ?? []), m]);
    divisions.forEach(div => div.matches.forEach(m => {
        index.byId.set(m.id, m);
        index.divisionOf.set(m.id, div);
        index.order.set(m.id, index.order.size);
        if (m.nextMatchId) push(index.winnerFeeders, m.nextMatchId, m);
        if (m.consolationMatchId) push(index.loserFeeders, m.consolationMatchId, m);
    }));
    return index;
};

const isByeResolved = (m: Match) => m.score?.description === 'BYE';

const slotEmpty = (m: Match, slot?: 1 | 2) =>
    slot === 1 ? !m.pair1.p1Id : slot === 2 ? !m.pair2.p1Id : (!m.pair1.p1Id || !m.pair2.p1Id);

/** Every pair that could end up playing this match (known pairs + whoever can come from its feeders). */
export const getCandidatePairs = (
    match: Match,
    index: MatchIndex,
    memo: Map<string, Set<string>> = new Map()
): Set<string> => {
    const cached = memo.get(match.id);
    if (cached) return cached;
    const result = new Set<string>();
    [match.pair1, match.pair2].forEach(p => {
        const key = pairKeyOf(p);
        if (key) result.add(key);
    });
    for (const f of index.winnerFeeders.get(match.id) ?? []) {
        if (!slotEmpty(match, f.nextMatchSlot)) continue;
        getCandidatePairs(f, index, memo).forEach(k => result.add(k));
    }
    for (const f of index.loserFeeders.get(match.id) ?? []) {
        if (!slotEmpty(match, f.consolationSlot) || f.status === 'no_disputado') continue;
        if (isByeResolved(f)) {
            // Bye-seed: its first real match is in round 2; if it loses there it drops here
            const seed = f.pair1.p1Id === 'BYE' ? f.pair2 : f.pair1;
            const key = pairKeyOf(seed);
            if (key) result.add(key);
        } else {
            getCandidatePairs(f, index, memo).forEach(k => result.add(k));
        }
    }
    memo.set(match.id, result);
    return result;
};

/** Matches that must be finished (plus rest) before this one can start. */
export const getDependencies = (match: Match, index: MatchIndex): Match[] => {
    const deps: Match[] = [...(index.winnerFeeders.get(match.id) ?? [])];
    for (const f of index.loserFeeders.get(match.id) ?? []) {
        if (f.status === 'no_disputado') continue;
        if (isByeResolved(f)) {
            const seedMatch = f.nextMatchId ? index.byId.get(f.nextMatchId) : undefined;
            if (seedMatch) deps.push(seedMatch);
        } else {
            deps.push(f);
        }
    }
    return deps;
};
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/candidates.test.ts`
Esperado: PASA (3 tests).

- [ ] **Paso 5: Commit**

```bash
git add services/scheduler/candidates.ts services/scheduler/__tests__/candidates.test.ts
git commit -m "feat(scheduler): parejas candidatas y dependencias por partido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 5: Fase 1, planificador de rondas

**Archivos:**
- Crear: `services/scheduler/roundPlanner.ts`
- Test: `services/scheduler/__tests__/roundPlanner.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/roundPlanner.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { planRounds, roundKeyOf } from '../roundPlanner';
import { at, makeCategory, makeConfig } from './fixtures';

const weekend = makeConfig({
    courts: 4,
    dailySchedule: [
        { date: '2026-06-05', startTime: '17:00', endTime: '22:00' },
        { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
        { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
    ],
    roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
});

describe('roundPlanner', () => {
    it('a category with more rounds has less slack in its first round', () => {
        const big = makeCategory('A', 32);
        const small = makeCategory('B', 4);
        const { plans } = planRounds([...big, ...small], weekend);
        const bigR1 = plans.get(roundKeyOf(big[0].id, 1))!;
        const smallR1 = plans.get(roundKeyOf(small[0].id, 1))!;
        expect(bigR1.latestStart!.getTime()).toBeLessThan(smallR1.latestStart!.getTime());
    });

    it('the deadline of a final is the end of its window', () => {
        const cat = makeCategory('A', 8);
        const { plans } = planRounds(cat, weekend);
        const final = plans.get(roundKeyOf(cat[0].id, 3))!;
        expect(final.deadline!.getTime()).toBe(at('2026-06-07', '14:00').getTime());
        expect(final.windowed).toBe(true);
    });

    it('warns when a phase window is too small', () => {
        const cat = makeCategory('A', 8);
        const config = makeConfig({
            courts: 1,
            dailySchedule: [{ date: '2026-06-06', startTime: '09:00', endTime: '22:00' }],
            roundWindows: [{ roundName: 'Semifinales', date: '2026-06-06', startTime: '16:00', endTime: '17:30' }],
        });
        const { warnings } = planRounds(cat, config);
        expect(warnings.some(w => w.message.startsWith('Semifinales'))).toBe(true);
    });

    it('no warnings for a comfortable weekend', () => {
        const { warnings } = planRounds([...makeCategory('A', 8), ...makeCategory('B', 8)], weekend);
        expect(warnings).toEqual([]);
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/roundPlanner.test.ts`
Esperado: FALLA con `Failed to resolve import "../roundPlanner"`.

- [ ] **Paso 3: Implementar**

`services/scheduler/roundPlanner.ts`:
```ts
import type { Division, Match } from '../../types';
import type { FeasibilityWarning, SchedulerConfig } from './types';
import { normalizeRoundName } from './types';
import {
    Interval, addMinutes, getOperatingIntervals, getRoundIntervals, getStartTimes, hasRoundWindows,
} from './timeGrid';

export interface RoundPlan {
    key: string;
    divisionId: string;
    jornada: number;
    roundName: string;
    label: string;              // category label for messages
    matchCount: number;         // matches that will actually be played
    intervals: Interval[];      // where this round may be played
    windowed: boolean;          // has its own phase windows
    earliestStart: Date | null; // IT
    latestStart: Date | null;   // latest start of the round's first wave: priority key (smaller = more urgent)
    deadline: Date | null;      // FT: matches of this round should end by this time
}

export const roundKeyOf = (divisionId: string, jornada: number): string => `${divisionId}#${jornada}`;

export const isPlayable = (m: Match): boolean =>
    m.status !== 'no_disputado' && m.score?.description !== 'BYE' &&
    m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE';

export const divisionLabel = (div: Division): string => {
    const base = div.category || div.name || `División ${div.numero}`;
    return div.category && div.type === 'consolation' ? `${base} (Cons.)` : base;
};

const fmt = (d: Date) => d.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const firstFit = (from: Date, starts: Date[]): Date | null => starts.find(s => s >= from) ?? null;

const lastFit = (latestEnd: Date, starts: Date[], duration: number): Date | null => {
    for (let i = starts.length - 1; i >= 0; i--) {
        if (addMinutes(starts[i], duration) <= latestEnd) return starts[i];
    }
    return null;
};

/** Places `waves` consecutive waves no earlier than `from`. */
const forwardWaves = (from: Date, waves: number, starts: Date[], duration: number): { start: Date; end: Date } | null => {
    let first: Date | null = null;
    let t = from;
    for (let w = 0; w < waves; w++) {
        const s = firstFit(t, starts);
        if (!s) return null;
        if (!first) first = s;
        t = addMinutes(s, duration);
    }
    return first ? { start: first, end: t } : null;
};

/** Places `waves` consecutive waves ending no later than `latestEnd`; returns the first wave's start. */
const backwardWaves = (latestEnd: Date, waves: number, starts: Date[], duration: number): Date | null => {
    let t = latestEnd;
    let start: Date | null = null;
    for (let w = 0; w < waves; w++) {
        start = lastFit(t, starts, duration);
        if (!start) return null;
        t = start;
    }
    return start;
};

const findMainFor = (cons: Division, divisions: Division[]): Division | undefined => {
    if (cons.category) {
        const sameCat = divisions.find(d => d.type === 'main' && d.category === cons.category);
        if (sameCat) return sameCat;
    }
    const idx = divisions.indexOf(cons);
    for (let i = idx - 1; i >= 0; i--) if (divisions[i].type === 'main') return divisions[i];
    return undefined;
};

const slotCapacity = (intervals: Interval[], duration: number, courts: number): number =>
    intervals.reduce((sum, iv) => sum + Math.floor((iv.end.getTime() - iv.start.getTime()) / 60000 / duration), 0) * courts;

/**
 * Phase 1: for every round of every division computes the window [earliestStart, deadline]
 * and its urgency (latestStart), going forward from the tournament start and backward from the finals.
 */
export const planRounds = (
    divisions: Division[],
    config: SchedulerConfig
): { plans: Map<string, RoundPlan>; warnings: FeasibilityWarning[] } => {
    const D = config.slotDurationMinutes;
    const rest = config.restMinutes;
    const courts = Math.max(1, config.courts);
    const plans = new Map<string, RoundPlan>();
    const warnings: FeasibilityWarning[] = [];

    const operating = getOperatingIntervals(config);
    if (!operating.length) return { plans, warnings: [{ message: 'No hay días del torneo configurados.' }] };
    const tournamentStart = operating[0].start;
    const tournamentEnd = operating[operating.length - 1].end;

    const ordered = [...divisions.filter(d => d.type !== 'consolation'), ...divisions.filter(d => d.type === 'consolation')];

    for (const div of ordered) {
        const label = divisionLabel(div);
        const jornadas = Array.from(new Set(div.matches.map(m => m.jornada))).sort((a, b) => a - b);
        const rounds = jornadas.map(j => {
            const matches = div.matches.filter(m => m.jornada === j);
            const roundName = matches[0]?.roundName ?? `Ronda ${j}`;
            const intervals = getRoundIntervals(roundName, config);
            return {
                jornada: j,
                roundName,
                count: matches.filter(isPlayable).length,
                intervals,
                windowed: hasRoundWindows(roundName, config),
                starts: getStartTimes(intervals, D),
            };
        });

        // Forward pass: earliest start of each round
        let t = tournamentStart;
        if (div.type === 'consolation') {
            const main = findMainFor(div, divisions);
            const mainFirst = main && Math.min(...main.matches.map(m => m.jornada));
            const mainPlan = main ? plans.get(roundKeyOf(main.id, mainFirst!)) : undefined;
            if (mainPlan?.earliestStart) t = addMinutes(mainPlan.earliestStart, D + rest);
        }
        const earliest = rounds.map(r => {
            if (r.count === 0) return firstFit(t, r.starts);
            const res = forwardWaves(t, Math.ceil(r.count / courts), r.starts, D);
            if (!res) return null;
            t = addMinutes(res.end, rest);
            return res.start;
        });

        // Backward pass: deadline and latest start of each round
        let latestEnd = tournamentEnd;
        const backward: { latestStart: Date | null; deadline: Date }[] = new Array(rounds.length);
        for (let i = rounds.length - 1; i >= 0; i--) {
            const r = rounds[i];
            const lastIntervalEnd = r.intervals.length ? r.intervals[r.intervals.length - 1].end : null;
            const deadline = lastIntervalEnd && lastIntervalEnd < latestEnd ? lastIntervalEnd : latestEnd;
            const latestStart = r.count === 0
                ? lastFit(deadline, r.starts, D)
                : backwardWaves(deadline, Math.ceil(r.count / courts), r.starts, D);
            backward[i] = { latestStart, deadline };
            if (latestStart && r.count > 0) latestEnd = addMinutes(latestStart, -rest);
        }

        rounds.forEach((r, i) => {
            const key = roundKeyOf(div.id, r.jornada);
            const es = earliest[i];
            const { latestStart: ls, deadline } = backward[i];
            plans.set(key, {
                key, divisionId: div.id, jornada: r.jornada, roundName: r.roundName, label,
                matchCount: r.count, intervals: r.intervals, windowed: r.windowed,
                earliestStart: es, latestStart: ls, deadline,
            });
            if (r.count === 0) return;
            const name = `${normalizeRoundName(r.roundName)} de ${label}`;
            if (!es) warnings.push({ roundKey: key, message: `${name}: no hay horario disponible para jugarla.` });
            else if (!ls) warnings.push({ roundKey: key, message: `${name}: no cabe antes de las rondas siguientes.` });
            else if (es > ls) warnings.push({
                roundKey: key,
                message: `${name} no cabe: puede empezar como pronto ${fmt(es)} pero debería empezar como tarde ${fmt(ls)}.`,
            });
        });
    }

    // Phase windows: total matches of a round name vs slots in its windows
    const perWindowedRound = new Map<string, number>();
    plans.forEach(p => {
        if (!p.windowed || !p.matchCount) return;
        const name = normalizeRoundName(p.roundName);
        perWindowedRound.set(name, (perWindowedRound.get(name) ?? 0) + p.matchCount);
    });
    perWindowedRound.forEach((total, name) => {
        const capacity = slotCapacity(getRoundIntervals(name, config), D, courts);
        if (total > capacity) {
            warnings.push({ message: `${name}: ${total} partidos no caben en sus franjas (${capacity} huecos con ${courts} pistas).` });
        }
    });

    // Whole tournament
    const totalMatches = Array.from(plans.values()).reduce((s, p) => s + p.matchCount, 0);
    const totalCapacity = slotCapacity(operating, D, courts);
    if (totalMatches > totalCapacity) {
        warnings.push({ message: `El torneo tiene ${totalMatches} partidos y solo hay ${totalCapacity} huecos disponibles.` });
    }

    return { plans, warnings };
};
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/roundPlanner.test.ts`
Esperado: PASA (4 tests).

- [ ] **Paso 5: Commit**

```bash
git add services/scheduler/roundPlanner.ts services/scheduler/__tests__/roundPlanner.test.ts
git commit -m "feat(scheduler): fase 1, planificador de rondas y avisos de viabilidad

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 6: Fase 2, asignación de partidos

**Archivos:**
- Crear: `services/scheduler/matchAssigner.ts`
- Test: `services/scheduler/__tests__/matchAssigner.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/matchAssigner.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { Division } from '../../../types';
import type { PairAvailability, SchedulerConfig } from '../types';
import { assignMatches } from '../matchAssigner';
import { planRounds } from '../roundPlanner';
import { buildMatchIndex, getDependencies } from '../candidates';
import { allMatches, at, endOf, makeCategory, makeConfig, pairIds } from './fixtures';

const run = (divisions: Division[], config: SchedulerConfig, constraints: Record<string, PairAvailability> = {}) => {
    const toSchedule = new Set(allMatches(divisions)
        .filter(m => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
        .map(m => m.id));
    const { plans } = planRounds(divisions, config);
    assignMatches({ divisions, config, constraints, plans, toSchedule });
    return divisions;
};

const oneDay = (start = '09:00', end = '22:00') => [{ date: '2026-06-06', startTime: start, endTime: end }];

describe('matchAssigner', () => {
    it('never puts two matches on the same court at the same time', () => {
        const divs = run([...makeCategory('A', 8), ...makeCategory('B', 8)], makeConfig({ courts: 3, dailySchedule: oneDay() }));
        const placed = allMatches(divs).filter(m => m.startTime);
        placed.forEach(a => placed.forEach(b => {
            if (a.id === b.id || a.court !== b.court) return;
            const overlap = new Date(a.startTime!) < endOf(b.startTime!) && new Date(b.startTime!) < endOf(a.startTime!);
            expect(overlap).toBe(false);
        }));
    });

    it('always respects the rest between a match and its feeders', () => {
        const divs = run(makeCategory('A', 16, true), makeConfig({ courts: 4, dailySchedule: oneDay() }));
        const index = buildMatchIndex(divs);
        allMatches(divs).filter(m => m.startTime).forEach(m => {
            getDependencies(m, index).filter(d => d.startTime).forEach(d => {
                expect(new Date(m.startTime!).getTime()).toBeGreaterThanOrEqual(endOf(d.startTime!).getTime() + 60 * 60000);
            });
        });
    });

    it('never schedules outside operating hours (no room → "Sin capacidad")', () => {
        const [main] = makeCategory('A', 4);
        run([main], makeConfig({ courts: 1, dailySchedule: oneDay('09:00', '12:00') }));
        main.matches.forEach(m => {
            if (!m.startTime) {
                expect(m.scheduleConflict?.[0].reason).toBe('Sin capacidad');
                return;
            }
            expect(new Date(m.startTime).getTime()).toBeGreaterThanOrEqual(at('2026-06-06', '09:00').getTime());
            expect(endOf(m.startTime).getTime()).toBeLessThanOrEqual(at('2026-06-06', '12:00').getTime());
        });
    });

    it('gives the restricted pair a compatible slot first', () => {
        const [main] = makeCategory('A', 4);
        const restricted = pairIds('A', 4)[1]; // seed 2 plays the SECOND R1 match
        // Only one court; pair A2 can only play 09:00–10:30
        const constraints = { [restricted]: { unavailableRanges: [{ date: '2026-06-06', startTime: '10:30', endTime: '22:00' }] } };
        run([main], makeConfig({ courts: 1, dailySchedule: oneDay() }), constraints);
        const a2Match = main.matches.find(m => m.jornada === 1 && (m.pair1.p1Id === 'A2a' || m.pair2.p1Id === 'A2a'))!;
        expect(new Date(a2Match.startTime!).getTime()).toBe(at('2026-06-06', '09:00').getTime());
        expect(a2Match.scheduleConflict).toBeUndefined();
    });

    it('places an impossible match anyway and flags the conflict', () => {
        const [main] = makeCategory('A', 2);
        const constraints = { [pairIds('A', 2)[0]]: { unavailableRanges: [{ date: '2026-06-06', startTime: '00:00', endTime: '23:59' }] } };
        run([main], makeConfig({ dailySchedule: oneDay() }), constraints);
        const final = main.matches[0];
        expect(final.startTime).toBeTruthy();
        expect(final.scheduleConflict?.[0].pairKey).toBe(pairIds('A', 2)[0]);
        expect(final.scheduleConflict?.[0].reason).toContain('No disponible');
    });

    it('preference availability: the final takes the slot fewer candidates are blocked in', () => {
        const [main] = makeCategory('A', 4);
        const ids = pairIds('A', 4);
        // Sunday 11:00–14:00 final window; 3 of 4 pairs cannot play before 12:30
        const block = { unavailableRanges: [{ date: '2026-06-07', startTime: '09:00', endTime: '12:30' }] };
        const constraints = { [ids[0]]: block, [ids[1]]: block, [ids[2]]: block };
        const config = makeConfig({
            dailySchedule: [
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
            ],
            roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
        });
        run([main], config, constraints);
        const final = main.matches.find(m => m.roundName === 'Final')!;
        expect(new Date(final.startTime!).getTime()).toBe(at('2026-06-07', '12:30').getTime());
        expect(final.scheduleConflict).toBeUndefined(); // pairs unknown → no conflict yet
    });

    it('keeps a windowed round inside its window', () => {
        const cats = [...makeCategory('A', 4), ...makeCategory('B', 4)];
        const config = makeConfig({
            dailySchedule: [
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-07', startTime: '09:00', endTime: '22:00' },
            ],
            roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '17:00', endTime: '20:00' }],
        });
        run(cats, config);
        allMatches(cats).filter(m => m.roundName === 'Final').forEach(f => {
            expect(new Date(f.startTime!).getTime()).toBeGreaterThanOrEqual(at('2026-06-07', '17:00').getTime());
            expect(endOf(f.startTime!).getTime()).toBeLessThanOrEqual(at('2026-06-07', '20:00').getTime());
        });
    });

    it('a round spanning two windows overflows into the second', () => {
        const [main] = makeCategory('A', 8);
        const config = makeConfig({
            courts: 1, restMinutes: 0,
            dailySchedule: [
                { date: '2026-06-05', startTime: '09:00', endTime: '22:00' },
                { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
            ],
            roundWindows: [
                { roundName: 'Cuartos', date: '2026-06-05', startTime: '18:00', endTime: '21:00' },
                { roundName: 'Cuartos', date: '2026-06-06', startTime: '09:00', endTime: '12:00' },
            ],
        });
        run([main], config);
        const cuartos = main.matches.filter(m => m.roundName === 'Cuartos');
        const fri = cuartos.filter(m => new Date(m.startTime!).getDate() === 5);
        const sat = cuartos.filter(m => new Date(m.startTime!).getDate() === 6);
        expect(fri).toHaveLength(2);
        expect(sat).toHaveLength(2);
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/matchAssigner.test.ts`
Esperado: FALLA con `Failed to resolve import "../matchAssigner"`.

- [ ] **Paso 3: Implementar**

`services/scheduler/matchAssigner.ts`:
```ts
import type { Division, Match } from '../../types';
import type { PairAvailability, ScheduleConflict, SchedulerConfig } from './types';
import { ANY_PAIR, normalizeRoundName, pairKeyOf, roundRank } from './types';
import {
    addMinutes, fitsIn, getOperatingIntervals, getRoundIntervals, getStartTimes, hasRoundWindows,
} from './timeGrid';
import { buildMatchIndex, getCandidatePairs, getDependencies } from './candidates';
import { describeViolation, getViolations, violatingPairCount, violationMinutes } from './availability';
import { RoundPlan, roundKeyOf } from './roundPlanner';

export const knownPairKeys = (match: Match): string[] =>
    [pairKeyOf(match.pair1), pairKeyOf(match.pair2)].filter((k): k is string => !!k);

/** Availability is a hard requirement for known pairs and for rounds before `strictAvailabilityUntilRound`. */
export const isStrictMatch = (match: Match, config: SchedulerConfig): boolean => {
    if (knownPairKeys(match).length === 2) return true;
    return roundRank(match.roundName) < roundRank(config.strictAvailabilityUntilRound ?? 'Cuartos');
};

/** Conflicts of a match placed at `start`. */
export const computeConflicts = (
    match: Match,
    start: Date,
    config: SchedulerConfig,
    constraints: Record<string, PairAvailability>,
    candidates: Set<string>,
    outsideWindow: boolean
): ScheduleConflict[] | undefined => {
    const end = addMinutes(start, config.slotDurationMinutes);
    const known = knownPairKeys(match);
    let keys = known;
    let prefix = '';
    if (known.length < 2 && isStrictMatch(match, config)) {
        keys = Array.from(candidates);
        prefix = 'Posible pareja: ';
    }
    const conflicts: ScheduleConflict[] = getViolations(start, end, keys, constraints)
        .map(v => ({ pairKey: v.pairKey, reason: prefix + describeViolation(v) }));
    if (outsideWindow) {
        conflicts.push({ pairKey: ANY_PAIR, reason: `Fuera de franja de ${normalizeRoundName(match.roundName)}` });
    }
    return conflicts.length ? conflicts : undefined;
};

/** Re-evaluates a match at its current startTime using only its known pairs. */
export const evaluateConflicts = (
    match: Match,
    config: SchedulerConfig,
    constraints: Record<string, PairAvailability>
): ScheduleConflict[] | undefined => {
    if (!match.startTime) return undefined;
    const start = new Date(match.startTime);
    const end = addMinutes(start, config.slotDurationMinutes);
    const outside = hasRoundWindows(match.roundName, config) && !fitsIn(start, end, getRoundIntervals(match.roundName, config));
    return computeConflicts(match, start, config, constraints, new Set(knownPairKeys(match)), outside);
};

export interface AssignInput {
    divisions: Division[];                       // mutated in place
    config: SchedulerConfig;
    constraints: Record<string, PairAvailability>;
    plans: Map<string, RoundPlan>;
    toSchedule: Set<string>;                     // ids of matches to place (their startTime must be cleared)
}

interface Booking { start: Date; end: Date; }

interface Info {
    match: Match;
    plan?: RoundPlan;
    starts: Date[];               // allowed starts for its round
    startSet: Set<number>;
    keys: string[];               // pairs whose availability matters (known or candidates)
    candidates: Set<string>;
    strict: boolean;
    compatible: Date[];           // allowed starts with zero violations
    compatibleSet: Set<number>;
    lastStart: Date | null;       // last start that ends before the round deadline
    deps: Match[];
    order: number;
}

/**
 * Phase 2: chronological list scheduling. At each grid instant every free court takes the
 * most urgent ready match (least round slack, then fewest compatible slots left, then bracket order).
 * A match that can no longer find a compatible slot before its deadline is placed in the
 * least-violating slot and flagged with scheduleConflict.
 */
export const assignMatches = ({ divisions, config, constraints, plans, toSchedule }: AssignInput): void => {
    const D = config.slotDurationMinutes;
    const rest = config.restMinutes;
    const index = buildMatchIndex(divisions);
    const candidateMemo = new Map<string, Set<string>>();
    const courts: Booking[][] = Array.from({ length: Math.max(1, config.courts) }, () => []);

    index.byId.forEach(m => {
        if (toSchedule.has(m.id) || !m.startTime || !m.court || m.court > courts.length) return;
        const start = new Date(m.startTime);
        courts[m.court - 1].push({ start, end: addMinutes(start, D) });
    });

    const isFree = (court: number, start: Date) => {
        const end = addMinutes(start, D);
        return courts[court].every(b => b.end <= start || b.start >= end);
    };
    const anyCourtFree = (start: Date) => courts.some((_, c) => isFree(c, start));
    /** Free court at `start`, preferring the one that became free most recently (back-to-back). */
    const pickCourt = (start: Date): number | null => {
        let best: number | null = null;
        let bestLastEnd = -Infinity;
        for (let c = 0; c < courts.length; c++) {
            if (!isFree(c, start)) continue;
            const lastEnd = Math.max(-Infinity, ...courts[c].filter(b => b.end <= start).map(b => b.end.getTime()));
            if (best === null || lastEnd > bestLastEnd) {
                best = c;
                bestLastEnd = lastEnd;
            }
        }
        return best;
    };

    const infos = new Map<string, Info>();
    toSchedule.forEach(id => {
        const match = index.byId.get(id);
        const div = index.divisionOf.get(id);
        if (!match || !div) return;
        const plan = plans.get(roundKeyOf(div.id, match.jornada));
        const starts = getStartTimes(plan?.intervals ?? getRoundIntervals(match.roundName, config), D);
        const known = knownPairKeys(match);
        const candidates = getCandidatePairs(match, index, candidateMemo);
        const keys = known.length === 2 ? known : Array.from(candidates);
        const compatible = starts.filter(s => getViolations(s, addMinutes(s, D), keys, constraints).length === 0);
        const deadline = plan?.deadline ?? null;
        const inDeadline = deadline ? starts.filter(s => addMinutes(s, D) <= deadline) : starts;
        infos.set(id, {
            match, plan, starts, startSet: new Set(starts.map(s => s.getTime())),
            keys, candidates, strict: isStrictMatch(match, config),
            compatible, compatibleSet: new Set(compatible.map(s => s.getTime())),
            lastStart: inDeadline.length ? inDeadline[inDeadline.length - 1] : null,
            deps: getDependencies(match, index),
            order: index.order.get(id) ?? 0,
        });
    });

    /** undefined = a dependency is still unplaced; otherwise the earliest start allowed by dependencies. */
    const readyTime = (info: Info): Date | undefined => {
        let ready = new Date(0);
        for (const dep of info.deps) {
            if (!dep.startTime) {
                if (toSchedule.has(dep.id)) return undefined;
                continue; // BYE / resolved without a slot
            }
            const t = addMinutes(new Date(dep.startTime), D + rest);
            if (t > ready) ready = t;
        }
        return ready;
    };

    const cost = (info: Info, s: Date): [number, number] => {
        const v = getViolations(s, addMinutes(s, D), info.keys, constraints);
        return info.strict ? [violationMinutes(v), 0] : [violatingPairCount(v), violationMinutes(v)];
    };

    const place = (info: Info, start: Date, court: number, outsideWindow: boolean) => {
        const m = info.match;
        m.startTime = start.toISOString();
        m.court = court + 1;
        courts[court].push({ start, end: addMinutes(start, D) });
        const conflicts = computeConflicts(m, start, config, constraints, info.candidates, outsideWindow);
        if (conflicts) m.scheduleConflict = conflicts;
        else delete m.scheduleConflict;
    };

    const placeFallback = (info: Info, from: Date) => {
        const ready = readyTime(info) ?? from;
        const t0 = ready > from ? ready : from;
        const free = (s: Date) => s >= t0 && anyCourtFree(s);
        const within = info.starts.filter(s => free(s) && (!info.lastStart || s <= info.lastStart));
        const pool = within.length ? within : info.starts.filter(free);
        if (pool.length) {
            let best = pool[0];
            let bestCost = cost(info, best);
            for (const s of pool.slice(1)) {
                const c = cost(info, s);
                if (c[0] < bestCost[0] || (c[0] === bestCost[0] && c[1] < bestCost[1])) {
                    best = s;
                    bestCost = c;
                }
            }
            place(info, best, pickCourt(best)!, false);
            return;
        }
        const anyOperating = getStartTimes(getOperatingIntervals(config), D).find(free);
        if (anyOperating) {
            place(info, anyOperating, pickCourt(anyOperating)!, true);
            return;
        }
        info.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
    };

    const remainingCompatible = (info: Info, t: Date) =>
        info.compatible.filter(s => s >= t && (!info.lastStart || s <= info.lastStart)).length;

    const hasFutureCompatible = (info: Info, t: Date) =>
        info.compatible.some(s => s > t && (!info.lastStart || s <= info.lastStart) && anyCourtFree(s));

    const isEligible = (info: Info, t: Date) =>
        info.startSet.has(t.getTime()) && info.compatibleSet.has(t.getTime());

    const byPriority = (infosAtT: Info[], t: Date): Info[] => {
        const remaining = new Map(infosAtT.map(i => [i, remainingCompatible(i, t)]));
        return infosAtT.sort((a, b) =>
            (a.plan?.latestStart?.getTime() ?? Infinity) - (b.plan?.latestStart?.getTime() ?? Infinity) ||
            remaining.get(a)! - remaining.get(b)! ||
            a.order - b.order);
    };

    const pending = new Set(infos.keys());
    const grid = Array.from(new Set(Array.from(infos.values()).flatMap(i => i.starts.map(s => s.getTime()))))
        .sort((a, b) => a - b)
        .map(ms => new Date(ms));

    for (const t of grid) {
        if (!pending.size) break;
        const ready = byPriority(Array.from(pending)
            .map(id => infos.get(id)!)
            .filter(info => {
                const r = readyTime(info);
                return r !== undefined && r <= t;
            }), t);
        if (!ready.length) continue;

        // 1) Matches that can no longer get a compatible slot before their deadline
        const courtFreeAtT = anyCourtFree(t);
        for (const info of ready) {
            if (isEligible(info, t) && courtFreeAtT) continue;
            if (hasFutureCompatible(info, t)) continue;
            placeFallback(info, t);
            pending.delete(info.match.id);
        }

        // 2) Fill the free courts at t with the most urgent eligible matches
        for (const info of ready) {
            if (!pending.has(info.match.id) || !isEligible(info, t)) continue;
            const court = pickCourt(t);
            if (court === null) break;
            place(info, t, court, false);
            pending.delete(info.match.id);
        }
    }

    // Leftovers (dependencies resolved after the last grid instant)
    let progress = true;
    while (pending.size && progress) {
        progress = false;
        for (const id of Array.from(pending).sort((a, b) => infos.get(a)!.order - infos.get(b)!.order)) {
            const info = infos.get(id)!;
            const r = readyTime(info);
            if (r === undefined) continue;
            placeFallback(info, r);
            pending.delete(id);
            progress = true;
        }
    }
    pending.forEach(id => {
        infos.get(id)!.match.scheduleConflict = [{ pairKey: ANY_PAIR, reason: 'Sin capacidad' }];
    });
};
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run services/scheduler/__tests__/matchAssigner.test.ts`
Esperado: PASA (8 tests).

- [ ] **Paso 5: Commit**

```bash
git add services/scheduler/matchAssigner.ts services/scheduler/__tests__/matchAssigner.test.ts
git commit -m "feat(scheduler): fase 2, asignación con prioridades y conflictos marcados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 7: Fachada `SchedulerEngine`, modos y conexión mínima

Esta tarea sustituye el motor antiguo. Para que la app no se rompa entre tareas, también cambia las dos llamadas de `RankingView` a la API nueva. La Tarea 11 las completará.

**Archivos:**
- Crear: `services/scheduler/index.ts`
- Reemplazar: `services/SchedulerEngine.ts`
- Borrar: `services/__tests__/SchedulerEngine.test.ts`
- Modificar: `components/RankingView.tsx` (2 llamadas)
- Test: `services/scheduler/__tests__/SchedulerEngine.integration.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

`services/scheduler/__tests__/SchedulerEngine.integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { Division, Match, Ranking } from '../../../types';
import type { PairAvailability } from '../types';
import { SchedulerEngine } from '../index';
import { TournamentEngine } from '../../TournamentEngine';
import { allMatches, at, endOf, makeCategory, makeConfig, makeRanking, pairIds } from './fixtures';

const weekend = (overrides = {}) => makeConfig({
    courts: 6,
    dailySchedule: [
        { date: '2026-06-05', startTime: '17:00', endTime: '22:00' },
        { date: '2026-06-06', startTime: '09:00', endTime: '22:00' },
        { date: '2026-06-07', startTime: '09:00', endTime: '14:00' },
    ],
    roundWindows: [{ roundName: 'Final', date: '2026-06-07', startTime: '11:00', endTime: '14:00' }],
    ...overrides,
});

/** Plays every playable match (pair1 always wins) the way RankingView does, calling onResultEntered after each. */
const playAll = (ranking: Ranking): Ranking => {
    let current = ranking;
    for (let guard = 0; guard < 500; guard++) {
        const next = allMatches(current.divisions)
            .filter(m => m.status === 'pendiente' && m.pair1.p1Id && m.pair2.p1Id && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
            .sort((a, b) => a.jornada - b.jornada)[0];
        if (!next) break;
        next.status = 'finalizado';
        next.points = { p1: 1, p2: 0 };
        let divisions = TournamentEngine.advanceWinner(next, current, { p1: next.pair1.p1Id, p2: next.pair1.p2Id });
        const isMainFirstRound = current.divisions.find(d => d.matches.includes(next))?.type === 'main' && next.jornada === 1;
        if (isMainFirstRound) {
            divisions = TournamentEngine.moveLoserToConsolation(next, { ...current, divisions }, { p1: next.pair2.p1Id, p2: next.pair2.p2Id });
        }
        divisions = TournamentEngine.tryResolveConsolationDeferred({ divisions });
        current = { ...current, divisions: SchedulerEngine.onResultEntered({ ...current, divisions }).divisions };
    }
    return current;
};

const timesById = (divisions: Division[]) =>
    Object.fromEntries(allMatches(divisions).map(m => [m.id, `${m.startTime}|${m.court}`]));

describe('SchedulerEngine (integration)', () => {
    it('full mode: entering every result never moves a scheduled match', () => {
        const ranking = makeRanking([...makeCategory('A', 8, true), ...makeCategory('B', 6, true)], weekend());
        const scheduled = { ...ranking, divisions: SchedulerEngine.generateSchedule(ranking) };
        const before = timesById(scheduled.divisions);
        allMatches(scheduled.divisions).filter(m => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE')
            .forEach(m => {
                expect(m.startTime).toBeTruthy();
                expect(m.scheduleLocked).toBe(true);
                expect(m.scheduleEstimated).toBe(false);
            });

        const played = playAll(scheduled);
        expect(allMatches(played.divisions).filter(m => m.status === 'finalizado' && m.score?.description !== 'BYE').length).toBeGreaterThan(15);
        const after = timesById(played.divisions);
        Object.entries(before).forEach(([id, slot]) => {
            if (slot.startsWith('undefined')) return; // BYE matches never get a slot
            expect(after[id]).toBe(slot);
        });
    });

    it('re-generating keeps locked matches untouched', () => {
        const ranking = makeRanking(makeCategory('A', 8), weekend());
        const first = SchedulerEngine.generateSchedule(ranking);
        const second = SchedulerEngine.generateSchedule({ ...ranking, divisions: first });
        expect(timesById(second)).toEqual(timesById(first));
    });

    it('includeLocked recomputes locked matches', () => {
        const ranking = makeRanking(makeCategory('A', 4), weekend());
        const first = SchedulerEngine.generateSchedule(ranking);
        const moved = first.map(d => ({ ...d, matches: d.matches.map(m => m.jornada === 1 ? { ...m, startTime: at('2026-06-06', '20:00').toISOString() } : m) }));
        const regenerated = SchedulerEngine.generateSchedule({ ...ranking, divisions: moved }, { includeLocked: true });
        expect(timesById(regenerated)).toEqual(timesById(first));
    });

    it('a locked match on a day removed from the configuration is rescheduled', () => {
        const [main] = makeCategory('A', 2);
        main.matches[0].startTime = at('2026-06-04', '18:00').toISOString();
        main.matches[0].court = 1;
        main.matches[0].scheduleLocked = true;
        const [div] = SchedulerEngine.generateSchedule(makeRanking([main], weekend()));
        expect(new Date(div.matches[0].startTime!).getDate()).not.toBe(4);
        expect(div.matches[0].scheduleLocked).toBe(true);
    });

    it('daily mode: only the current day is locked, lockNextDay locks the next one', () => {
        const ranking = makeRanking(makeCategory('A', 16), weekend({ mode: 'daily' }));
        const divisions = SchedulerEngine.generateSchedule(ranking, { now: at('2026-06-01', '10:00') });
        const scheduled = allMatches(divisions).filter(m => m.startTime);
        const friday = scheduled.filter(m => new Date(m.startTime!).getDate() === 5);
        const later = scheduled.filter(m => new Date(m.startTime!).getDate() > 5);
        expect(friday.length).toBeGreaterThan(0);
        expect(later.length).toBeGreaterThan(0);
        friday.forEach(m => expect(m.scheduleLocked).toBe(true));
        later.forEach(m => expect(m.scheduleEstimated).toBe(true));

        const fridayBefore: Record<string, string> = Object.fromEntries(friday.map(m => [m.id, `${m.startTime}|${m.court}`]));
        const next = SchedulerEngine.lockNextDay({ ...ranking, divisions });
        const saturday = allMatches(next).filter(m => m.startTime && new Date(m.startTime).getDate() === 6);
        saturday.forEach(m => expect(m.scheduleLocked).toBe(true));
        allMatches(next).filter(m => m.startTime && new Date(m.startTime).getDate() === 7)
            .forEach(m => expect(m.scheduleEstimated).toBe(true));
        allMatches(next).filter(m => fridayBefore[m.id]).forEach(m => expect(`${m.startTime}|${m.court}`).toBe(fridayBefore[m.id]));
    });

    it('balances categories: every final lands in its window', () => {
        const divisions = [...makeCategory('A', 8), ...makeCategory('B', 16), ...makeCategory('C', 32)];
        const ranking = makeRanking(divisions, weekend());
        expect(SchedulerEngine.checkFeasibility(ranking)).toEqual([]);
        const result = SchedulerEngine.generateSchedule(ranking);
        const finals = allMatches(result).filter(m => m.roundName === 'Final');
        expect(finals).toHaveLength(3);
        finals.forEach(f => {
            expect(new Date(f.startTime!).getTime()).toBeGreaterThanOrEqual(at('2026-06-07', '11:00').getTime());
            expect(endOf(f.startTime!).getTime()).toBeLessThanOrEqual(at('2026-06-07', '14:00').getTime());
            expect(f.scheduleConflict).toBeUndefined();
        });
    });

    it('respects legacy constraints stored with the pair in reverse order', () => {
        const [main] = makeCategory('A', 2);
        const reversedKey = 'A1b::A1a';
        const ranking = makeRanking([main], weekend(), {
            [reversedKey]: { unavailableRanges: [{ date: '2026-06-05', startTime: '00:00', endTime: '23:59' }, { date: '2026-06-06', startTime: '00:00', endTime: '20:00' }] },
        });
        const [div] = SchedulerEngine.generateSchedule(ranking);
        const start = new Date(div.matches[0].startTime!);
        expect(start.getTime()).toBeGreaterThanOrEqual(at('2026-06-06', '20:00').getTime());
    });

    it('treats legacy confirmed slots as locked', () => {
        const [main] = makeCategory('A', 2);
        main.matches[0].startTime = at('2026-06-06', '18:00').toISOString();
        main.matches[0].court = 3;
        const [div] = SchedulerEngine.generateSchedule(makeRanking([main], weekend()));
        expect(div.matches[0].startTime).toBe(at('2026-06-06', '18:00').toISOString());
        expect(div.matches[0].scheduleLocked).toBe(true);
    });

    it('onResultEntered flags (but does not move) a match whose real pair is unavailable', () => {
        const [main] = makeCategory('A', 4);
        const ranking = makeRanking([main], weekend());
        const divisions = SchedulerEngine.generateSchedule(ranking);
        const final = divisions[0].matches.find(m => m.roundName === 'Final')!;
        const finalStart = new Date(final.startTime!);
        const semi = divisions[0].matches.find(m => m.nextMatchId === final.id && m.nextMatchSlot === 1)!;
        const winnerKey = `${semi.pair1.p1Id}::${semi.pair1.p2Id}`;
        const constraints: Record<string, PairAvailability> = {
            [winnerKey]: { unavailableRanges: [{ date: '2026-06-07', startTime: '00:00', endTime: '23:59' }] },
        };
        final.pair1 = { ...semi.pair1 };
        final.pair2 = { p1Id: 'X1', p2Id: 'X2' };
        const { divisions: checked, newConflicts } = SchedulerEngine.onResultEntered({ ...ranking, divisions, pairConstraints: constraints });
        const checkedFinal = checked[0].matches.find(m => m.id === final.id)!;
        expect(new Date(checkedFinal.startTime!).getTime()).toBe(finalStart.getTime());
        expect(checkedFinal.scheduleConflict?.[0].pairKey).toBe(winnerKey);
        expect(newConflicts).toHaveLength(1);
    });

    it('reference tournament: 6 categories, 4 courts, 30% restricted pairs → no conflicts, < 1s', () => {
        const divisions = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap(c => makeCategory(c, 8));
        const constraints: Record<string, PairAvailability> = {};
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => pairIds(c, 8).forEach((key, i) => {
            if (i % 10 !== 0 && i % 10 !== 3 && i % 10 !== 6) return; // ~30%
            constraints[key] = i % 2 === 0
                ? { unavailableRanges: [{ date: '2026-06-05', startTime: '00:00', endTime: '23:59' }] }       // no Friday
                : { unavailableRanges: [{ date: '2026-06-06', startTime: '00:00', endTime: '15:00' }] };      // Saturday afternoon only
        }));
        const ranking = makeRanking(divisions, weekend({ courts: 4 }), constraints);
        const t0 = performance.now();
        const result = SchedulerEngine.generateSchedule(ranking);
        const elapsed = performance.now() - t0;
        const conflicts = allMatches(result).filter((m: Match) => m.scheduleConflict);
        expect(conflicts.map(m => `${m.roundName}: ${m.scheduleConflict!.map(c => c.reason).join(', ')}`)).toEqual([]);
        expect(allMatches(result).filter(m => m.status === 'pendiente').every(m => m.startTime)).toBe(true);
        expect(elapsed).toBeLessThan(1000);
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run services/scheduler/__tests__/SchedulerEngine.integration.test.ts`
Esperado: FALLA con `Failed to resolve import "../index"`.

- [ ] **Paso 3: Implementar la fachada**

`services/scheduler/index.ts`:
```ts
import type { Division, Match, Ranking } from '../../types';
import type { FeasibilityWarning, PlayerAvailability, ScheduleConflict, SchedulerConfig } from './types';
import { normalizePairConstraints, normalizeRoundName, pairKeyOf } from './types';
import { addMinutes, localDateKey, parseTimeOnDate } from './timeGrid';
import { planRounds } from './roundPlanner';
import { assignMatches, evaluateConflicts } from './matchAssigner';

export * from './types';
export { STEP_MINUTES, localDateKey } from './timeGrid';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Pending and not blocked by a known BYE (those are never played). */
const isSchedulable = (m: Match) => m.status === 'pendiente' && m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE';

export interface ResultCheck {
    divisions: Division[];
    newConflicts: { matchId: string; conflicts: ScheduleConflict[] }[];
}

export class SchedulerEngine {

    // ---- Generation ----

    /** Pre-generation check: rounds or phase windows that cannot fit. */
    static checkFeasibility(ranking: Ranking): FeasibilityWarning[] {
        if (!ranking.schedulerConfig) return [];
        return planRounds(ranking.divisions, ranking.schedulerConfig).warnings;
    }

    /**
     * Generates the schedule. Locked or played matches stay where they are unless includeLocked.
     * Mode 'full' locks everything; mode 'daily' locks the current tournament day and estimates the rest.
     */
    static generateSchedule(ranking: Ranking, opts: { includeLocked?: boolean; now?: Date } = {}): Division[] {
        const config = ranking.schedulerConfig;
        if (!config?.dailySchedule?.length) return ranking.divisions;
        const lockUntil = (config.mode ?? 'full') === 'full' ? null : SchedulerEngine.currentDayKey(config, opts.now ?? new Date());
        return SchedulerEngine.run(ranking, !!opts.includeLocked, lockUntil);
    }

    /** Mode 'daily': recomputes unlocked matches and locks the first day that still has estimates. */
    static lockNextDay(ranking: Ranking): Division[] {
        const config = ranking.schedulerConfig;
        if (!config?.dailySchedule?.length) return ranking.divisions;
        const day = SchedulerEngine.firstEstimatedDay(ranking.divisions);
        return day ? SchedulerEngine.run(ranking, false, day) : ranking.divisions;
    }

    static firstEstimatedDay(divisions: Division[]): string | null {
        const days = divisions.flatMap(d => d.matches)
            .filter(m => m.status === 'pendiente' && m.scheduleEstimated && m.startTime)
            .map(m => localDateKey(new Date(m.startTime!)))
            .sort();
        return days[0] ?? null;
    }

    /**
     * After a result: never moves anything. Re-checks availability of matches whose two pairs
     * are now known and returns the conflicts that are new.
     */
    static onResultEntered(ranking: Ranking): ResultCheck {
        const config = ranking.schedulerConfig;
        if (!config) return { divisions: ranking.divisions, newConflicts: [] };
        const divisions: Division[] = clone(ranking.divisions);
        const constraints = normalizePairConstraints(ranking.pairConstraints);
        const newConflicts: ResultCheck['newConflicts'] = [];
        divisions.forEach(d => d.matches.forEach(m => {
            if (m.status !== 'pendiente' || !m.startTime || m.scheduleEstimated) return;
            if (!pairKeyOf(m.pair1) || !pairKeyOf(m.pair2)) return;
            const before = m.scheduleConflict ?? [];
            const after = evaluateConflicts(m, config, constraints);
            if (after) m.scheduleConflict = after;
            else delete m.scheduleConflict;
            const added = (after ?? []).filter(c => !before.some(b => b.pairKey === c.pairKey && b.reason === c.reason));
            if (added.length) newConflicts.push({ matchId: m.id, conflicts: added });
        }));
        return { divisions, newConflicts };
    }

    /** Conflicts of a match at its current startTime (for manual moves). */
    static computeConflicts(match: Match, ranking: Ranking): ScheduleConflict[] | undefined {
        if (!ranking.schedulerConfig) return undefined;
        return evaluateConflicts(match, ranking.schedulerConfig, normalizePairConstraints(ranking.pairConstraints));
    }

    private static run(ranking: Ranking, includeLocked: boolean, lockUntil: string | null): Division[] {
        const config = ranking.schedulerConfig!;
        const divisions: Division[] = clone(ranking.divisions);
        const constraints = normalizePairConstraints(ranking.pairConstraints);
        const tournamentDays = new Set((config.dailySchedule ?? []).map(d => d.date));
        const toSchedule = new Set<string>();

        divisions.forEach(d => d.matches.forEach(m => {
            // Legacy data: a confirmed (non-estimated) slot counts as locked
            if (m.startTime && m.scheduleLocked === undefined && !m.scheduleEstimated) m.scheduleLocked = true;
            // A locked match on a day that is no longer part of the tournament has to move
            if (m.scheduleLocked && m.startTime && !tournamentDays.has(localDateKey(new Date(m.startTime)))) m.scheduleLocked = false;
            if (!isSchedulable(m) || (m.scheduleLocked && !includeLocked)) return;
            delete m.startTime;
            delete m.court;
            delete m.scheduleConflict;
            m.scheduleEstimated = false;
            m.scheduleLocked = false;
            toSchedule.add(m.id);
        }));

        const { plans } = planRounds(divisions, config);
        assignMatches({ divisions, config, constraints, plans, toSchedule });

        divisions.forEach(d => d.matches.forEach(m => {
            if (!toSchedule.has(m.id) || !m.startTime) return;
            const lock = lockUntil === null || localDateKey(new Date(m.startTime)) <= lockUntil;
            m.scheduleLocked = lock;
            m.scheduleEstimated = !lock;
        }));
        return divisions;
    }

    /** Today if it is a tournament day, else the next tournament day, else the last one. */
    private static currentDayKey(config: SchedulerConfig, now: Date): string {
        const days = (config.dailySchedule ?? []).map(d => d.date).sort();
        const today = localDateKey(now);
        return days.find(d => d >= today) ?? days[days.length - 1];
    }

    // ---- Helpers used by the UI ----

    static addMinutes(date: Date, minutes: number): Date {
        return addMinutes(date, minutes);
    }

    static parseTimeOnDate(timeStr: string, dateStr: string): Date {
        return parseTimeOnDate(timeStr, dateStr);
    }

    static normalizeRoundName(name?: string): string {
        return normalizeRoundName(name);
    }

    static doRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
        return start1 < end2 && start2 < end1;
    }

    static checkMatchConflict(
        startTime: Date,
        endTime: Date,
        court: number,
        occupiedSlots: { start: Date; end: Date; court: number }[]
    ): boolean {
        return occupiedSlots.some(slot =>
            slot.court === court && SchedulerEngine.doRangesOverlap(startTime, endTime, slot.start, slot.end));
    }

    /** @deprecated legacy per-player constraints */
    static checkPlayerAvailability(
        startTime: Date,
        endTime: Date,
        playerIds: string[],
        allConstraints: Record<string, PlayerAvailability>
    ): { valid: boolean; conflictPlayerId?: string; conflictRange?: { start: string; end: string } } {
        if (!allConstraints) return { valid: true };
        for (const pid of playerIds) {
            for (const range of allConstraints[pid]?.unavailableRanges ?? []) {
                if (SchedulerEngine.doRangesOverlap(startTime, endTime, new Date(range.start), new Date(range.end))) {
                    return { valid: false, conflictPlayerId: pid, conflictRange: range };
                }
            }
        }
        return { valid: true };
    }

    static getAllOccupiedSlots(ranking: Ranking, excludeMatchId?: string): { start: Date; end: Date; court: number }[] {
        const duration = ranking.schedulerConfig?.slotDurationMinutes || 90;
        return ranking.divisions.flatMap(div => div.matches)
            .filter(m => m.startTime && m.court && m.id !== excludeMatchId)
            .map(m => ({
                start: new Date(m.startTime!),
                end: addMinutes(new Date(m.startTime!), duration),
                court: m.court!,
            }));
    }
}
```

- [ ] **Paso 4: Sustituir el motor antiguo y borrar su test**

Reemplaza todo el contenido de `services/SchedulerEngine.ts` por:
```ts
// Kept so existing imports keep working; the engine lives in ./scheduler
export * from './scheduler';
```

```bash
git rm services/__tests__/SchedulerEngine.test.ts
```

- [ ] **Paso 5: Conexión mínima en `RankingView`**

En `components/RankingView.tsx`, dentro de `handleGenerateFullSchedule`, sustituye:
```ts
    const newDivisions = SchedulerEngine.generateFullSchedule(ranking);
```
por:
```ts
    const newDivisions = SchedulerEngine.generateSchedule(ranking);
```

Y en el gancho reactivo (busca `// Reactive Scheduler Hook`) sustituye:
```ts
          newDivisions = SchedulerEngine.scheduleNextMatches(updatedMatch, tempRanking, activeDivision.id);
```
por:
```ts
          newDivisions = SchedulerEngine.onResultEntered(tempRanking).divisions;
```

- [ ] **Paso 6: Ejecutar los tests y los tipos**

Ejecuta: `npx vitest run`
Esperado: PASA toda la suite (incluidos los 10 tests de integración).

Ejecuta: `npx tsc --noEmit -p .`
Esperado: solo los 2 errores previos de `RankingView.tsx` (`'mexicano'`/`'americano'`).

- [ ] **Paso 7: Commit**

```bash
git add services/scheduler/index.ts services/scheduler/__tests__/SchedulerEngine.integration.test.ts services/SchedulerEngine.ts components/RankingView.tsx
git commit -m "feat(scheduler): fachada SchedulerEngine v2 con modos completo y por día

Sustituye el motor voraz; las horas ya no se mueven al meter resultados.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 8: Configuración (modo, 75 min y claves normalizadas)

**Archivos:**
- Modificar: `components/SchedulerConfigModal.tsx`

- [ ] **Paso 1: Import**

Sustituye:
```ts
import { SchedulerConfig, PairAvailability, makePairKey, SchedulerEngine } from '../services/SchedulerEngine';
```
por:
```ts
import { SchedulerConfig, PairAvailability, makePairKey, SchedulerEngine, normalizePairConstraints, roundRank } from '../services/SchedulerEngine';
```

- [ ] **Paso 2: Estado del modo**

Debajo de `const [restMinutes, setRestMinutes] = useState(initialConfig?.restMinutes || 60);` añade:
```ts
    const [mode, setMode] = useState<'full' | 'daily'>(initialConfig?.mode ?? 'full');
```

- [ ] **Paso 3: Restricciones normalizadas al abrir**

Sustituye:
```ts
    const [pairConstraints, setPairConstraints] = useState<Record<string, PairAvailability>>(
        initialPairConstraints ?? {}
    );
```
por:
```ts
    const [pairConstraints, setPairConstraints] = useState<Record<string, PairAvailability>>(
        () => normalizePairConstraints(initialPairConstraints)
    );
```

- [ ] **Paso 4: Usar `roundRank` en el orden de las fases**

En el `useMemo` de `roundNames`, sustituye la función local `rank` y el `return`:
```ts
        const rank = (name: string): number => {
            if (name === 'Final') return 5000;
            if (name === 'Semifinales') return 4000;
            if (name === 'Cuartos') return 3000;
            if (name === 'Octavos') return 2000;
            const m = name.match(/Ronda de (\d+)/);
            if (m) return 1000 - Number(m[1]); // larger bracket plays earlier
            return 0;
        };
        return Array.from(set).sort((a, b) => rank(a) - rank(b));
```
por:
```ts
        return Array.from(set).sort((a, b) => roundRank(a) - roundRank(b));
```

- [ ] **Paso 5: Guardar el modo**

En `handleSave`, sustituye:
```ts
            courts,
            slotDurationMinutes: slotDuration,
            restMinutes,
            timeWindows:
```
por el bloque siguiente. El spread condicional evita guardar `undefined`, que Firestore rechaza.
```ts
            courts,
            slotDurationMinutes: slotDuration,
            restMinutes,
            mode,
            ...(initialConfig?.strictAvailabilityUntilRound
                ? { strictAvailabilityUntilRound: initialConfig.strictAvailabilityUntilRound }
                : {}),
            timeWindows:
```

- [ ] **Paso 6: Opción de 75 min y selector de modo (pestaña Recursos)**

Sustituye:
```tsx
                                    <option value={60}>60 min</option>
                                    <option value={90}>90 min (Estándar)</option>
```
por:
```tsx
                                    <option value={60}>60 min</option>
                                    <option value={75}>75 min</option>
                                    <option value={90}>90 min (Estándar)</option>
```

Y al final de la pestaña Recursos sustituye:
```tsx
                                    <option value={120}>120 min</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
```
(es el bloque que cierra el `select` de **descanso**, el segundo `120 min` del archivo) por:
```tsx
                                    <option value={120}>120 min</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Modo de horario</label>
                            <select className="mt-1 block w-full border rounded-md p-2"
                                value={mode} onChange={e => setMode(e.target.value as 'full' | 'daily')}>
                                <option value="full">Horario completo: se fija todo al generar</option>
                                <option value="daily">Por día: se fija el día en curso, el resto es estimado</option>
                            </select>
                        </div>
                    </div>
                )}
```

- [ ] **Paso 7: Comprobar tipos y tests**

Ejecuta: `npx tsc --noEmit -p .` → solo los 2 errores previos.
Ejecuta: `npx vitest run` → todo en verde.

- [ ] **Paso 8: Commit**

```bash
git add components/SchedulerConfigModal.tsx
git commit -m "feat(scheduler): modo de horario y duración de 75 min en la configuración

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 9: Componentes compartidos de interfaz

**Archivos:**
- Crear: `components/scheduler/pairLabel.ts`
- Crear: `components/scheduler/ScheduleStatusBadges.tsx`
- Crear: `components/scheduler/ScheduleConflictsModal.tsx`
- Crear: `components/scheduler/GenerateScheduleModal.tsx`
- Test: `components/scheduler/__tests__/schedulerUi.test.tsx`

- [ ] **Paso 1: Escribir el test que falla**

`components/scheduler/__tests__/schedulerUi.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Match, Ranking } from '../../../types';
import { ScheduleStatusBadges } from '../ScheduleStatusBadges';
import { ScheduleConflictsModal, getConflictMatches } from '../ScheduleConflictsModal';
import { GenerateScheduleModal } from '../GenerateScheduleModal';

const match = (overrides: Partial<Match> = {}): Match => ({
    id: 'm1', jornada: 1, roundName: 'Cuartos',
    pair1: { p1Id: 'a', p2Id: 'b' }, pair2: { p1Id: 'c', p2Id: 'd' },
    points: { p1: 0, p2: 0 }, status: 'pendiente',
    startTime: new Date(2026, 5, 6, 17, 0).toISOString(), court: 1,
    ...overrides,
});

const ranking = (matches: Match[]): Ranking => ({
    id: 'r', nombre: 'T', categoria: 'Masculino', fechaInicio: '', status: 'activo', format: 'elimination',
    divisions: [{ id: 'd', numero: 1, status: 'activa', players: [], matches, category: '1ª Masc' }],
    schedulerConfig: { courts: 2, slotDurationMinutes: 90, restMinutes: 60, timeWindows: [] },
});

const players = {
    a: { id: 'a', nombre: 'Ana', apellidos: 'García' },
    b: { id: 'b', nombre: 'Bea', apellidos: 'López' },
} as any;

describe('scheduler UI', () => {
    it('ScheduleStatusBadges shows the estimated label and the conflict reasons', () => {
        const m = match({ scheduleEstimated: true, scheduleConflict: [{ pairKey: 'a::b', reason: 'No disponible sáb 17:00–19:00' }] });
        const { container } = render(<ScheduleStatusBadges match={m} ranking={ranking([m])} showConflicts />);
        expect(screen.getByText('· estimado')).toBeInTheDocument();
        expect(container.querySelector('[title="No disponible sáb 17:00–19:00"]')).not.toBeNull();
    });

    it('ScheduleStatusBadges hides conflicts from non-admins', () => {
        const m = match({ scheduleConflict: [{ pairKey: 'a::b', reason: 'X' }] });
        const { container } = render(<ScheduleStatusBadges match={m} ranking={ranking([m])} showConflicts={false} />);
        expect(container.querySelector('[title="X"]')).toBeNull();
    });

    it('ScheduleConflictsModal lists conflicts with pair names and opens the move dialog', () => {
        const m = match({ scheduleConflict: [{ pairKey: 'a::b', reason: 'No disponible sáb 17:00–19:00' }] });
        const r = ranking([m, match({ id: 'm2' })]);
        expect(getConflictMatches(r)).toHaveLength(1);
        const onMove = vi.fn();
        render(<ScheduleConflictsModal isOpen onClose={() => {}} ranking={r} players={players} onMove={onMove} />);
        expect(screen.getByText('Ana G. / Bea L.: No disponible sáb 17:00–19:00')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Mover'));
        expect(onMove).toHaveBeenCalledWith(m);
    });

    it('GenerateScheduleModal shows warnings and generates on confirm', () => {
        const onGenerate = vi.fn();
        render(<GenerateScheduleModal isOpen onClose={() => {}} warnings={[{ message: 'Semifinales no cabe' }]}
            hasLocked={false} onGenerate={onGenerate} onConfigure={() => {}} />);
        expect(screen.getByText('Semifinales no cabe')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Generar igualmente'));
        expect(onGenerate).toHaveBeenCalledWith(false);
    });
});
```

- [ ] **Paso 2: Ejecutarlo y comprobar que falla**

Ejecuta: `npx vitest run components/scheduler`
Esperado: FALLA con `Failed to resolve import "../ScheduleStatusBadges"`.

- [ ] **Paso 3: Implementar**

`components/scheduler/pairLabel.ts`:
```ts
import { Player } from '../../types';

/** "Ana G. / Luis P." from a pair key ("id1::id2"). */
export const pairLabel = (pairKey: string, players: Record<string, Player>): string =>
    pairKey.split('::').filter(Boolean).map(id => {
        const p = players[id];
        return p ? `${p.nombre} ${(p.apellidos || '').charAt(0)}.`.trim() : id;
    }).join(' / ');
```

`components/scheduler/ScheduleStatusBadges.tsx`:
```tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Match, Ranking } from '../../types';
import { SchedulerEngine } from '../../services/SchedulerEngine';

interface Props {
    match: Match;
    ranking: Ranking;
    showConflicts: boolean;
    size?: number;
}

/** "· estimado" label for projected slots + red icon for availability, window or court conflicts. */
export const ScheduleStatusBadges = ({ match, ranking, showConflicts, size = 14 }: Props) => {
    if (!match.startTime) return null;
    const reasons = (match.scheduleConflict ?? []).map(c => c.reason);
    if (showConflicts && match.court) {
        const start = new Date(match.startTime);
        const end = SchedulerEngine.addMinutes(start, ranking.schedulerConfig?.slotDurationMinutes || 90);
        const occupied = SchedulerEngine.getAllOccupiedSlots(ranking, match.id);
        if (SchedulerEngine.checkMatchConflict(start, end, match.court, occupied)) reasons.push(`Pista ${match.court} ocupada`);
    }
    return (
        <>
            {match.scheduleEstimated && <span className="ml-1 italic font-medium text-amber-600">· estimado</span>}
            {showConflicts && reasons.length > 0 && (
                <span className="ml-2 text-red-500" title={reasons.join('\n')}>
                    <AlertTriangle size={size} />
                </span>
            )}
        </>
    );
};
```

`components/scheduler/ScheduleConflictsModal.tsx`:
```tsx
import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { Modal, Button } from '../ui/Components';
import { Match, Player, Ranking } from '../../types';
import { ANY_PAIR } from '../../services/SchedulerEngine';
import { pairLabel } from './pairLabel';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    players: Record<string, Player>;
    onMove: (match: Match) => void;
}

export const getConflictMatches = (ranking: Ranking): Match[] =>
    ranking.divisions.flatMap(d => d.matches)
        .filter(m => m.status === 'pendiente' && m.scheduleConflict?.length)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

export const ScheduleConflictsModal = ({ isOpen, onClose, ranking, players, onMove }: Props) => {
    const matches = getConflictMatches(ranking);
    const categoryOf = (m: Match) => {
        const div = ranking.divisions.find(d => d.matches.some(x => x.id === m.id));
        return div?.category || div?.name || '';
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Conflictos de horario (${matches.length})`} maxWidth="max-w-2xl">
            {matches.length === 0 ? (
                <p className="text-sm text-gray-500">No hay conflictos.</p>
            ) : (
                <ul className="space-y-3">
                    {matches.map(m => (
                        <li key={m.id} className="border border-red-100 bg-red-50 rounded-lg p-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0 text-sm">
                                <div className="font-semibold text-gray-800">
                                    {categoryOf(m)} · {m.roundName || `Ronda ${m.jornada}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {m.startTime
                                        ? new Date(m.startTime).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : 'Sin hora'}
                                    {m.court ? ` · Pista ${m.court}` : ''}
                                </div>
                                <ul className="mt-1 text-xs text-red-700 space-y-0.5">
                                    {m.scheduleConflict!.map((c, i) => (
                                        <li key={i}>
                                            {c.pairKey === ANY_PAIR ? c.reason : `${pairLabel(c.pairKey, players)}: ${c.reason}`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => onMove(m)}>
                                <Calendar size={14} /> Mover
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
};
```

`components/scheduler/GenerateScheduleModal.tsx`:
```tsx
import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui/Components';
import { FeasibilityWarning } from '../../services/SchedulerEngine';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    warnings: FeasibilityWarning[];
    hasLocked: boolean;
    onGenerate: (includeLocked: boolean) => void;
    onConfigure: () => void;
}

/** Shown before generating when the plan does not fit or some matches are already locked. */
export const GenerateScheduleModal = ({ isOpen, onClose, warnings, hasLocked, onGenerate, onConfigure }: Props) => {
    const [includeLocked, setIncludeLocked] = useState(false);

    const handleGenerate = () => {
        if (includeLocked && !window.confirm('Se recalcularán también los partidos ya fijados y sus horas pueden cambiar. ¿Continuar?')) return;
        onGenerate(includeLocked);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generar horario">
            <div className="space-y-4">
                {warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                            <AlertTriangle size={16} /> El horario no cabe tal como está configurado
                        </div>
                        <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
                            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                        </ul>
                        <p className="text-xs text-amber-700 mt-2">
                            Si generas igualmente, los partidos que no quepan saldrán marcados como conflicto.
                        </p>
                    </div>
                )}
                {hasLocked && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={includeLocked} onChange={e => setIncludeLocked(e.target.checked)} />
                        Regenerar también los partidos ya fijados
                    </label>
                )}
                <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button variant="secondary" onClick={() => { onClose(); onConfigure(); }}>Volver a configurar</Button>
                    <Button onClick={handleGenerate}>{warnings.length ? 'Generar igualmente' : 'Generar'}</Button>
                </div>
            </div>
        </Modal>
    );
};
```

- [ ] **Paso 4: Ejecutarlo y comprobar que pasa**

Ejecuta: `npx vitest run components/scheduler`
Esperado: PASA (4 tests).

- [ ] **Paso 5: Commit**

```bash
git add components/scheduler
git commit -m "feat(scheduler): insignias de estado, panel de conflictos y modal de generación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 10: `ScheduleModal` con disponibilidad por pareja y valor local correcto

Arregla además un fallo que ya existía: el `datetime-local` recibía un ISO en UTC y aparecía vacío.

**Archivos:**
- Reemplazar: `components/ScheduleModal.tsx`
- Modificar: `components/RankingView.tsx` (props del `<ScheduleModal>`)

- [ ] **Paso 1: Reemplazar el componente**

Contenido completo nuevo de `components/ScheduleModal.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Modal, Button } from './ui/Components';
import { Match, Ranking } from '../types';
import { SchedulerEngine, ANY_PAIR } from '../services/SchedulerEngine';
import { pairLabel } from './scheduler/pairLabel';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
    onSave: (matchId: string, schedule: { startTime?: string, court?: number }) => void;
    schedulerConfig?: import('../services/SchedulerEngine').SchedulerConfig;
    occupationSlots?: { start: Date; end: Date; court: number }[];
    ranking?: Ranking; // Needed to check pair availability and phase windows
    players?: Record<string, import('../types').Player>; // Needed to show names in conflict
}

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO string → value for <input type="datetime-local"> in local time. */
const toLocalInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ScheduleModal = ({ isOpen, onClose, match, onSave, schedulerConfig, occupationSlots, ranking, players }: Props) => {
    const [startTime, setStartTime] = useState('');
    const [court, setCourt] = useState('');

    useEffect(() => {
        setStartTime(toLocalInput(match?.startTime));
        setCourt(match?.court ? match.court.toString() : '');
    }, [match]);

    const handleSave = () => {
        if (!match) return;

        onSave(match.id, {
            startTime: startTime ? new Date(startTime).toISOString() : undefined,
            court: court ? parseInt(court) : undefined
        });
        onClose();
    };

    if (!match) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Programar: Jornada ${match.jornada}`}>
            <div className="space-y-6">
                {/* Scheduling Section */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                    <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                        <Calendar size={16} /> Horario y Pista
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-sm border-blue-200 rounded p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-blue-700 mb-1">Pista</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Nº"
                                value={court}
                                onChange={(e) => setCourt(e.target.value)}
                                className="w-full text-sm border-blue-200 rounded p-2"
                            />
                        </div>
                    </div>
                    {match.startTime && startTime !== toLocalInput(match.startTime) && (
                        <div className="text-xs text-blue-600 italic mt-1">
                            Cambiar el horario notificará a los jugadores
                        </div>
                    )}
                    {/* Real Conflict Check */}
                    {(() => {
                        if (!startTime || !schedulerConfig) return null;
                        const start = new Date(startTime);
                        const end = SchedulerEngine.addMinutes(start, schedulerConfig.slotDurationMinutes);

                        const alerts = [];

                        // 1. Court conflict
                        if (court && occupationSlots && SchedulerEngine.checkMatchConflict(start, end, parseInt(court), occupationSlots)) {
                            alerts.push(
                                <div key="court" className="flex items-center gap-2 p-2 bg-red-100 text-red-700 rounded text-xs font-bold animate-pulse">
                                    <AlertTriangle size={14} />
                                    <span>¡Conflicto! Pista {court} ocupada.</span>
                                </div>
                            );
                        }

                        // 2. Pair availability and phase window
                        if (ranking) {
                            const conflicts = SchedulerEngine.computeConflicts({ ...match, startTime: start.toISOString() }, ranking) ?? [];
                            conflicts.forEach((c, i) => alerts.push(
                                <div key={`c${i}`} className="flex items-center gap-2 p-2 bg-orange-100 text-orange-800 rounded text-xs font-bold">
                                    <Clock size={14} />
                                    <span>{c.pairKey === ANY_PAIR ? c.reason : `${pairLabel(c.pairKey, players ?? {})}: ${c.reason}`}</span>
                                </div>
                            ));
                        }

                        return alerts.length > 0 ? <div className="space-y-2 mt-2">{alerts}</div> : null;
                    })()}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Horario</Button>
                </div>
            </div>
        </Modal>
    );
};
```

- [ ] **Paso 2: Pasarle `ranking` desde `RankingView`**

En `components/RankingView.tsx`, dentro de `<ScheduleModal … />`, sustituye:
```tsx
            playerConstraints={ranking.playerConstraints}
```
por:
```tsx
            ranking={ranking}
```

- [ ] **Paso 3: Comprobar tipos y tests**

Ejecuta: `npx tsc --noEmit -p .` → solo los 2 errores previos.
Ejecuta: `npx vitest run` → todo en verde.

- [ ] **Paso 4: Commit**

```bash
git add components/ScheduleModal.tsx components/RankingView.tsx
git commit -m "feat(scheduler): avisos de disponibilidad por pareja al mover un partido

Corrige además el valor del datetime-local, que aparecía vacío con horas ISO.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 11: Integración en `RankingView`, `BracketView` y `ScheduleGridModal`

**Archivos:**
- Modificar: `components/RankingView.tsx`
- Modificar: `components/BracketView.tsx`
- Modificar: `components/ScheduleGridModal.tsx`

- [ ] **Paso 1: Imports en `RankingView`**

Debajo de `import { ScheduleGridModal } from './ScheduleGridModal';` añade:
```ts
import { ScheduleStatusBadges } from './scheduler/ScheduleStatusBadges';
import { ScheduleConflictsModal, getConflictMatches } from './scheduler/ScheduleConflictsModal';
import { GenerateScheduleModal } from './scheduler/GenerateScheduleModal';
import { pairLabel } from './scheduler/pairLabel';
```

- [ ] **Paso 2: Estado nuevo**

Debajo de `const [isSchedulerConfigModalOpen, setIsSchedulerConfigModalOpen] = useState(false);` añade:
```ts
  const [generateDialog, setGenerateDialog] = useState<{ warnings: import('../services/SchedulerEngine').FeasibilityWarning[]; hasLocked: boolean } | null>(null);
  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState(false);
```

- [ ] **Paso 3: Un movimiento manual fija el partido**

En `handleSaveSchedule` sustituye:
```ts
    const oldMatch = targetDivision.matches[matchIndex];
    const updatedMatch = { ...oldMatch, ...schedule };
```
por:
```ts
    const oldMatch = targetDivision.matches[matchIndex];
    const updatedMatch: Match = { ...oldMatch, ...schedule };
    // A manual move locks the slot and re-evaluates its conflicts
    updatedMatch.scheduleLocked = !!updatedMatch.startTime;
    updatedMatch.scheduleEstimated = false;
    const conflicts = SchedulerEngine.computeConflicts(updatedMatch, ranking);
    if (conflicts) updatedMatch.scheduleConflict = conflicts;
    else delete updatedMatch.scheduleConflict;
```

- [ ] **Paso 4: Aviso tras meter un resultado**

Sustituye el bloque que dejó la Tarea 7:
```ts
        // Reactive Scheduler Hook
        if (ranking.schedulerConfig && isEliminationContext) {
          const tempRanking = { ...updatedRanking, divisions: newDivisions };
          newDivisions = SchedulerEngine.onResultEntered(tempRanking).divisions;
        }
```
por:
```ts
        // Scheduler: slots never move after a result; only re-check availability of the pairs that advanced
        if (ranking.schedulerConfig && isEliminationContext) {
          const check = SchedulerEngine.onResultEntered({ ...updatedRanking, divisions: newDivisions });
          newDivisions = check.divisions;
          if (check.newConflicts.length) {
            const lines = check.newConflicts.flatMap(c => c.conflicts.map(x => `• ${pairLabel(x.pairKey, players)}: ${x.reason}`));
            alert(`Conflicto de horario en el siguiente partido:\n${lines.join('\n')}\n\nRevísalo en "Conflictos".`);
          }
        }
```

- [ ] **Paso 5: Flujo de generación y "Fijar día siguiente"**

En `handleGenerateFullSchedule` sustituye:
```ts
    if (!onUpdateRanking) return;
    const newDivisions = SchedulerEngine.generateSchedule(ranking);
    onUpdateRanking({ ...ranking, divisions: newDivisions });
  };
```
por:
```ts
    if (!onUpdateRanking) return;
    const warnings = SchedulerEngine.checkFeasibility(ranking);
    const hasLocked = ranking.divisions.some(d => d.matches.some(m =>
      m.status === 'pendiente' && m.startTime && !m.scheduleEstimated && m.scheduleLocked !== false));
    if (warnings.length || hasLocked) {
      setGenerateDialog({ warnings, hasLocked });
      return;
    }
    runGenerateSchedule(false);
  };

  const runGenerateSchedule = (includeLocked: boolean) => {
    if (!onUpdateRanking) return;
    onUpdateRanking({ ...ranking, divisions: SchedulerEngine.generateSchedule(ranking, { includeLocked }) });
  };

  const handleLockNextDay = () => {
    if (!onUpdateRanking) return;
    onUpdateRanking({ ...ranking, divisions: SchedulerEngine.lockNextDay(ranking) });
  };
```

- [ ] **Paso 6: Botones de la barra**

Sustituye el final de la acción `generate-schedule`:
```ts
              title: 'Asignar automáticamente horarios y pistas a todos los partidos listos',
              className: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
            },
```
por:
```ts
              title: 'Asignar automáticamente horarios y pistas a todos los partidos',
              className: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
            },
            {
              id: 'lock-next-day',
              label: 'Fijar día siguiente',
              icon: Calendar,
              onClick: handleLockNextDay,
              visible: isAdmin && ranking.schedulerConfig?.mode === 'daily' && !!SchedulerEngine.firstEstimatedDay(ranking.divisions),
              variant: 'secondary',
              title: 'Recalcular y fijar los horarios del siguiente día con partidos estimados'
            },
            {
              id: 'schedule-conflicts',
              label: `Conflictos (${getConflictMatches(ranking).length})`,
              icon: AlertTriangle,
              onClick: () => setIsConflictsModalOpen(true),
              visible: isAdmin && getConflictMatches(ranking).length > 0,
              variant: 'secondary',
              className: 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
            },
```

- [ ] **Paso 7: Insignias en la tarjeta del partido**

Sustituye el bloque completo que empieza en `{/* Conflict Indicator */}` (dentro de la tarjeta, donde se muestran la hora y la pista) y termina en su `})()}`:
```tsx
                                        {/* Conflict Indicator */}
                                        {isAdmin && ranking.schedulerConfig && ranking.playerConstraints && (() => {
                                          const start = new Date(m.startTime!);
                                          const end = SchedulerEngine.addMinutes(start, ranking.schedulerConfig.slotDurationMinutes);
                                          const occupied = SchedulerEngine.getAllOccupiedSlots(ranking, m.id);

                                          const courtConflict = m.court && SchedulerEngine.checkMatchConflict(start, end, m.court, occupied);

                                          const pIds = [m.pair1.p1Id, m.pair1.p2Id, m.pair2.p1Id, m.pair2.p2Id].filter(Boolean) as string[];
                                          const playerConflict = SchedulerEngine.checkPlayerAvailability(start, end, pIds, ranking.playerConstraints || {});

                                          if (courtConflict || !playerConflict.valid) {
                                            return (
                                              <div className="ml-2 text-red-500 animate-pulse" title="Conflicto de horario detectado">
                                                <AlertTriangle size={14} />
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
```
por:
```tsx
                                        <ScheduleStatusBadges match={m} ranking={ranking} showConflicts={!!isAdmin} />
```

- [ ] **Paso 8: Montar los modales nuevos**

Justo después del cierre del bloque `{/* Schedule Modal */}` (el `}` que sigue a `<ScheduleModal … />`), añade:
```tsx

      {generateDialog && (
        <GenerateScheduleModal
          isOpen={!!generateDialog}
          onClose={() => setGenerateDialog(null)}
          warnings={generateDialog.warnings}
          hasLocked={generateDialog.hasLocked}
          onGenerate={runGenerateSchedule}
          onConfigure={() => setIsSchedulerConfigModalOpen(true)}
        />
      )}

      <ScheduleConflictsModal
        isOpen={isConflictsModalOpen}
        onClose={() => setIsConflictsModalOpen(false)}
        ranking={ranking}
        players={players}
        onMove={(m) => { setIsConflictsModalOpen(false); setSchedulingMatch(m); }}
      />
```

- [ ] **Paso 9: `BracketView`**

En `components/BracketView.tsx` sustituye los imports:
```ts
import { Trophy, Calendar, Clock, AlertTriangle, Edit2, Lock, Unlock } from 'lucide-react';
import { SchedulerEngine } from '../services/SchedulerEngine';
```
por:
```ts
import { Trophy, Calendar, Clock, Edit2, Lock, Unlock } from 'lucide-react';
import { ScheduleStatusBadges } from './scheduler/ScheduleStatusBadges';
```
Después sustituye el bloque completo `{/* Conflict Indicator (Admin Only) */}` … `})()}` (usa `checkPlayerAvailability` y `ranking.playerConstraints`) por:
```tsx
                                                    <ScheduleStatusBadges match={match} ranking={ranking} showConflicts={!!onScheduleClick} size={12} />
```
Usa la herramienta Edit, no `sed`: `sed` en Windows cambia los finales de línea de todo el archivo.

- [ ] **Paso 10: `ScheduleGridModal`**

En `components/ScheduleGridModal.tsx` sustituye:
```tsx
                                                                    ${match.scheduleEstimated ? 'border-dashed opacity-70 ' : ''}
```
por:
```tsx
                                                                    ${match.scheduleEstimated ? 'border-dashed opacity-70 ' : ''}
                                                                    ${match.scheduleConflict?.length ? 'ring-2 ring-red-400 ' : ''}
```

- [ ] **Paso 11: Comprobar tipos y tests**

Ejecuta: `npx tsc --noEmit -p .` → solo los 2 errores previos.
Ejecuta: `npx vitest run` → todo en verde (en el prototipo fueron 130 tests en 17 archivos).

- [ ] **Paso 12: Commit**

```bash
git add components/RankingView.tsx components/BracketView.tsx components/ScheduleGridModal.tsx
git commit -m "feat(scheduler): flujo de generación, fijar día y panel de conflictos en la vista del torneo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 12: Verificación final en la app

**Archivos:** ninguno (solo verificación).

- [ ] **Paso 1: Suite completa y tipos**

Ejecuta: `npx vitest run` → todo en verde.
Ejecuta: `npx tsc --noEmit -p .` → solo los 2 errores previos.

- [ ] **Paso 2: Prueba manual (`npm run dev`)** con un torneo de eliminación con 2 categorías y consolación:
1. *Disponibilidad → Recursos*: aparecen la opción de 75 min y el selector de modo. Elige "Horario completo".
2. *Días*: viernes 17–22, sábado 9–22, domingo 9–14. *Fases*: Final el domingo de 11 a 14.
3. *Generar horario*: todos los partidos tienen hora, y las finales caen el domingo entre 11:00 y 14:00.
4. Mete varios resultados: ninguna hora cambia. Si una pareja con restricción avanza a un hueco incompatible, salta el aviso y aparece "Conflictos (N)".
5. "Conflictos" → "Mover": el modal muestra la hora actual (antes salía vacía) y los avisos por pareja. Al guardar, el partido queda fijado.
6. Cambia a "Por día" y pulsa *Generar horario* con "Regenerar también los fijados": solo queda fijado el primer día, el resto aparece "· estimado" y está el botón "Fijar día siguiente".
7. Reduce la franja de la final a 30 min y pulsa *Generar horario*: aparece el aviso de viabilidad con "Generar igualmente" y "Volver a configurar".

- [ ] **Paso 3: Resultado**

Si algo falla, abre un ticket o corrígelo antes de integrar la rama. Si todo funciona, usa superpowers:finishing-a-development-branch.
