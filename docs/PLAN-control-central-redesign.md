# Plan: Rediseño Control Central (Client-First)

Este plan detalla la transformación del "Control Central" para SuperAdmins, pasando de una lista plana de todos los torneos a una navegación jerárquica basada en Clientes (Admins).

## 🎯 Objetivo
Mejorar la usabilidad y escalabilidad del panel de SuperAdmin para gestionar 50+ clientes sin saturación visual ("doom scrolling").

## 🏗️ Cambios en UI/UX

### 1. Nueva Vista "Directorio de Clientes" (Nivel 1)
Cuando un SuperAdmin entra a "Control Central" (y no ha seleccionado un filtro):
- **Grid de Tarjetas**: Cada tarjeta representa un Admin/Cliente.
- **Datos de la Tarjeta**:
  - Nombre del Admin / Club.
  - Email.
  - Badge de Rol/Plan.
  - **KPIs**: Conteo de torneos activos/totales.
- **Acción**: Clic en la tarjeta -> Entra al Nivel 2.

### 2. Vista de Torneos Filtrada (Nivel 2)
Es la vista actual de `RankingList`, pero:
- **Filtro Aplicado**: `selectedClientId` se fija al ID del cliente seleccionado.
- **Header**: Muestra "Torneos de [Nombre Cliente]".
- **Navegación**: Botón "⬅ Volver a Clientes" prominente.
- **Quick Switch**: (Opcional) Mantener el dropdown para cambios rápidos sin volver atrás.

## 🛠️ Especificaciones Técnicas

### Archivo: `components/RankingList.tsx`

#### Estado
- Mantener `selectedClientId`.
- Si `users` existe (prop) Y `selectedClientId === 'all'`, renderizar **ViewMode: Clients**.
- Si `users` existe Y `selectedClientId !== 'all'`, renderizar **ViewMode: Tournaments** (con botón back).

#### Lógica de Renderizado (Clientes)
1. Recorrer array `users`.
2. Calcular metadatos para cada usuario usando `rankings` prop:
   - `activeTournaments`: `rankings.filter(r => r.ownerId === u.id && r.status === 'activo').length`
   - `totalTournaments`: `rankings.filter(r => r.ownerId === u.id).length`
3. Ordenar clientes: Primero los que tienen torneos activos, luego por nombre.

#### Componentes Nuevos (Internos)
- `ClientCard`: Componente visual para el grid de clientes.

## 📋 Pasos de Implementación

1.  **Refactor `RankingList`**:
    -   Introducir lógica de "Modo Directorio" vs "Modo Lista".
    -   Implementar el Grid de Clientes.
    -   Añadir botón de retorno.
2.  **Verificación**:
    -   Entrar como SuperAdmin -> Ver Grid.
    -   Entrar como Admin Normal -> Ver Lista directa (sin cambios).

---
**Reglas de Diseño:**
- Usar `lucide-react` para iconos (`Building`, `User`, `LayoutGrid`).
- Mantener consistencia visual con las tarjetas de torneos existentes (bordes suaves, sombras hover).
