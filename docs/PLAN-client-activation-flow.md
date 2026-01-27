# PLAN-client-activation-flow.md

> **Objetivo:** Refinar el proceso de alta de clientes eliminando el envío de contraseñas por email. Se adoptará un flujo de "Activación de Cuenta" (Password Reset personalizado).

## 1. Análisis de Requisitos

### Situación Actual
- SuperAdmin crea usuario + contraseña random.
- Envía email con credenciales en texto plano.
- Cliente entra y debe cambiar la contraseña (opcional/manual).

### Nueva Estrategia (Opción B - Secure Hack)
- SuperAdmin crea usuario (contraseña interna oculta de 40 chars).
- Sistema dispara `sendPasswordResetEmail` (Firebase Auth).
- El usuario recibe un email de "Activa tu cuenta".
- Al hacer clic, llega a una pantalla donde define su contraseña.

---

## 2. Tareas de Implementación

### Fase 1: Creación de Cuenta "Silenciosa"
- **Archivo:** `components/AdminLayout.tsx` (función `handleCreateAdmin`)
    - [ ] Modificar generación de password: usar `crypto.randomUUID()` o string largo complejo.
    - [ ] **NO ENVIAR** este password por email ni mostrarlo en el `alert`.

### Fase 2: Email de Activación Personalizado
- **Archivo:** `functions/src/index.ts`
    - [ ] Crear nueva función `sendActivationEmail`.
    - [ ] Generar link de reset password usando Firebase Admin SDK: `admin.auth().generatePasswordResetLink(email)`.
    - [ ] Usar Resend para enviar este link con un template bonito ("Bienvenido a PadelRank, activa tu cuenta aquí").

### Fase 3: Frontend - UX
- **Archivo:** `components/AdminLayout.tsx`
    - [ ] Actualizar feedback al SuperAdmin: "Cliente creado. Email de activación enviado."

---

## 3. Plan de Verificación

1. **Crear Cliente**:
   - SuperAdmin rellena form (nombre, email).
   - Verifica que **NO** ve la contraseña.
2. **Recepción de Email**:
   - Verificar que llega el email bonito de Resend (no el default de Firebase).
   - Verificar que el link funciona.
3. **Activación**:
   - Hacer clic en el link.
   - Establecer contraseña nueva.
   - Loguearse exitosamente.

---

## 4. Notas Técnicas
- Usaremos `admin.auth().generatePasswordResetLink(email)` en el Cloud Function para obtener el link exacto que Firebase usaría, pero envolviéndolo en nuestro template de Resend.
- Esto evita tener que crear una página custom de `/reset-password` en el frontend por ahora (se usará la handler page de Firebase por defecto, o la que tengamos configurada).
