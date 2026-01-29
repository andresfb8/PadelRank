# Plan: Personalized Public URLs

## Context
The user wants to personalize the public URLs for sharing tournaments. Currently, the URL structure is `https://app.racketgrid.com/?id=TOURNAMENT_ID`. The user desires a structure like `https://app.racketgrid.com/CLUB_NAME/?id=TOURNAMENT_ID`. This enhances branding and makes the links look more professional.

## Objectives
1.  **Support Club Name in URL**: Modify the routing logic to handle URLs with a path segment (the club name) before the query parameters.
2.  **Maintain Backward Compatibility**: Ensure existing links (without the club name) still work.
3.  **Update "Share" Logic**: Update the `RankingView` component to generate this new URL format when the user clicks "Share" (copy to clipboard).
4.  **Fetch Club Name**: Retrieve the club name from the tournament owner's profile (User object) to construct the URL dynamically.

## Challenges
- **Routing**: This is a Single Page Application (SPA) likely handled by `react-router` or simple condition-based rendering in `App.tsx`. Steps need to be taken to ensure the web server (Firebase Hosting / Vercel) rewrites all paths to `index.html` so the JS can handle the "club name" path segment without 404ing.
- **Data Availability**: The `Ranking` object currently has an `ownerId` but might not have the `clubName` directly embedded. We might need to:
    - Add `clubName` to the `Ranking` object for easier access.
    - OR fetch the user profile in `RankingView` to get the club name.
    - OR just allow the user to manually set/edit the "slug" for the tournament URL.
    - *Decision*: To keep it simple and automated, we will try to use the `clubName` from the logged-in user context in `RankingView` (since only admins share). But for the *Public View*, the visitor doesn't have the owner's user context.
    - *Refined Approach*: Add an optional `clubId` or `clubSlug` field to the `Ranking` document in Firestore, which is populated upon creation or migration. For now, let's see if we can derive it or just add a `publicSlug` field to the `Ranking` model.

## Proposed Strategy
1.  **Routing Update (`App.tsx`)**:
    - The current routing is very simple: check `window.location.search` for `id`.
    - Modify it to ignore the path (e.g., `/my-tennis-club/`) and still look for the `?id=` param. It effectively treating the path as cosmetic.
    - **Note**: Since `App.tsx` just looks at query params, adding a path prefix *should* work out of the box IF the hosting provider rewrites to `index.html`. Firebase Hosting typically rewrites `**` to `index.html` for SPAs.

2.  **Generating the URL (`RankingView.tsx`)**:
    - Updates `copyToClipboard` function.
    - We need the Club Name to generate the URL.
    - Since `Ranking` doesn't strictly have `clubName`, we have two options:
        A. Add `clubName` to `Ranking` interface and populate it.
        B. Pass `clubName` as a prop to `RankingView`.
    - *Selection*: Pass `clubName` (or `user.clubName`) to `RankingView`.

## Implementation Steps
1.  **Backend/Data**:
    - No strict backend change needed if we just treat the path as cosmetic.
    - Ideally, we should ensure `Ranking` objects store `clubName` for performance, but passing it from the parent component is faster for now.

2.  **Frontend Logic (`RankingView.tsx`)**:
    - Add `clubSlug` prop (optional).
    - Update `copyToClipboard` to use: `${window.location.origin}/${clubSlug}/?id=${ranking.id}`.
    - Sanitize the club name (replace spaces with hyphens, lowercase, remove special chars).

3.  **Frontend Routing (`vite.config.ts` / `firebase.json`)**:
    - Ensure rewrites are set up. `firebase.json` already usually has `source: "**", destination: "/index.html"`.

## Task Breakdown
- [ ] **Data**: Update `RankingView` props to accept `clubName`.
- [ ] **Logic**: Implement `formatSlug(name)` helper.
- [ ] **Logic**: Update `copyToClipboard` in `RankingView.tsx` to construct the new URL format.
- [ ] **Integrate**: Pass `clubName` from `AdminLayout` (where user data exists) into `RankingView`.

## Agent Assignment
- **Agent**: `frontend-specialist`

