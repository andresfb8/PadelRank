import { RankingConfig, Player } from '../../types';

export interface FormatConfigProps {
    config: RankingConfig;
    setConfig: (config: RankingConfig) => void;
    numDivisions: number;
    setNumDivisions: (num: number) => void;
    individualMaxPlayers: number;
    setIndividualMaxPlayers: (num: number) => void;
}

export interface FormatAssignmentsProps {
    assignments: Record<number, string[]>;
    setAssignments: (assignments: Record<number, string[]>) => void;
    selectedPlayerIds: string[];
    availablePlayers: Player[];
    numDivisions: number;
    config: RankingConfig;
    individualMaxPlayers: number;
}
