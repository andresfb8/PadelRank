# Plan: PadelRank TV Mode (Modo Televisión)

## 🎯 Objetivo
Crear una interfaz "Modo TV" optimizada para mostrar información del torneo en pantallas grandes de forma continua y automatizada. Esta vista será pública (no requiere login) y rotará automáticamente entre diferentes "diapositivas" (clasificación, partidos, patrocinadores, etc.).

## 📋 Requisitos Confirmados
1.  **Acceso Público:** URL única accesible sin autenticación (ej: `/tv/:rankingId`).
2.  **Modo Carrusel:** Rotación automática de vistas.
3.  **Contenido:**
    *   📊 Clasificación (Standings).
    *   🎾 Partidos (En juego, recientes, próximos).
    *   🤝 Patrocinadores (Logos configurables).
    *   📱 Código QR (Para acceder a la app desde el móvil).
4.  **Personalizable:** El administrador puede configurar qué diapositivas mostrar y la duración de cada una.

## 🛠️ Arquitectura Técnica

### 1. Nuevas Dependencias
*   `qrcode.react`: Para generar el código QR dinámicamente en el frontend.

### 2. Estructura de Datos
Actualizar el tipo `Ranking` para incluir la configuración de TV:

```typescript
type TVConfig = {
  enabled: boolean;
  slideDuration: number; // Segundos por diapositiva (default: 15)
  showStandings: boolean;
  showMatches: boolean;
  showQR: boolean;
  showSponsors: boolean;
  sponsors?: { id: string; url: string; name: string }[]; // URLs de logos
  theme?: 'dark' | 'light'; // Default: dark (mejor para TV)
};
```

### 3. Nuevos Componentes

#### `components/tv/TVLayout.tsx`
*   Layout principal sin navegación estándar.
*   Fondo oscuro / alto contraste.
*   Lógica de rotación (Timer y manejo de estado `currentSlide`).
*   Indicador de progreso (barra de tiempo de la diapositiva actual).

#### `components/tv/slides/*`
*   `StandingsSlide.tsx`: Tabla de clasificación con texto grande. Si hay muchos jugadores, hace *auto-scroll* suave.
*   `MatchesSlide.tsx`: Grid de partidos. Diferencia clara entre "Jugando ahora", "Finalizados" y "Próximos".
*   `SponsorsSlide.tsx`: Muestra logos de patrocinadores a pantalla completa o en rejilla.
*   `QRSlide.tsx`: Muestra QR grande apuntando a la URL pública del torneo + instrucciones cortas.

### 4. Rutas
*   Nueva ruta pública: `/tv/:rankingId`
*   Esta ruta debe cargar los datos del torneo (usando `subscribeToRankings` o `getDoc`) sin requerir el contexto de usuario autenticado estándar (o manejando el caso de usuario nulo).

### 5. Configuración (Admin)
*   Añadir sección "Configurar Modo TV" en `RankingSettingsModal`.
*   Botón "Abrir Modo TV" en el dashboard del torneo.

## 📅 Plan de Implementación

### Fase 1: Configuración y Datos
1.  [ ] Instalar `qrcode.react`: `npm install qrcode.react`.
2.  [ ] Actualizar `types.ts` con `TVConfig`.
3.  [ ] Actualizar `RankingSettingsModal` para permitir editar la configuración de TV (tiempo, activar/desactivar slides, subir logos - *por ahora URLs de texto para simplificar MVP*).

### Fase 2: Motor del Modo TV
4.  [ ] Crear página `/tv/[id]` que cargue los datos del torneo públicamente.
5.  [ ] Implementar `TVLayout` con la lógica de ciclo automático (`setInterval`).

### Fase 3: Diapositivas
6.  [ ] Implementar `StandingsSlide`: Reutilizar lógica de `generateStandings` pero con UI simplificada para TV.
7.  [ ] Implementar `MatchesSlide`: Filtrar partidos relevantes.
8.  [ ] Implementar `QRSlide` y `SponsorsSlide`.

## 🔍 Verificación
*   [ ] ¿La URL `/tv/...` abre sin estar logueado?
*   [ ] ¿El carrusel rota correctamente según el tiempo configurado?
*   [ ] ¿El QR lleva correctamente a la vista pública del torneo?
*   [ ] ¿Se ven bien los textos en una pantalla grande (simulada)?

---
**Nota sobre QR:** Usaremos `qrcode.react` para generar un SVG ligero. La URL encodeada será la del propio torneo público (la misma que ya usan los usuarios para ver sus resultados).
