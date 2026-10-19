# Diseño: Rejilla de bloqueos en la inscripción de parejas

Fecha: 2026-10-19
Estado: Pendiente de revisión
Alcance: inscripción pública de torneos (`PublicRegistrationPage`) y gestión de inscripciones del admin (`RegistrationManagerModal`). Es la pieza 1 de 4 del proyecto «inscripción con disponibilidad»; las otras tres tienen su propia especificación.

## 1. Problema

Las parejas ya pueden inscribirse con un enlace público, y al importar las aprobadas su disponibilidad se convierte en restricciones del motor de horarios (`pairConstraints`). Pero la disponibilidad se pide con opciones fijas: viernes «desde las X», sábado «solo mañana / solo tarde / personalizado» y domingo «solo mañana / solo tarde».

Eso falla en tres cosas:

1. **No hay precisión.** El motor trabaja en tramos de 15 minutos, pero «sábado por la mañana» se traduce a una franja fija (00:00–15:00). El admin acaba corrigiendo restricciones a mano.
2. **No sigue los días reales del torneo.** El formulario siempre muestra viernes, sábado y domingo. La conversión adivina las fechas por el día de la semana o a partir de `fechaInicio`.
3. **Los cambios llegan por WhatsApp.** El admin no puede editar la disponibilidad desde la ficha de la inscripción. Y lo que cambia después de importar no llega al motor.

## 2. Objetivos

- La pareja marca **cuándo NO puede jugar** con una rejilla de medias horas sobre los días y horarios reales del torneo.
- Los bloqueos se guardan **en el mismo formato que usa el motor**, así que importar es copiar.
- El admin ve y edita los bloqueos de cada inscripción con la misma rejilla.
- Si la inscripción ya está importada, editarla actualiza el torneo y revisa los conflictos sin mover partidos.

Fuera de alcance (son las otras piezas del proyecto):
- **Pieza 2:** el enlace personal «Mi inscripción» para que la pareja edite sus bloqueos.
- **Pieza 3:** los emails con Brevo, para la confirmación y los cambios de horario.
- **Pieza 4:** la vinculación con jugadores que ya existen, para el historial.
- Las preferencias suaves («preferimos tarde»). Solo hay bloqueos estrictos.
- Heredar bloqueos cuando el admin deshace las parejas al montar el cuadro.

## 3. Decisiones tomadas

| Pregunta | Decisión |
|---|---|
| Qué se pregunta | Cuándo NO pueden. Por defecto, disponibles siempre. |
| Interfaz | Pestañas por día y una fila por media hora (opción B de las maquetas). |
| Precisión | Medias horas. |
| Torneo sin días configurados | La inscripción no admite parejas hasta configurarlos. |
| Edición del admin | Ve y edita con la misma rejilla desde la ficha. |
| Inscripción ya importada | Al guardarla se sincroniza sola con `pairConstraints`. |
| Formato guardado | Lista de franjas `{ date, startTime, endTime }`, igual que el motor. |

## 4. Modelo de datos

`types.ts`, en `TournamentRegistration`:

```ts
/** Franjas en las que la pareja NO puede jugar. Mismo formato que PairAvailability.unavailableRanges. */
blockedRanges?: DaySchedule[];   // { date: 'YYYY-MM-DD', startTime: 'HH:MM', endTime: 'HH:MM' }
```

- `availability` (el formato de viernes, sábado y domingo) se queda **solo como lectura** para las inscripciones antiguas. El código nuevo no lo escribe.
- `availabilityNotes` se sigue rellenando, porque lo usan las exportaciones a Excel y PDF. Ahora se genera a partir de `blockedRanges`: «Sáb 24: no 09:00–10:30, 21:30–22:00», o «Disponibles todo el torneo».
- Una inscripción **sin** `blockedRanges` y **sin** `availability` significa disponible siempre.
- `DaySchedule` ya existe en `services/scheduler/types.ts` y se reutiliza.

## 5. Arquitectura

### 5.1 `services/registration/blockedTimes.ts` (lógica pura)

Sin React ni Firestore. Las horas siempre en hora local (`parseTimeOnDate` / `localDateKey` de `services/scheduler/timeGrid.ts`).

