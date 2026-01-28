# 🎯 Plan: Rondas Aleatorias en Mexicano

## 📋 Problema Identificado

En el formato **Mexicano**, los partidos se generan basándose estrictamente en la clasificación:
- Ronda 1: 1º, 2º, 3º, 4º juegan juntos
- Ronda 2: Si la clasificación no cambia mucho → **mismos jugadores juntos**
- Ronda 3: **Repetición de emparejamientos**

**Ejemplo del Problema:**
```
Ronda 1: Juan (1º) & María (4ª) vs Pedro (2º) & Ana (3ª)
Ronda 2: Juan (1º) & María (4ª) vs Pedro (2º) & Ana (3ª)  ← REPETIDO
Ronda 3: Juan (1º) & María (4ª) vs Pedro (2º) & Ana (3ª)  ← REPETIDO
```

**Consecuencia:** Partidos monótonos y predecibles.

---

## ✅ Solución Propuesta

### **Opción 1: Modo Aleatorio con Historial (Recomendada)**

Añadir una configuración al crear el torneo:
- **Mexicano Clásico** (por ranking) - Comportamiento actual
- **Mexicano Aleatorio** (evita repeticiones) - **NUEVO**

**Lógica del Modo Aleatorio:**
1. Trackear historial de emparejamientos (quién jugó con quién)
2. Al generar nueva ronda, priorizar emparejamientos **no repetidos**
3. Si todos jugaron con todos, resetear historial parcialmente

---

## 🔧 Implementación

### **Paso 1: Añadir Configuración al Wizard**

**Ubicación:** `components/RankingWizard.tsx`

```tsx
{format === 'mexicano' && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Modo de Generación de Rondas
    </label>
    <select
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      value={config.mexicanoMode || 'ranking'}
      onChange={(e) => setConfig({ ...config, mexicanoMode: e.target.value as 'ranking' | 'random' })}
    >
      <option value="ranking">Por Ranking (Clásico)</option>
      <option value="random">Aleatorio (Evita Repeticiones)</option>
    </select>
    <p className="text-xs text-gray-500 mt-1">
      {config.mexicanoMode === 'random' 
        ? 'Los partidos se generan aleatoriamente evitando que los mismos jugadores jueguen juntos repetidamente.'
        : 'Los partidos se generan agrupando a los jugadores por su posición en el ranking.'}
    </p>
  </div>
)}
```

---

### **Paso 2: Actualizar Tipo `RankingConfig`**

**Ubicación:** `types.ts`

```typescript
export interface RankingConfig {
  // ... existing fields
  mexicanoMode?: 'ranking' | 'random'; // NEW
  mexicanoHistory?: {
    partnerships: Record<string, string[]>; // playerId -> [partnerId1, partnerId2, ...]
    opponents: Record<string, string[]>;    // playerId -> [opponentId1, opponentId2, ...]
  };
}
```

---

### **Paso 3: Crear Función `generateMexicanoRoundRandom`**

**Ubicación:** `services/matchGenerator.ts`

