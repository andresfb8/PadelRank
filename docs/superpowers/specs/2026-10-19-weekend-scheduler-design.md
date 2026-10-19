# Diseño: Motor de horarios para torneos de fin de semana (v2)

Fecha: 2026-10-19
Estado: Pendiente de revisión
Alcance: torneos de formato `elimination` (con y sin consolación). El formato `hybrid` queda fuera.

## 1. Problema

El `SchedulerEngine` actual (`services/SchedulerEngine.ts`) es un algoritmo voraz de primer hueco libre. Por orden de prioridad del organizador, falla en esto:

1. **Estabilidad (D).** Las horas provisionales cambian al meter resultados. `scheduleNextMatches` busca un hueco nuevo, y además choca con la propia estimación del partido, porque `getAllOccupiedSlots` se llama sin `excludeMatchId`.
2. **Reparto entre categorías (C).** Los partidos se ordenan solo por `jornada`, mezclando categorías, y la categoría más grande acapara las pistas.
3. **Disponibilidad (A).** No se prioriza a las parejas restringidas ni se recoloca nada. Los partidos sin hueco se quedan sin hora y sin ningún aviso.

Otros defectos que se corrigen de paso:
- Se mezcla UTC con hora local al calcular el día (`toISOString`).
- La rejilla de 30 minutos desperdicia tiempo con partidos de 75 minutos.
- La clave de la pareja depende del orden de los jugadores.
- La estimación ignora la disponibilidad.

## 2. Objetivos

- Horarios estables, con dos modos que elige el admin: **completo** y **por día**.
- Avance equilibrado entre categorías, programando hacia atrás desde las finales.
- Respetar la disponibilidad de las parejas, colocando primero a las más restringidas.
- Si no hay solución, colocar igualmente el partido y **marcar el conflicto**.
- Avisar antes de generar si las fases o el torneo no caben.

Fuera de alcance:
- Formato híbrido.
- Corte mañana/tarde configurable (sigue fijo a las 15:00).
- Duración distinta por fase.
- Optimización global (búsqueda con restricciones).

## 3. Arquitectura

`services/SchedulerEngine.ts` se sustituye por `services/scheduler/`:

| Módulo | Responsabilidad | Depende de |
|---|---|---|
| `types.ts` | `SchedulerConfig`, `PairAvailability`, `makePairKey`, tipos internos (`Slot`, `RoundPlan`, `Conflict`) | — |
| `timeGrid.ts` | Construye la rejilla día × hora (paso de 15 min) × pista a partir de `dailySchedule`. Todas las fechas en hora local y con un helper `localDateKey(date)` en lugar de `toISOString` | `types` |
| `candidates.ts` | `getCandidatePairs(matchId, divisions)`: el conjunto de parejas que pueden llegar a un partido, siguiendo `nextMatchId` y `consolationMatchId` hacia atrás. Si el partido ya tiene sus dos parejas, devuelve solo esas | `types` |
| `availability.ts` | `violationMinutes(start, end, pairKeys, constraints)`: devuelve los minutos de solape con las restricciones (0 = compatible) | `types` |
| `roundPlanner.ts` | **Fase 1:** ventana [IT, FT] y holgura por ronda, más la comprobación de viabilidad | `timeGrid` |
| `matchAssigner.ts` | **Fase 2:** asigna hora y pista con un recorrido cronológico y prioridades | `timeGrid`, `candidates`, `availability`, `roundPlanner` |
| `index.ts` | La fachada `SchedulerEngine`: `generateSchedule(ranking, opts)`, `lockNextDay(ranking)`, `onResultEntered(match, ranking, divisionId)`, `checkFeasibility(ranking)`. Reexporta los tipos para no romper los imports existentes | todos |

`services/SchedulerEngine.ts` se mantiene como un reexport de `services/scheduler/index.ts`, para no tocar los imports de los componentes.

## 4. Modelo de datos

