# Plan: Evolución SuperAdmin y Gestión Global

Este plan describe la reestructuración de la vista de SuperAdmin para transformarla en un centro de mando global (SaaS) y la optimización de la gestión de torneos para soportar múltiples clientes.

## ✅ Requisitos Confirmados

1. **Dashboard SuperAdmin (KPIs)**:
   - Clientes Totales.
   - Ingresos Estimados (Suma de precios de planes).
   - Total de Jugadores (Global).
   - Total de Torneos Activos (Global).

2. **Visibilidad de Torneos**:
   - Renombrar "Mis Torneos" a **"Control Central"**.
   - Añadir filtros por **Cliente/Club**.

3. **Impersonificación**:
   - **Prioridad Alta**: Permitir "entrar" como un cliente específico para ver/editar su panel.
   - Añadir botón "Dejar de Impersonar" o "Volver a SuperAdmin".

4. **Escalabilidad**:
   - Navegación híbrida: **Buscador Potente** + **Vista de Carpetas/Lista Paginada** para clientes.

---

## 🏗️ Cambios Propuestos

### 1. Impersonificación (Core)
Implementar un estado `impersonatedUserId` en `AdminLayout`.
- Si está activo, las suscripciones de Firebase (Rankings, Jugadores) deben apuntar a ese `id` en lugar del `currentUser.id`.
- Mostrar un banner superior persistente: "Viendo como [Nombre Cliente] - [Salir]".

### 2. Dashboard Global (SaaS Command Center)
Transformar el `AdminDashboard` cuando el usuario es SuperAdmin o crear un `SuperAdminAnalytics`.

- **KPIs Globales**: Clientes Totales, Ingresos, Jugadores, Torneos.
- **Gráfico de Actividad**: Volumen de partidos/torneos a lo largo del tiempo.
- **Sección de Alertas**: Clientes cerca de su límite de plan, nuevas solicitudes.

### 3. Control Central (Gestión de Torneos)
Evolucionar `RankingList`.

- **Renombrar**: "Mis Torneos" -> "Control Central".
- **Filtro de Propietario**: Dropdown de usuarios (Clientes) para filtrar la lista.
- **Buscador Global**: Buscar por nombre de torneo O nombre de club.

### 4. Gestión de Clientes (Navegación)
Mejorar `SuperAdminDashboard` tabla de clientes.
- Añadir paginación si supera X clientes.
- Añadir acción "Impersonar" en cada fila.

---

## 🏗️ Cambios Propuestos

### 1. Dashboard Global (SaaS Command Center)
Transformar el `AdminDashboard` cuando el usuario es SuperAdmin o crear un `SuperAdminAnalytics`.

- **KPIs Globales**: Total Clientes, Torneos Activos (Global), Jugadores Totales (Global), Partidos Jugados (Global).
- **Gráfico de Actividad**: (Opcional) Volumen de partidos/torneos a lo largo del tiempo.
- **Sección de Alertas**: Clientes cerca de su límite de plan, nuevas solicitudes de registro (pending).

### 2. Gestión de Torneos Multi-Cliente
Optimizar `RankingList` y la navegación lateral.

- **Filtro de Propietario**: Añadir un selector de "Club/Cliente" en la parte superior de `RankingList` para filtrar instantáneamente.
- **Search Global**: Mejorar el buscador para encontrar torneos por nombre o por nombre del cliente.

### 3. Rediseño del Panel Lateral (Sidebar)
Ajustar los accesos directos para SuperAdmin.

- **Dashboard**: Enlace a la vista global.
- **Torneos**: Acceso a la gestión global de torneos.
- **Gestión Admins**: Acceso a clientes y suscripciones (ya existe, pero se puede integrar mejor).

---

## 🛠️ Asignación de Tareas

| Fase | Tarea | Agente |
|------|-------|--------|
| 1 | Análisis UI/UX con `ui-ux-pro-max` | Frontend Specialist |
| 2 | Implementación de `GlobalStatsView` | Backend/Frontend Specialist |
| 3 | Refactor de `RankingList` (Filtros Globales) | Frontend Specialist |
| 4 | Verificación y Pruebas de Escalabilidad | Debugger |

## ✅ Plan de Verificación

### Pruebas de UI
- [ ] Verificar que el SuperAdmin ve KPIs globales y el Admin ve solo los suyos.
- [ ] Comprobar que el filtro de clientes en "Torneos" funciona correctamente.

### Pruebas de Lógica
- [ ] Asegurar que el filtrado global de Firestore no impacta en el rendimiento (uso de índices).
- [ ] Validar que la transición entre "Vista Global" y "Vista de Cliente" sea fluida.
