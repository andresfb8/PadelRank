# PLAN-landing-responsive.md

> **Task:** Landing Page Full-Width & Mobile Responsiveness
> **Status:** PROPOSED
> **Date:** 2026-01-28

## 1. Objective
Refactor the landing page (`landing/src/App.tsx`) to:
1.  **Full Width on Desktop:** Remove the 1280px (`max-w-7xl`) constraint to use the full screen width (100%), creating a more immersive experience.
2.  **Mobile Adaptation:** Ensure all elements (especially tables, grids, and mockups) stack and scale correctly on mobile devices without horizontal scrolling or breakage.

## 2. Implementation Strategy

### A. Layout Container Refactor (Desktop)
*   **Target:** `landing/src/App.tsx`
*   **Action:** Change container classes.
    *   Current: `max-w-7xl mx-auto px-6`
    *   New: `w-full px-6 md:px-12 lg:px-24` (Fluid width with responsive padding).
*   **Affected Sections:**
    *   Navbar
    *   Hero Section
    *   Features Grid
    *   Pricing Section
    *   Footer

### B. Mobile Optimization (Responsive Tweaks)
*   **Mockups:** Verify `RankingTableMockup`, `ScheduleGridMockup`, `PlayerDatabaseMockup` occupy 100% width on mobile or have internal scroll if content is too wide.
*   **Typography:** Adjust `h1` and `h2` sizes on mobile to prevent wrapping issues.
*   **Spacing:** Reduce `py-24` to `py-16` on mobile for tighter vertical rhythm.

### C. Specific Component Fixes
1.  **Hero:** Ensure the split layout (Text + Buttons) stacks vertically on mobile.
2.  **Pricing Cards:** Ensure they stack (grid-cols-1) on mobile and verify the "Recommended" badge doesn't get cut off.
3.  **Roadmap:** Check grid-cols-1 on mobile.

## 3. Verification Plan
*   [ ] **Desktop View:** Verify content expands to edges on large screens.
*   [ ] **Mobile View:** Open DevTools (iPhone SE/XR dimensions) and check for horizontal overflow.
*   [ ] **Navigation:** Ensure the mobile menu overlay covers the full width.

---

## 4. Next Steps
Run `/create` (or confirm "Adelante") to apply these changes to `landing/src/App.tsx`.
