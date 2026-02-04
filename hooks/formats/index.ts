/**
 * Format-Specific Logic Hooks
 * 
 * These hooks isolate business logic for each tournament format.
 * Use the master `useFormatLogic` hook to automatically route to the correct format.
 */

export { useClassicLogic } from './useClassicLogic';
export { usePointBasedLogic } from './usePointBasedLogic';
export { useHybridLogic } from './useHybridLogic';
export { useEliminationLogic } from './useEliminationLogic';
export { useFormatLogic, isSetBasedFormat, isPointBasedFormat } from './useFormatLogic';
