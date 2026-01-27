# Debug: Hybrid Bracket Rendering Mix-up

## Issue
User sees "Group Stage Results" and "People already in Final" in the Playoff Bracket view.
This happens because `RankingView` passes ALL divisions (including Group ones) to `BracketView`.
`BracketView` aggregates all matches by `jornada`. Group matches (League) and Playoff matches (Elimination) clash, causing irrelevant matches to appear in the bracket tree.

## Tasks
- [ ] 1. Modify `RankingView.tsx` to filter divisions passed to `<BracketView />`.
  - Filter logic: Include only divisions where `stage === 'playoff'` OR `type === 'main'` OR `type === 'consolation'`.
  - Exclude `stage === 'group'` or undefined type (standard divisions).

## Verification
- [ ] Check "Playoff Final" tab. It should ONLY show the Elimination Bracket matches.
- [ ] Check "Fase de Grupos" tab. It should show Group Standings/Matches.
- [ ] Verify no "Ghost" finals appear.

## Fix Code
```typescript
// RankingView.tsx
<BracketView
    divisions={ranking.divisions.filter(d => d.stage === 'playoff' || d.type === 'main' || d.type === 'consolation')}
    // ...
/>
```