```ts
interface SchedulerConfig {
  courts: number;
  slotDurationMinutes: number;      // 60 | 75 | 90 | 120
  restMinutes: number;
  mode?: 'full' | 'daily';          // NUEVO. Por defecto 'full'
  strictAvailabilityUntilRound?: string; // NUEVO. Por defecto 'Cuartos' (ver 6.4)
  dailySchedule?: { date; startTime; endTime }[];
  timeWindows: { start; end }[];    // legado, se mantiene
  roundWindows?: { roundName; date; startTime; endTime }[];
}

interface Match {
  // ...campos existentes
  scheduleLocked?: boolean;         // NUEVO: fijado, no se mueve solo
  scheduleEstimated?: boolean;      // ahora solo para días no fijados en modo 'daily'
  scheduleConflict?: {              // NUEVO
    pairKey: string;                // o '*' si el conflicto es de franja o capacidad
    reason: string;                 // texto para mostrar al admin
  }[];
}
```

**`makePairKey`** pasa a ser independiente del orden: ordena los dos IDs antes de unirlos con `::`. Al leer `pairConstraints` se normalizan las claves antiguas; si dos claves acaban siendo la misma, se fusionan sus `unavailableRanges`.

**Migración de datos antiguos:**
- Un partido con `startTime` y `scheduleEstimated !== true` se trata como `scheduleLocked = true`.
- Los partidos estimados se recalculan.
- Si `mode` no está definido, se usa `'full'`.

## 5. Fase 1: Planificador de rondas (`roundPlanner.ts`)

Una "pista" de planificación es una categoría (división), y la consolación cuenta como una pista propia. Las rondas de cada una se ordenan por orden de juego.

Para cada ronda *r* con *m* partidos se calcula:

- `need(r) = ⌈m / courts⌉ × duración` (estimación optimista de lo que ocupa).
- **IT (inicio más temprano), hacia delante:**
  - `IT(primera) = max(inicio del torneo, inicio de la primera franja de la ronda)`.
  - `IT(r+1) = max(IT(r) + need(r) + descanso, inicio de la primera franja de r+1)`.
- **FT (fin más tardío), hacia atrás:**
  - `FT(final) = fin de la última franja de la final` o, si no tiene franja, el cierre del último día.
  - `FT(r) = min(FT(r+1) − need(r+1) − descanso, fin de la última franja de r)`.
- **Holgura:** `holgura(r) = FT(r) − IT(r) − need(r)`.

Al calcular IT y FT hay que tener en cuenta los cierres nocturnos: el tiempo se mide sobre la rejilla, no sobre el reloj. Si un intervalo cae fuera del horario de un día, salta a la apertura del día siguiente (hacia delante) o al cierre del día anterior (hacia atrás).

**`checkFeasibility(ranking)`** devuelve una lista de avisos:
- Una ronda con `holgura < 0` o `IT > FT`. Ejemplo: "Semifinales de 2ª no caben en sáb 16:00–19:00 con 4 pistas: necesitan 2h30, disponible 1h30".
- Una franja de fase en la que la suma de `need` de todas las categorías supera pistas × minutos de la franja.
- El torneo completo: el total de minutos de partido supera la capacidad total.

## 6. Fase 2: Asignación de partidos (`matchAssigner.ts`)

### 6.1 Recorrido
Se recorren los instantes de la rejilla en orden cronológico, de 15 en 15 minutos. Las pistas que ya están ocupadas (por partidos fijados, jugados o asignados en esta misma pasada) se descartan. Para cada pista libre en el instante *t*:

1. **Partidos listos:** sin hora ni fijación, y además:
   - todos sus partidos de origen tienen hora y `inicio + duración + descanso ≤ t`. Los BYE o los finalizados sin hora cuentan como listos desde el inicio;
   - `IT(ronda) ≤ t` y `t + duración ≤ FT(ronda)`;
   - el partido completo cabe en el día y, si la ronda tiene franjas, dentro de una de ellas.
2. **Filtro de disponibilidad (6.4):** se queda con los partidos cuya `violationMinutes` es 0.
3. **Prioridad para elegir:**
   1. menor holgura de la ronda;
   2. menos huecos compatibles que le quedan hasta su último inicio (FT − duración);
   3. orden del cuadro (`jornada` y luego su índice).
