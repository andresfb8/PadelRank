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
  createdAt?: string; // ISO timestamp for when the user was created
  internalNotes?: string; // Private notes for SuperAdmin use
  lastLogin?: string; // ISO timestamp of the last time the user logged in
  branding?: {
    logoUrl?: string;
  };
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


export type RankingFormat = 'classic' | 'americano' | 'mexicano' | 'individual' | 'pairs' | 'elimination' | 'hybrid' | 'pozo';

export type ScoringMode = '16' | '21' | '24' | '31' | '32' | 'custom' | 'per-game';

export interface RankingConfig {
  // ===== SHARED (All Formats) =====
  /** Whether this tournament affects global player statistics */
  isOfficial?: boolean;

  /** Number of courts available for scheduling */
  courts?: number;

  /** Tournament branding configuration */
  branding?: {
    logoUrl?: string; // Base64 or URL
    hideDefaultLogo?: boolean;
  };

  // ===== FORMAT-SPECIFIC NAMESPACES =====
  /** Classic format configuration */
  classicConfig?: import('./types/configs').ClassicConfig;

  /** Individual format configuration */
  individualConfig?: import('./types/configs').IndividualConfig;

  /** Pairs format configuration */
  pairsConfig?: import('./types/configs').PairsConfig;

  /** Americano format configuration */
  americanoConfig?: import('./types/configs').AmericanoConfig;

  /** Mexicano format configuration */
  mexicanoConfig?: import('./types/configs').MexicanoConfig;

  /** Pozo format configuration */
  pozoConfig?: import('./types/configs').PozoConfig;

  /** Hybrid format configuration */
  hybridConfig?: import('./types/configs').HybridConfig;

  /** Elimination format configuration */
  eliminationConfig?: import('./types/configs').EliminationConfig;

  // ===== LEGACY FIELDS (Backward Compatibility) =====
  /** @deprecated Use classicConfig.pointsPerWin2_0 */
  pointsPerWin2_0?: number;
  /** @deprecated Use classicConfig.pointsPerWin2_1 */
  pointsPerWin2_1?: number;
  /** @deprecated Use classicConfig.pointsDraw */
  pointsDraw?: number;
  /** @deprecated Use classicConfig.pointsPerLoss2_1 */
  pointsPerLoss2_1?: number;
  /** @deprecated Use classicConfig.pointsPerLoss2_0 */
  pointsPerLoss2_0?: number;
  /** @deprecated Use classicConfig.promotionCount */
  promotionCount?: number;
  /** @deprecated Use classicConfig.relegationCount */
  relegationCount?: number;
  /** @deprecated Use classicConfig.maxPlayersPerDivision */
  maxPlayersPerDivision?: number;
  /** @deprecated Use americanoConfig.scoringMode or mexicanoConfig.scoringMode */
  scoringMode?: ScoringMode;
  /** @deprecated Use americanoConfig.totalPoints or mexicanoConfig.totalPoints */
  customPoints?: number;
}

export interface TVConfig {
  enabled: boolean;
  slideDuration: number; // Seconds
  showStandings: boolean;
  showMatches: boolean;
  showQR: boolean;
  showSponsors: boolean;
  sponsors?: { id: string; url: string; name: string }[];
  theme?: 'dark' | 'light';
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
  tvConfig?: TVConfig;
  rules?: string; // Markdown or text rules
  history?: Match[]; // Historical matches from previous phases (for global stats)
  overrides?: { playerId: string, forceDiv: number }[]; // Manual division overrides for next phase
  isOfficial?: boolean; // If false, matches do not affect global player stats (default: true for Classic, false for Quick)
  guestPlayers?: { id: string; nombre: string; apellidos?: string }[]; // Temporary players for this tournament only
  rounds?: number; // Total rounds for elimination bracket

  // Scheduler Configuration
  schedulerConfig?: import('./services/SchedulerEngine').SchedulerConfig;
  playerConstraints?: Record<string, import('./services/SchedulerEngine').PlayerAvailability>;

  // God Mode 2.0: Manual Adjustments (Extra points / Penalties)
  // Key: playerId or pairKey ("p1::p2")
  manualPointsAdjustments?: Record<string, number>; // DEPRECATED: Use manualStatsAdjustments
  manualStatsAdjustments?: Record<string, ManualStatsAdjustment>; // Key: playerId
}

export interface ManualStatsAdjustment {
  pts?: number;
  pj?: number;
  pg?: number;
  setsWon?: number;
  setsDiff?: number;
  gamesWon?: number;
  gamesDiff?: number;
}

export interface Division {
  id: string;
  numero: number;
  status: 'activa' | 'finalizada';
  players: string[]; // Player IDs
  retiredPlayers?: string[]; // IDs of players who left during the phase
  matches: Match[];
  name?: string; // Optional custom name (e.g. "Champions League")
  type?: 'main' | 'consolation' | 'league-consolation-main'; // For Elimination and Hybrid Consolation
  stage?: 'group' | 'playoff'; // To distinguish phases in Hybrid
  category?: string; // E.g. "Primera Masculina", "Segunda Femenina"
  standings?: StandingRow[];
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
  manualAdjustment?: number;
}