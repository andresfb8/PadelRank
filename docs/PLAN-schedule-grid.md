
# IMPLEMENTATION PLAN - Schedule Grid View

> Create a visual grid view for tournament schedules to easily see court allocations.

## 1. Context
- **Goal**: Provide a "bird's eye view" of the tournament schedule (Time vs Courts).
- **Current State**: Schedule info is fragmented inside match cards.
- **Target**: A button in the Bracket view that opens a grid showing all matches organized by time and court.

## 2. Components

### A. `ScheduleGridModal.tsx` (New)
- **Props**: `matches` (all matches), `courts` (count), `config` (scheduler config).
- **UI Structure**:
  - Header: Date selector (if multi-day) or simple list if small.
  - Grid: 
    - **Rows**: Time Slots (e.g., 09:00, 10:30, 12:00).
    - **Columns**: Pista 1, Pista 2, ..., Pista N.
  - **Cell Content**:
    - Match Card (Mini): "Round: Pair 1 vs Pair 2".
    - Color coding: Blue (Main), Orange (Consolation).
    - Status: Green check if finished.

### B. Update `RankingView.tsx`
- Add a button `[📅 Ver Parrilla]` next to the "Cuadro Principal" / "Cuadro Consolación" tabs.
- State to manage `isGridModalOpen`.
- Pass all matches from the division to the modal.

## 3. Implementation Steps

### Step 1: Create `ScheduleGridModal`
- Use `SchedulerEngine` logic to generate time slots.
- Render a responsive table or grid layout.
- Handle empty slots (show "Libre" or blank).
- Map matches to `{ startTime, court }` coordinates.

### Step 2: Integrate in `RankingView`
- Add the button in the header section of the elimination view.
- Ensure it works for both Admin (maybe clickable to edit? No, keep simple for now) and Public (read-only).

### Step 3: Optimization
- Handle logic for "Matches without court/time" -> Show in a "Sin Asignar" sidebar or footer? (Maybe v2).

## 4. Verification
- **Test 1**: Open tournament with scheduled matches.
- **Test 2**: Click "Ver Parrilla".
- **Test 3**: Check if matches align with their assigned court/time.
- **Test 4**: Verify public, read-only access.