4. Se asigna `startTime`, `court` y `scheduleConflict = undefined`.

En el mismo instante, el algoritmo prefiere encadenar partidos: si hay varias pistas libres, se ocupa primero la que acaba de quedar libre.

### 6.2 Partidos que se quedan sin hueco
Cuando *t* supera el último inicio de la ronda de un partido que sigue sin asignar:
- Se busca en su ventana [IT, FT] el hueco libre con **menor `violationMinutes`** y se asigna allí. `scheduleConflict` recibe un elemento por cada pareja afectada, con un motivo del tipo "Pareja X no disponible sáb 17:00–19:00".
- Si no queda ningún hueco libre en la ventana, se usa el primero libre después de FT, con `scheduleConflict = [{ pairKey: '*', reason: 'Fuera de franja de <ronda>' }]`.
- Si no hay ningún hueco libre en todo el torneo, el partido se queda sin hora, con `scheduleConflict = [{ pairKey: '*', reason: 'Sin capacidad' }]`.

### 6.3 Parejas candidatas
`getCandidatePairs` sigue el árbol hacia atrás:
- Partido con las dos parejas conocidas → esas dos.
- Si no, la unión de las candidatas de sus partidos de origen (los que tienen `nextMatchId` apuntando a él).
- En consolación, la unión de las parejas de los partidos con `consolationMatchId` apuntando a él. Para los cabezas de serie con BYE, cuyo primer partido real es en segunda ronda, también se incluyen los partidos de segunda ronda que alimentan esa consolación según la lógica de `TournamentEngine.moveLoserToConsolation` y `tryResolveConsolationDeferred`.

### 6.4 Disponibilidad estricta frente a preferente
- Un partido con sus **dos parejas conocidas** usa siempre la disponibilidad como requisito, sea cual sea su ronda.
- Para partidos con parejas aún desconocidas:
  - Rondas anteriores a `strictAvailabilityUntilRound` (por defecto `'Cuartos'`, sin incluirla): la disponibilidad es **requisito**. Un partido solo entra en el paso 2 si **ninguna** pareja candidata incumple.
  - Desde esa ronda en adelante: la disponibilidad es **preferencia**. El paso 2 deja pasar todos los partidos, y entre los huecos posibles se elige el que menos candidatas incumplen y, a igualdad, el de menos minutos incumplidos. No se marca conflicto mientras las parejas no se conozcan.

## 7. Modos y ciclo de vida

### 7.1 `generateSchedule(ranking, { includeLocked = false })`
1. Normaliza las claves de pareja y migra los datos antiguos (sección 4).
2. Ejecuta `checkFeasibility`. La interfaz muestra los avisos antes de llamar a la generación (7.4).
3. Si `includeLocked` es falso, los partidos fijados o jugados se quedan como ocupados y fijos. Si es verdadero, solo se respetan los jugados.
4. Ejecuta la fase 1 y la fase 2 sobre todos los partidos pendientes.
5. Según el modo:
   - **`full`:** todos los partidos asignados quedan con `scheduleLocked = true` y `scheduleEstimated = false`.
   - **`daily`:** se fijan los partidos del día en curso (o del primer día si el torneo aún no ha empezado). Los de días posteriores quedan con `scheduleEstimated = true` y `scheduleLocked = false`.

### 7.2 `lockNextDay(ranking)` (solo en modo `daily`)
Recalcula todos los partidos no fijados y no jugados, usando las parejas ya conocidas, y fija el primer día que todavía tenga partidos estimados.

### 7.3 `onResultEntered(match, ranking, divisionId)`
Sustituye a `scheduleNextMatches`. **No busca huecos.** Después de que `TournamentEngine` haga avanzar al ganador o al perdedor:
- Para cada partido que acaba de recibir una pareja y ya tiene hora, recalcula `scheduleConflict` usando solo sus parejas reales (con la disponibilidad como requisito).
- Si el partido tiene una hora estimada (modo `daily`), no se toca: se resolverá al fijar ese día.
- Si el conflicto es nuevo, devuelve la lista para que la interfaz avise al admin.

