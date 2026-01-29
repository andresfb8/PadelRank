# Plan: Capacidad Dinámica en Añadir División

## Objetivo
Permitir que al añadir una nueva división en formatos "Individual", "Parejas" y "Pairs", el modal respete la configuración del torneo sobre cuántos jugadores/parejas debe tener cada división, en lugar de estar limitado a 4.

## Problema Actual

En `AddDivisionModal.tsx`, las líneas 26-28 y 32-33 definen la capacidad de las divisiones:

```tsx
case 'individual':
  const maxPlayers = rankingConfig?.maxPlayersPerDivision || 6;
  return { mode: 'fixed-players', count: maxPlayers, label: 'jugadores' };

case 'pairs':
  const pairsPerGroup = rankingConfig?.hybridConfig?.pairsPerGroup || 4;
  return { mode: 'pairs', count: pairsPerGroup, label: 'parejas' };
```

**El problema:** Aunque el código ya lee la configuración del torneo (`rankingConfig`), parece que:

1. **Para "Individual"**: Usa `maxPlayersPerDivision` (correcto)
2. **Para "Pairs"**: Usa `hybridConfig.pairsPerGroup` (incorrecto - este campo es para formato híbrido)

El usuario reporta que solo puede añadir 4 parejas/jugadores, lo que sugiere que:
- La configuración no se está pasando correctamente al modal, O
- El campo de configuración para "Pairs" es incorrecto

## Análisis del Código

### Configuración en `RankingWizard.tsx`

Revisando el wizard (líneas 38-51), vemos que la configuración inicial es:

```tsx
const [config, setConfig] = useState<RankingConfig>({
  pointsPerWin2_0: 4,
  // ... otros campos
  promotionCount: 2,
  relegationCount: 2,
  // NO HAY campo específico para "pairsPerDivision" en formato "pairs"
  hybridConfig: { qualifiersPerGroup: 2, pairsPerGroup: 4 }
});
```

Y en las líneas 140-151 (cuando se selecciona formato "pairs"):

```tsx
if (f.id === 'pairs') {
  setIndividualMaxPlayers(6);  // ← Esto se usa para UI del wizard
  setConfig(prev => ({
    ...prev,
    promotionCount: 0,
    relegationCount: 0,
    // ... puntos
  }));
}
```

**Problema identificado:**
- El wizard NO guarda en `config` cuántas parejas debe tener cada división para formato "pairs"
- Solo usa `individualMaxPlayers` (state local) que NO se persiste en `ranking.config`

### Configuración en `RankingView.tsx`

Cuando se abre el modal desde `RankingView`, se pasa:

```tsx
<AddDivisionModal
  rankingConfig={ranking.config}
  // ...
/>
```

Si `ranking.config` no tiene el campo correcto, el modal usa el valor por defecto (4).

## Solución Propuesta

### Opción 1: Usar campo existente `maxPlayersPerDivision` para "Pairs"

**Cambios en `RankingWizard.tsx` (línea 363):**

Cuando el usuario configura "Parejas/Div" en el wizard para formato "pairs", guardar ese valor en `config.maxPlayersPerDivision`:

```tsx
<Input 
  type="number" 
  label={format === 'pairs' ? "Parejas/Div" : "Jugadores/Div"} 
  value={individualMaxPlayers} 
  onChange={(e: any) => {
    const newValue = Math.max(0, parseInt(e.target.value) || 0);
    setIndividualMaxPlayers(newValue);
    // NUEVO: Guardar en config para que persista
    setConfig({ ...config, maxPlayersPerDivision: newValue });
  }}
/>
```

**Cambios en `AddDivisionModal.tsx` (línea 30-33):**

Usar `maxPlayersPerDivision` también para formato "pairs":

```tsx
case 'pairs':
  // Usar maxPlayersPerDivision en lugar de hybridConfig.pairsPerGroup
  const pairsPerDiv = rankingConfig?.maxPlayersPerDivision || 4;
  return { mode: 'pairs', count: pairsPerDiv, label: 'parejas' };
```

### Opción 2: Crear campo específico `pairsPerDivision` en config

**Ventaja:** Más explícito y claro
**Desventaja:** Requiere modificar el tipo `RankingConfig` en `types.ts`

## Implementación Recomendada

**Opción 1** es más simple y reutiliza el campo existente `maxPlayersPerDivision` que ya funciona para "individual".

### Pasos:

1. **Modificar `RankingWizard.tsx`** (línea 363):
   - Actualizar el `onChange` del input "Parejas/Div" para guardar en `config.maxPlayersPerDivision`

2. **Modificar `AddDivisionModal.tsx`** (línea 30-33):
   - Cambiar de `hybridConfig.pairsPerGroup` a `maxPlayersPerDivision` para formato "pairs"

3. **Verificar que funciona:**
   - Crear torneo de parejas con 6 parejas/div
   - Añadir nueva división
   - Verificar que permite seleccionar 6 parejas (12 jugadores)

## Archivos Afectados

- `components/RankingWizard.tsx` (línea ~363)
- `components/AddDivisionModal.tsx` (líneas 30-33)

## Casos de Prueba

1. **Formato Individual:**
   - Configurar 8 jugadores/div en wizard
   - Añadir división → Debe permitir 8 jugadores

2. **Formato Parejas:**
   - Configurar 6 parejas/div en wizard
   - Añadir división → Debe permitir 6 parejas (12 jugadores)

3. **Formato Híbrido:**
   - No debe afectarse (usa su propio campo `hybridConfig.pairsPerGroup`)

## Prioridad
**Media-Alta** - Afecta la usabilidad al crear divisiones

## Tiempo Estimado
20 minutos
