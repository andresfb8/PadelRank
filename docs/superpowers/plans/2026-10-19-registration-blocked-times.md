# Rejilla de bloqueos en la inscripción de parejas: plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que las parejas marquen en la inscripción pública **cuándo NO pueden jugar** con una rejilla de medias horas sobre los días reales del torneo, guardado en el mismo formato que usa el motor de horarios. El admin ve y edita esos bloqueos con la misma rejilla, y si la pareja ya está importada el torneo se actualiza solo.

**Arquitectura:** dos módulos puros en `services/registration/`: `blockedTimes.ts` para las medias horas y franjas, y `syncRegistration.ts` para importar y sincronizar con `pairConstraints`. Un componente controlado, `components/registration/BlockedTimesPicker.tsx`, con una pestaña por día. Lo usan `PublicRegistrationPage` y `RegistrationManagerModal`. El motor de horarios no cambia.

**Stack:** React 19 + TypeScript, Vite, Vitest 4 (jsdom, `@testing-library/react`), Firebase (Firestore y sus reglas).

**Spec:** `docs/superpowers/specs/2026-10-19-registration-blocked-times-design.md`

**Desviaciones respecto al spec (decididas al prototipar):**
- En `blockedTimes.ts`, `rangesToSlotKeys` y `slotKeysToRanges` del spec quedan como `isSlotBlocked(ranges, date, slot)` y `slotsToRanges(date, slots)`: trabajan con objetos `Slot` (`{ start, end }`) en vez de claves de texto. Se añaden `blocksWholeTournament`, `dayLabel`, `sortDays`, `rangesOfDay`, `notesWithSummary` y `registrationNote`.
- `availabilityNotes` conserva la nota libre de la pareja al final («… • Nota: …»). `registrationNote()` la recupera al editar, para no perderla.
- La ficha del admin no es una vista aparte. Cada inscripción de la lista muestra el resumen de bloqueos y un botón «Editar bloqueos» que abre un modal con la rejilla.
- `RegistrationManagerModal` recibe la prop opcional `onConfigureDays`. `RankingView` la usa para cerrar el gestor y abrir «Disponibilidad».
- Cuando falla una escritura, el formulario muestra el error y no borra nada, así que reintentar no exige volver a marcar los bloqueos.

**Todo el código de este plan está verificado:** se prototipó completo sobre `main` (`1f030cd`), con 188/188 tests en verde y sin errores nuevos de `tsc`. Además se probó a mano en los emuladores de Firebase:
- inscripción desde el móvil;
- la regla de 100 franjas;
- aprobar e importar;
- editar con sincronización;
- un torneo sin días.

Después se revirtió. Cópialo tal cual.

**Comandos** (desde `PadelRank/PadelRank`, en una rama nueva `feature/registration-blocked-times` creada desde `main`):
- Un test: `npx vitest run <ruta>`
- Toda la suite: `npx vitest run`
- Tipos: `npx tsc --noEmit -p .`. Hay **42 errores previos** en ficheros que este plan no toca (`RankingWizard.tsx`, `examples/`, `functions/`, `components/superadmin/`, etc.). El número no puede subir: comprueba con `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` que siga siendo 42.

**Finales de línea:** en el árbol de trabajo estos ficheros están en LF y Git los convierte al hacer commit. Edítalos con las herramientas de edición, no con `sed -i`.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `types.ts` | Modificar | Campo `blockedRanges` en `TournamentRegistration` |
| `services/registration/blockedTimes.ts` | Crear | Medias horas de un día, franjas ⇄ medias horas, recortar a los días, resumen, nota, conversión del formato antiguo |
| `services/registration/syncRegistration.ts` | Crear | `importRegistrations` y `applyRegistrationBlocks`, que actualiza `pairConstraints` y revisa conflictos sin mover partidos |
| `components/registration/BlockedTimesPicker.tsx` | Crear | Rejilla con pestañas por día, atajos y modo de solo lectura |
| `pages/PublicRegistrationPage.tsx` | Modificar | Sustituye viernes, sábado y domingo por la rejilla, añade la pantalla «todavía no disponible» y el nuevo resumen |
| `components/admin/RegistrationManagerModal.tsx` | Modificar | Interruptor sin días, «Editar bloqueos» con sincronización, rejilla en la inscripción manual, importación con `importRegistrations` |
| `components/RankingView.tsx` | Modificar | Pasa `onConfigureDays` |
| `firestore.rules` | Modificar | `blockedRanges` de 100 franjas como máximo al crear una inscripción |
| `scripts/seedEmulator.mjs` | Modificar | Torneo de ejemplo con días e inscripción abierta |
| `services/registration/__tests__/blockedTimes.test.ts` | Crear | Tests de la lógica pura |
| `services/registration/__tests__/syncRegistration.test.ts` | Crear | Tests de importación, sincronización e integración con el motor |
| `components/registration/__tests__/BlockedTimesPicker.test.tsx` | Crear | Tests del componente |

---

### Tarea 0: Rama de trabajo

- [ ] **Paso 1: Crear la rama**

```bash
git checkout main
git checkout -b feature/registration-blocked-times
```

---

### Tarea 1: Lógica pura de bloqueos (`blockedTimes.ts`)

**Archivos:**
- Modificar: `types.ts` (interfaz `TournamentRegistration`)
- Crear: `services/registration/blockedTimes.ts`
- Test: `services/registration/__tests__/blockedTimes.test.ts`

- [ ] **Paso 1: Añadir el campo a `types.ts`**

En `TournamentRegistration`, sustituye:

```ts
  availability?: TournamentRegistrationAvailability;
  availabilityNotes?: string; // Human-readable summary e.g. "Viernes: Desde 19:30 | Sábado: Todo el día"
```

por:

```ts
  /** Ranges in which the pair can NOT play. Same shape as PairAvailability.unavailableRanges. */
  blockedRanges?: { date: string; startTime: string; endTime: string }[];
  availability?: TournamentRegistrationAvailability; // Legacy Friday/Saturday/Sunday format, read-only
  availabilityNotes?: string; // Human-readable summary e.g. "Sáb 24: no 09:00–10:30 • Nota: ..."
```

(El tipo va en línea para que `types.ts` no importe de `services/scheduler`, que ya importa de `types.ts`.)

- [ ] **Paso 2: Escribir los tests (fallan)**

