# Ajustes por formato — diseño

Fecha: 2026-10-22

## Problema

Los formatos comparten demasiados ajustes:

- El asistente (`RankingWizard.tsx`) arranca con un `config` común que ya trae
  `eliminationConfig`, `hybridConfig`, `scoringMode: '24'`, ascensos/descensos y pistas.
  Todo torneo se guarda con datos de otros formatos, y al cambiar de formato no se limpian
  (p. ej. Pozo → Clásica deja `pozoConfig`; Individual/Americano/Mexicano heredan los puntos previos).
- El modal de ajustes (`RankingSettingsModal.tsx`) y el modo TV (`TVLayout.tsx`) deciden qué
  enseñar con condiciones `isPozo`/`isHybrid`/… repartidas, y no coinciden entre sí:
  - En Eliminatoria y en el playoff de Liga + playoff la TV ignora «Clasificación» y
    «Partidos y horarios», pero los interruptores siguen apareciendo.
  - Pozo muestra en la TV una clasificación por pista titulada «División N».
  - «Ascensos y descensos» aparece en Individual/Parejas con una sola división.
  - Americano/Mexicano ofrecen el desempate «Diferencia de juegos» aunque se juega a puntos.
- El punto de oro solo existe en Pozo, solo en el asistente, y no se enseña en ningún sitio.
- Liga + playoff guarda los puntos dos veces (nivel superior y `hybridConfig`).

## Objetivo

Que cada formato muestre solo sus ajustes, en el asistente, en Ajustes y en la TV,
y que cada torneo guarde solo la configuración de su formato.

## Reparto de ajustes

Comunes a todos: nombre, categoría, fecha, si cuenta para las estadísticas, logo,
patrocinadores, segundos por diapositiva y QR en TV.
**Punto de oro** (solo informativo) en todos los formatos con sets: Clásica, Individual,
Parejas, Liga + playoff, Eliminatoria y Pozo cuando se juega a sets. No en Americano/Mexicano.

| Formato | Puntuación | Pestaña propia | Estructura | Columnas | Diapositivas TV |
|---|---|---|---|---|---|
| Clásica | 5 valores + desempates sets/juegos | Ascensos y descensos | Divisiones | Todas | Clasificación, Partidos |
| Individual | Igual | Ascensos/descensos solo si hay ≥ 2 divisiones | Divisiones | Todas | Clasificación, Partidos |
| Parejas | Igual (+ ida y vuelta, informativo) | Igual que Individual | Divisiones | Todas | Clasificación, Partidos |
| Liga + playoff | 5 valores (grupos) + desempates | Paso al playoff | Grupos, parejas por grupo | Todas (grupos) | Grupos: Clasificación, Partidos · Playoff: Cuadros, Horarios |
| Americano / Mexicano | Puntos por partido + desempates por puntos (sin criterios de sets ni juegos) | — | Grupos, pistas, modalidad (informativo) | Solo «Partidos perdidos» | Clasificación, Partidos |
| Eliminatoria | — | Cuadros (consolación, 3.er puesto, informativo) | Categorías, pistas | — | Cuadros, Horarios |
| Pozo | Sistema (por juegos / sets, informativo) | Rotación (explicación) | Pistas en juego | Solo «Partidos perdidos» | Clasificación general, Partidos de la ronda |

## Diseño

### 1. Catálogo de formatos — `config/formatSettings.ts` (nuevo)

Un único sitio que describe cada formato. Para cada `RankingFormat`:

