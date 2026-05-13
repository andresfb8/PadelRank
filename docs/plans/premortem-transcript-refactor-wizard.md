# Transcripción del Premortem: Refactorización Ranking Wizard

**Fecha:** 2026-05-10
**Proyecto:** PadelRank
**Plan Analizado:** Refactorización de Ranking Wizard (`2026-05-03-refactor-tournament-creation.md`)

## Contexto Recopilado
- **¿Qué es?** Desacoplar el componente monolítico `RankingWizard.tsx` en módulos específicos de configuración, asignación y generación usando un patrón Strategy, creando componentes separados para Americano, Eliminación, Ligas, Pozo, etc.
- **¿Para quién es?** Para los administradores que crean torneos (impacto de usuario) y los desarrolladores que mantienen el código (mantenibilidad).
- **¿Cómo es el éxito?** Código limpio y modular en `components/ranking-wizard/` y generadores en `services/wizardGenerators.ts`, sin causar regresiones ni bugs en el proceso de creación de torneos en la app en producción.

## Razones de Fallo en Bruto Identificadas
1. La extracción masiva rompió dependencias de estado (Prop drilling excesivo y re-renders que congelaron la UI).
2. Los enormes bloques `if-else` del código antiguo contenían casos límite cruciales de lógica de negocio que se descartaron "limpiando" el código.
3. Se perdieron efectos secundarios importantes al navegar entre pasos (por ejemplo, cambiar configuración en el paso 2 que antes reseteaba silenciosamente asignaciones en el paso 3).
4. La interfaz compartida (`FormatConfigProps`) probó ser demasiado rígida, forzando un diseño de estado ineficiente para formatos que no usaban esos datos.

## Análisis Profundos de Agentes

*(Ver informe HTML para las narrativas expandidas)*

1. **Infierno de Props y Desincronización de Estado** -> Supuesto: Que el estado local en el padre bastaba.
2. **Pérdida de Reglas de Negocio en la Extracción** -> Supuesto: Que el código monolítico viejo era solo "feo" y no contenía reglas vitales parcheadas con el tiempo.
3. **Ruptura de Dependencias de Ciclo de Vida** -> Supuesto: Que los pasos del Wizard eran lógicamente independientes.
4. **Parálisis por Sobre-Abstracción** -> Supuesto: Que todos los formatos se adhieren al mismo modelo de configuración.

## Síntesis y Plan Revisado
*(Se encuentra en la sección superior del Informe HTML)*

**Revisión Principal Recomendada:** 
No intentes extraer componentes y pasar estado mediante props simultáneamente. Crea un **Store de Zustand** para el estado global del Wizard primero, y escribe **tests de regresión** para los casos complejos del monolito antes de extraer la lógica a los nuevos generadores.
