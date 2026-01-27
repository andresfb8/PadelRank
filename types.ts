export type Role = 'superadmin' | 'admin' | 'public';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  clubName?: string;
  status: 'active' | 'pending' | 'rejected' | 'blocked';
  // SaaS Subscription fields
  plan?: 'basic' | 'pro' | 'star' | 'weekend' | 'trial';
  planExpiry?: number; // timestamp for Weekend Warrior plan
  stripeCustomerId?: string; // For future Stripe integration
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


export type RankingFormat = 'classic' | 'americano' | 'mexicano' | 'individual' | 'pairs' | 'elimination' | 'hybrid';

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

  // For Elimination
  eliminationConfig?: {
    consolation: boolean;
    thirdPlaceMatch: boolean;
    type: 'individual' | 'pairs';
  };

  // For Hybrid
  hybridConfig?: {
    qualifiersPerGroup: number; // Top N players from each group advance
    pairsPerGroup?: number; // Number of pairs per group
  };
}

export interface Ranking {
  id: string;
  nombre: string;
  categoria: 'Masculino' | 'Femenino' | 'Mixto';
  fechaInicio: string;
  status: 'activo' | 'finalizado' | 'pausado';
  phase?: 'league' | 'playoff'; // NEW: Track current phase for hybrid tournaments
  divisions: Division[];
  publicUrl?: string;
  ownerId?: string;
  format?: RankingFormat; // Optional for backward compatibility (default 'classic')
  config?: RankingConfig;
  rules?: string; // Markdown or text rules
  history?: Match[]; // Historical matches from previous phases (for global stats)
  overrides?: { playerId: string, forceDiv: number }[]; // Manual division overrides for next phase
  isOfficial?: boolean; // If false, matches do not affect global player stats (default: true for Classic, false for Quick)
  guestPlayers?: { id: string; nombre: string; apellidos?: string }[]; // Temporary players for this tournament only
  rounds?: number; // Total rounds for elimination bracket

  // Scheduler Configuration
  schedulerConfig?: import('./services/SchedulerEngine').SchedulerConfig;
  playerConstraints?: Record<string, import('./services/SchedulerEngine').PlayerAvailability>;
}

export interface Division {
  id: string;
  numero: number;
  status: 'activa' | 'finalizada';
  players: string[]; // Player IDs
  retiredPlayers?: string[]; // IDs of players who left during the phase
  matches: Match[];
  name?: string; // Optional custom name (e.g. "Champions League")
  type?: 'main' | 'consolation'; // For Elimination
  stage?: 'group' | 'playoff'; // To distinguish phases in Hybrid
  category?: string; // E.g. "Primera Masculina", "Segunda Femenina"
}

export interface MatchPair {
  p1Id: string;
  p2Id: string;
  placeholder?: string; // E.g., "Winner of Match 1"
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
  jornada: number; // In elimination: Round Number (1 = Final, 2 = Semis, etc. OR 1=R32...)
  pair1: MatchPair;
  pair2: MatchPair;
  score?: MatchScore;
  points: { p1: number; p2: number };
  status: 'pendiente' | 'finalizado' | 'no_disputado' | 'descanso';
  court?: number;
  startTime?: string; // ISO string for scheduling

  // Elimination Pointers
  nextMatchId?: string; // ID of the match where the winner goes
  consolationMatchId?: string; // ID of the match where the loser goes (if R1)
  roundName?: string; // "Final", "Semi-Final", "Quarter-Final"
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