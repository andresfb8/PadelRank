import { RankingFormat, RankingConfig } from '../../types';
import { useClassicLogic } from './useClassicLogic';
import { usePointBasedLogic } from './usePointBasedLogic';
import { useHybridLogic } from './useHybridLogic';
import { useEliminationLogic } from './useEliminationLogic';

/**
 * Master hook that routes to the correct format-specific logic
 * This is the single entry point for format-specific business logic
 * 
 * @example
 * const logic = useFormatLogic(ranking.format, ranking.config);
 * const points = logic.calculateMatchPoints(match.score);
 */
export function useFormatLogic(format: RankingFormat, config: RankingConfig | undefined) {
    const classicLogic = useClassicLogic(config);
    const americanoLogic = usePointBasedLogic(config, 'americano');
    const mexicanoLogic = usePointBasedLogic(config, 'mexicano');
    const hybridLogic = useHybridLogic(config);
    const eliminationLogic = useEliminationLogic(config);

    switch (format) {
        case 'classic':
        case 'individual':
        case 'pairs':
            return classicLogic;

        case 'americano':
            return americanoLogic;

        case 'mexicano':
            return mexicanoLogic;

        case 'hybrid':
            return hybridLogic;

        case 'elimination':
            return eliminationLogic;

        case 'pozo':
            // Pozo uses point-based logic similar to Americano
            return americanoLogic;

        default:
            return classicLogic;
    }
}

/**
 * Type guard to check if format uses set-based scoring
 */
export function isSetBasedFormat(format: RankingFormat): boolean {
    return ['classic', 'individual', 'pairs', 'hybrid', 'elimination'].includes(format);
}

/**
 * Type guard to check if format uses point-based scoring
 */
export function isPointBasedFormat(format: RankingFormat): boolean {
    return ['americano', 'mexicano', 'pozo'].includes(format);
}