```ts
interface FormatSettings {
  label: string;                        // 'Liga clásica', …
  unit: [string, string, boolean?];     // singular, plural, femenino
  scoring: 'sets' | 'points' | 'none';  // qué enseña la pestaña Puntuación
  setCriteriaInTieBreak: boolean;       // desempates por sets/juegos
  advance: 'promotion' | 'playoff' | 'brackets' | 'rotation' | null;
  promotionNeedsDivisions?: number;     // 2 en individual/parejas
  columns: 'all' | 'lostOnly' | 'none';
  goldenPoint: boolean | ((config: RankingConfig) => boolean); // Pozo: solo a sets
  tvSlides: (ranking: Ranking) => TVSlideKind[]; // 'standings' | 'matches' | 'brackets' | 'schedule'
  defaults: () => Partial<RankingConfig>; // config inicial del asistente, solo con lo de este formato
}
export const FORMAT_SETTINGS: Record<RankingFormat, FormatSettings>;
export const getFormatSettings = (f?: RankingFormat) => FORMAT_SETTINGS[f || 'classic'];
```

Sustituye a `FORMAT_LABEL` y `UNIT` de `RankingSettingsModal.tsx` y a los bloques `if (f.id === …)`
de `RankingWizard.tsx`.

### 2. Asistente

- `config` inicial = `getFormatSettings('classic').defaults()` + `tieBreakCriteria` + `branding`.
- Al elegir formato se **reemplaza** el config por `defaults()` del nuevo formato, manteniendo solo
  lo común (`branding`, `tieBreakCriteria`, filtrados a criterios válidos para el formato).
- Liga + playoff: los puntos viven solo en el nivel superior; `hybridConfig` deja de copiarlos.
  Lectura con retrocompatibilidad: si un torneo antiguo solo tiene los de `hybridConfig`, se usan esos.
- El interruptor de punto de oro sale de `PozoConfig.tsx` y pasa a ser común (paso 2), visible
  cuando `goldenPoint` del formato es verdadero.

### 3. Nuevo campo común

`RankingConfig.goldenPoint?: boolean` (informativo). Los torneos Pozo antiguos con
`pozoConfig.goldenPoint` se leen como respaldo.

### 4. Modal de ajustes

- Pestañas y bloques salen del catálogo en vez de `isPozo`/`isHybrid`/….
- Puntuación: añade el interruptor «Punto de oro» si aplica.
- Ascensos y descensos ocultos si `divisions.length < promotionNeedsDivisions`.
- Bloque «Modo TV»: un interruptor por cada diapositiva de `tvSlides` del formato
  (Eliminatoria: Cuadros, Horarios; Liga + playoff: los cuatro con una nota de en qué fase sale cada uno).

### 5. TV

- `TVConfig` gana `showBrackets?: boolean` y `showSchedule?: boolean` (por defecto `true`).
- `TVLayout` construye las diapositivas a partir de `tvSlides(ranking)` respetando los interruptores.
- Pozo: todo el torneo vive en una única división (`generatePozoDivisions`), así que ya hay una sola
  clasificación; solo cambia el título («Clasificación general» y «Partidos» en vez de «División 1»).
- Punto de oro: una línea «Se juega con punto de oro» en el pie de la TV y en la vista pública
  (cabecera del torneo) cuando está activo.

### 6. Desempates

`TieBreakConfig` recibe `setCriteria: boolean` del catálogo. En Americano/Mexicano se quitan
`setsDiff`, `setsWon`, y las etiquetas `gamesDiff`/`gamesWon` pasan a «Diferencia de puntos»/«Puntos a favor».

## Fuera de alcance

- Migrar los torneos existentes: los campos sobrantes se ignoran porque la UI decide por formato.
- Mover los campos «legacy» del nivel superior a los `xxxConfig` de cada formato.
- Modo TV por Chromecast (proyecto aparte, siguiente diseño).

## Pruebas

- Test unitario del catálogo: cada formato produce `defaults()` sin claves de otros formatos
  (`eliminationConfig` solo en eliminatoria, `hybridConfig` solo en hybrid, `pozoConfig` solo en pozo,
  `scoringMode` solo en americano/mexicano).
- Test del asistente: Pozo → Clásica no deja `pozoConfig`.
- Test de `tvSlides`: Eliminatoria respeta `showBrackets`/`showSchedule`; Pozo da una sola clasificación.
- Comprobación en el navegador del modal de ajustes con un torneo de cada formato.
