# 🎯 Plan: Mostrar Jugadores que Descansan (Americano/Mexicano)

## 📋 Problema Identificado

En formatos **Americano** y **Mexicano**, cuando el número de jugadores no es múltiplo de 4, algunos jugadores quedan sin partido en cada ronda (descansan). Actualmente:

- ❌ Los jugadores que descansan **NO aparecen** en el apartado de partidos
- ❌ No hay indicación visual de quién descansa en cada ronda
- ❌ Puede causar confusión (¿dónde está el jugador X?)

### **Ejemplo del Problema:**

**Torneo Americano con 10 jugadores:**
- Ronda 1: Se forman 2 partidos (8 jugadores)
- **2 jugadores descansan** → No aparecen en ningún lado

---

## ✅ Solución Propuesta

### **Opción 1: Sección "Jugadores que Descansan" (Recomendada)**

Mostrar una sección separada debajo de los partidos de cada ronda:

```
📋 Ronda 1

Partidos:
🎾 Partido 1: Juan & Pedro vs María & Ana
🎾 Partido 2: Carlos & Luis vs Sofia & Laura

⏸️ Descansan esta ronda:
- Diego Martínez
- Elena García
```

**Ventajas:**
- ✅ Información clara y visible
- ✅ Fácil de implementar
- ✅ No interfiere con la UI de partidos existente

---

### **Opción 2: Tarjetas de "Descanso" (Alternativa)**

Mostrar tarjetas similares a las de partidos pero con estilo diferente:

```
📋 Ronda 1

🎾 Partido 1: Juan & Pedro vs María & Ana
🎾 Partido 2: Carlos & Luis vs Sofia & Laura
⏸️ Descanso: Diego Martínez
⏸️ Descanso: Elena García
```

**Ventajas:**
- ✅ Visualmente integrado con los partidos
- ✅ Más compacto

**Desventajas:**
- ❌ Puede confundirse con partidos reales
- ❌ Requiere más cambios en la UI

---

## 🔧 Implementación (Opción 1)

### **Paso 1: Calcular Jugadores que Descansan**

**Ubicación:** `components/RankingView.tsx` o crear helper function

```typescript
function getRestingPlayers(
  allPlayers: string[], 
  matches: Match[], 
  roundNumber: number
): string[] {
  // Get all players in matches for this round
  const playingPlayers = new Set<string>();
  
  matches
    .filter(m => m.jornada === roundNumber)
    .forEach(m => {
      playingPlayers.add(m.pair1.p1);
      playingPlayers.add(m.pair1.p2);
      playingPlayers.add(m.pair2.p1);
      playingPlayers.add(m.pair2.p2);
    });
  
  // Return players NOT in matches
  return allPlayers.filter(p => !playingPlayers.has(p));
}
```

### **Paso 2: Modificar UI para Mostrar Descansos**

**Ubicación:** Donde se renderizan los partidos por ronda

```tsx
{/* Existing matches rendering */}
{roundMatches.map(match => (
  <MatchCard key={match.id} match={match} />
))}

{/* NEW: Resting players section */}
{(ranking.format === 'americano' || ranking.format === 'mexicano') && (
  <RestingPlayersSection 
    players={getRestingPlayers(activeDivision.players, activeDivision.matches, currentRound)}
    playerData={players}
  />
)}
```

### **Paso 3: Crear Componente `RestingPlayersSection`**

**Nuevo archivo:** `components/RestingPlayersSection.tsx`