Crea `services/registration/__tests__/blockedTimes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { DaySchedule } from '../../scheduler/types';
import {
    blockWholeDay, blocksWholeTournament, clearDay, clipToDays, dayLabel, daySlots, effectiveBlockedRanges,
    isSlotBlocked, legacyAvailabilityToRanges, notesWithSummary, registrationNote, slotsToRanges, summarize, toggleSlot,
} from '../blockedTimes';

// Friday 23, Saturday 24 and Sunday 25 October 2026
const FRI: DaySchedule = { date: '2026-10-23', startTime: '17:00', endTime: '22:00' };
const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const SUN: DaySchedule = { date: '2026-10-25', startTime: '09:00', endTime: '14:00' };
const DAYS = [FRI, SAT, SUN];

const r = (date: string, startTime: string, endTime: string): DaySchedule => ({ date, startTime, endTime });

describe('blockedTimes', () => {
    it('daySlots: half hours from opening to closing', () => {
        const slots = daySlots(SUN);
        expect(slots).toHaveLength(10);
        expect(slots[0]).toEqual({ start: '09:00', end: '09:30' });
        expect(slots[9]).toEqual({ start: '13:30', end: '14:00' });
    });

    it('daySlots: irregular opening and closing give shorter edge rows', () => {
        const slots = daySlots({ date: FRI.date, startTime: '17:15', endTime: '18:45' });
        expect(slots).toEqual([
            { start: '17:15', end: '17:30' },
            { start: '17:30', end: '18:00' },
            { start: '18:00', end: '18:30' },
            { start: '18:30', end: '18:45' },
        ]);
    });

    it('slotsToRanges joins consecutive rows', () => {
        expect(slotsToRanges(SAT.date, [
            { start: '10:00', end: '10:30' }, { start: '09:00', end: '09:30' }, { start: '09:30', end: '10:00' },
            { start: '21:30', end: '22:00' },
        ])).toEqual([r(SAT.date, '09:00', '10:30'), r(SAT.date, '21:30', '22:00')]);
    });

    it('isSlotBlocked: any overlap with a range of the same day', () => {
        const ranges = [r(SAT.date, '09:10', '09:20')];
        expect(isSlotBlocked(ranges, SAT.date, { start: '09:00', end: '09:30' })).toBe(true);
        expect(isSlotBlocked(ranges, SAT.date, { start: '09:30', end: '10:00' })).toBe(false);
        expect(isSlotBlocked(ranges, SUN.date, { start: '09:00', end: '09:30' })).toBe(false);
    });

    it('toggleSlot blocks, merges with neighbours and leaves other days alone', () => {
        let ranges = [r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '09:30')];
        ranges = toggleSlot(ranges, SAT, { start: '09:30', end: '10:00' });
        expect(ranges).toEqual([r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '10:00')]);
    });

    it('toggleSlot in the middle of a range splits it', () => {
        const ranges = toggleSlot([r(SAT.date, '09:00', '10:30')], SAT, { start: '09:30', end: '10:00' });
        expect(ranges).toEqual([r(SAT.date, '09:00', '09:30'), r(SAT.date, '10:00', '10:30')]);
    });

    it('blockWholeDay and clearDay only touch their day', () => {
        const base = [r(FRI.date, '17:00', '18:00'), r(SAT.date, '12:00', '13:00')];
        expect(blockWholeDay(base, SAT)).toEqual([r(FRI.date, '17:00', '18:00'), r(SAT.date, '09:00', '22:00')]);
        expect(clearDay(base, SAT)).toEqual([r(FRI.date, '17:00', '18:00')]);
    });

    it('clipToDays cuts ranges to the day hours and drops days that are gone', () => {
        const { kept, droppedCount } = clipToDays([
            r(SAT.date, '00:00', '15:00'),       // cut to 09:00–15:00
            r(SUN.date, '15:00', '23:59'),       // after closing: dropped
            r('2026-10-26', '10:00', '12:00'),   // not a tournament day: dropped
        ], DAYS);
        expect(kept).toEqual([r(SAT.date, '09:00', '15:00')]);
        expect(droppedCount).toBe(2);
    });

    it('blocksWholeTournament', () => {
        expect(blocksWholeTournament(DAYS.map(d => r(d.date, d.startTime, d.endTime)), DAYS)).toBe(true);
        expect(blocksWholeTournament([r(SAT.date, '09:00', '22:00')], DAYS)).toBe(false);
        expect(blocksWholeTournament([], [])).toBe(false);
    });

    it('dayLabel and summarize', () => {
        expect(dayLabel(SAT.date)).toBe('sáb 24');
        expect(summarize([], DAYS)).toBe('Disponibles todo el torneo');
        expect(summarize([r(SUN.date, '09:00', '14:00'), r(SAT.date, '21:30', '22:00'), r(SAT.date, '09:00', '10:30')], DAYS))
            .toBe('Sáb 24: no 09:00–10:30, 21:30–22:00 • Dom 25: no 09:00–14:00');
    });

    it('notesWithSummary and registrationNote round-trip the free-text note', () => {
        const notes = notesWithSummary('Disponibles todo el torneo', ' Salgo a las 19h ');
        expect(notes).toBe('Disponibles todo el torneo • Nota: Salgo a las 19h');
        expect(registrationNote({ availabilityNotes: notes })).toBe('Salgo a las 19h');
        expect(registrationNote({ availability: { notes: 'legado' }, availabilityNotes: 'x' })).toBe('legado');
        expect(notesWithSummary('Disponibles todo el torneo', '')).toBe('Disponibles todo el torneo');
    });

    it('legacyAvailabilityToRanges keeps the old conversion', () => {
        expect(legacyAvailabilityToRanges({
            friday: { status: 'from_time', fromTime: '19:00' },
            saturday: { status: 'custom', fromTime: '10:00', untilTime: '20:00' },
            sunday: { status: 'morning_only' },
        }, DAYS)).toEqual([
            r(FRI.date, '00:00', '19:00'),
            r(SAT.date, '00:00', '10:00'),
            r(SAT.date, '20:00', '23:59'),
            r(SUN.date, '15:00', '23:59'),
        ]);
        expect(legacyAvailabilityToRanges({
            friday: { status: 'unavailable' }, saturday: { status: 'afternoon_only' }, sunday: { status: 'all_day' },
        }, DAYS)).toEqual([r(FRI.date, '00:00', '23:59'), r(SAT.date, '00:00', '15:00')]);
    });

    it('legacyAvailabilityToRanges falls back to the weekend of fechaInicio', () => {
        expect(legacyAvailabilityToRanges({ saturday: { status: 'unavailable' } }, [], '2026-10-24'))
            .toEqual([r(SAT.date, '00:00', '23:59')]);
    });

    it('effectiveBlockedRanges prefers the new field', () => {
        expect(effectiveBlockedRanges({ blockedRanges: [r(SAT.date, '09:00', '10:00')], availability: { friday: { status: 'unavailable' } } }, DAYS))
            .toEqual([r(SAT.date, '09:00', '10:00')]);
        expect(effectiveBlockedRanges({ availability: { friday: { status: 'unavailable' } } }, DAYS))
            .toEqual([r(FRI.date, '00:00', '23:59')]);
        expect(effectiveBlockedRanges({}, DAYS)).toEqual([]);
    });
});
```

- [ ] **Paso 3: Ejecutarlos y ver que fallan**

Ejecuta: `npx vitest run services/registration/__tests__/blockedTimes.test.ts`
Resultado esperado: FALLA, porque no se puede resolver `../blockedTimes`.

- [ ] **Paso 4: Implementar `blockedTimes.ts`**

Crea `services/registration/blockedTimes.ts`:

