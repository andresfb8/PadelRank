# Plan: Ajustes de UI y Lógica de Cuadro Híbrido

Este plan aborda la eliminación de etiquetas visuales de podio en formatos no rápidos y la verificación/ajuste de la lógica de enfrentamientos.

## Fase 1: Limpieza Visual (Standings)
Modificar `RankingView.tsx` para que los estilos de "Medalla" (colores oro, plata, bronce) en la lista de clasificación sean condicionales.

- **Componente:** `RankingView.tsx`
- **Cambio:** 
    - En el renderizado de la tabla (Desktop) y las cards (Mobile), añadir una condición: 
      `const showMedals = ranking.format === 'americano' || ranking.format === 'mexicano';`
    - Si `showMedals` es falso, usar un estilo neutro para los números de posición (gris suave).

## Fase 2: Lógica de Enfrentamientos (Playoffs)
Asegurar que en el formato Híbrido, los cruces siempre busquen enfrentar a un 1.º de grupo contra un 2.º de grupo.

- **Servicio:** `logic.ts` -> `getQualifiedPlayers`
- **Acción:** Verificar que el orden de los IDs devueltos siga favoreciendo el cruce 1 vs N-1. 
- **Casuística 4 grupos:** Confirmar que con 4 grupos, los 1.º de cada grupo queden en cuadrantes opuestos para que no se eliminen entre sí en la primera ronda del cuadro.

## Fase 3: Verificación
1. Crear un torneo híbrido de prueba con 2 grupos.
2. Crear un torneo híbrido de prueba con 4 grupos.
3. Verificar que el 1A no juegue contra el 1B en primera ronda.
4. Verificar que las etiquetas #1, #2, #3 no tengan colores especiales en estos torneos.

## Asignación de Agentes
- **Frontend Specialist:** Para los cambios en `RankingView.tsx`.
- **Backend/Logic Specialist:** Para validar el orden en `TournamentEngine` y `logic.ts`.
