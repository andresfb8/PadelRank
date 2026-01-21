# Plan: Substitution & Promotion Logic Refactor (Dynamic Rebalancing)

## Goal
Ensure that the promotion/relegation logic (`calculatePromotions`) automatically maintains fixed division sizes (target: 4 players) even when substitutions occur or players retire. This prevents imbalances (e.g., 5 in Div 1, 3 in Div 2) by dynamically adjusting detailed movement rules to satisfy capacity constraints.

## User Review Required
> [!IMPORTANT]
> **Proposed Logic Change**:
> Currently, rules are fixed (e.g., "Top 2 Promote, Bottom 2 Relegate").
> The new logic will be **Capacity-Driven**:
> 1. Calculate target size for each division (Default: 4).
> 2. Determine "Must Move" players based on hard rules (e.g., Winner usually always promotes).
> 3. Fill remaining slots in Division 1 with the best available candidates from:
>    - Current Div 1 (Stayers)
>    - Incoming from Div 2 (Promoters)
> 4. Cascade this logic down to lower divisions.
>
> **Implication**: If a player retires in Div 1, an *extra* player from Div 2 might be promoted to fill the gap, effectively overriding the standard "Only top 2 promote" rule. **Please confirm if this "Lucky Loser" (or "Lucky Promoter") behavior is desired.** (Assumption: YES, to maintain structure).

## Proposed Changes

### Logic Layer (`services/logic.ts`)

#### [MODIFY] `calculatePromotions`
Refactor the function to implement a "Waterfall" filling algorithm:
1.  **Collect Metadata**: Get all active players (excluding retired) from all divisions.
2.  **Sort & Rank**: Establish a global or relative merit list.
    - *Preserve Division Hierarchy*: A Div 1 loser is generally ranked higher than a Div 2 winner? **No**, we usually respect the "Relegation Zone".
    - *Revised Strategy*:
        - Identify "Guaranteed Spots":
            - Div 1 Top N (Stay).
            - Div 2 Top N (Promote).
        - Identify "Flexible Spots" caused by retirements/substitutions.
        - Fill Div 1 to capacity (4) using:
            1. Non-relegated Div 1 players.
            2. Standard Promoters from Div 2.
            3. *Backfill*: If gaps remain (due to retirement), pull the highest-ranked non-promoted player from Div 2 (The "3rd place").
            4. *Overflow*: If too many (due to substitution adding players without removing?), force relegation of the lowest ranked in Div 1.

### Validation
- **Unit Test**: Create a script `test_rebalancing.ts` to simulate:
    - Initial State: Div 1 (4 players), Div 2 (4 players).
    - Action: Substitute Player D (Div 1) -> Effectively Player D retires, New Player N enters (where? usually bottom or inherits?).
    - Run `calculatePromotions`.
    - Assert: Div 1 has 4, Div 2 has 4.

## Verification Plan

### Automated Tests
- Run the new reproduction script to verify the fix.
- Verify clear movements log.

### Manual Verification
1.  Go to `RankingWizard` (or Management View).
2.  Setup a test ranking.
3.  Simulate a substitutions (via Firestore console or UI if available).
4.  Trigger "AdminManagement -> Cerrar Fase".
5.  Check resulting division tables for correct distinct counts.