```ts
import type { TournamentRegistration, TournamentRegistrationAvailability } from '../../types';
import type { DaySchedule } from '../scheduler/types';
import { localDateKey, parseTimeOnDate } from '../scheduler/timeGrid';

/** A row of the grid: half an hour, or less at an irregular opening/closing time. "HH:MM". */
export interface Slot {
    start: string;
    end: string;
}

const SLOT_MINUTES = 30;

const toMin = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toTime = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

const byStart = (a: DaySchedule, b: DaySchedule) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

export const sortDays = (days: DaySchedule[]): DaySchedule[] => [...days].sort(byStart);

/** Half-hour rows of a tournament day, from opening to closing. Irregular edges give a shorter row (17:15–17:30). */
export const daySlots = (day: DaySchedule): Slot[] => {
    const close = toMin(day.endTime);
    const out: Slot[] = [];
    for (let t = toMin(day.startTime); t < close;) {
        const next = Math.min(close, (Math.floor(t / SLOT_MINUTES) + 1) * SLOT_MINUTES);
        out.push({ start: toTime(t), end: toTime(next) });
        t = next;
    }
    return out;
};

export const rangesOfDay = (ranges: DaySchedule[], date: string): DaySchedule[] =>
    ranges.filter(r => r.date === date).sort(byStart);

/** A row is blocked when any range of its day overlaps it. */
export const isSlotBlocked = (ranges: DaySchedule[], date: string, slot: Slot): boolean =>
    ranges.some(r => r.date === date && toMin(r.startTime) < toMin(slot.end) && toMin(r.endTime) > toMin(slot.start));

/** Joins consecutive blocked rows into ranges. */
export const slotsToRanges = (date: string, slots: Slot[]): DaySchedule[] => {
    const out: DaySchedule[] = [];
    [...slots].sort((a, b) => a.start.localeCompare(b.start)).forEach(s => {
        const last = out[out.length - 1];
        if (last && last.endTime === s.start) last.endTime = s.end;
        else out.push({ date, startTime: s.start, endTime: s.end });
    });
    return out;
};

const replaceDay = (ranges: DaySchedule[], date: string, dayRanges: DaySchedule[]): DaySchedule[] =>
    [...ranges.filter(r => r.date !== date), ...dayRanges].sort(byStart);

/** Blocks or unblocks one row. The day's ranges are rebuilt from its rows (always merged). */
export const toggleSlot = (ranges: DaySchedule[], day: DaySchedule, slot: Slot): DaySchedule[] => {
    const blocked = daySlots(day).filter(s => {
        const isTarget = s.start === slot.start;
        const was = isSlotBlocked(ranges, day.date, s);
        return isTarget ? !was : was;
    });
    return replaceDay(ranges, day.date, slotsToRanges(day.date, blocked));
};

export const blockWholeDay = (ranges: DaySchedule[], day: DaySchedule): DaySchedule[] =>
    replaceDay(ranges, day.date, [{ date: day.date, startTime: day.startTime, endTime: day.endTime }]);

export const clearDay = (ranges: DaySchedule[], day: DaySchedule): DaySchedule[] =>
    replaceDay(ranges, day.date, []);

/** Cuts every range to its day's hours; ranges on days that are no longer in the tournament are dropped. */
export const clipToDays = (ranges: DaySchedule[], days: DaySchedule[]): { kept: DaySchedule[]; droppedCount: number } => {
    const kept: DaySchedule[] = [];
    let droppedCount = 0;
    ranges.forEach(r => {
        const day = days.find(d => d.date === r.date);
        const start = day ? Math.max(toMin(r.startTime), toMin(day.startTime)) : 0;
        const end = day ? Math.min(toMin(r.endTime), toMin(day.endTime)) : 0;
        if (!day || end <= start) {
            droppedCount++;
            return;
        }
        kept.push({ date: r.date, startTime: toTime(start), endTime: toTime(end) });
    });
    return { kept: kept.sort(byStart), droppedCount };
};

/** Every row of every day is blocked. */
export const blocksWholeTournament = (ranges: DaySchedule[], days: DaySchedule[]): boolean =>
    days.length > 0 && days.every(d => daySlots(d).every(s => isSlotBlocked(ranges, d.date, s)));

/** "sáb 24" */
export const dayLabel = (date: string): string => {
    const d = parseTimeOnDate('12:00', date);
    return `${d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')} ${d.getDate()}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sáb 24: no 09:00–10:30, 21:30–22:00 • Dom 25: no 09:00–14:00", or "Disponibles todo el torneo". */
export const summarize = (ranges: DaySchedule[], days: DaySchedule[]): string => {
    const { kept } = clipToDays(ranges, days);
    if (!kept.length) return 'Disponibles todo el torneo';
    return sortDays(days)
        .filter(d => kept.some(r => r.date === d.date))
        .map(d => `${capitalize(dayLabel(d.date))}: no ${rangesOfDay(kept, d.date).map(r => `${r.startTime}–${r.endTime}`).join(', ')}`)
        .join(' • ');
};

/** availabilityNotes: the summary plus the free-text note, if any. */
export const notesWithSummary = (summary: string, note?: string): string =>
    note?.trim() ? `${summary} • Nota: ${note.trim()}` : summary;

/** The free-text note of a registration (legacy ones keep it in availability.notes). */
export const registrationNote = (reg: Pick<TournamentRegistration, 'availability' | 'availabilityNotes'>): string =>
    reg.availability?.notes ?? reg.availabilityNotes?.match(/• Nota: (.*)$/)?.[1] ?? '';

/** Friday, Saturday and Sunday dates of the tournament (from its days, else from fechaInicio). */
const weekendDates = (days: DaySchedule[], fechaInicio?: string) => {
    let friday = '';
    let saturday = '';
    let sunday = '';
    days.forEach(day => {
        const dayOfWeek = parseTimeOnDate('12:00', day.date).getDay();
        if (dayOfWeek === 5) friday = day.date;
        else if (dayOfWeek === 6) saturday = day.date;
        else if (dayOfWeek === 0) sunday = day.date;
    });
    if (!friday && fechaInicio) {
        const start = parseTimeOnDate('12:00', fechaInicio);
        const diffToFriday = (5 - start.getDay() + 7) % 7;
        const fri = new Date(start);
        fri.setDate(start.getDate() + (diffToFriday > 3 ? diffToFriday - 7 : diffToFriday));
        const sat = new Date(fri);
        sat.setDate(fri.getDate() + 1);
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        friday = localDateKey(fri);
        saturday = localDateKey(sat);
        sunday = localDateKey(sun);
    }
    return { friday, saturday, sunday };
};

/** Legacy Friday/Saturday/Sunday availability as blocked ranges (moved unchanged from RegistrationManagerModal). */
export const legacyAvailabilityToRanges = (
    availability: TournamentRegistrationAvailability,
    days: DaySchedule[],
    fechaInicio?: string
): DaySchedule[] => {
    const { friday: fridayDate, saturday: saturdayDate, sunday: sundayDate } = weekendDates(days, fechaInicio);
    const out: DaySchedule[] = [];
    const block = (date: string, startTime: string, endTime: string) => out.push({ date, startTime, endTime });
    const { friday, saturday, sunday } = availability;

    if (fridayDate && friday) {
        if (friday.status === 'unavailable') block(fridayDate, '00:00', '23:59');
        else if (friday.status === 'from_time' && friday.fromTime) block(fridayDate, '00:00', friday.fromTime);
    }
    if (saturdayDate && saturday) {
        if (saturday.status === 'unavailable') block(saturdayDate, '00:00', '23:59');
        else if (saturday.status === 'morning_only') block(saturdayDate, '15:00', '23:59');
        else if (saturday.status === 'afternoon_only') block(saturdayDate, '00:00', '15:00');
        else if (saturday.status === 'custom') {
            if (saturday.fromTime) block(saturdayDate, '00:00', saturday.fromTime);
            if (saturday.untilTime) block(saturdayDate, saturday.untilTime, '23:59');
        }
    }
    if (sundayDate && sunday) {
        if (sunday.status === 'unavailable') block(sundayDate, '00:00', '23:59');
        else if (sunday.status === 'morning_only') block(sundayDate, '15:00', '23:59');
        else if (sunday.status === 'afternoon_only') block(sundayDate, '00:00', '15:00');
    }
    return out;
};

/** The registration's blocked ranges: the new field, else the legacy availability converted, else none. */
export const effectiveBlockedRanges = (
    reg: Pick<TournamentRegistration, 'blockedRanges' | 'availability'>,
    days: DaySchedule[],
    fechaInicio?: string
): DaySchedule[] => {
    if (reg.blockedRanges) return reg.blockedRanges;
    if (reg.availability) return legacyAvailabilityToRanges(reg.availability, days, fechaInicio);
    return [];
};
```

- [ ] **Paso 5: Ejecutar los tests**

Ejecuta: `npx vitest run services/registration/__tests__/blockedTimes.test.ts`
Resultado esperado: 14 tests en verde.

- [ ] **Paso 6: Commit**

```bash
git add types.ts services/registration/blockedTimes.ts services/registration/__tests__/blockedTimes.test.ts
git commit -m "feat(registration): lógica pura de franjas bloqueadas en medias horas"
```

---

### Tarea 2: Importación y sincronización (`syncRegistration.ts`)

**Archivos:**
- Crear: `services/registration/syncRegistration.ts`
- Test: `services/registration/__tests__/syncRegistration.test.ts`

- [ ] **Paso 1: Escribir los tests (fallan)**

Crea `services/registration/__tests__/syncRegistration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Match, Ranking, TournamentRegistration } from '../../../types';
import type { DaySchedule } from '../../scheduler/types';
import { SchedulerEngine, makePairKey } from '../../scheduler';
import { TournamentEngine } from '../../TournamentEngine';
import { applyRegistrationBlocks, guestIdsOf, importRegistrations, isImported } from '../syncRegistration';

