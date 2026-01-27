# Plan: Implementar Admin Dashboard Profesional

Este plan tiene como objetivo mejorar la experiencia del administrador creando un "Centro de Mando" (Dashboard) visualmente atractivo y funcional, extrayendo la lógica actual y mejorándola.

## Fase 1: Extracción y Creación del Componente
Crear un nuevo componente `components/AdminDashboard.tsx` que encapsule la vista de resumen actual.

- **Componente:** `AdminDashboard.tsx`
- **Props:** 
    - `activeRankings`: Ranking[]
    - `players`: Record<string, Player>
    - `users`: User[] (opcional, para superadmin)
    - `onNavigate`: (view: string) => void
    - `userName`: string
- **Funcionalidad:**
    - Renderizar los KPIs (Torneos, Jugadores, Partidos Pendientes).
    - Renderizar la barra de progreso de torneos.
    - Renderizar la lista de "Top Jugadores".
    - Botones de acción rápida "Nuevo Torneo" y "Nuevo Jugador".

## Fase 2: Mejoras Visuales (UI Pro Max)
Mejorar el diseño visual utilizando `lucide-react` y estilos de Tailwind más modernos.

- **Header del Dashboard:** Añadir un saludo personalizado con la fecha actual.
- **KPI Cards:** Mejorar el contraste y la iconografía.
- **Actividad Reciente:** Añadir una sección (aunque sea simulada o basada en últimos partidos) de "Última Actividad".
- **Accesos Directos:** Hacer los botones de acción más prominentes.

## Fase 3: Integración
Sustituir el bloque de código hardcodeado en `AdminLayout.tsx` por el nuevo componente `<AdminDashboard />`.

## Asignación de Agentes
- **Frontend Specialist:** Para todo el trabajo de UI y componentes React.

## Verificación
- El dashboard debe cargar correctamente al iniciar sesión.
- Los contadores deben coincidir con los datos reales.
- La navegación desde los botones del dashboard debe funcionar.