```tsx
interface Props {
  players: string[]; // Player IDs
  playerData: Record<string, Player>;
}

export const RestingPlayersSection = ({ players, playerData }: Props) => {
  if (players.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <svg /* pause icon */ />
        <h4 className="font-semibold text-gray-700">
          Descansan esta ronda ({players.length})
        </h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map(playerId => {
          const player = playerData[playerId];
          if (!player) return null;
          
          return (
            <div 
              key={playerId}
              className="px-3 py-1.5 bg-white rounded-md border border-gray-300 text-sm text-gray-700"
            >
              {player.nombre} {player.apellidos}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 📊 Casos de Uso

### **Caso 1: Americano con 10 jugadores**
- Ronda 1: 2 partidos (8 jugadores) + 2 descansan
- Ronda 2: 2 partidos (8 jugadores) + 2 descansan (diferentes)
- ...

### **Caso 2: Mexicano con 14 jugadores**
- Ronda 1: 3 partidos (12 jugadores) + 2 descansan
- Ronda 2: 3 partidos (12 jugadores) + 2 descansan (diferentes)
- ...

### **Caso 3: Americano con 8 jugadores (múltiplo de 4)**
- Ronda 1: 2 partidos (8 jugadores) + **0 descansan**
- **Sección "Descansan" NO se muestra** (players.length === 0)

---

## 🎨 Diseño Visual

### **Desktop:**
```
┌─────────────────────────────────────────┐
│ 📋 Ronda 1                              │
├─────────────────────────────────────────┤
│ 🎾 Partido 1                            │
│ Juan & Pedro vs María & Ana             │
│ [Pendiente]                             │
├─────────────────────────────────────────┤
│ 🎾 Partido 2                            │
│ Carlos & Luis vs Sofia & Laura          │
│ [Pendiente]                             │
├─────────────────────────────────────────┤
│ ⏸️ Descansan esta ronda (2)             │
│ ┌──────────────┐ ┌──────────────┐      │
│ │ Diego M.     │ │ Elena G.     │      │
│ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────┘
```

### **Mobile:**
```
┌───────────────────────┐
│ 📋 Ronda 1            │
├───────────────────────┤
│ 🎾 Partido 1          │
│ Juan & Pedro          │
│ vs                    │
│ María & Ana           │
│ [Pendiente]           │
├───────────────────────┤
│ 🎾 Partido 2          │
│ Carlos & Luis         │
│ vs                    │
│ Sofia & Laura         │
│ [Pendiente]           │
├───────────────────────┤
│ ⏸️ Descansan (2)      │
│ ┌─────────────────┐   │
│ │ Diego M.        │   │
│ │ Elena G.        │   │
│ └─────────────────┘   │
└───────────────────────┘
```

---

## 📁 Archivos a Modificar

| Archivo | Cambios | Complejidad |
|---------|---------|-------------|
| `components/RankingView.tsx` | Añadir helper `getRestingPlayers` + renderizar sección | Media |
| `components/RestingPlayersSection.tsx` | Crear nuevo componente | Baja |
| `services/matchGenerator.ts` | **NO requiere cambios** (lógica ya correcta) | N/A |

**Total:** 2 archivos (1 nuevo, 1 modificado)

---

## 🧪 Casos de Prueba

### **Test 1: Americano con 10 jugadores**
1. Crear torneo Americano con 10 jugadores
2. Generar Ronda 1
3. **Verificar:**
   - ✅ Se muestran 2 partidos (8 jugadores)
   - ✅ Sección "Descansan esta ronda (2)" visible
   - ✅ 2 jugadores listados en la sección

### **Test 2: Mexicano con 14 jugadores**
1. Crear torneo Mexicano con 14 jugadores
2. Generar Ronda 1
3. **Verificar:**
   - ✅ Se muestran 3 partidos (12 jugadores)
   - ✅ Sección "Descansan esta ronda (2)" visible
   - ✅ 2 jugadores listados

### **Test 3: Americano con 8 jugadores (control)**
1. Crear torneo Americano con 8 jugadores
2. Generar Ronda 1
3. **Verificar:**
   - ✅ Se muestran 2 partidos (8 jugadores)
   - ✅ Sección "Descansan" **NO** visible (0 jugadores)

### **Test 4: Cambio de ronda**
1. Torneo con 10 jugadores
2. Generar Ronda 1 → Verificar 2 descansan (ej: Diego y Elena)
3. Generar Ronda 2 → Verificar 2 descansan (diferentes: ej: Juan y María)
4. **Verificar:** Los jugadores que descansan rotan correctamente

---

## 🚀 Próximos Pasos

1. **Confirmar diseño:** ¿Opción 1 (sección separada) u Opción 2 (tarjetas)?
2. **Implementar helper function** `getRestingPlayers`
3. **Crear componente** `RestingPlayersSection`
4. **Integrar en RankingView** donde se renderizan los partidos
5. **Probar con diferentes números de jugadores**

---

## 💡 Mejoras Futuras (Opcional)

### **Mejora 1: Indicador en Clasificación**
Mostrar un icono en la tabla de clasificación indicando quién descansa en la ronda actual:

```
Clasificación - Ronda 1:
1. Juan Pérez    - 45 pts
2. Diego M. ⏸️   - 42 pts (Descansa)
3. María López   - 40 pts
```

### **Mejora 2: Rotación Equitativa**
Asegurar que todos los jugadores descansen el mismo número de veces a lo largo del torneo.

**Implementación:**
- Trackear cuántas veces ha descansado cada jugador
- Al generar nueva ronda, priorizar que descansen los que menos han descansado

---

## 🎯 Resumen

**Problema:** Jugadores que descansan no aparecen en el apartado de partidos  
**Solución:** Añadir sección "Descansan esta ronda" debajo de los partidos  
**Complejidad:** Media (2/10)  
**Tiempo estimado:** 1-2 horas  
**Impacto:** Alto (mejora significativa en UX)