const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const SUN: DaySchedule = { date: '2026-10-25', startTime: '09:00', endTime: '14:00' };

const reg = (id: string, overrides: Partial<TournamentRegistration> = {}): TournamentRegistration => ({
    id, rankingId: 'r',
    player1: { name: `${id}-A`, phone: '600000001' },
    player2: { name: `${id}-B`, phone: '600000002' },
    selectedCategory: 'Primera', status: 'approved', createdAt: '2026-10-19T10:00:00.000Z',
    ...overrides,
});

const keyOf = (id: string) => makePairKey(guestIdsOf(id).p1, guestIdsOf(id).p2);
const pairOf = (id: string) => ({ p1Id: guestIdsOf(id).p1, p2Id: guestIdsOf(id).p2 });

const baseRanking = (matches: Match[] = []): Ranking => ({
    id: 'r', nombre: 'T', categoria: 'Mixto', fechaInicio: '2026-10-24', status: 'activo', format: 'elimination',
    divisions: [{ id: 'd', numero: 1, status: 'activa', players: [], matches, category: 'Primera' }],
    schedulerConfig: { courts: 2, slotDurationMinutes: 90, restMinutes: 60, timeWindows: [], dailySchedule: [SAT, SUN] },
    pairConstraints: {},
});

describe('syncRegistration', () => {
    it('importRegistrations adds guests and copies the blocks cut to the tournament days', () => {
        const ranking = importRegistrations(baseRanking(), [
            reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '08:00', endTime: '10:30' }, { date: '2026-10-26', startTime: '10:00', endTime: '11:00' }] }),
            reg('r2'),
        ]);
        expect(ranking.guestPlayers!.map(p => p.id)).toEqual([
            guestIdsOf('r1').p1, guestIdsOf('r1').p2, guestIdsOf('r2').p1, guestIdsOf('r2').p2,
        ]);
        expect(ranking.guestPlayers![0]).toEqual({ id: guestIdsOf('r1').p1, nombre: 'r1-A', apellidos: '(Primera)' });
        expect(ranking.pairConstraints![keyOf('r1')]).toEqual({ unavailableRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:30' }] });
        expect(ranking.pairConstraints![keyOf('r2')]).toBeUndefined();
    });

    it('importRegistrations is idempotent', () => {
        const once = importRegistrations(baseRanking(), [reg('r1')]);
        const twice = importRegistrations(once, [reg('r1')]);
        expect(twice.guestPlayers).toHaveLength(2);
    });

    it('applyRegistrationBlocks leaves a registration that is not imported alone', () => {
        const ranking = baseRanking();
        const result = applyRegistrationBlocks(ranking, reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] }));
        expect(isImported(ranking, reg('r1'))).toBe(false);
        expect(result.ranking).toBe(ranking);
        expect(result.newConflicts).toEqual([]);
    });

    it('applyRegistrationBlocks flags a scheduled match inside the new block without moving it', () => {
        const start = new Date(2026, 9, 24, 9, 0).toISOString();
        const match = {
            id: 'm1', jornada: 2, roundName: 'Semifinales', pair1: pairOf('r1'), pair2: pairOf('r2'),
            points: { p1: 0, p2: 0 }, status: 'pendiente', startTime: start, court: 1, scheduleLocked: true,
        } as Match;
        const imported = importRegistrations(baseRanking([match]), [reg('r1'), reg('r2')]);
        const edited = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] });

        const { ranking, newConflicts } = applyRegistrationBlocks(imported, edited);

        expect(ranking.pairConstraints![keyOf('r1')]).toEqual({ unavailableRanges: edited.blockedRanges });
        expect(newConflicts).toHaveLength(1);
        expect(newConflicts[0].matchId).toBe('m1');
        const after = ranking.divisions[0].matches[0];
        expect(after.startTime).toBe(start);
        expect(after.scheduleConflict?.[0].pairKey).toBe(keyOf('r1'));
    });

    it('applyRegistrationBlocks removes the constraint (and the conflict) when the blocks are cleared', () => {
        const start = new Date(2026, 9, 24, 9, 0).toISOString();
        const match = {
            id: 'm1', jornada: 2, roundName: 'Semifinales', pair1: pairOf('r1'), pair2: pairOf('r2'),
            points: { p1: 0, p2: 0 }, status: 'pendiente', startTime: start, court: 1, scheduleLocked: true,
        } as Match;
        const blocked = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '10:00' }] });
        const withConflict = applyRegistrationBlocks(importRegistrations(baseRanking([match]), [blocked, reg('r2')]), blocked).ranking;

        const { ranking } = applyRegistrationBlocks(withConflict, reg('r1', { blockedRanges: [] }));

        expect(ranking.pairConstraints![keyOf('r1')]).toBeUndefined();
        expect(ranking.divisions[0].matches[0].scheduleConflict).toBeUndefined();
    });

    it('an imported registration with blocks is never scheduled inside them', () => {
        const ids = ['r1', 'r2', 'r3', 'r4'];
        const division = { ...TournamentEngine.generateBracket(ids.map(id => `${guestIdsOf(id).p1}::${guestIdsOf(id).p2}`), false)[0], category: 'Primera' };
        const blocked = reg('r1', { blockedRanges: [{ date: SAT.date, startTime: '09:00', endTime: '18:00' }] });
        const ranking = importRegistrations({ ...baseRanking(), divisions: [division] }, [blocked, reg('r2'), reg('r3'), reg('r4')]);

        const divisions = SchedulerEngine.generateSchedule(ranking);

        const r1Match = divisions[0].matches.find(m => m.pair1.p1Id === guestIdsOf('r1').p1 || m.pair2.p1Id === guestIdsOf('r1').p1)!;
        const start = new Date(r1Match.startTime!);
        expect(start.getTime()).toBeGreaterThanOrEqual(new Date(2026, 9, 24, 18, 0).getTime());
        expect(r1Match.scheduleConflict).toBeUndefined();
    });
});
```

- [ ] **Paso 2: Ejecutarlos y ver que fallan**

Ejecuta: `npx vitest run services/registration/__tests__/syncRegistration.test.ts`
Resultado esperado: FALLA, porque no se puede resolver `../syncRegistration`.

- [ ] **Paso 3: Implementar `syncRegistration.ts`**

Crea `services/registration/syncRegistration.ts`:

```ts
import type { Ranking, TournamentRegistration } from '../../types';
import { SchedulerEngine, makePairKey } from '../scheduler';
import type { ResultCheck } from '../scheduler';
import { clipToDays, effectiveBlockedRanges } from './blockedTimes';

