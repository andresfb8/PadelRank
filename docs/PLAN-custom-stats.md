# PLAN: Visibilidad de Estadísticas Personalizada

Este plan permite a los administradores de torneos elegir qué columnas de estadísticas son visibles en las clasificaciones.

## 🔴 Reglas de Negocio

- **Columnas Obligatorias**: Puntos (PTS), Partidos Jugados (PJ), Partidos Ganados (PG) y % Winrate. Estas siempre serán visibles.
- **Columnas Opcionales**: Partidos Perdidos (PP), Diferencia de Sets (DS), Diferencia de Juegos (DJ), Sets Ganados/Perdidos, Juegos Ganados/Perdidos.
- **Alcance**: Los cambios afectarán a la vista de administración, vista pública y exportación PDF.
- **Persistencia**: La configuración se guarda individualmente por torneo.

---

## Fase 1: Actualización de Modelos y Tipos

### [MODIFY] [types.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/types.ts)

- Añadir `visibleColumns?: string[]` a la interfaz `RankingConfig`.
- Las columnas se identificarán por las `keys` definidas en `StandingsColumn.ts` (ej: 'pp', 'setsDiff', etc.).

---

## Fase 2: Interfaz de Configuración

### [MODIFY] [RankingSettingsModal.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/RankingSettingsModal.tsx)

- Añadir una nueva sección "Visibilidad de Estadísticas".
- Listar las columnas opcionales con checkboxes.
- Deshabilitar/Omitir de la lista las columnas obligatorias (siempre marcadas).

---

## Fase 3: Integración en Vistas (Web)

### [MODIFY] [RankingView.tsx](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/components/RankingView.tsx)

- Implementar una función `getVisibleColumns()` que tome el preset del formato y lo filtre basándose en `ranking.config.visibleColumns`.
- Asegurar que la lógica de filtrado preserve siempre las columnas obligatorias.
- Pasar el array resultante al componente `StandingsTable`.

---

## Fase 4: Exportación PDF

### [MODIFY] [export.ts](file:///c:/Users/andre/Desktop/Proyectos%20Gemini/PadelRank/PadelRank/services/export.ts)

- Actualizar `tableColumns` dinámicamente basándose en la configuración del torneo.
- Aplicar el mismo filtro de visibilidad antes de generar el `autoTable`.

---

## Verificación Plan

### 🛠️ Pruebas Manuales

1. **Configuración**: Abrir ajustes de un torneo y desmarcar "Diferencia de Juegos". Guardar.
2. **Vista Admin**: Verificar que la columna "DJ" desaparece de la tabla.
3. **Vista Pública**: Verificar que la columna "DJ" tampoco es visible para usuarios no logueados.
4. **Exportación**: Generar PDF y comprobar que la tabla solo contiene las columnas seleccionadas.
5. **Obligatoriedad**: Intentar ocultar "Puntos" (no debería ser posible en la UI).
