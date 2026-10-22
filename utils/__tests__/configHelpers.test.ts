import { describe, it, expect } from 'vitest';
import { getHybridConfig } from '../configHelpers';

describe('getHybridConfig', () => {
    it('takes points from the top level, where results read them', () => {
        const hc = getHybridConfig({
            pointsPerWin2_0: 5, pointsPerWin2_1: 4, pointsDraw: 3, pointsPerLoss2_1: 2, pointsPerLoss2_0: 1,
            hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0, pointsPerWin2_0: 3, pointsPerWin2_1: 2, pointsDraw: 1, pointsPerLoss2_1: 1, pointsPerLoss2_0: 0 },
        });
        expect([hc.pointsPerWin2_0, hc.pointsPerWin2_1, hc.pointsDraw, hc.pointsPerLoss2_1, hc.pointsPerLoss2_0]).toEqual([5, 4, 3, 2, 1]);
        expect(hc.qualifiersPerGroup).toBe(2);
    });

    it('falls back to the old copy inside hybridConfig', () => {
        const hc = getHybridConfig({ hybridConfig: { pairsPerGroup: 4, qualifiersPerGroup: 2, consolationQualifiersPerGroup: 0, pointsPerWin2_0: 3, pointsPerWin2_1: 2, pointsDraw: 1, pointsPerLoss2_1: 1, pointsPerLoss2_0: 0 } });
        expect(hc.pointsPerWin2_0).toBe(3);
        expect(hc.pointsDraw).toBe(1);
    });

    it('uses defaults when there is nothing', () => {
        expect(getHybridConfig(undefined).pointsPerWin2_0).toBe(4);
    });
});
