
# IMPLEMENTATION PLAN - Match Scheduling UI

> Refactor Match Cards to support distinct actions for Scheduling vs Scoring.

## 1. Context & Goal
- **Problem**: Users find it cumbersome to open the full match modal just to set a time/court. Also, the combined modal caused data saving issues.
- **Goal**: Implement a direct execution path for scheduling from the match card.
- **Approach**: Visual Split (Option C). The Match Card will have a dedicated "Schedule Chip/Area". Clicking this area opens a dedicated `ScheduleModal`. Clicking the rest opens `MatchModal` (Score).

## 2. Requirements
- **Match Card Update**:
  - Distinct clickable area for Time/Court info.
  - Visual state for "Unscheduled" vs "Scheduled".
  - Ensure click events don't conflict (stopPropagation).
- **New Component: `ScheduleModal`**:
  - Simplified version of existing fields.
  - inputs: Date/Time, Court.
  - Conflict detection logic (reuse `SchedulerEngine`).
- **Integration**:
  - `RankingView` handles the new modal state.
  - `RankingView` provides `handleUpdateSchedule` function.

## 3. Step-by-Step Implementation

### Phase 1: Create ScheduleModal
- Extract scheduling logic (Time/Court inputs + Conflict Alert) from `MatchModal` into a new `ScheduleModal.tsx`.
- Keep it clean: Only save Time/Court.

### Phase 2: Refactor MatchModal
- Remove duplicate logic if possible (or keep simplistic version).
- Ensure `MatchModal` focuses on Result/Score.

### Phase 3: Update RankingView (The Controller)
- Add state `isScheduleModalOpen` and `schedulingMatch`.
- Create handler `onSaveSchedule(matchId, {startTime, court})`.
- Call `onUpdateRanking` with merged data.

### Phase 4: Layout & Interaction (The Card)
- Modify the Match Card JSX in `RankingView` (or extract to `MatchCard.tsx` if it's too big).
- Add the clickable "Schedule Badge".
  - If scheduled: Show `Clock` icon + Time + Court.
  - If unscheduled: Show "Programar" button/link style.
- `onClick` for this badge -> opens `ScheduleModal`.

## 4. Verification
- **Test 1**: Click "Programar" -> Opens small modal -> Save -> Card updates. Status remains "Pendiente".
- **Test 2**: Click main card area -> Opens Score modal -> Save Result -> Status becomes "Finalizado".
- **Test 3**: Conflict check still works in new modal.

## 5. Agent Assignment
- **Frontend**: Implement Modals and CSS changes.
- **Logic**: Ensure `SchedulerEngine` is called correctly from new modal.
