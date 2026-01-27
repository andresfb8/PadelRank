# Hybrid Tournament Navigation Fix

## Goal
Enable navigation between Group Stage and Playoff brackets in "Hybrid" tournaments after playoffs have started.

## Tasks
- [x] 1. Add `viewMode` state to `RankingView.tsx` (defaulting to 'playoff' if phase is playoff, else 'groups') → Verify: React DevTools shows state.
- [x] 2. Implement "Phase Switcher" UI in the Header (Standard vs Playoff) → Verify: Buttons appear when in Hybrid + Playoff mode.
- [x] 3. Refactor `RankingView` render logic to conditionally show `<BracketView>` OR Standard Division View based on `viewMode` → Verify: Clicking switcher toggles the view.
- [x] 4. Ensure `activeDivisionId` falls back gracefully when switching to "Groups" view → Verify: Groups are visible and selectable.

## Done When
- [x] User can view Group Stage results even after Playoff has started.
- [x] User can return to Playoff bracket easily.
- [ ] No regression in other tournament formats.
