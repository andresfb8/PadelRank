/**
 * Configuration Helpers
 * Utilities to safely access format-specific configs with fallbacks
 */

import { RankingConfig, RankingFormat } from '../types';
import {
    ClassicConfig,
    IndividualConfig,
    PairsConfig,
    AmericanoConfig,
    MexicanoConfig,
    PozoConfig,
    HybridConfig,
    EliminationConfig,
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
 * Get Classic format configuration with fallbacks
 */
export function getClassicConfig(config: RankingConfig | undefined): ClassicConfig {
    // Try new structure first
    if (config?.classicConfig) {
        return config.classicConfig;
    }

    // Fallback to legacy fields
    if (config) {
        return {
            pointsPerWin2_0: config.pointsPerWin2_0 ?? DEFAULT_CLASSIC_CONFIG.pointsPerWin2_0,
            pointsPerWin2_1: config.pointsPerWin2_1 ?? DEFAULT_CLASSIC_CONFIG.pointsPerWin2_1,
            pointsDraw: config.pointsDraw ?? DEFAULT_CLASSIC_CONFIG.pointsDraw,
            pointsPerLoss2_1: config.pointsPerLoss2_1 ?? DEFAULT_CLASSIC_CONFIG.pointsPerLoss2_1,
            pointsPerLoss2_0: config.pointsPerLoss2_0 ?? DEFAULT_CLASSIC_CONFIG.pointsPerLoss2_0,
            maxPlayersPerDivision: config.maxPlayersPerDivision ?? DEFAULT_CLASSIC_CONFIG.maxPlayersPerDivision,
            promotionCount: config.promotionCount ?? DEFAULT_CLASSIC_CONFIG.promotionCount,
            relegationCount: config.relegationCount ?? DEFAULT_CLASSIC_CONFIG.relegationCount
        };
    }

    return DEFAULT_CLASSIC_CONFIG;
}

/**
 * Get Individual format configuration with fallbacks
 */
export function getIndividualConfig(config: RankingConfig | undefined): IndividualConfig {
    if (config?.individualConfig) {
        return config.individualConfig;
    }

    if (config) {
        return {
            pointsPerWin2_0: config.pointsPerWin2_0 ?? DEFAULT_INDIVIDUAL_CONFIG.pointsPerWin2_0,
            pointsPerWin2_1: config.pointsPerWin2_1 ?? DEFAULT_INDIVIDUAL_CONFIG.pointsPerWin2_1,
            pointsDraw: config.pointsDraw ?? DEFAULT_INDIVIDUAL_CONFIG.pointsDraw,
            pointsPerLoss2_1: config.pointsPerLoss2_1 ?? DEFAULT_INDIVIDUAL_CONFIG.pointsPerLoss2_1,
            pointsPerLoss2_0: config.pointsPerLoss2_0 ?? DEFAULT_INDIVIDUAL_CONFIG.pointsPerLoss2_0
        };
    }

    return DEFAULT_INDIVIDUAL_CONFIG;
}

/**
 * Get Pairs format configuration with fallbacks
 */
export function getPairsConfig(config: RankingConfig | undefined): PairsConfig {
    if (config?.pairsConfig) {
        return config.pairsConfig;
    }

    if (config) {
        return {
            pointsPerWin2_0: config.pointsPerWin2_0 ?? DEFAULT_PAIRS_CONFIG.pointsPerWin2_0,
            pointsPerWin2_1: config.pointsPerWin2_1 ?? DEFAULT_PAIRS_CONFIG.pointsPerWin2_1,
            pointsDraw: config.pointsDraw ?? DEFAULT_PAIRS_CONFIG.pointsDraw,
            pointsPerLoss2_1: config.pointsPerLoss2_1 ?? DEFAULT_PAIRS_CONFIG.pointsPerLoss2_1,
            pointsPerLoss2_0: config.pointsPerLoss2_0 ?? DEFAULT_PAIRS_CONFIG.pointsPerLoss2_0
        };
    }

    return DEFAULT_PAIRS_CONFIG;
}

/**
 * Get Americano format configuration with fallbacks
 */
export function getAmericanoConfig(config: RankingConfig | undefined): AmericanoConfig {
    if (config?.americanoConfig) {
        return config.americanoConfig;
    }

    if (config) {
        return {
            scoringMode: (config.scoringMode as any) ?? DEFAULT_AMERICANO_CONFIG.scoringMode,
            totalPoints: config.customPoints
        };
    }

    return DEFAULT_AMERICANO_CONFIG;
}

/**
 * Get Mexicano format configuration with fallbacks
 */
export function getMexicanoConfig(config: RankingConfig | undefined): MexicanoConfig {
    if (config?.mexicanoConfig) {
        return config.mexicanoConfig;
    }

    if (config) {
        return {
            scoringMode: (config.scoringMode as any) ?? DEFAULT_MEXICANO_CONFIG.scoringMode,
            totalPoints: config.customPoints
        };
    }

    return DEFAULT_MEXICANO_CONFIG;
}

/**
 * Get Pozo format configuration with fallbacks
 */
export function getPozoConfig(config: RankingConfig | undefined): PozoConfig {
    if (config?.pozoConfig) {
        return config.pozoConfig;
    }

    return DEFAULT_POZO_CONFIG;
}

/**
 * Get Hybrid format configuration with fallbacks
 */
export function getHybridConfig(config: RankingConfig | undefined): HybridConfig {
    if (config?.hybridConfig) {
        return config.hybridConfig;
    }

    return DEFAULT_HYBRID_CONFIG;
}

/**
 * Get Elimination format configuration with fallbacks
 */
export function getEliminationConfig(config: RankingConfig | undefined): EliminationConfig {
    if (config?.eliminationConfig) {
        return config.eliminationConfig;
    }

    return DEFAULT_ELIMINATION_CONFIG;
}

/**
 * Generic helper to get any format config
 */
export function getFormatConfigByType(
    config: RankingConfig | undefined,
    format: RankingFormat
): any {
    switch (format) {
        case 'classic':
            return getClassicConfig(config);
        case 'individual':
            return getIndividualConfig(config);
        case 'pairs':
            return getPairsConfig(config);
        case 'americano':
            return getAmericanoConfig(config);
        case 'mexicano':
            return getMexicanoConfig(config);
        case 'pozo':
            return getPozoConfig(config);
        case 'hybrid':
            return getHybridConfig(config);
        case 'elimination':
            return getEliminationConfig(config);
        default:
            return null;
    }
}
