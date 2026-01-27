# Plan: Admin Management Evolution (SuperAdmin Control)

## Objetivo
Potenciar las herramientas de gestión de clientes para el SuperAdmin, automatizando el onboarding (envío de credenciales) y proporcionando controles proactivos (reseteo de contraseñas, notas internas y cuotas de uso).

## Fases de Implementación

### Fase 1: Actualización del Modelo de Datos 🏗️
- **Archivo**: `types.ts`
- **Cambios**:
    - Añadir `internalNotes?: string` a la interfaz `User`.
    - Añadir `lastLogin?: string` para seguimiento de actividad.
    - Asegurar que `createdAt` esté bien tipado (ya realizado).

### Fase 2: Lógica de Gestión en `AdminLayout.tsx` 🧠
- **Cambios**:
    - Actualizar `handleCreateAdmin` para:
        - Generar una contraseña aleatoria segura de 10 caracteres.
        - Llamar a una función simulada `sendWelcomeEmail`.
    - Implementar `handleResetPassword`:
        - Usar `sendPasswordResetEmail` de Firebase Auth.
    - Actualizar `handleUpdateUser` (genérico) para permitir guardar notas internas.

### Fase 3: Rediseño de la UI en `SuperAdminDashboard.tsx` 🎨
- **Cambios**:
    - **Tabla de Clientes**:
        - Añadir columna/indicador de "Actividad" (hace cuánto entró).
        - Añadir botones de acción rápida: 🔑 (Reset Pass), 📧 (Re-enviar Bienvenida).
    - **Modal de Creación**:
        - Campo autogenerado para contraseña (con opción de ver/ocultar).
        - Toggle "Notificar por email al cliente".
    - **Nuevo Modal: "Ficha del Cliente"**:
        - Espacio para `internalNotes` (Markdown soportado).
        - Visualización detallada de cuotas (Ej: "80/100 jugadores usados").

### Fase 4: Simulación de Comunicaciones 📧
- Crear un componente de "Email Preview" o simplemente usar `console.info` con estilos para que el SuperAdmin vea qué se enviaría al cliente hasta que integremos Resend/SendGrid.

## Verificación y Testing 🧪

### Checklist de Pruebas
- [ ] **Creación**: ¿Se genera la contraseña? ¿Se muestra el alert/modal de éxito con los datos?
- [ ] **Reset**: ¿Llega el correo de Firebase de reseteo? (Probado con email real).
- [ ] **Notas**: ¿Se guardan las notas internas y persisten al recargar?
- [ ] **UX**: ¿El SuperAdmin se siente en control total?

## Ideas Pro Max (Futuro) 🚀
- **Logs de Auditoría**: Lista de "Últimas 5 acciones de este admin".
- **Modo Mantenimiento**: Botón para bloquear acceso temporal a un cliente específico.
- **Broadcast**: Enviar un mensaje que aparecerá en el dashboard de todos los admins.
