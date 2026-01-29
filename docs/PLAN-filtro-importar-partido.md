# Plan: Filtro de Jugadores en Importación de Partidos

## Objetivo
Restringir la selección de jugadores en el modal "Importar Partido Pasado" para que solo se puedan seleccionar jugadores que pertenecen a la división seleccionada.

## Problema Actual
El componente `AddManualMatchModal` muestra **todos** los jugadores del sistema en los selectores, independientemente de la división seleccionada. Esto permite importar partidos con jugadores que no pertenecen a esa división, lo cual es incorrecto.

## Solución Propuesta

### 1. Modificar `AddManualMatchModal.tsx`

**Cambios necesarios:**

1. **Filtrar la lista de jugadores según la división seleccionada**
   - Obtener la división actualmente seleccionada del array `divisions`
   - Extraer el array `players` de esa división
   - Filtrar `playerList` para mostrar solo los jugadores que están en `division.players`

2. **Actualizar la lista cuando cambie la división**
   - El filtro debe actualizarse automáticamente cuando el usuario cambie la división seleccionada
   - Limpiar las selecciones de jugadores cuando se cambie de división (opcional pero recomendado)

### 2. Implementación Detallada

**Ubicación:** `components/AddManualMatchModal.tsx`

**Línea 34:** Cambiar de:
```tsx
const playerList = Object.values(players).sort((a, b) => a.nombre.localeCompare(b.nombre));
```

A:
```tsx
// Obtener la división seleccionada
const selectedDivisionObj = divisions.find(d => d.id === selectedDivision);

// Filtrar jugadores que pertenecen a la división
const playerList = selectedDivisionObj
  ? Object.values(players)
      .filter(p => selectedDivisionObj.players.includes(p.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  : [];
```

**Mejora adicional (opcional):** Limpiar selecciones al cambiar división

Agregar un `useEffect` para resetear las selecciones cuando cambie la división:

```tsx
useEffect(() => {
  // Limpiar selecciones cuando cambie la división
  setPair1P1('');
  setPair1P2('');
  setPair2P1('');
  setPair2P2('');
}, [selectedDivision]);
```

### 3. Consideraciones

- **Jugadores invitados (guests):** Si la división incluye jugadores invitados, estos también deben aparecer en la lista filtrada
- **División vacía:** Si una división no tiene jugadores asignados, la lista estará vacía (comportamiento correcto)
- **UX:** Considerar mostrar un mensaje si la división seleccionada no tiene jugadores

### 4. Validación

**Casos de prueba:**
1. Seleccionar División 1 → Solo aparecen jugadores de División 1
2. Cambiar a División 2 → La lista se actualiza con jugadores de División 2
3. Intentar importar partido → Solo se pueden seleccionar jugadores de la división actual
4. División sin jugadores → Lista vacía o mensaje informativo

## Archivos Afectados

- `components/AddManualMatchModal.tsx` (modificación principal)

## Prioridad
**Alta** - Evita datos inconsistentes en el sistema

## Tiempo Estimado
15 minutos
