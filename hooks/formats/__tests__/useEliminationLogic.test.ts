import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEliminationLogic } from '../useEliminationLogic';
import { RankingConfig, Match } from '../../../types';

describe('useEliminationLogic', () => {
    const mockConfig: RankingConfig = {
        eliminationConfig: {
            type: 'individual',
            consolation: true,
            thirdPlaceMatch: true
        }
    };

    const mockConfigNoConsolation: RankingConfig = {
        eliminationConfig: {
            type: 'individual',
            consolation: false,
            thirdPlaceMatch: false
        }
    };

    describe('calculateBracketSize', () => {
        it('should return next power of 2', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.calculateBracketSize(5)).toBe(8);
            expect(result.current.calculateBracketSize(8)).toBe(8);
            expect(result.current.calculateBracketSize(9)).toBe(16);
            expect(result.current.calculateBracketSize(16)).toBe(16);
            expect(result.current.calculateBracketSize(17)).toBe(32);
        });

        it('should handle edge cases', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.calculateBracketSize(1)).toBe(1);
            expect(result.current.calculateBracketSize(2)).toBe(2);
            expect(result.current.calculateBracketSize(3)).toBe(4);
        });
    });

    describe('calculateRoundCount', () => {
        it('should calculate correct number of rounds', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.calculateRoundCount(8)).toBe(3); // QF, SF, F
            expect(result.current.calculateRoundCount(16)).toBe(4); // R16, QF, SF, F
            expect(result.current.calculateRoundCount(4)).toBe(2); // SF, F
            expect(result.current.calculateRoundCount(2)).toBe(1); // F only
        });
    });

    describe('getRoundName', () => {
        it('should return correct round names', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.getRoundName(1, 4)).toBe('Final');
            expect(result.current.getRoundName(2, 4)).toBe('Semifinal');
            expect(result.current.getRoundName(3, 4)).toBe('Cuartos de Final');
            expect(result.current.getRoundName(4, 4)).toBe('Octavos de Final');
            expect(result.current.getRoundName(5, 5)).toBe('Dieciseisavos de Final');
        });

        it('should use generic naming for earlier rounds', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.getRoundName(6, 6)).toBe('Ronda de 64');
        });
    });

    describe('getMatchWinner', () => {
        it('should return p1 as winner when p1 wins 2-0', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const match: Match = {
                id: '1',
                pair1: { p1Id: 'player1', p2Id: 'player2' },
                pair2: { p1Id: 'player3', p2Id: 'player4' },
                status: 'finalizado',
                score: {
                    set1: { p1: 6, p2: 4 },
                    set2: { p1: 6, p2: 3 }
                }
            } as Match;

            expect(result.current.getMatchWinner(match)).toBe('p1');
        });

        it('should return p2 as winner when p2 wins 2-1', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const match: Match = {
                id: '1',
                pair1: { p1Id: 'player1', p2Id: 'player2' },
                pair2: { p1Id: 'player3', p2Id: 'player4' },
                status: 'finalizado',
                score: {
                    set1: { p1: 6, p2: 4 },
                    set2: { p1: 3, p2: 6 },
                    set3: { p1: 2, p2: 6 }
                }
            } as Match;

            expect(result.current.getMatchWinner(match)).toBe('p2');
        });

        it('should return null for unfinished match', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const match: Match = {
                id: '1',
                pair1: { p1Id: 'player1', p2Id: 'player2' },
                pair2: { p1Id: 'player3', p2Id: 'player4' },
                status: 'pendiente'
            } as Match;

            expect(result.current.getMatchWinner(match)).toBeNull();
        });
    });

    describe('getWinnerPair and getLoserPair', () => {
        it('should return correct winner and loser pairs', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const match: Match = {
                id: '1',
                pair1: { p1Id: 'player1', p2Id: 'player2' },
                pair2: { p1Id: 'player3', p2Id: 'player4' },
                status: 'finalizado',
                score: {
                    set1: { p1: 6, p2: 4 },
                    set2: { p1: 6, p2: 3 }
                }
            } as Match;

            const winner = result.current.getWinnerPair(match);
            const loser = result.current.getLoserPair(match);

            expect(winner?.p1Id).toBe('player1');
            expect(loser?.p1Id).toBe('player3');
        });
    });

    describe('config properties', () => {
        it('should return true for consolation when enabled', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            expect(result.current.hasConsolation).toBe(true);
            expect(result.current.hasThirdPlaceMatch).toBe(true);
        });

        it('should return false for consolation when disabled', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfigNoConsolation));

            expect(result.current.hasConsolation).toBe(false);
            expect(result.current.hasThirdPlaceMatch).toBe(false);
        });
    });

    describe('isBracketComplete', () => {
        it('should return true when all matches are finished', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: '1',
                    status: 'finalizado',
                    pair1: { p1Id: 'p1', p2Id: 'p2' },
                    pair2: { p1Id: 'p3', p2Id: 'p4' }
                } as Match,
                {
                    id: '2',
                    status: 'finalizado',
                    pair1: { p1Id: 'p5', p2Id: 'p6' },
                    pair2: { p1Id: 'p7', p2Id: 'p8' }
                } as Match
            ];

            expect(result.current.isBracketComplete(matches)).toBe(true);
        });

        it('should return false when some matches are pending', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: '1',
                    status: 'finalizado',
                    pair1: { p1Id: 'p1', p2Id: 'p2' },
                    pair2: { p1Id: 'p3', p2Id: 'p4' }
                } as Match,
                {
                    id: '2',
                    status: 'pendiente',
                    pair1: { p1Id: 'p5', p2Id: 'p6' },
                    pair2: { p1Id: 'p7', p2Id: 'p8' }
                } as Match
            ];

            expect(result.current.isBracketComplete(matches)).toBe(false);
        });
    });

    describe('getFinalStandings', () => {
        it('should return correct final standings', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: 'final',
                    roundName: 'Final',
                    status: 'finalizado',
                    pair1: { p1Id: 'winner', p2Id: 'w2' },
                    pair2: { p1Id: 'runnerup', p2Id: 'r2' },
                    score: {
                        set1: { p1: 6, p2: 4 },
                        set2: { p1: 6, p2: 3 }
                    }
                } as Match,
                {
                    id: '3rd',
                    roundName: '3er Puesto',
                    status: 'finalizado',
                    pair1: { p1Id: 'third', p2Id: 't2' },
                    pair2: { p1Id: 'fourth', p2Id: 'f2' },
                    score: {
                        set1: { p1: 6, p2: 4 },
                        set2: { p1: 6, p2: 3 }
                    }
                } as Match
            ];

            const standings = result.current.getFinalStandings(matches);

            expect(standings.first?.p1Id).toBe('winner');
            expect(standings.second?.p1Id).toBe('runnerup');
            expect(standings.third?.p1Id).toBe('third');
        });

        it('should return nulls when bracket is incomplete', () => {
            const { result } = renderHook(() => useEliminationLogic(mockConfig));

            const matches: Match[] = [
                {
                    id: 'final',
                    roundName: 'Final',
                    status: 'pendiente',
                    pair1: { p1Id: 'p1', p2Id: 'p2' },
                    pair2: { p1Id: 'p3', p2Id: 'p4' }
                } as Match
            ];

            const standings = result.current.getFinalStandings(matches);

            expect(standings.first).toBeNull();
            expect(standings.second).toBeNull();
            expect(standings.third).toBeNull();
        });
    });
});