/** Guest player ids created when a registration is imported into the tournament. */
export const guestIdsOf = (regId: string) => ({ p1: `guest_reg_${regId}_1`, p2: `guest_reg_${regId}_2` });

export const isImported = (ranking: Ranking, reg: TournamentRegistration): boolean =>
    (ranking.guestPlayers ?? []).some(p => p.id === guestIdsOf(reg.id).p1);

const pairKeyOfRegistration = (reg: TournamentRegistration): string => {
    const { p1, p2 } = guestIdsOf(reg.id);
    return makePairKey(p1, reg.player2 ? p2 : undefined);
};

/** Sets (or removes, when empty) the registration's blocks in pairConstraints, cut to the tournament days. */
const withRegistrationBlocks = (ranking: Ranking, reg: TournamentRegistration): Ranking => {
    const days = ranking.schedulerConfig?.dailySchedule ?? [];
    const { kept } = clipToDays(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days);
    const pairConstraints = { ...(ranking.pairConstraints ?? {}) };
    const key = pairKeyOfRegistration(reg);
    if (kept.length) pairConstraints[key] = { unavailableRanges: kept };
    else delete pairConstraints[key];
    return { ...ranking, pairConstraints };
};

/**
 * After editing an imported registration: updates its pair's constraints and re-checks the conflicts of
 * the matches that already have a time, without moving any of them. A registration that is not imported
 * leaves the ranking untouched.
 */
export const applyRegistrationBlocks = (
    ranking: Ranking,
    reg: TournamentRegistration
): { ranking: Ranking; newConflicts: ResultCheck['newConflicts'] } => {
    if (!isImported(ranking, reg)) return { ranking, newConflicts: [] };
    const updated = withRegistrationBlocks(ranking, reg);
    const check = SchedulerEngine.onResultEntered(updated);
    return { ranking: { ...updated, divisions: check.divisions }, newConflicts: check.newConflicts };
};

/** Adds the approved registrations as guest players with their blocks as pair constraints. */
export const importRegistrations = (ranking: Ranking, approved: TournamentRegistration[]): Ranking => {
    const guestPlayers = [...(ranking.guestPlayers ?? [])];
    let updated: Ranking = ranking;
    approved.forEach(reg => {
        const { p1, p2 } = guestIdsOf(reg.id);
        const apellidos = `(${reg.assignedCategory || reg.selectedCategory})`;
        if (!guestPlayers.some(p => p.id === p1)) guestPlayers.push({ id: p1, nombre: reg.player1.name, apellidos });
        if (reg.player2 && !guestPlayers.some(p => p.id === p2)) guestPlayers.push({ id: p2, nombre: reg.player2.name, apellidos });
        updated = withRegistrationBlocks(updated, reg);
    });
    return { ...updated, guestPlayers };
};
```

- [ ] **Paso 4: Ejecutar los tests**

Ejecuta: `npx vitest run services/registration`
Resultado esperado: 20 tests en verde (14 + 6). El último test genera un horario real con `SchedulerEngine.generateSchedule` y comprueba que la pareja con bloqueos no juega dentro de ellos.

- [ ] **Paso 5: Commit**

```bash
git add services/registration/syncRegistration.ts services/registration/__tests__/syncRegistration.test.ts
git commit -m "feat(registration): importar y sincronizar bloqueos con pairConstraints"
```

---

### Tarea 3: Componente `BlockedTimesPicker`

**Archivos:**
- Crear: `components/registration/BlockedTimesPicker.tsx`
- Test: `components/registration/__tests__/BlockedTimesPicker.test.tsx`

- [ ] **Paso 1: Escribir los tests (fallan)**

Crea `components/registration/__tests__/BlockedTimesPicker.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { DaySchedule } from '../../../services/scheduler/types';
import { BlockedTimesPicker } from '../BlockedTimesPicker';

const FRI: DaySchedule = { date: '2026-10-23', startTime: '17:00', endTime: '22:00' };
const SAT: DaySchedule = { date: '2026-10-24', startTime: '09:00', endTime: '22:00' };
const DAYS = [SAT, FRI]; // unsorted on purpose

