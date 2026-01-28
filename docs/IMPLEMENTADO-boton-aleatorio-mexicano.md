# ✅ Implementado: Botón Ronda Aleatoria en Mexicano

## 📋 Funcionalidad

Se ha añadido un nuevo botón **"Ronda Aleatoria"** en el panel de administración del formato Mexicano.

Este botón permite generar una ronda donde los emparejamientos son **aleatorios**, en lugar de seguir estrictamente el orden de la clasificación. Esto es útil para romper la monotonía cuando el ranking es muy estable y los jugadores siempre juegan con los mismos compañeros.

---

## 🔧 Detalles de Implementación

### **1. Nuevo Botón en la UI**

- **Ubicación:** `RankingView.tsx`, junto al botón "Nueva Ronda".
- **Visibilidad:** Solo visible en formato **Mexicano**.
- **Icono:** `Shuffle` (Aleatorio).
- **Color:** Púrpura, para diferenciarlo del botón estándar (Naranja).

### **2. Lógica de Generación (`matchGenerator.ts`)**

Se creó la función `generateMexicanoRoundRandom` que:
1. Mezcla aleatoriamente a todos los jugadores disponibles.
2. Los agrupa en pistas de 4 jugadores.
3. Asigna parejas balanceadas (1º y 4º vs 2º y 3º del grupo aleatorio).

### **3. Flujo de Uso**

1. Finalizar todos los partidos de la ronda actual.
2. Si se quiere una ronda basada en méritos: Click en **"Nueva Ronda"**.
3. Si se quiere variar y mezclar jugadores: Click en **"Ronda Aleatoria"**.

---

## 🧪 Cómo Probarlo

1. **Crear Torneo Mexicano**.
2. **Generar Ronda 1** (con botón estándar).
3. Finalizar partidos.
4. **Generar Ronda 2** usando el botón **"Ronda Aleatoria"**.
   - Verificar que los emparejamientos son diferentes a lo que dictaría el ranking puro.
5. **Verificar** que se genera correctamente y se añade a la lista de jornadas.

---

## 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `services/matchGenerator.ts` | Añadida función `generateMexicanoRoundRandom` |
| `components/RankingView.tsx` | Añadido botón e integración de la lógica |

---