```typescript
generateMexicanoRoundRandom: (
  players: Player[], 
  standings: StandingRow[], 
  roundNumber: number, 
  courts: number = 20,
  history?: { partnerships: Record<string, string[]>, opponents: Record<string, string[]> }
): { matches: Match[], updatedHistory: typeof history } => {
  const sorted = [...standings].sort((a, b) => b.pts - a.pts || b.gamesDiff - a.gamesDiff);
  const playerIds = sorted.map(s => s.playerId);
  
  // Initialize history if not provided
  const partnerships = history?.partnerships || {};
  const opponents = history?.opponents || {};
  
  playerIds.forEach(id => {
    if (!partnerships[id]) partnerships[id] = [];
    if (!opponents[id]) opponents[id] = [];
  });

  const matches: Match[] = [];
  const usedPlayers = new Set<string>();
  let courtIndex = 1;

  // Helper: Get partnership score (lower = less played together)
  const getPartnershipScore = (p1: string, p2: string): number => {
    return (partnerships[p1]?.filter(p => p === p2).length || 0) +
           (partnerships[p2]?.filter(p => p === p1).length || 0);
  };

  // Helper: Get opponent score (lower = less played against)
  const getOpponentScore = (p1: string, p2: string): number => {
    return (opponents[p1]?.filter(p => p === p2).length || 0) +
           (opponents[p2]?.filter(p => p === p1).length || 0);
  };

  // Try to form matches with minimal repetition
  const maxAttempts = 1000;
  for (let attempt = 0; attempt < maxAttempts && usedPlayers.size < playerIds.length - 3; attempt++) {
    // Get available players
    const available = playerIds.filter(p => !usedPlayers.has(p));
    if (available.length < 4) break;

    // Find best group of 4 with minimal history
    let bestGroup: string[] | null = null;
    let bestScore = Infinity;

    // Sample random groups and pick the one with least history
    for (let i = 0; i < 50; i++) {
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const group = shuffled.slice(0, 4);
      
      // Calculate history score for this group
      const [p1, p2, p3, p4] = group;
      const score = 
        getPartnershipScore(p1, p4) + getPartnershipScore(p2, p3) + // Pair 1 & 4, Pair 2 & 3
        getOpponentScore(p1, p2) + getOpponentScore(p1, p3) +
        getOpponentScore(p4, p2) + getOpponentScore(p4, p3);
      
      if (score < bestScore) {
        bestScore = score;
        bestGroup = group;
      }
      
      // If perfect match (no history), use it immediately
      if (score === 0) break;
    }

    if (!bestGroup) break;

    const [p1, p2, p3, p4] = bestGroup;

    // Create match: p1 & p4 vs p2 & p3
    const currentCourt = ((courtIndex - 1) % courts) + 1;
    matches.push(createMatch(0, roundNumber, p1, p4, p2, p3, currentCourt));

    // Update history
    partnerships[p1].push(p4);
    partnerships[p4].push(p1);
    partnerships[p2].push(p3);
    partnerships[p3].push(p2);

    opponents[p1].push(p2, p3);
    opponents[p4].push(p2, p3);
    opponents[p2].push(p1, p4);
    opponents[p3].push(p1, p4);

    // Mark as used
    usedPlayers.add(p1);
    usedPlayers.add(p2);
    usedPlayers.add(p3);
    usedPlayers.add(p4);

    courtIndex++;
  }

  return { 
    matches, 
    updatedHistory: { partnerships, opponents } 
  };
}
```

---

### **Paso 4: Modificar `handleGenerateNextRound`**

**Ubicación:** `components/RankingView.tsx` (línea 532-544)

```typescript
// Mexicano Logic
if (ranking.format === 'mexicano') {
  if (currentRound > 0 && activeDivision.matches.some(m => m.status === 'pendiente')) {
    return alert("Debes finalizar todos los partidos de la ronda actual antes de generar la siguiente en modo Mexicano.");
  }

  const mode = ranking.config?.mexicanoMode || 'ranking';

  if (mode === 'random') {
    // Random mode with history tracking
    const result = MatchGenerator.generateMexicanoRoundRandom(
      activeDivision.players.map(id => {
        const guest = ranking.guestPlayers?.find(g => g.id === id);
        return players[id] || (guest ? { ...guest, stats: { winrate: 50 }, email: '', telefono: '', fechaNacimiento: '' } as Player : { id, nombre: '?', apellidos: '', stats: { winrate: 0 } as any } as Player);
      }),
      standings,
      nextRound,
      ranking.config?.courts,
      ranking.config?.mexicanoHistory
    );

    newMatches = result.matches;

    // Update ranking config with new history
    const updatedRanking = {
      ...ranking,
      config: {
        ...ranking.config,
        mexicanoHistory: result.updatedHistory
      }
    };
    
    // Save updated ranking (will be done after adding matches)
    onUpdateRanking(updatedRanking);
  } else {
    // Classic mode (current behavior)
    newMatches = MatchGenerator.generateMexicanoRound(
      activeDivision.players.map(id => {
        const guest = ranking.guestPlayers?.find(g => g.id === id);
        return players[id] || (guest ? { ...guest, stats: { winrate: 50 }, email: '', telefono: '', fechaNacimiento: '' } as Player : { id, nombre: '?', apellidos: '', stats: { winrate: 0 } as any } as Player);
      }),
      standings,
      nextRound,
      ranking.config?.courts
    );
  }
}
```