- `daySlots(day: DaySchedule): Slot[]`: las medias horas de un día del torneo, desde la apertura hasta el cierre. Si la apertura no cae en hora o media, el primer tramo es más corto (17:15–17:30) y los demás siguen en medias horas normales. Lo mismo con el último tramo si el cierre no cae en hora o media.
- `rangesToSlotKeys(ranges, day): Set<string>`: las medias horas de ese día que se solapan con algún bloqueo.
- `slotKeysToRanges(date, keys, day): DaySchedule[]`: lo contrario, juntando las medias horas seguidas en una sola franja.
- `toggleSlot(ranges, day, slot)`, `blockWholeDay(ranges, day)` y `clearDay(ranges, day)` devuelven la lista de franjas nueva, ya juntada.
- `clipToDays(ranges, days): { kept, droppedCount }`: recorta cada franja al horario de su día y descarta las de días que ya no son del torneo.
- `summarize(ranges, days): string`: el texto de `availabilityNotes`.
- `legacyAvailabilityToRanges(availability, days, fechaInicio)`: la conversión que hoy vive dentro de `RegistrationManagerModal` (`buildPairConstraintsForRegistration`). Se mueve aquí sin cambiar su comportamiento.
- `effectiveBlockedRanges(reg, days, fechaInicio)`: `blockedRanges` si existe; si no, la conversión del formato antiguo; si tampoco, `[]`.

### 5.2 `services/registration/syncRegistration.ts` (lógica pura)

- `applyRegistrationBlocks(ranking, reg): { ranking, newConflicts }`.
  - Si la inscripción no está importada (el torneo no tiene el jugador `guest_reg_<id>_1`), devuelve el torneo sin cambios.
  - Si lo está, calcula la clave de la pareja con `makePairKey(guest_reg_<id>_1, guest_reg_<id>_2)` y pone en `pairConstraints` las franjas de `clipToDays(effectiveBlockedRanges(...))`. Si quedan vacías, borra la entrada.
  - Después llama a `SchedulerEngine.onResultEntered`, que revisa los conflictos de los partidos con hora y con las dos parejas conocidas **sin mover nada**, y devuelve sus `newConflicts`.
- `importRegistrations(ranking, approved): Ranking`: la parte pura de la importación actual (jugadores invitados y `pairConstraints`), usando `effectiveBlockedRanges` y `clipToDays`.

### 5.3 `components/registration/BlockedTimesPicker.tsx`

Componente controlado:

```ts
interface Props {
  days: DaySchedule[];            // schedulerConfig.dailySchedule, ordenados
  value: DaySchedule[];           // franjas bloqueadas
  onChange?: (ranges: DaySchedule[]) => void;
  readOnly?: boolean;
}
```

- Una pestaña por día: «vie 23», o «sáb 24 · 2» cuando tiene bloqueos. El número es la cantidad de franjas de ese día.
- Debajo, una fila por media hora con su horario («09:00–09:30») y una barra que se pulsa para bloquear o desbloquear. En rojo, bloqueada; en verde, libre.
- Atajos por día: «No podemos en todo el día» y «Borrar este día».
- En `readOnly` no hay atajos y las filas no responden.
- Toda la lógica llama a `blockedTimes.ts`. El componente no calcula franjas por su cuenta.

### 5.4 Cambios en ficheros existentes

- `types.ts`: el campo `blockedRanges`.
- `pages/PublicRegistrationPage.tsx`: sustituye los selectores de viernes, sábado y domingo por `BlockedTimesPicker` (ver sección 6).
- `components/admin/RegistrationManagerModal.tsx`: ver sección 7. Pierde `buildPairConstraintsForRegistration`, que pasa a `blockedTimes.ts`, y la lógica de importación, que pasa a `syncRegistration.ts`.
- `firestore.rules`: el límite de tamaño de la sección 8.

El motor de horarios (`services/scheduler/`) no cambia.

## 6. Formulario público

- Días: `ranking.schedulerConfig.dailySchedule`, ordenados por fecha. La lectura del torneo ya es pública (`allow get: if true`).
- Si la inscripción está abierta pero el torneo **no tiene días**, la página muestra «La inscripción todavía no está disponible» en lugar del formulario.
- Texto encima de la rejilla: «¿Cuándo NO podéis jugar? Si podéis siempre, no marquéis nada». No es obligatorio marcar nada.
- Si las franjas cubren todas las medias horas de todos los días, sale el aviso «Habéis bloqueado todo el torneo y no podremos daros hora». Se puede enviar igualmente.
- La pantalla de confirmación muestra el resumen (`summarize`).
- Al enviar se guardan `blockedRanges` (ya juntadas) y `availabilityNotes`. Ya no se escribe `availability`.
- Se mantiene el campo libre de notas.
- Si falla el envío, se muestra el error que ya existe y se conservan los bloqueos marcados.

