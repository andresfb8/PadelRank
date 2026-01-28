# Plan de Implementación: Data Correction & Híbrido

Este plan detalla la implementación de herramientas de corrección para torneos (Playoff), permitiendo resolver errores en fases previas o asignaciones incorrectas.

## 🎯 Objetivos
1.  **Regeneración Nuclear (Option 1):** Permitir borrar y regenerar completamente un Playoff basado en la clasificación actualizada de la fase de grupos.
2.  **Edición Manual "Modo Dios" (Option B):** Permitir al administrador forzar cambios de jugadores en cualquier casilla del cuadro, independientemente de la lógica automática.

## ⚠️ User Review Required
> [!CAUTION]
> **Regeneración Nuclear:** Esta acción es destructiva. Borrará **todos** los partidos y resultados del playoff actual. Debe estar protegida por doble confirmación.

> [!WARNING]
> **Edición Manual:** Permitir cambiar jugadores manualmente puede romper la integridad si el admin no tiene cuidado (ej. poner al mismo jugador en dos sitios). Se asume que el admin sabe lo que hace.

## 🛠️ Proposed Changes

### Componente: Backend (TournamentEngine & Logic)

#### [MODIFY] [TournamentEngine.ts](file:///c:/Users/andre/Desktop/Proyectos Gemini/PadelRank/PadelRank/services/TournamentEngine.ts)
*   Añadir método `regeneratePlayoff(originalTournamentData)`:
    *   Verificar si existen divisiones de playoff.
    *   Eliminar las divisiones actuales de playoff.
    *   Volver a llamar a `generateBracket` usando los criterios de clasificación actuales de la fase de grupos.

#### [MODIFY] [logic.ts](file:///c:/Users/andre/Desktop/Proyectos Gemini/PadelRank/PadelRank/services/logic.ts)
*   Añadir función `updateMatchParticipant(tournamentId, matchId, pairIndex, newParticipantId)`:
    *   Permitir sobrescribir `pair1.p1Id/p2Id` o `pair2.p1Id/p2Id` manualmente.

### Componente: Frontend (Admin UI)

#### [MODIFY] [TournamentPlayoff.tsx](file:///c:/Users/andre/Desktop/Proyectos Gemini/PadelRank/PadelRank/src/components/TournamentPlayoff.tsx) (o componente equivalente)
*   **Botón "Regenerar Playoff":**
    *   Aparece solo si el torneo es Híbrido/Playoff.
    *   Modal de confirmación: "⚠️ ¿Seguro? Se borrarán todos los resultados del playoff actual."
    *   Acción: Llama a la función de regeneración.

#### [MODIFY] [BracketMatch.tsx](file:///c:/Users/andre/Desktop/Proyectos Gemini/PadelRank/PadelRank/src/components/BracketMatch.tsx)
*   **Modo Edición:**
    *   Añadir toggle "Modo Admin/Edición" en la vista del cuadro.
    *   Cuando está activo, los nombres de los jugadores son clicables.
    *   Al hacer click: Abre un selector con **todos** los participantes del torneo.
    *   Al seleccionar: Llama a `updateMatchParticipant`.

## ✅ Verification Plan

### Automated Tests
*   `npm test`: Verificar que la lógica de generación no rompe tests existentes.
*   Crear test unitario para `updateMatchParticipant` asegurando que persiste el cambio.

### Manual Verification
1.  **Caso Regeneración:**
    *   Crear torneo híbrido.
    *   Generar playoff.
    *   Cambiar un resultado en grupos (cambia el líder).
    *   Pulsar "Regenerar Playoff".
    *   Verificar que el nuevo líder está en el cuadro y los partidos viejos se han borrado.
2.  **Caso Edición Manual:**
    *   Ir a un partido de playoff.
    *   Activar "Modo Edición".
    *   Cambiar a "Jugador A" por "Jugador Z".
    *   Guardar y recargar página.
    *   Verificar que "Jugador Z" aparece y puede avanzar de ronda si gana.
