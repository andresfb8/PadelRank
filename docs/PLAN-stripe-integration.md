# Plan: Integración de Suscripciones con Stripe

## Objetivo

Integrar suscripciones de Stripe para automatizar la gestión de planes (Básico, Pro, Star, Weekend Warrior), gestionando actualizaciones, cancelaciones y expiraciones automáticamente a través de Webhooks.

## Revisión de Usuario Requerida
>
> [!IMPORTANT]
> **Secretos de Stripe**: Debes configurar la Clave Secreta de Stripe en los secretos de Firebase Functions antes de desplegar.
> Comando: `firebase functions:secrets:set STRIPE_SECRET_KEY`
>
> **Productos de Stripe**: Debes crear los productos en el Dashboard de Stripe con los metadatos exactos o buscar sus IDs de Precio para ponerlos en la configuración. Por defecto, crearé un archivo `stripeConfig.ts` donde podrás pegar estos IDs.

## Cambios Propuestos

### Backend (Cloud Functions)

#### [MODIFICAR] [package.json](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/functions/package.json)

- Añadir dependencia `stripe`.

#### [NUEVO] [functions/src/stripe/index.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/functions/src/stripe/index.ts)

- `createCheckoutSession`: Función invocable para verificar autenticación y crear una Sesión de Checkout de Stripe.
- `createPortalSession`: Función invocable para redirigir al usuario al Portal de Clientes de Stripe.
- `stripeWebhook`: Función HTTPS para manejar `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`.

#### [NUEVO] [functions/src/stripe/webhookHandlers.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/functions/src/stripe/webhookHandlers.ts)

- Lógica para actualizar `users/{userId}` en Firestore:
  - `plan`: 'basic' | 'pro' | 'star' | 'weekend'
  - `subscriptionStatus`: 'active' | 'past_due' | 'canceled'
  - `planExpiry`: Timestamp (para Weekend Warrior o cancelación al final del periodo)
  - `stripeCustomerId`: Guardar en el primer checkout.

#### [MODIFICAR] [functions/src/index.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/functions/src/index.ts)

- Exportar las nuevas funciones de Stripe.

### Frontend

#### [NUEVO] [src/services/stripeService.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/src/services/stripeService.ts)

- Ayudante del lado del cliente para llamar a las Cloud Functions.

#### [NUEVO] [src/pages/PricingPage.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/src/pages/PricingPage.tsx)

- UI para mostrar los 4 planes.
- Lógica para manejar el clic en el botón "Suscribirse" -> llamar a `createCheckoutSession` -> redirigir a Stripe.

#### [MODIFICAR] [src/App.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/src/App.tsx)

- Añadir ruta para `/pricing`.
- Añadir ruta para `/payment/success` y `/payment/cancel`.

### Datos y Migración

#### [MODIFICAR] [types.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/types.ts)

- Actualizar la interfaz `User` con campos estrictos de suscripción.

#### [NUEVO] [scripts/migrateUsersToStar.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/scripts/migrateUsersToStar.ts)

- Script para actualizar por lotes a todos los usuarios existentes al plan `star`, con `subscriptionStatus: 'active'` y `isLegacyFree: true` (para el descuento del 100%).

## Plan de Verificación

### Pruebas Manuales

1. **Flujo de Suscripción**:
    - Usuario hace clic en "Suscribirse Pro" -> Redirige a Stripe -> Completa Pago -> Redirige a `/payment/success`.
    - Verificar que en Firestore `users/{uid}` tiene `plan: 'pro'` y `subscriptionStatus: 'active'`.
2. **Cancelación**:
    - Usuario hace clic en "Gestionar Suscripción" -> Redirige al Portal -> Cancela Plan.
    - Verificar que Firestore actualiza `cancelAtPeriodEnd: true`.
    - Esperar fin del periodo (simulado) -> Verificar que `plan` revierte o status pasa a `canceled`.
3. **Weekend Warrior**:
    - Comprar Weekend Warrior -> Verificar `plan: 'weekend'` y `planExpiry` se establece a 7 días desde ahora.
