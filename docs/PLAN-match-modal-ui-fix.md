
# IMPLEMENTATION PLAN - Match Modal UI Fixes

> Refine MatchModal aesthetics and information display based on user feedback.

## 1. Context
- **Issue**: The current `MatchModal` has generic titles ("Jornada 1") which don't make sense for Elimination tournaments ("Octavos", etc.).
- **Issue**: Player names in pairs are truncated (e.g., "Player A & Play...").
- **Issue**: Schedule info is completely missing from the modal (context unaware).

## 2. Goals
- **Better Titles**: Display dynamic round names for elimination formats.
- **Readable Names**: Display pair members in **two vertical rows** to avoid truncation.
- **Contextual Info**: Show schedule (Time/Court) as read-only info if set.

## 3. Implementation Steps

### Step 1: Dynamic Title Logic
- In `MatchModal.tsx`:
  - Check `match.roundName`.
  - If present, use it as the main title (e.g., "Resultado: Octavos de Final").
  - Fallback to "Jornada X" for leagues.

### Step 2: Improved Player Display
- Refactor the header row of the score inputs.
- Instead of using a single string `p1Name`, create a rendering helper:
  ```jsx
  <div className="flex flex-col gap-1">
     <div className="font-semibold truncate">{p1.nombre} {p1.apellidos}</div>
     {p2 && <div className="font-semibold truncate text-gray-600">{p2.nombre} {p2.apellidos}</div>}
  </div>
  ```
- Apply this to both columns (Pair 1 and Pair 2).

### Step 3: Read-Only Schedule Context
- Add a small info bar at the top or bottom of the modal.
- "📅 Jugado el [Fecha] en Pista [X]".
- This confirms to the user *which* match they are editing without re-introducing the editing complexity.

## 4. Verification
- Open an Elimination Match -> Title should say "Cuartos", "Semifinal", etc.
- Check a Pair Match -> Names should be stacked vertically, fully visible.
- Check Schedule Info -> Should appear if set.
