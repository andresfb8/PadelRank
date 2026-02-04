/**
 * Format Logic Hooks Usage Examples
 * Shows how to use the format-specific logic hooks in your components
 */

import React from 'react';
import { useFormatLogic } from '../hooks/formats';
import { Ranking, Match } from '../types';

/**
 * Example 1: Using the master hook (Recommended)
 * Automatically routes to the correct format logic
 */
export function MatchResultExample({ ranking, match }: { ranking: Ranking; match: Match }) {
    const logic = useFormatLogic(ranking.format, ranking.config);

    const handleSaveScore = (score: any) => {
        // Calculate match points using format-specific logic
        const matchPoints = logic.calculateMatchPoints(score);

        console.log('Match points:', matchPoints);
        // Save to database...
    };

    return (
        <div>
            <h3>Register Match Result</h3>
            {/* Your score input component */}
        </div>
    );
}

/**
 * Example 2: Classic Format Specific
 * Direct use of Classic logic hook
 */
export function ClassicStandingsExample({ ranking }: { ranking: Ranking }) {
    const { calculateSetsDiff, config } = useFormatLogic('classic', ranking.config);

    const calculatePlayerStats = (playerId: string) => {
        const matches = ranking.divisions?.[0]?.matches || [];
        const stats = calculateSetsDiff(matches, playerId);

        return {
            setsDiff: stats.setsDiff,
            gamesDiff: stats.gamesDiff,
            setsWon: stats.setsWon,
            gamesWon: stats.gamesWon
        };
    };

    return (
        <div>
            <h3>Classic Standings</h3>
            <p>Points per win 2-0: {config.pointsPerWin2_0}</p>
            {/* Render standings... */}
        </div>
    );
}

/**
 * Example 3: Americano Format Specific
 * Point-based scoring logic
 */
export function AmericanoScoreInputExample({ ranking }: { ranking: Ranking }) {
    const { getTotalPoints, autoCalculatePoints, isValidScore } = useFormatLogic('americano', ranking.config);

    const [p1Points, setP1Points] = React.useState(0);
    const totalPoints = getTotalPoints();
    const p2Points = autoCalculatePoints(p1Points);

    const score = {
        pointsScored: { p1: p1Points, p2: p2Points }
    };

    const isValid = isValidScore(score);

    return (
        <div>
            <h3>Americano Score Input</h3>
            <p>Total points: {totalPoints}</p>
            <input
                type="number"
                value={p1Points}
                onChange={(e) => setP1Points(parseInt(e.target.value) || 0)}
                max={totalPoints}
            />
            <p>Pair 2 points (auto): {p2Points}</p>
            <p>Valid: {isValid ? 'Yes' : 'No'}</p>
        </div>
    );
}

/**
 * Example 4: Hybrid Format Specific
 * Group stage + playoff logic
 */
export function HybridPlayoffExample({ ranking }: { ranking: Ranking }) {
    const { getMainPlayoffQualifiers, getConsolationQualifiers, isGroupStage } = useFormatLogic('hybrid', ranking.config);

    const generatePlayoffs = () => {
        const groupDivisions = ranking.divisions?.filter(d => isGroupStage(d.nombre)) || [];

        const mainQualifiers = getMainPlayoffQualifiers(groupDivisions);
        const consolationQualifiers = getConsolationQualifiers(groupDivisions);

        console.log('Main playoff qualifiers:', mainQualifiers);
        console.log('Consolation qualifiers:', consolationQualifiers);

        // Generate playoff brackets...
    };

    return (
        <div>
            <h3>Hybrid Playoff Generation</h3>
            <button onClick={generatePlayoffs}>
                Generate Playoffs
            </button>
        </div>
    );
}

/**
 * Example 5: Conditional Logic Based on Format
 * Using type guards
 */
export function UniversalMatchModalExample({ ranking, match }: { ranking: Ranking; match: Match }) {
    const logic = useFormatLogic(ranking.format, ranking.config);

    // Type guard to determine which input to show
    const isSetBased = ['classic', 'individual', 'pairs', 'hybrid', 'elimination'].includes(ranking.format);

    return (
        <div>
            <h3>Match Result</h3>
            {isSetBased ? (
                <div>
                    {/* Set-based input (Set 1, Set 2, Set 3) */}
                    <p>Enter sets...</p>
                </div>
            ) : (
                <div>
                    {/* Point-based input (Points scored) */}
                    <p>Enter points...</p>
                </div>
            )}
        </div>
    );
}

/**
 * Example 6: Migration from Old Code
 */

// BEFORE (Coupled):
function OldWay({ ranking, match }: { ranking: Ranking; match: Match }) {
    const calculatePoints = (score: any) => {
        if (ranking.format === 'classic') {
            // Classic logic here...
            const p1Sets = 0; // count sets...
            if (p1Sets === 2) {
                return { p1: ranking.config?.pointsPerWin2_0 || 4, p2: 0 };
            }
        } else if (ranking.format === 'americano') {
            // Americano logic here...
        }
        // ... more conditionals
    };

    return <div>Old way</div>;
}

// AFTER (Decoupled):
function NewWay({ ranking, match }: { ranking: Ranking; match: Match }) {
    const logic = useFormatLogic(ranking.format, ranking.config);

    const calculatePoints = (score: any) => {
        return logic.calculateMatchPoints(score);
    };

    return <div>New way</div>;
}
