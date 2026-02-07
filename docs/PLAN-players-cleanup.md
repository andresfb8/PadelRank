# Plan: Simplificación de la Base de Datos de Jugadores

Este plan detalla la eliminación de la sección de KPIs y la opción de vista en cuadrícula (grid) en la base de datos de jugadores para simplificar la interfaz.

## Proposed Changes

### Jugadores (`components/players/`)

#### [MODIFY] [PlayerDatabaseView.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/players/PlayerDatabaseView.tsx)

- Eliminar el componente `<PlayerStatsHeader />`.
- Eliminar el estado `viewMode` y su paso a `PlayerFilters`.

#### [MODIFY] [PlayerFilters.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/players/PlayerFilters.tsx)

- Eliminar el tipo `ViewMode`.
- Eliminar el toggle de vista (Lista/Grid).
- Limpiar props y estados relacionados.

#### [DELETE] [PlayerStatsHeader.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/players/PlayerStatsHeader.tsx)

- El archivo ya no será necesario.

---

## Verification Plan

### Manual Verification

- Verificar que la base de datos de jugadores ya no muestra las tarjetas de estadísticas superiores.
- Verificar que ha desaparecido el botón de alternar entre Lista y Cuadrícula.
- Asegurar que la tabla de jugadores sigue funcionando correctamente y es la única vista disponible.