## 7. Gestión del admin

- **Abrir la inscripción:** hoy la inscripción está abierta por defecto (`registrationConfig.isOpen !== false`) y se controla con el interruptor «Inscripciones Abiertas / Cerradas». Sin días configurados, el interruptor muestra «Cerradas: faltan los días del torneo», no deja pasar a abiertas y enlaza a «Disponibilidad». La página pública, por su parte, ya muestra «todavía no disponible» (sección 6), así que el valor por defecto no deja pasar inscripciones sin rejilla.
- **Ficha de la inscripción:** `BlockedTimesPicker` editable con `effectiveBlockedRanges` y un botón «Guardar bloqueos».
  - Las inscripciones antiguas aparecen ya convertidas. Al guardarlas pasan a `blockedRanges`.
  - Si `clipToDays` descarta franjas, la ficha avisa: «N franjas fuera de los días del torneo; no se tendrán en cuenta».
- **Inscripción manual del admin:** incluye la rejilla, opcional.
- **Guardar bloqueos:**
  1. Actualiza la inscripción (`blockedRanges` y `availabilityNotes`).
  2. Si está importada, aplica `applyRegistrationBlocks` y guarda el torneo.
  3. Si hay `newConflicts`, muestra el aviso habitual («Conflicto de horario… Revísalo en "Conflictos"»), igual que al meter un resultado.
  4. Si falla el paso 2 después del 1, muestra «Inscripción guardada, pero no se pudo actualizar el torneo. Vuelve a guardar para reintentarlo». Guardar dos veces da el mismo resultado.
- **Importar las aprobadas:** usa `importRegistrations`. El comportamiento es el mismo que hoy, salvo que copia las franjas tal cual en vez de convertirlas.

## 8. Seguridad

- `firestore.rules`, en `registrations`: la creación sigue siendo pública, pero se exige que `blockedRanges`, si viene, sea una lista de 100 elementos como máximo:
  `allow create: if !('blockedRanges' in request.resource.data) || (request.resource.data.blockedRanges is list && request.resource.data.blockedRanges.size() <= 100);`
- La lectura y la edición siguen siendo solo del admin y de su staff.

## 9. Errores y casos límite

- **Días cambiados después de inscribirse:** las franjas se recortan o descartan al importar y sincronizar (`clipToDays`), y la ficha lo avisa.
- **Horario que no empieza o acaba en hora o media:** el tramo es más corto y la franja guarda la hora exacta.
- **Bloqueo de todo el torneo:** se permite. El motor marcará el conflicto al generar, como ya hace.
- **Inscripción sin bloqueos:** la pareja no tiene restricciones y se borra su entrada de `pairConstraints` si existía.
- **Pareja importada y luego deshecha por el admin:** si no existe `guest_reg_<id>_1`, `applyRegistrationBlocks` no hace nada.

## 10. Pruebas (vitest)

- `services/registration/__tests__/blockedTimes.test.ts`:
  - medias horas de un día normal y de uno con apertura y cierre irregulares (17:15–21:45);
  - convertir entre franjas y medias horas, juntando las seguidas;
  - marcar y desmarcar en medio de una franja (la parte en dos);
  - todo el día y borrar el día;
  - recortar a los días del torneo y contar las descartadas;
  - el resumen;
  - que `legacyAvailabilityToRanges` da lo mismo que la función actual en los casos de viernes, sábado y domingo.
- `services/registration/__tests__/syncRegistration.test.ts`:
  - inscripción no importada: no cambia nada;
  - inscripción importada: se reemplazan sus `pairConstraints`, o se borran si no tiene bloqueos;
  - un partido con hora dentro de un bloqueo nuevo aparece en `newConflicts` y conserva su hora;
  - la importación copia las franjas y descarta las que caen fuera de los días.
- `components/registration/__tests__/BlockedTimesPicker.test.tsx`: pestañas con contador, que pulsar una fila envíe franjas juntadas, «todo el día», y el modo de solo lectura.
- Integración: un torneo con una inscripción importada con bloqueos y `generateSchedule` no da hora a esa pareja dentro de sus bloqueos.
- Manual en los emuladores (`npm run emulators`, `npm run seed:emulator`, `npm run dev:emulator`). El script de siembra añade un torneo con días configurados e inscripción abierta.
  1. Inscribirse desde el enlace público con vista de móvil.
  2. Aprobar e importar.
  3. Generar el horario.
  4. Editar los bloqueos de una pareja ya importada y ver el conflicto en «Conflictos (N)».
