# Walkthrough: Branding Personalizado (White Label)

Se ha implementado la funcionalidad completa para que los administradores (Planes Pro/Star/Weekend) puedan personalizar la identidad visual de sus torneos.

## 1. Subida Directa de Imágenes (`utils/imageProcessor.ts`)
*   Se ha creado un utilitario que:
    *   Intercepta la subida de archivos (Input File).
    *   Redimensiona la imagen usando `Canvas` en el navegador (Max Height: 150px).
    *   Convierte a Base64 optimizado (~50KB) para evitar necesidad de Storage Buckets complejos.

## 2. Configuración (`RankingSettingsModal.tsx`)
*   Nueva pestaña **"Marca"** visible solo para usuarios con plan habilitado.
*   Permite:
    *   Subir Logo (con preview inmediata).
    *   Eliminar Logo.
    *   Opción para ocultar logo de Racket Grid por defecto (checkbox).

## 3. Vista Pública (`PublicLayout.tsx`)
*   **Header**: Ahora muestra el logo del torneo si existe.
*   **Footer**: Se ha añadido un pie de página "Powered by Racket Grid" que aparece cuando hay branding activo, desplazando la marca de la plataforma a un segundo plano.

## 4. Modo TV (`TVLayout.tsx` & Slides)
*   **StandingsSlide**: Reemplaza el icono de Trofeo por el Logo del Torneo.
*   **MatchesSlide**: Reemplaza el icono de Calendario por el Logo del Torneo.
*   **Footer Global**: Muestra "Powered by Racket Grid" discretamente si hay branding activo.

## Archivos Modificados
- `types.ts`: Esquema de Branding.
- `utils/imageProcessor.ts`: Lógica de compresión.
- `components/RankingSettingsModal.tsx`: UI de configuración.
- `components/RankingView.tsx`, `components/AdminLayout.tsx`: Prop drilling de Plan de Usuario.
- `components/PublicLayout.tsx`: Renderizado público.
- `components/tv/TVLayout.tsx`: Renderizado TV global.
- `components/tv/slides/*.tsx`: Renderizado TV específico.

## Próximos Pasos (Usuario)
1.  Entrar a un torneo como Admin (con plan Pro).
2.  Ir a Ajustes -> Pestaña "Marca".
3.  Subir un logo y guardar.
4.  Verificar en "Vista Pública" y "Modo TV".
