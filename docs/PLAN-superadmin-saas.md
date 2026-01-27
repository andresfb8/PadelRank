# Plan: SuperAdmin SaaS & Gestión de Suscripciones

Este plan describe la transformación de la aplicación en una plataforma SaaS, implementando niveles de suscripción (Básico, Pro, Star Point, Weekend) y un panel de control avanzado para el SuperAdmin que permita gestionar a los clientes (clubes).

## Fase 1: Definición de Planes y Restricciones
Centralizar la lógica de negocios y límites en el código.

- **Archivo:** `config/subscriptionPlans.ts` (Nuevo)
- **Definiciones:**
    - `SubscriptionPlan`: 'basic' | 'pro' | 'star' | 'weekend'
    - `PlanFeatures`:
        - `maxPlayers`: number (50, 150, Infinity)
        - `maxActiveTournaments`: number (3, Infinity, Infinity)
        - `allowedFormats`: Array<'americano' | 'mexicano' | 'league' | 'hybrid' | 'elimination'>
        - `allowsBranding`: boolean
- **Lógica:**
    - Funciones helper: `checkLimit(user, 'players')`, `isFeatureEnabled(user, 'elimination')`.

## Fase 2: Gestión de Estado del Usuario (SaaS)
Actualizar cómo manejamos y guardamos la información del usuario para incluir su plan.

- **Modelo de Usuario (Extendido en Firestore/Contexto):**
    - Añadir campo `plan`: string
    - Añadir campo `planExpiry`: timestamp (opcional, para Weekend Warrior)
    - Añadir campo `clubName`: string
- **Cambios en UI:** Mostrar el plan actual ("Etiqueta PRO") en la barra lateral del administrador del club.

## Fase 3: Dashboard SuperAdmin (Vista de Negocio)
Reemplazar la vista actual de gestión de admins por un panel de control SaaS.

- **Componente:** `components/SuperAdminDashboard.tsx` (Evolución de AdminManagement)
- **Características:**
    - **Lista de Clientes:** Tabla con buscador. Muestra Nombre, Email, Plan, Uso (X/Y Jugadores).
    - **Drill-Down:** Click en un cliente -> Cargar `AdminDashboard` PERO con el contexto de *ese* usuario (simulación de login o filtrado por `ownerId`).
    - **Editor de Suscripción:** Modal para cambiar el plan de un usuario manualmente (Upgrade/Downgrade).

## Fase 4: Aplicación de Restricciones (Enforcement)
Bloquear acciones en la UI del cliente si superan su plan.

- **Crear Torneo:** Bloquear si `activeTournaments >= limit`.
- **Elegir Formato:** Deshabilitar opciones (ej. Eliminación) si el plan es Básico.
- **Añadir Jugador:** Bloquear si `totalPlayers >= limit`.

## Asignación de Agentes
- **Backend Specialist:** (Opcional, si hubiera API real) Para lógica de base de datos.
- **Frontend Specialist:** Para UI de Súper Admin y validaciones visuales.

## Verificación
- Un usuario 'Básico' no debe poder crear un 4º torneo activo.
- Un usuario 'Básico' no debe ver disponible el formato 'Eliminación'.
- El SuperAdmin debe poder cambiar el plan de un usuario instantáneamente y ver reflejado el cambio de permisos.