---

## 📊 Comparativa de Modos

| Característica | Mexicano Clásico | Mexicano Aleatorio |
|----------------|------------------|-------------------|
| **Generación** | Por ranking estricto | Aleatorio con historial |
| **Repeticiones** | Frecuentes si ranking estable | Minimizadas |
| **Variedad** | Baja | Alta |
| **Competitividad** | Alta (mejores vs mejores) | Media (más equilibrado) |
| **Uso Recomendado** | Torneos competitivos | Torneos sociales/recreativos |

---

## 🎨 UI del Wizard

### **Desktop:**
```
┌─────────────────────────────────────────┐
│ Configuración del Torneo Mexicano       │
├─────────────────────────────────────────┤
│ Modo de Generación de Rondas            │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Aleatorio (Evita Repeticiones)   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ℹ️ Los partidos se generan              │
│ aleatoriamente evitando que los mismos  │
│ jugadores jueguen juntos repetidamente. │
└─────────────────────────────────────────┘
```

---

## 🧪 Casos de Prueba

### **Test 1: Modo Aleatorio - Primera Ronda**
1. Crear torneo Mexicano con modo "Aleatorio"
2. 12 jugadores
3. Generar Ronda 1
4. **Verificar:**
   - ✅ 3 partidos generados
   - ✅ Emparejamientos aleatorios (no necesariamente 1-2-3-4)

### **Test 2: Modo Aleatorio - Evitar Repeticiones**
1. Generar Ronda 1 → Anotar emparejamientos
2. Finalizar todos los partidos
3. Generar Ronda 2
4. **Verificar:**
   - ✅ Emparejamientos diferentes a Ronda 1
   - ✅ Historial actualizado en `ranking.config.mexicanoHistory`

### **Test 3: Modo Clásico (Control)**
1. Crear torneo Mexicano con modo "Por Ranking"
2. Generar Ronda 1
3. **Verificar:**
   - ✅ Comportamiento actual (1º-2º-3º-4º)
   - ✅ Sin cambios en la lógica existente

---

## 📁 Archivos a Modificar

| Archivo | Cambios | Complejidad |
|---------|---------|-------------|
| `types.ts` | Añadir `mexicanoMode` y `mexicanoHistory` a `RankingConfig` | Baja |
| `components/RankingWizard.tsx` | Añadir selector de modo | Baja |
| `services/matchGenerator.ts` | Crear `generateMexicanoRoundRandom` | Alta |
| `components/RankingView.tsx` | Modificar `handleGenerateNextRound` | Media |

**Total:** 4 archivos

---

## 💡 Mejoras Futuras (Opcional)

### **Mejora 1: Visualizar Historial**
Mostrar un modal con el historial de emparejamientos:

```
Historial de Emparejamientos:

Juan Pérez:
- Jugó con: María (2x), Pedro (1x), Ana (1x)
- Jugó contra: Carlos (2x), Luis (1x), Sofia (1x)
```

### **Mejora 2: Reset Parcial de Historial**
Si todos jugaron con todos, resetear parcialmente:

```typescript
// If everyone played with everyone at least 2 times, reset to 1
if (allPlayersMinHistory >= 2) {
  Object.keys(partnerships).forEach(key => {
    partnerships[key] = partnerships[key].slice(-partnerships[key].length / 2);
  });
}
```

### **Mejora 3: Modo Híbrido**
Combinar ranking y aleatoriedad:
- Top 50% por ranking
- Bottom 50% aleatorio

---

## 🎯 Resumen

**Problema:** Partidos repetitivos en Mexicano cuando el ranking es estable  
**Solución:** Modo aleatorio con tracking de historial de emparejamientos  
**Complejidad:** Alta (7/10)  
**Tiempo estimado:** 2-3 horas  
**Impacto:** Alto (mejora significativa en variedad y diversión)

**Beneficios:**
- ✅ Mayor variedad de partidos
- ✅ Evita monotonía
- ✅ Más justo (todos juegan con todos)
- ✅ Opción configurable (no rompe comportamiento actual)
