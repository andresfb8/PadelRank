# Plan: Implementación de Centro de Ayuda Interactivo

Este plan detalla la creación e integración de un "Help Center" (Centro de Ayuda) accesible desde toda la aplicación, diseñado para resolver dudas sobre formatos de torneos y uso de la plataforma sin necesidad de soporte externo.

## Fase 1: Estructura de Datos de Ayuda
Definir un archivo de configuración estático que contenga todo el conocimiento estructurado.

- **Archivo:** `data/helpContent.ts` (Nuevo)
- **Estructura:**
    - `categories`: Array de categorías (Formatos, Gestión, Jugadores, FAQ).
    - `articles`: Array de objetos con `id`, `title`, `content` (Markdown soportado), `categoryId`, `tags`.
- **Contenido Inicial:**
    - Explicación detallada de formatos: Americano, Mexicano, Híbrido, Liga.
    - Guía rápida de Administración.
    - Glosario de términos (Bye, Set, Tie-break).

## Fase 2: Componente `HelpCenter`
Crear el componente visual que actuará como panel lateral (Drawer/Slide-over).

- **Componente:** `components/HelpCenter.tsx`
- **Características:**
    - Botón flotante `?` (trigger) visible en `AdminLayout`.
    - Modal lateral con animación `slide-in` desde la derecha.
    - **Header:** Buscador en tiempo real (filtrado por título/tags).
    - **Body:** 
        - Vista inicial: Lista de categorías y artículos populares.
        - Vista detalle: Renderizado del artículo seleccionado con botón "Atrás".
    - **Footer:** Enlaces de contacto o versión de la app.

## Fase 3: Integración
Añadir el componente al layout principal para que esté siempre disponible.

- **Archivo:** `components/AdminLayout.tsx`
- **Acción:** Importar e incluir `<HelpCenter />` como elemento raíz (fixed position).

## Asignación de Agentes
- **Frontend Specialist:** Para el diseño del componente y la experiencia de usuario.
- **Content:** Para estructurar el texto de ayuda inicial (se usará texto placeholder de alta calidad o definiciones reales ya conocidas).

## Verificación
- El botón de ayuda no debe tapar elementos críticos.
- El buscador debe filtrar correctamente los artículos.
- La navegación entre categorías y detalles debe ser fluida.
