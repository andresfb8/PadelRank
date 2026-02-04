/**
 * Config Migration Utility
 * Logic to transform legacy flat configuration to namespaced configuration
 */
import { RankingFormat, RankingConfig } from '../types';
import {
    DEFAULT_CLASSIC_CONFIG,
    DEFAULT_INDIVIDUAL_CONFIG,
    DEFAULT_PAIRS_CONFIG,
    DEFAULT_AMERICANO_CONFIG,
    DEFAULT_MEXICANO_CONFIG,
    DEFAULT_POZO_CONFIG,
    DEFAULT_HYBRID_CONFIG,
    DEFAULT_ELIMINATION_CONFIG
} from '../types/configs';

/**
 * Migrate a single ranking configuration object
 * @param oldConfig The potentially legacy configuration object
 * @param format The format of the ranking
 * @returns A new configuration object ensuring the correct namespace exists
 */
export function migrateRankingConfig(oldConfig: any, format: string): RankingConfig {
    const newConfig: RankingConfig = { ...oldConfig };

    // Function to safely extract legacy values or use defaults
    const getValue = (key: string, defaultVal: any) => oldConfig?.[key] ?? defaultVal;

    switch (format) {
        case 'classic':
            if (!newConfig.classicConfig) {
                newConfig.classicConfig = {
                    pointsPerWin2_0: getValue('pointsPerWin2_0', DEFAULT_CLASSIC_CONFIG.pointsPerWin2_0),
                    pointsPerWin2_1: getValue('pointsPerWin2_1', DEFAULT_CLASSIC_CONFIG.pointsPerWin2_1),
                    pointsDraw: getValue('pointsDraw', DEFAULT_CLASSIC_CONFIG.pointsDraw),
                    pointsPerLoss2_1: getValue('pointsPerLoss2_1', DEFAULT_CLASSIC_CONFIG.pointsPerLoss2_1),
                    pointsPerLoss2_0: getValue('pointsPerLoss2_0', DEFAULT_CLASSIC_CONFIG.pointsPerLoss2_0),
                    maxPlayersPerDivision: getValue('maxPlayersPerDivision', DEFAULT_CLASSIC_CONFIG.maxPlayersPerDivision),
                    promotionCount: getValue('promotionCount', DEFAULT_CLASSIC_CONFIG.promotionCount),
                    relegationCount: getValue('relegationCount', DEFAULT_CLASSIC_CONFIG.relegationCount)
                };
            }
            break;

        case 'individual':
            if (!newConfig.individualConfig) {
                newConfig.individualConfig = {
                    pointsPerWin2_0: getValue('pointsPerWin2_0', DEFAULT_INDIVIDUAL_CONFIG.pointsPerWin2_0),
                    pointsPerWin2_1: getValue('pointsPerWin2_1', DEFAULT_INDIVIDUAL_CONFIG.pointsPerWin2_1),
                    pointsDraw: getValue('pointsDraw', DEFAULT_INDIVIDUAL_CONFIG.pointsDraw),
                    pointsPerLoss2_1: getValue('pointsPerLoss2_1', DEFAULT_INDIVIDUAL_CONFIG.pointsPerLoss2_1),
                    pointsPerLoss2_0: getValue('pointsPerLoss2_0', DEFAULT_INDIVIDUAL_CONFIG.pointsPerLoss2_0)
                };
            }
            break;

        case 'pairs':
            if (!newConfig.pairsConfig) {
                newConfig.pairsConfig = {
                    pointsPerWin2_0: getValue('pointsPerWin2_0', DEFAULT_PAIRS_CONFIG.pointsPerWin2_0),
                    pointsPerWin2_1: getValue('pointsPerWin2_1', DEFAULT_PAIRS_CONFIG.pointsPerWin2_1),
                    pointsDraw: getValue('pointsDraw', DEFAULT_PAIRS_CONFIG.pointsDraw),
                    pointsPerLoss2_1: getValue('pointsPerLoss2_1', DEFAULT_PAIRS_CONFIG.pointsPerLoss2_1),
                    pointsPerLoss2_0: getValue('pointsPerLoss2_0', DEFAULT_PAIRS_CONFIG.pointsPerLoss2_0)
                };
            }
            break;

        case 'americano':
            if (!newConfig.americanoConfig) {
                newConfig.americanoConfig = {
                    scoringMode: getValue('scoringMode', DEFAULT_AMERICANO_CONFIG.scoringMode),
                    totalPoints: getValue('customPoints', DEFAULT_AMERICANO_CONFIG.totalPoints)
                };
            }
            break;

        case 'mexicano':
            if (!newConfig.mexicanoConfig) {
                newConfig.mexicanoConfig = {
                    scoringMode: getValue('scoringMode', DEFAULT_MEXICANO_CONFIG.scoringMode),
                    totalPoints: getValue('customPoints', DEFAULT_MEXICANO_CONFIG.totalPoints)
                };
            }
            break;

        case 'pozo':
            if (!newConfig.pozoConfig) {
                newConfig.pozoConfig = { ...DEFAULT_POZO_CONFIG };
                // Map legacy pozo fields if any exist
            }
            break;

        case 'hybrid':
            if (!newConfig.hybridConfig) {
                newConfig.hybridConfig = { ...DEFAULT_HYBRID_CONFIG };
                // Map legacy hybrid fields if any exist
            }
            break;

        case 'elimination':
            if (!newConfig.eliminationConfig) {
                newConfig.eliminationConfig = { ...DEFAULT_ELIMINATION_CONFIG };
            }
            break;
    }

    return newConfig;
}
