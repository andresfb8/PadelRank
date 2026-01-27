# Plan: Vista Lista de Alta Densidad (2 Columnas)

Este plan modifica la implementación de la vista "Lista" en la gestión de torneos para aprovechar mejor el espacio en pantallas grandes, manteniendo la compatibilidad móvil.

## Modificaciones en RankingList.tsx

- **Objetivo:** Cambiar el contenedor de la vista lista.
- **Cambio Actual:**
  ```tsx
  <div className={viewMode === 'grid' ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
  ```
- **Nuevo Cambio:**
  ```tsx
  <div className={viewMode === 'grid' 
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
      : "grid gap-3 grid-cols-1 md:grid-cols-2" // <-- 2 Columnas en MD
  }>
  ```

## Verificación
- Abrir en pantalla grande: Deben verse dos columnas de items "tipo lista".
- Abrir en pantalla móvil: Debe verse una sola columna apilada.
