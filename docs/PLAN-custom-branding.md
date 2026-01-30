# Plan de Implementación: Personalización de Marca (White Label)

## Contexto
Implementar funcionalidad para planes **Pro**, **Start Point** (Star) y **Weekend Warrior** que permita personalizar la identidad visual del torneo mediante **subida directa de logo**.

## Requisitos
1.  **Subida Directa**: Admins suben su archivo de imagen (no URL externa).
2.  **Optimización**: La imagen se redimensiona automáticamente en el navegador para evitar problemas de peso/servidor.
3.  **Visibilidad**: Reemplaza logo Racket Grid en Vistas Pública y TV.
4.  **Reubicación**: Racket Grid "Powered by" en footer.

## Estrategia Técnica (v1)
*   **Almacenamiento**: Data URI (Base64) guardado en Firestore (`ranking.config.branding.logoUrl`).
*   **Procesamiento**:
    *   Input `type="file"`.
    *   API `Canvas` para redimensionar (Max-Height: 150px).
    *   Límite estricto de peso resultante (< 50KB-100KB) para proteger la base de datos.
*   **Infraestructura**: No requiere configurar Buckets de Storage ni reglas de seguridad complejas (Zero Config).

## Tareas

### 1. Definición de Tipos (`types.ts`)
- [ ] Actualizar `RankingConfig` para incluir:
    ```typescript
    branding?: {
        logoUrl?: string; // Base64 string
        hideDefaultLogo?: boolean;
        // Future: primaryColor
    }
    ```
- [ ] Validar planes permitidos (`pro`, `star`, `weekend`).

### 2. Utils de Procesamiento (`utils/images.ts` opcional)
- [ ] Crear función `processLogoUpload(file: File): Promise<string>`
    -   Leer archivo.
    -   Redimensionar proporcionalmente a `h=150px`.
    -   Comprimir a JPEG/PNG.
    -   Devolver Data URL.

### 3. Interfaz de Configuración (`RankingSettingsModal.tsx`)
- [ ] Pestaña "Marca".
- [ ] Botón "Subir Logo" (Input File oculto).
- [ ] Vista previa inmediata.
- [ ] Botón "Eliminar Logo".

### 4. Adaptación de Vistas
#### `PublicLayout.tsx`
- [ ] Header: Renderizar `img src={branding.logoUrl}` si existe.
- [ ] Footer: Mostrar "Powered by Racket Grid" solo si hay branding activo.

#### `TVLayout.tsx`
- [ ] Reemplazar logo en el header de las diapositivas.

## Verificación
- [ ] Subir imagen de 5MB -> Se procesa a ~30KB y se muestra.
- [ ] Guardar cambios -> Persiste en Firestore.
- [ ] Vista Pública -> Muestra logo nuevo.