### 7.4 Interfaz
- **`SchedulerConfigModal`, pestaña Recursos:** se añade el selector de modo (Horario completo / Por día) y la opción de 75 minutos en la duración.
- **Generar:**
  - Si `checkFeasibility` devuelve avisos, se abre un resumen con los botones "Generar igualmente" y "Volver a configurar".
  - Si ya hay partidos fijados: la acción por defecto regenera solo los no fijados, y hay una casilla "Regenerar también los fijados" que pide confirmación.
- **Modo por día:** un botón "Fijar día siguiente".
- **Panel de Conflictos** (en la vista del torneo): lista los partidos con `scheduleConflict`, con categoría, ronda, hora, motivo y una acción "Mover", que abre `ScheduleModal`.
- **Indicadores:** los partidos con conflicto llevan una marca roja y los estimados un estilo atenuado con la etiqueta "Estimado", tanto en el cuadro como en la parrilla.
- **`ScheduleModal`:** mover un partido a mano lo marca como `scheduleLocked = true` y recalcula su `scheduleConflict`.

### 7.5 Integración en `RankingView`
- `handleGenerateFullSchedule` pasa a llamar a `generateSchedule`.
- El gancho reactivo de la línea 651 pasa a llamar a `onResultEntered`.
- `handleSaveSchedulerConfig` no cambia.
- La importación de inscripciones (`RegistrationManagerModal`) usa el nuevo `makePairKey`.

## 8. Errores y casos límite

- **Sin `dailySchedule`:** no se genera nada y se pide configurar los días (como ahora).
- **Partidos con BYE:** no ocupan hueco y cuentan como origen resuelto desde el inicio.
- **Un día eliminado de la configuración con partidos fijados en él:** al regenerar, esos partidos pierden la fijación y se recolocan, con el motivo "Día eliminado".
- **Partido jugado fuera de hora:** se usa su `startTime` tal cual. No se recalcula nada a partir de horas reales de fin.
- **Rendimiento:** con 200 partidos, unos 3 días de 52 pasos de 15 min y 8 pistas, la fase 2 hace del orden de 10⁵ comprobaciones baratas. El objetivo es menos de 1 segundo en el navegador.

## 9. Pruebas (vitest, `services/scheduler/__tests__/`)

- **`timeGrid`:** pasos de 15 min. Un partido de 75 min termina dentro del día. No hay desfase por UTC en partidos de 23:30 ni en el cambio de hora de octubre.
- **`availability`:** con una restricción de 17:00 a 19:00, un partido a las 16:45 da 75 minutos de incumplimiento con 90 de duración. A las 15:30 da 0 y a las 19:00 da 0.
- **`candidates`:** la final contiene todas las parejas de la categoría. En consolación se incluyen los cabezas de serie con BYE.
- **`roundPlanner`:** la categoría con más rondas tiene menos holgura en su primera ronda. Se detecta una franja de semifinales imposible. FT(final) es igual al final de su franja.
- **`matchAssigner`:**
  - la pareja restringida recibe hueco y la libre se adapta;
  - un caso sin solución acaba con el partido colocado y con conflicto;
  - nunca hay dos partidos a la vez en la misma pista;
  - el descanso se respeta siempre;
  - con disponibilidad preferente, la final elige el hueco con menos incumplimientos.
- **Integración:**
  - modo `full`: meter todos los resultados no cambia ningún `startTime`;
  - modo `daily`: solo se fija el día en curso, y `lockNextDay` respeta lo ya fijado;
  - con 3 categorías de 8, 16 y 32 parejas, todas las finales caen dentro de su franja;
  - las claves de pareja antiguas en orden inverso se migran y se respetan.
- **Torneo de referencia:** 6 categorías, 4 pistas, de viernes 17:00 a domingo 14:00, con un 30 % de parejas restringidas. Debe dar 0 conflictos y tardar menos de 1 segundo.
- Las pruebas actuales de `SchedulerEngine.test.ts` se adaptan donde dependen del comportamiento antiguo de búsqueda reactiva.
