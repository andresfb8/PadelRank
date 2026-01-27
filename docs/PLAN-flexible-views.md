# Plan: Vista de Torneos Flexible (Grid/List)

Este plan implementa la opción de alternar entre vista de lista detallada y vista de cuadrícula compacta en el Dashboard y en la lista de torneos, mejorando la usabilidad para administradores con muchos eventos.

## Fase 1: AdminDashboard Flexible
Añadir selector de vista en la sección "Progreso de Torneos".

- **Componente:** `components/AdminDashboard.tsx`
- **Cambios:**
    - Estado local: `const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');`
    - Cabecera de sección: Añadir botones con iconos `List` y `LayoutGrid`.
    - **Modo Lista:** Mantener el diseño actual (barras de progreso horizontales).
    - **Modo Grid:** Nuevo diseño de tarjeta compacta:
        - Título truncado.
        - Donut chart o barra mini para el progreso.
        - Datos clave resumidos (Partidos jugados/total).

## Fase 2: Mis Torneos (RankingList) Flexible
Replicar la funcionalidad en la página principal de gestión de torneos.

- **Componente:** `components/RankingList.tsx`
- **Cambios:**
    - Estado local para el modo de vista.
    - Adaptar el `map` de rankings para renderizar el componente adecuado según el modo.
    - La vista de "Lista Detallada" mostrará más información (fecha creación, ID, estado explícito) que la tarjeta actual.

## Asignación de Agentes
- **Frontend Specialist:** Para la implementación de los componentes de UI y lógica de estado.

## Verificación
- Los botones de cambio de vista deben funcionar instantáneamente.
- La información mostrada debe ser coherente en ambas vistas.
- El diseño Grid debe ser responsivo (1 columna en móvil, 2-3 en tablet/desktop).
