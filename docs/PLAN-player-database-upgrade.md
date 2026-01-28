# PLAN-player-database-upgrade.md

> **Task:** Upgrade Player Database UI/UX
> **Status:** PLANNING
> **Assignee:** Frontend & Backend Specialist

## 1. Context & Goal
The current `PlayerList` is a basic table. We want to transform it into a "Player Management Hub" that allows administrators to explore their player base, identify trends, and manage users efficiently without losing context.

**Design Philosophy:** "Data Intelligence & Fluid Navigation".
- **Views:** Toggle between Density (Table) and Visual (Grid).
- **Navigation:** Use a "Drawer" (Slide-over) for details instead of full-page navigation to keep list context.
- **Insights:** Show "Quick Segments" (Top Players, New, Inactive) to drive engagement.

## 2. Technical Architecture

### 2.1 Component Structure
- `PlayerDatabaseView.tsx`: Main container replacing `PlayerList` usage.
- `PlayerStatsHeader.tsx`: Summary cards (Total, Active, Growth).
- `PlayerFilters.tsx`: Search, view toggle, and advanced sorting/filtering.
- `PlayerTable.tsx`: The high-density "Excel-like" view with sortable columns and visual sparklines.
- `PlayerGrid.tsx`: The visual "Card" view for quick browsing.
- `PlayerDrawer.tsx`: A robust side-panel component that reuses `PlayerDetailView` logic but in a condensed, side-by-side format.

### 2.2 New Types & Utilities
- Need a `PlayerSegment` logic:
    - `Top Performers`: High winrate + min games played.
    - `New Joiners`: Created in last 30 days.
    - `Need Attention`: High loss rate or inactivity (if we track last match date).

## 3. Implementation Steps

### Phase 1: Foundation & Header
- [ ] Create `components/players/` directory.
- [ ] Implement `PlayerStatsHeader` calculating metrics from `players` prop.
- [ ] Implement `PlayerFilters` with View Toggle state (saved in localStorage ideally).

### Phase 2: The Views (Table & Grid)
- [ ] Implement `PlayerTable` with:
    - Sortable headers (Name, Matches, Winrate).
    - "Winrate" visual bar in cell.
    - "Quick Actions" menu (Edit, Delete) in row.
- [ ] Implement `PlayerGrid` reusing existing card logic but enhanced with "Badges".

### Phase 3: Fluid Navigation (The Drawer)
- [ ] Create a generic `Drawer` UI component (Right side slide-over).
- [ ] Wrap `PlayerDetailView` logic content into `PlayerDrawer`.
- [ ] Update `PlayerDatabaseView` to handle `selectedPlayer` state triggering the Drawer.

### Phase 4: Integration
- [ ] Replace `PlayerList` in `AdminLayout` / Navigation.
- [ ] Ensure Import/Export functionality is preserved and accessible.

## 4. Verification
- [ ] **Manual:** Import large dataset (Excel) and verify Table performance.
- [ ] **Manual:** Click through "Segments" (Top Players filter) and check correctness.
- [ ] **Manual:** Open Drawer, edit player, close drawer -> Ensure List updates instantly without refresh.
- [ ] **Mobile:** Verify Drawer covers full screen on mobile but Table scrolls horizontally.