describe('BlockedTimesPicker', () => {
    it('shows one tab per day in date order, with the number of blocked ranges', () => {
        render(<BlockedTimesPicker days={DAYS} value={[{ date: SAT.date, startTime: '09:00', endTime: '10:00' }, { date: SAT.date, startTime: '21:00', endTime: '22:00' }]} />);
        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['vie 23', 'sáb 24 · 2']);
        expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('switching tabs shows that day rows', () => {
        render(<BlockedTimesPicker days={DAYS} value={[]} />);
        expect(screen.getByRole('button', { name: '17:00–17:30' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('tab', { name: /sáb 24/ }));
        expect(screen.getByRole('button', { name: '09:00–09:30' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /–/ })).toHaveLength(26); // 09:00–22:00
    });

    it('clicking a row emits merged ranges', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[{ date: FRI.date, startTime: '17:00', endTime: '17:30' }]} onChange={onChange} />);
        expect(screen.getByRole('button', { name: '17:00–17:30' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: '17:30–18:00' }));
        expect(onChange).toHaveBeenCalledWith([{ date: FRI.date, startTime: '17:00', endTime: '18:00' }]);
    });

    it('whole-day and clear-day shortcuts', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[{ date: FRI.date, startTime: '18:00', endTime: '19:00' }]} onChange={onChange} />);
        fireEvent.click(screen.getByRole('button', { name: 'No podemos en todo el día' }));
        expect(onChange).toHaveBeenLastCalledWith([{ date: FRI.date, startTime: '17:00', endTime: '22:00' }]);
        fireEvent.click(screen.getByRole('button', { name: 'Borrar este día' }));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('read-only: no shortcuts and rows do nothing', () => {
        const onChange = vi.fn();
        render(<BlockedTimesPicker days={DAYS} value={[]} onChange={onChange} readOnly />);
        expect(screen.queryByRole('button', { name: 'No podemos en todo el día' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '17:00–17:30' }));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('without days it says so', () => {
        render(<BlockedTimesPicker days={[]} value={[]} />);
        expect(screen.getByText('El torneo no tiene días configurados.')).toBeInTheDocument();
    });
});
```

- [ ] **Paso 2: Ejecutarlos y ver que fallan**

Ejecuta: `npx vitest run components/registration`
Resultado esperado: FALLA, porque no se puede resolver `../BlockedTimesPicker`.

- [ ] **Paso 3: Implementar el componente**

Crea `components/registration/BlockedTimesPicker.tsx`:

```tsx
import React, { useState } from 'react';
import type { DaySchedule } from '../../services/scheduler/types';
import {
    blockWholeDay, clearDay, dayLabel, daySlots, isSlotBlocked, rangesOfDay, sortDays, toggleSlot,
} from '../../services/registration/blockedTimes';

interface Props {
    /** Tournament days (schedulerConfig.dailySchedule). */
    days: DaySchedule[];
    /** Ranges in which the pair can NOT play. */
    value: DaySchedule[];
    onChange?: (ranges: DaySchedule[]) => void;
    readOnly?: boolean;
}

/** "When can you NOT play?": one tab per tournament day, one row per half hour. */
export const BlockedTimesPicker: React.FC<Props> = ({ days, value, onChange, readOnly = false }) => {
    const sorted = sortDays(days);
    const [activeDate, setActiveDate] = useState(sorted[0]?.date ?? '');
    const day = sorted.find(d => d.date === activeDate) ?? sorted[0];

    if (!day) {
        return <p className="text-xs text-slate-400">El torneo no tiene días configurados.</p>;
    }

    const change = (ranges: DaySchedule[]) => {
        if (!readOnly) onChange?.(ranges);
    };

    return (
        <div className="space-y-3">
            <div role="tablist" className="flex gap-1.5">
                {sorted.map(d => {
                    const count = rangesOfDay(value, d.date).length;
                    const active = d.date === day.date;
                    return (
                        <button
                            key={d.date}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveDate(d.date)}
                            className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold border transition ${
                                active
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {dayLabel(d.date)}{count > 0 ? ` · ${count}` : ''}
                        </button>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => change(blockWholeDay(value, day))}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-rose-500/60"
                    >
                        No podemos en todo el día
                    </button>
                    <button
                        type="button"
                        onClick={() => change(clearDay(value, day))}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-emerald-500/60"
                    >
                        Borrar este día
                    </button>
                </div>
            )}

            <div className="space-y-1">
                {daySlots(day).map(slot => {
                    const blocked = isSlotBlocked(value, day.date, slot);
                    const label = `${slot.start}–${slot.end}`;
                    return (
                        <button
                            key={slot.start}
                            type="button"
                            aria-label={label}
                            aria-pressed={blocked}
                            disabled={readOnly}
                            onClick={() => change(toggleSlot(value, day, slot))}
                            className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                        >
                            <span className="w-24 shrink-0 text-[11px] font-mono text-slate-400">{label}</span>
                            <span className={`h-6 flex-1 rounded-lg border text-[10px] font-bold leading-6 px-2 ${
                                blocked
                                    ? 'bg-rose-500/30 border-rose-500/60 text-rose-200'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300/60'
                            }`}>
                                {blocked ? 'No podemos' : ''}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
```

- [ ] **Paso 4: Ejecutar los tests**

Ejecuta: `npx vitest run components/registration`
Resultado esperado: 6 tests en verde.

- [ ] **Paso 5: Commit**

```bash
git add components/registration/
git commit -m "feat(registration): rejilla de bloqueos con pestañas por día"
```

---

### Tarea 4: Formulario público

**Archivos:**
- Modificar: `pages/PublicRegistrationPage.tsx`

- [ ] **Paso 1: Imports**

Debajo de `import { Ranking, TournamentRegistration, User as ClubUser } from '../types';` añade:

```tsx
import type { DaySchedule } from '../services/scheduler/types';
import { BlockedTimesPicker } from '../components/registration/BlockedTimesPicker';
import { blocksWholeTournament, notesWithSummary, sortDays, summarize } from '../services/registration/blockedTimes';
```

- [ ] **Paso 2: Estado**

Sustituye el bloque `// Weekend Availability State` (los ocho `useState` de `fridayStatus` a `availabilityNotes`) por:

```tsx
  // Availability: ranges in which the pair can NOT play
  const [blockedRanges, setBlockedRanges] = useState<DaySchedule[]>([]);
  const [availabilityNotes, setAvailabilityNotes] = useState('');
```

- [ ] **Paso 3: Envío**

En `handleSubmit`, borra todo lo que hay entre `// Build structured availability` y la línea anterior a `const registrationData: Omit<TournamentRegistration, 'id'> = {`, es decir, el objeto `availability`, el array `parts` y `readableSummary`. Pon esto en su lugar:

```tsx
      const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);
      const readableSummary = notesWithSummary(summarize(blockedRanges, days), availabilityNotes);

```

Y dentro de `registrationData`, sustituye:

```tsx
        availability,
        availabilityNotes: readableSummary,
```

por:

```tsx
        blockedRanges,
        availabilityNotes: readableSummary,
```

- [ ] **Paso 4: Días y pantalla «todavía no disponible»**

Sustituye:

```tsx
  const isIndividual = ranking.format === 'individual';

  // Pantalla de Confirmación
```

por:

```tsx
  const isIndividual = ranking.format === 'individual';
  const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);

  // Pantalla de Confirmación
```

Justo antes del `return (` principal, el que empieza por `<div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 flex flex-col justify-center items-center">` y va después del bloque `if (!isRegistrationOpen) { ... }`, añade:

```tsx
  // Sin días configurados no hay rejilla de bloqueos: la inscripción todavía no admite parejas
  if (days.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold">La inscripción todavía no está disponible</h2>
          <p className="text-slate-400 text-sm">
            La organización de <strong className="text-white">{ranking.nombre}</strong> aún está preparando los horarios del torneo. Vuelve a intentarlo más tarde.
          </p>
        </div>
      </div>
    );
  }

```

- [ ] **Paso 5: Pantalla de confirmación**

En la tarjeta de resumen, sustituye la etiqueta «Disponibilidad declarada:» y el `<span>` siguiente, que contiene la larga expresión con `fridayStatus`, `saturdayStatus` y `sundayStatus`, por:

```tsx
              <span className="text-slate-400 block mb-1">Bloqueos declarados:</span>
              <span className="text-slate-300 font-medium text-[11px] block bg-slate-900 p-2 rounded-xl border border-slate-800">
                {summarize(blockedRanges, days)}
              </span>
```

En el `onClick` de «Inscribir otra pareja», sustituye:

```tsx
                setFridayStatus('available');
                setFridayFromTime('19:00');
                setSaturdayStatus('all_day');
                setSaturdayFromTime('10:00');
                setSaturdayUntilTime('20:00');
                setSundayStatus('all_day');
                setAvailabilityNotes('');
```

por:

```tsx
                setBlockedRanges([]);
                setAvailabilityNotes('');
```

- [ ] **Paso 6: Sección de disponibilidad del formulario**

En la sección `{/* Section 4: Weekend Schedule Availability */}`, sustituye todo lo que va desde la línea

```tsx
                <span>{isIndividual ? '3' : '4'}. Disponibilidad para el Torneo (Fin de Semana)</span>
```

hasta la línea anterior a `{/* Textarea for additional comments */}`. Eso incluye el `<p>` de ayuda, el cierre de la cabecera y los bloques de Viernes, Sábado y Domingo. Pon esto en su lugar:

```tsx
                <span>{isIndividual ? '3' : '4'}. ¿Cuándo NO podéis jugar?</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Marcad las medias horas en las que no podéis jugar. Si podéis jugar siempre, no marquéis nada.
              </p>
            </div>

            <div className="space-y-3">
              <BlockedTimesPicker days={days} value={blockedRanges} onChange={setBlockedRanges} />

              {blocksWholeTournament(blockedRanges, days) && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Habéis bloqueado todo el torneo y no podremos daros hora.
                </div>
              )}

```

El textarea de observaciones y su texto de ayuda se quedan como están.

- [ ] **Paso 7: Tipos y tests**

Ejecuta: `npx tsc --noEmit -p . 2>&1 | grep -E "PublicRegistration|registration/"`
Resultado esperado: ninguna línea. Además, `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` debe dar 42.

Ejecuta: `npx vitest run`
Resultado esperado: todo en verde.

- [ ] **Paso 8: Commit**

```bash
git add pages/PublicRegistrationPage.tsx
git commit -m "feat(registration): el formulario público pide los bloqueos con la rejilla"
```

---

### Tarea 5: Gestión del admin

**Archivos:**
- Modificar: `components/admin/RegistrationManagerModal.tsx`
- Modificar: `components/RankingView.tsx`

- [ ] **Paso 1: Imports**

Sustituye:

```tsx
import { Ranking, TournamentRegistration, TournamentRegistrationAvailability } from '../../types';
import { makePairKey, PairAvailability } from '../../services/SchedulerEngine';
```

por:

```tsx
import { Ranking, TournamentRegistration } from '../../types';
import type { DaySchedule } from '../../services/scheduler/types';
import { BlockedTimesPicker } from '../registration/BlockedTimesPicker';
import { pairLabel } from '../scheduler/pairLabel';
import {
  clipToDays,
  effectiveBlockedRanges,
  notesWithSummary,
  registrationNote,
  sortDays,
  summarize
} from '../../services/registration/blockedTimes';
import { applyRegistrationBlocks, importRegistrations, isImported } from '../../services/registration/syncRegistration';
```

- [ ] **Paso 2: Props**

En `RegistrationManagerModalProps`, debajo de `onUpdateRanking: (updated: Ranking) => void;`, añade:

```tsx
  /** Opens "Disponibilidad" so the admin can configure the tournament days. */
  onConfigureDays?: () => void;
```

En la desestructuración de props, sustituye `onClose,\n  onUpdateRanking\n}) => {` por:

```tsx
  onClose,
  onUpdateRanking,
  onConfigureDays
}) => {
```

- [ ] **Paso 3: Estado**

En `manualData`, borra las siete propiedades del formato antiguo, de `fridayStatus` a `sundayStatus`. Quedan `category: ''` y `notes: ''` seguidas.

Debajo de `const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);` añade:

```tsx
  const [manualBlocked, setManualBlocked] = useState<DaySchedule[]>([]);
  const [editingBlocks, setEditingBlocks] = useState<DaySchedule[]>([]);
  const [savingBlocks, setSavingBlocks] = useState(false);

  const days = sortDays(ranking.schedulerConfig?.dailySchedule ?? []);
  const hasDays = days.length > 0;
```

- [ ] **Paso 4: Interruptor sin días**

Al principio de `handleToggleRegistrationOpen`, antes de `const isCurrentlyOpen = ...`, añade:

```tsx
    // Without tournament days there is no blocked-times grid: send the admin to configure them
    if (!hasDays) {
      onConfigureDays?.();
      return;
    }
```

- [ ] **Paso 5: Inscripción manual**

En `handleCreateManual`, sustituye todo lo que va de `// Structured availability` hasta `const readableSummary = parts.join(' • ');`, incluida esa línea, por:

```tsx
    const readableSummary = notesWithSummary(summarize(manualBlocked, days), manualData.notes);
```

En `newReg`, sustituye `availability,` por `blockedRanges: manualBlocked,`. Deja `availabilityNotes: readableSummary,` como está.

En el `setManualData({...})` del final, que reinicia el formulario, borra las siete propiedades del formato antiguo, de `fridayStatus` a `sundayStatus`. Justo después del `});` de ese `setManualData`, añade `setManualBlocked([]);`.

- [ ] **Paso 6: Importar con `importRegistrations`**

Borra la función entera `buildPairConstraintsForRegistration`, desde el comentario `// Helper to map availability to pairConstraints` hasta la línea anterior a `// Import approved pairs into tournament guest players and divisions`.

En `handleImportApprovedToTournament`, dentro del `try`, sustituye todo lo que va desde `const existingGuestPlayers = [...(ranking.guestPlayers || [])];` hasta la línea anterior a `await updateRanking(updatedRanking);` por:

```tsx
      const updatedRanking = importRegistrations(ranking, approvedList);

```

- [ ] **Paso 7: Abrir y guardar bloqueos**

Justo antes de `// Export to Excel`, añade:

```tsx
  const handleOpenBlocksEditor = (reg: TournamentRegistration) => {
    setSelectedReg(reg);
    setEditingBlocks(clipToDays(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days).kept);
  };

  /** Saves the blocks; an imported registration also updates the tournament and re-checks its conflicts. */
  const handleSaveBlocks = async () => {
    if (!selectedReg) return;
    const updatedReg: TournamentRegistration = {
      ...selectedReg,
      blockedRanges: editingBlocks,
      availabilityNotes: notesWithSummary(summarize(editingBlocks, days), registrationNote(selectedReg))
    };
    setSavingBlocks(true);
    try {
      await updateTournamentRegistration(ranking.id, selectedReg.id, {
        blockedRanges: updatedReg.blockedRanges,
        availabilityNotes: updatedReg.availabilityNotes
      });
    } catch (err) {
      console.error('Error saving blocked times:', err);
      alert('No se pudieron guardar los bloqueos. Inténtalo de nuevo.');
      setSavingBlocks(false);
      return;
    }
    try {
      if (isImported(ranking, updatedReg)) {
        const { ranking: updatedRanking, newConflicts } = applyRegistrationBlocks(ranking, updatedReg);
        await updateRanking(updatedRanking);
        onUpdateRanking(updatedRanking);
        if (newConflicts.length) {
          const players = Object.fromEntries((updatedRanking.guestPlayers ?? []).map(p => [p.id, p])) as any;
          const lines = newConflicts.flatMap(c => c.conflicts.map(x => `• ${pairLabel(x.pairKey, players)}: ${x.reason}`));
          alert(`Conflicto de horario en el siguiente partido:\n${lines.join('\n')}\n\nRevísalo en "Conflictos".`);
        }
      }
      setSelectedReg(null);
    } catch (err) {
      console.error('Error syncing blocked times to the tournament:', err);
      alert('Inscripción guardada, pero no se pudo actualizar el torneo. Vuelve a guardar para reintentarlo.');
    } finally {
      setSavingBlocks(false);
    }
  };
```

- [ ] **Paso 8: Interruptor en la interfaz**

Sustituye `const isRegistrationOpen = ranking.registrationConfig?.isOpen !== false;` por:

```tsx
  const isRegistrationOpen = hasDays && ranking.registrationConfig?.isOpen !== false;
```

En el botón del interruptor (`onClick={handleToggleRegistrationOpen}`), añade debajo del `onClick`:

```tsx
              title={hasDays ? undefined : 'Configura los días del torneo en «Disponibilidad»'}
```

y sustituye su texto `{isRegistrationOpen ? 'Inscripciones Abiertas' : 'Inscripciones Cerradas'}` por:

```tsx
              {isRegistrationOpen ? 'Inscripciones Abiertas' : hasDays ? 'Inscripciones Cerradas' : 'Cerradas: faltan los días del torneo'}
```

- [ ] **Paso 9: Resumen en cada inscripción**

Sustituye el bloque entero que empieza en `{/* Schedule availability badges & notes */}` y acaba en su `) : null}`. Es la cadena `reg.availability ? (...badges...) : reg.availabilityNotes ? (...) : null`. Pon esto en su lugar:

```tsx
                    {/* Blocked times */}
                    <div className="text-[11px] bg-slate-900/90 border border-slate-800/80 rounded-xl px-2.5 py-1 text-slate-300 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="flex-1">
                        <strong>Bloqueos:</strong> {notesWithSummary(summarize(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days), registrationNote(reg))}
                      </span>
                      {hasDays && (
                        <button
                          type="button"
                          onClick={() => handleOpenBlocksEditor(reg)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" /> Editar bloqueos
                        </button>
                      )}
                    </div>
```

- [ ] **Paso 10: Modal de edición de bloqueos**

Justo antes de `{/* Manual Registration Modal */}`, añade:

```tsx
      {/* Blocked Times Editor */}
      {selectedReg && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Bloqueos de {selectedReg.player1.name}{selectedReg.player2 ? ` / ${selectedReg.player2.name}` : ''}
              </h3>
              <button onClick={() => setSelectedReg(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const dropped = clipToDays(effectiveBlockedRanges(selectedReg, days, ranking.fechaInicio), days).droppedCount;
              return dropped > 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {dropped} franja{dropped > 1 ? 's' : ''} fuera de los días del torneo; no se tendrán en cuenta.
                </div>
              ) : null;
            })()}

            <BlockedTimesPicker days={days} value={editingBlocks} onChange={setEditingBlocks} />

            {isImported(ranking, selectedReg) && (
              <p className="text-[11px] text-slate-400">
                Esta pareja ya está en el torneo: al guardar se actualizan sus restricciones y se revisan sus partidos (no se mueve ninguno).
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveBlocks}
                disabled={savingBlocks}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition"
              >
                {savingBlocks ? 'Guardando…' : 'Guardar bloqueos'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Paso 11: Rejilla en la inscripción manual**

En el formulario del modal manual, sustituye el bloque que empieza en `{/* Weekend Availability in Manual Modal */}` y acaba justo antes del `<div>` de «Observaciones adicionales». Es el `div` con Viernes, Sábado y Domingo. Pon esto en su lugar:

```tsx
              {/* Blocked times in Manual Modal */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-emerald-400">¿Cuándo NO pueden jugar? (opcional)</span>
                {hasDays ? (
                  <BlockedTimesPicker days={days} value={manualBlocked} onChange={setManualBlocked} />
                ) : (
                  <p className="text-[11px] text-slate-400">Configura los días del torneo en «Disponibilidad» para indicar bloqueos.</p>
                )}
              </div>

```

- [ ] **Paso 12: `RankingView` pasa `onConfigureDays`**

En `components/RankingView.tsx`, en `<RegistrationManagerModal ... />`, debajo de `onUpdateRanking={onUpdateRanking || (() => {})}`, añade:

```tsx
        onConfigureDays={() => {
          setIsRegistrationModalOpen(false);
          setIsSchedulerConfigModalOpen(true);
        }}
```

- [ ] **Paso 13: Tipos y tests**

Ejecuta: `npx tsc --noEmit -p . 2>&1 | grep -E "RegistrationManager|RankingView.tsx\(3|registration/"`
Resultado esperado: ninguna línea. Los dos errores previos de `RankingView.tsx`, en las líneas 1087 y 1143, no encajan con ese patrón. `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` debe dar 42.

Ejecuta: `npx vitest run`
Resultado esperado: todo en verde.

- [ ] **Paso 14: Commit**

```bash
git add components/admin/RegistrationManagerModal.tsx components/RankingView.tsx
git commit -m "feat(registration): el admin edita los bloqueos y se sincronizan con el torneo"
```

---

### Tarea 6: Regla de Firestore y datos de los emuladores

**Archivos:**
- Modificar: `firestore.rules`
- Modificar: `scripts/seedEmulator.mjs`

- [ ] **Paso 1: Regla**

En `firestore.rules`, dentro de `match /registrations/{regId}`, sustituye:

```
        // Public registration creation
        allow create: if true;
```

por:

```
        // Public registration creation (blockedRanges, if present, is capped to keep documents small)
        allow create: if !('blockedRanges' in request.resource.data)
          || (request.resource.data.blockedRanges is list && request.resource.data.blockedRanges.size() <= 100);
```

- [ ] **Paso 2: Torneo de ejemplo en el script de siembra**

En `scripts/seedEmulator.mjs`, al final de `main`, sustituye la línea `console.log(...)` por:

```js
    // An elimination tournament with its days configured and public registration open
    // (public link: /?inscripcion=test-registration-tournament)
    await setDoc('rankings/test-registration-tournament', {
        id: 'test-registration-tournament', nombre: 'Torneo Inscripciones', categoria: 'Mixto',
        fechaInicio: '2026-10-23', status: 'activo', format: 'elimination', ownerId: uid,
        divisions: [],
        schedulerConfig: {
            courts: 3, slotDurationMinutes: 90, restMinutes: 60, mode: 'full', timeWindows: [],
            dailySchedule: [
                { date: '2026-10-23', startTime: '17:00', endTime: '22:00' },
                { date: '2026-10-24', startTime: '09:00', endTime: '22:00' },
                { date: '2026-10-25', startTime: '09:00', endTime: '14:00' },
            ],
        },
        registrationConfig: { isOpen: true, categories: ['Primera', 'Segunda'] },
    });
    console.log(`Seeded admin ${TEST_EMAIL} (uid ${uid}), ${NAMES.length} players and the tournament test-registration-tournament.`);
```

- [ ] **Paso 3: Commit**

```bash
git add firestore.rules scripts/seedEmulator.mjs
git commit -m "feat(registration): límite de franjas en la regla y torneo de ejemplo en los emuladores"
```

---

### Tarea 7: Verificación final

- [ ] **Paso 1: Suite completa y tipos**

Ejecuta: `npx vitest run`. Resultado esperado: 188 tests en verde (162 previos y 26 nuevos).
Ejecuta: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"`. Resultado esperado: 42.

- [ ] **Paso 2: Prueba manual en los emuladores**

Hacen falta tres terminales: `npm run emulators`, luego `npm run seed:emulator` y `npm run dev:emulator`.

1. **Formulario público.** Abre `http://localhost:3000/?inscripcion=test-registration-tournament` con vista de móvil.
   - Aparecen las pestañas «vie 23», «sáb 24» y «dom 25».
   - En el sábado, pulsa 09:00–09:30, 09:30–10:00 y 10:00–10:30: la pestaña pasa a «sáb 24 · 1».
   - Rellena los dos jugadores, acepta las condiciones y envía. La confirmación muestra «Bloqueos declarados: Sáb 24: no 09:00–10:30».
2. **Regla de Firestore.** Una creación sin autenticar con 101 franjas en `blockedRanges` devuelve 403, y con 3 franjas devuelve 200 (POST a la API REST del emulador, en `.../rankings/test-registration-tournament/registrations`). **Borra después esa inscripción de prueba** (no tiene jugadores).
3. **Admin.** Entra con `admin@padelrank.test` (la contraseña está en `scripts/seedEmulator.mjs`), abre «Torneo Inscripciones» y luego «Inscripciones (1)».
   - La fila muestra «Bloqueos: Sáb 24: no 09:00–10:30» y el botón «Editar bloqueos».
   - Pulsa «Aprobar» y luego «Importar (1) al Torneo». El ranking tiene ahora `pairConstraints` con esa franja.
4. **Sincronización.** Pulsa «Editar bloqueos», ve al domingo, pulsa «No podemos en todo el día» y «Guardar bloqueos».
   - La fila pasa a «… • Dom 25: no 09:00–14:00».
   - Las `pairConstraints` del ranking incluyen `2026-10-25 09:00–14:00`.
5. **Sin días.** Vacía `schedulerConfig.dailySchedule` del ranking.
   - El interruptor dice «Cerradas: faltan los días del torneo», desaparece «Editar bloqueos» y al pulsar el interruptor se abre «Configuración de Horarios».
   - La página pública muestra «La inscripción todavía no está disponible».
   - Restaura los días al terminar.

- [ ] **Paso 3: Resultado**

Si algo falla, corrígelo antes de integrar la rama. Si todo funciona, usa superpowers:finishing-a-development-branch.
