# Plan: Cumplimiento Legal y Redes Sociales

Este plan detalla la implementación de las políticas legales (RGPD/LOPD), el banner de cookies y la integración de botones de contacto social (WhatsApp e Instagram).

## User Review Required

> [!IMPORTANT]
> Los textos legales son **plantillas generales**. Se recomienda que el usuario los revise y valide con un asesor legal para asegurar cumplimiento total con sus condiciones específicas.

## Proposed Changes

### Landing Page (`landing/`)

#### [MODIFY] [App.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/landing/src/App.tsx)

- Añadir sección de `LegalModal` para mostrar Aviso Legal, Privacidad y Cookies.
- Actualizar el `footer` con enlaces dinámicos a estos documentos.
- Implementar componente `WhatsAppButton` flotante (bottom-right).
- Añadir icono de Instagram en el footer.
- Integrar componente `CookieBanner` al inicio.

#### [NEW] [CookieBanner.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/landing/src/components/CookieBanner.tsx)

- Banner informativo con opción de Aceptar/Configurar.
- Persistencia en `localStorage` para no mostrarlo repetidamente.

---

### Aplicación Principal (`PadelRank/`)

#### [MODIFY] [AdminLayout.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/AdminLayout.tsx)

- Añadir enlaces legales mínimos en el pie de la página de Login.

## Verification Plan

### Automated Tests

- Verificar que el banner de cookies desaparece al hacer clic en "Aceptar".
- Verificar que los enlaces del footer abren el contenido correcto.

### Manual Verification

- Comprobar que el botón de WhatsApp abre correctamente la URL `https://wa.me/34625277697`.
- Comprobar que el enlace de Instagram redirige a `@racketgridapp`.
