# Plan: Enable "Import Match" for Hybrid Tournaments

## Context
The user wants to enable the "Import Match" (Add Manual Match) functionality for **Hybrid** tournaments. This feature already exists for "Pairs" ranking. The goal is to allow manual entry of past matches, especially for leagues that have already started. The user also wants to ensure that these imported matches properly update the standings.

## Current State
- `AddManualMatchModal` component exists and handles the UI.
- `handleImportMatch` function in `RankingView.tsx` logic exists but is currently:
    1. Only exposed/used for `ranking.format === 'pairs'` (implicitly, by button visibility).
    2. Uses **hardcoded points** (3 for win, 1 for loss) instead of respecting the tournament's `ranking.config`.
- Hybrid format structure allows for "Group Stage" (which acts like mini-leagues) and "Playoffs". The import should likely target the Group Stage divisions.

## Objectives
1.  **Enable Imports for Hybrid**: Expose the "Importar Partido" button in the UI when `format` is `hybrid`.
2.  **Respect Scoring Config**: Update the `handleImportMatch` logic to calculate points dynamically based on the tournament's configuration (`pointsPerWin`, `pointsDraw`, etc.), rather than hardcoded 3/1.
3.  **Verify Updates**: Ensure that adding a match via this method updates the standings correctly.

## Proposed Changes

### 1. UI Updates (`components/RankingView.tsx`)
- Locate the "Importar Partido" button rendering logic (Action Buttons section).
- Update the condition causing it to appear. Currently likely `ranking.format === 'pairs'`, allow `ranking.format === 'hybrid'` as well.
- Ensure the button appears in the context where `divisions` are accessible (which they are globally in `RankingView`).

### 2. Logic Updates (`components/RankingView.tsx`)
- Modify `handleImportMatch`:
    - Instead of hardcoded `3` and `1` points, retrieve scoring rules from `ranking.config`.
    - Map the set results (2-0, 2-1, Draw, etc.) to the configured points (`pointsPerWin2_0`, `pointsPerWin2_1`, etc.).
    - Fallback to safe defaults (3/1) if config is missing.

### 3. Verification
- Test importing a match in a Hybrid tournament.
- Verify the points in the Standings table update correctly according to the user's configuration.

## Task Breakdown
- [ ] **Analyze**: Confirm `ranking.config` structure matches expectation. (Done)
- [ ] **Edit**: Update `handleImportMatch` in `RankingView.tsx` to use dynamic scoring.
- [ ] **Edit**: Update button visibility in `RankingView.tsx` to include `hybrid`.
- [ ] **Verify**: User to manually test.

## Agent Assignment
- **Agent**: `frontend-specialist` (since this is primarily React View logic + local helper function).
