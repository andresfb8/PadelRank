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
  stats: {
    pj: number;
    pg: number;
    pp: number;
    winrate: number;
  };
  ownerId?: string;
}

export type RankingFormat = 'classic' | 'americano' | 'mexicano' | 'individual';

export interface RankingConfig {
  pointsPerWin2_0: number;
  pointsPerWin2_1: number;
  pointsDraw: number;
  pointsPerLoss2_1: number;
  pointsPerLoss2_0: number;
  promotionCount: number; // For individual ranking
  relegationCount: number; // For individual ranking
  maxPoints?: number; // For Americano/Mexicano (e.g. 32 points total)
  courts?: number; // For Americano/Mexicano scheduling
}

export interface Ranking {
  id: string;
  nombre: string;
  categoria: 'Masculino' | 'Femenino' | 'Mixto';
  fechaInicio: string;
  status: 'activo' | 'finalizado';
  divisions: Division[];
  publicUrl?: string;
  ownerId?: string;
  format?: RankingFormat; // Optional for backward compatibility (default 'classic')
  config?: RankingConfig;
}

export interface Division {
  id: string;
  numero: number;
  status: 'activa' | 'finalizada';
  players: string[]; // Player IDs
  matches: Match[];
}

export interface MatchPair {
  p1Id: string;
  p2Id: string;
}

export interface MatchScore {
  set1: { p1: number; p2: number };
  set2?: { p1: number; p2: number };
  set3?: { p1: number; p2: number };
  isIncomplete: boolean;
  finalizationType?: 'completo' | 'victoria_incompleta' | 'empate_diferencia' | 'empate_manual' | 'derrota_incompleta';
  description?: string;
}

export interface Match {
  id: string;
  jornada: number;
  pair1: MatchPair;
  pair2: MatchPair;
  score?: MatchScore;
  points: { p1: number; p2: number };
  status: 'pendiente' | 'finalizado' | 'no_disputado';
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