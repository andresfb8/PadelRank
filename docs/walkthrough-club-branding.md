# Walkthrough: Gestión de Marca de Club (Branding Global)

Se ha implementado una mejora en la gestión de branding para permitir a los administradores configurar su identidad visual una sola vez y aplicarla a todos sus torneos.

## Nuevas Funcionalidades

### 1. Configuración de Club ("Mi Club")
*   Se ha añadido un nuevo botón **"Mi Club"** en la barra superior del panel de administración (visible para planes Pro/Star/Weekend).
*   Abre un panel donde se puede subir el **Logo de la Organización**.
*   Este logo se guarda en el perfil del usuario, centralizando la configuración.

### 2. Propagación Automática
*   Al guardar el logo del club, aparece una opción (checkbox): **"Actualizar torneos existentes"**.
*   Si se marca, el sistema actualiza automáticamente la configuración de todos los torneos activos del usuario con el nuevo logo.

### 3. Creación de Nuevos Torneos
*   Al crear un nuevo torneo ("Crear Torneo"), el sistema precarga automáticamente el logo del club en la configuración del nuevo ranking.

### 4. Vistas Públicas
*   Funciona exactamente igual que antes:
    *   **Vista Pública**: Header con Logo + Footer "Powered by".
    *   **Modo TV**: Slides con Logo personalizado.

## Archivos Modificados
- `types.ts`: Añadido `branding` a interfaz `User`.
- `components/ClubSettingsModal.tsx`: **[NUEVO]** Modal de gestión de identidad corporativa.
- `components/AdminLayout.tsx`: Integración del botón y modal en la UI general.
- `components/RankingWizard.tsx`: Precarga de logo en nuevos torneos.
- `components/RankingSettingsModal.tsx`: (Mantenido) Permite sobrescribir el logo a nivel individual de torneo si se desea.

## Próximos Pasos (Usuario)
1.  Hacer clic en el botón **"Mi Club"** (icono edificio) en la barra superior.
2.  Subir el logo de tu organización.
3.  Marcar "Actualizar torneos existentes" para aplicar cambios retroactivos.
4.  Guardar.
5.  ¡Listo! Todos tus torneos ahora lucen tu marca.
