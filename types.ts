export type Role = 'superadmin' | 'admin' | 'public';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  clubName?: string;
  status: 'active' | 'pending' | 'rejected' | 'blocked';
}

export interface Player {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  fechaNacimiento?: string;
  stats: {
    pj: number;
    pg: number;
    pp: number;
    winrate: number;
  };
  ownerId?: string;
}

export type RankingFormat = 'classic' | 'americano' | 'mexicano' | 'individual' | 'pairs';

export type ScoringMode = '16' | '21' | '24' | '31' | '32' | 'custom' | 'per-game';

export interface RankingConfig {
  // For Classic/Individual (set-based scoring)
  pointsPerWin2_0?: number;
  pointsPerWin2_1?: number;
  pointsDraw?: number;
  pointsPerLoss2_1?: number;
  pointsPerLoss2_0?: number; // Confirmed present
  promotionCount?: number; // For individual ranking
  relegationCount?: number; // For individual ranking
  maxPlayersPerDivision?: number; // For Individual

  // For Americano/Mexicano (point-based scoring)
  courts?: number; // Number of courts for scheduling
  scoringMode?: ScoringMode; // Scoring system
  customPoints?: number; // If scoringMode === 'custom'
}

export interface Ranking {
  id: string;
  nombre: string;
  categoria: 'Masculino' | 'Femenino' | 'Mixto';
  fechaInicio: string;
  status: 'activo' | 'finalizado' | 'pausado';
  divisions: Division[];
  publicUrl?: string;
  ownerId?: string;
  format?: RankingFormat; // Optional for backward compatibility (default 'classic')
  config?: RankingConfig;
  rules?: string; // Markdown or text rules
  history?: Match[]; // Historical matches from previous phases (for global stats)
  overrides?: { playerId: string, forceDiv: number }[]; // Manual division overrides for next phase
}

export interface Division {
  id: string;
  numero: number;
  status: 'activa' | 'finalizada';
  players: string[]; // Player IDs
  retiredPlayers?: string[]; // IDs of players who left during the phase
  matches: Match[];
}

export interface MatchPair {
  p1Id: string;
  p2Id: string;
}

export interface MatchScore {
  // For Classic/Individual (set-based scoring)
  set1?: { p1: number; p2: number };
  set2?: { p1: number; p2: number };
  set3?: { p1: number; p2: number };
  isIncomplete?: boolean;
  finalizationType?: 'completo' | 'victoria_incompleta' | 'empate_diferencia' | 'empate_manual' | 'derrota_incompleta';

  // For Americano/Mexicano (point-based scoring)
  pointsScored?: { p1: number; p2: number }; // Actual game points scored

  description?: string;
}

export interface Match {
  id: string;
  jornada: number;
  pair1: MatchPair;
  pair2: MatchPair;
  score?: MatchScore;
  points: { p1: number; p2: number };
  status: 'pendiente' | 'finalizado' | 'no_disputado' | 'descanso';
  court?: number;
}

export interface StandingRow {
  playerId: string;
  pos: number;
  pj: number;
  pg: number; // Partidos Ganados
  pts: number;
  setsDiff: number;
  gamesDiff: number;
  setsWon: number;
  gamesWon: number;
  trend?: 'up' | 'down' | 'same';
}