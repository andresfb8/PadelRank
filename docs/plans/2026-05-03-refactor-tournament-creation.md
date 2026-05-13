# Plan de Implementación: Refactorización de Ranking Wizard

> **Para Claude:** SUB-SKILL REQUERIDA: Usa superpowers:executing-plans para implementar este plan tarea por tarea.

**Objetivo:** Desacoplar el componente monolítico `RankingWizard.tsx` en módulos específicos de configuración, asignación y generación por formato, para evitar que la lógica se entrelace entre los diferentes tipos de torneo.

**Arquitectura:** Implementaremos un patrón tipo Strategy para los pasos del asistente. `RankingWizard.tsx` actuará como un contenedor que maneja el Paso 1 (Selección de Formato) y guarda el estado global. El Paso 2 (Configuración), el Paso 3 (Asignación de Jugadores) y la lógica de generación final (`handleSaveRanking`) se delegarán a componentes y funciones dedicadas por formato (ej. `AmericanoConfig`, `AmericanoAssignments`, `generateAmericano`).

**Stack Tecnológico:** React, TypeScript, TailwindCSS, Lucide React

---

### Tarea 1: Crear Estructura de Directorios e Interfaces Compartidas

**Archivos:**
- Crear: `components/ranking-wizard/types.ts`
- Crear: `services/wizardGenerators.ts`

**Paso 1: Escribir interfaces compartidas**

Define las interfaces que los componentes específicos de formato necesitarán en `components/ranking-wizard/types.ts`.

```typescript
// components/ranking-wizard/types.ts
import { RankingConfig, Player } from '../../types';

export interface FormatConfigProps {
    config: RankingConfig;
    setConfig: (config: RankingConfig) => void;
    numDivisions: number;
    setNumDivisions: (num: number) => void;
    individualMaxPlayers: number;
    setIndividualMaxPlayers: (num: number) => void;
}

export interface FormatAssignmentsProps {
    assignments: Record<number, string[]>;
    setAssignments: (assignments: Record<number, string[]>) => void;
    selectedPlayerIds: string[];
    availablePlayers: Player[];
    numDivisions: number;
    config: RankingConfig;
    individualMaxPlayers: number;
}
```

**Paso 2: Commit**

```bash
git add components/ranking-wizard/types.ts services/wizardGenerators.ts
git commit -m "refactor: crear estructura e interfaces compartidas para el wizard de torneos"
```

### Tarea 2: Extraer Lógica de Americano y Mexicano

**Archivos:**
- Crear: `components/ranking-wizard/AmericanoConfig.tsx`
- Crear: `components/ranking-wizard/AmericanoAssignments.tsx`

**Paso 1: Extraer Configuración**

Crea `AmericanoConfig.tsx` y mueve el HTML/JSX específico relacionado con Mexicano/Americano (Modalidad de Juego, Pistas, Modo de Puntuación, etc.) desde `RankingWizard.tsx` a este archivo. Asegúrate de que recibe `FormatConfigProps` y `format` ('americano' | 'mexicano') como props.

**Paso 2: Extraer Asignaciones**

Crea `AmericanoAssignments.tsx` moviendo la lógica de generación de asignaciones (distribución automática) y el renderizado de los menús desplegables de parejas o individuales desde `RankingWizard.tsx`.

**Paso 3: Commit**

```bash
git add components/ranking-wizard/AmericanoConfig.tsx components/ranking-wizard/AmericanoAssignments.tsx
git commit -m "refactor: extraer pasos del wizard para Americano y Mexicano"
```

### Tarea 3: Extraer Lógica de Eliminación Directa

**Archivos:**
- Crear: `components/ranking-wizard/EliminationConfig.tsx`
- Crear: `components/ranking-wizard/EliminationAssignments.tsx`

**Paso 1: Extraer Configuración**

Mueve la lógica de "Modalidad" (Individual vs Parejas) y "Cuadro de Consolación" desde `RankingWizard.tsx` a `EliminationConfig.tsx`. 

**Paso 2: Extraer Asignaciones**

Mueve la lógica y el renderizado de "Inscripción de Parejas por Categoría" a `EliminationAssignments.tsx`. Esto incluye el manejo del tamaño de las categorías y los selectores.

**Paso 3: Commit**

```bash
git add components/ranking-wizard/EliminationConfig.tsx components/ranking-wizard/EliminationAssignments.tsx
git commit -m "refactor: extraer pasos del wizard para Eliminación"
```

### Tarea 4: Extraer Lógica Clásica, Individual, Parejas, Híbrido y Pozo

**Archivos:**
- Crear: `components/ranking-wizard/LeagueConfig.tsx`
- Crear: `components/ranking-wizard/LeagueAssignments.tsx`
- Crear: `components/ranking-wizard/PozoConfig.tsx`
- Crear: `components/ranking-wizard/HybridConfig.tsx`

**Paso 1: Extraer la lógica de los formatos restantes**

Agrupa los formatos restantes que son similares. Crea los componentes de configuración para Pozo, Híbrido y Ligas estándar (Clásico/Individual/Parejas) aislando sus inputs específicos. Mueve las cuadrículas de asignación manual y automática a `LeagueAssignments.tsx` (manejando divisiones/grupos).

**Paso 2: Commit**

```bash
git add components/ranking-wizard/*Config.tsx components/ranking-wizard/*Assignments.tsx
git commit -m "refactor: extraer los pasos restantes del wizard por formato"
```

### Tarea 5: Extraer Lógica de Generación y Guardado

**Archivos:**
- Modificar: `services/wizardGenerators.ts`

**Paso 1: Extraer los condicionales de `handleSaveRanking`**

Mueve los bloques masivos de `if-else` de `handleSaveRanking` en `RankingWizard.tsx` hacia funciones especializadas dentro de `wizardGenerators.ts`:
- `generateEliminationDivisions(...)`
- `generateAmericanoDivisions(...)`
- `generatePozoDivisions(...)`
- `generateLeagueDivisions(...)`

Cada función debe recibir `assignments`, `config`, `format`, `categories`, etc. y devolver un `Division[]` o lanzar un error de tipo string si la validación falla.

**Paso 2: Commit**

```bash
git add services/wizardGenerators.ts
git commit -m "refactor: extraer lógica de guardado y generación a wizardGenerators"
```

### Tarea 6: Refactorizar RankingWizard.tsx

**Archivos:**
- Modificar: `components/RankingWizard.tsx`

**Paso 1: Reemplazar lógica inline con componentes**

Importa los nuevos componentes y funciones.
En `renderStep2()`, reemplaza los grandes condicionales con un `switch(format)` que renderice el componente `*Config` específico.
En `renderStep3()`, haz lo mismo para el componente `*Assignments`.
En `handleSaveRanking()`, llama a la función generadora apropiada desde `wizardGenerators.ts`, captura los errores de validación, y construye el objeto `newRanking` final.

**Paso 2: Commit**

```bash
git add components/RankingWizard.tsx
git commit -m "refactor: utilizar componentes extraídos por formato en RankingWizard"
```
