# Plan: Manual Promotion Overrides

## Goal
Restore (or implement) the ability for administrators to manually adjust the target division for specific players during the "Finalizar Fase" process. This allows handling edge cases (e.g., a substitution player who should be in Division 1 despite low points) while the system automatically rebalances the remaining slots to maintain the target capacity (4 players/div).

## User Review Required
> [!IMPORTANT]
> **New Workflow**:
> 1. User clicks "Finalizar Fase".
> 2. Modal shows the *calculated* movements.
> 3. User can click an "Edit" or "Override" button next to a player (or select from a list).
> 4. User forces Player X to Division Y.
> 5. **System Recalculates**: The rebalancing logic runs again, respecting the forced move and adjusting other players to fill gaps or accommodate the extra player.
> 6. User confirms the final set of movements.

## Proposed Changes

### Logic Layer (`services/logic.ts`)
#### [MODIFY] `calculatePromotions`
- Update signature to accept optional `overrides`:
  ```typescript
  overrides?: { playerId: string, forceDiv: number }[]
  ```
- Modify the "Waterfall" algorithm:
  - **Step 0**: Pre-assign "Forced" players to their target divisions in `assignedPlayers` and `nextPhasePlayers`.
  - **Step 1...N**: When consuming players for Div K, *skip* players who are already forced elsewhere.
  - **Capacity Check**: If Div K has forced players, they count towards the capacity. The algorithm fills the *remaining* slots.

### UI Components

#### [MODIFY] `components/PromotionModal.tsx`
- Add UI controls to modify player destination.
  - Simple dropdown for "Target Division" next to each player?
  - Or a separate "Manual Adjustments" section?
  - **Design**: Enable a "Manual Mode" or "Edit" icon per row. When clicked, show a dropdown with `1, 2, 3...`.
- Pass `onOverride(playerId, toDiv)` callback to parent.

#### [MODIFY] `components/RankingView.tsx`
- Manage state `promotionOverrides` (array of objects).
- Handler `handleOverride` that updates state and re-runs `calculatePromotions(ranking, overrides)`.
- Pass new results to `PromotionModal`.

## Verification Plan

### Automated Tests
- Update `test_rebalance.ts` to include a scenario with Overrides.
  - Test: 2 Divs. Force Player P8 (Div 2) into Div 1.
  - Expect: Div 1 has P8 + 3 others (rebalanced). Div 2 has remaining.

### Manual Verification
1. Open Ranking.
2. Click "Finalizar Fase".
3. Verify default calculation.
4. Manually move a bottom player to Top Division.
5. Watch the preview update (someone else should drop).
6. Confirm and check new division structure.
