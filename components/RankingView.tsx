import React, { useState, useEffect } from 'react';
import { Share2, Clock, Calendar, ChevronDown, ChevronUp, Trophy, Medal, AlertCircle, Edit2, Play, PauseCircle, CheckCircle, Save, X, Plus, Trash2, StopCircle, ArrowLeft, RefreshCw, Filter, Users, Shuffle, Flag, Settings, BookOpen, Monitor, ArrowUpDown, ArrowUp, ArrowDown, Check, BarChart, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Modal } from './ui/Components';
import { ActionToolbar, ToolbarAction } from './ui/ActionToolbar';

import { generateStandings, generateGlobalStandings, calculatePromotions, getQualifiedPlayers } from '../services/logic';
import { Match, Player, Ranking, Division } from '../types';
import { MatchGenerator } from '../services/matchGenerator';
import { AddDivisionModal } from './AddDivisionModal';
import { PromotionModal } from './PromotionModal';
import { SubstituteModal } from './SubstituteModal';
import { AddManualMatchModal } from './AddManualMatchModal';
import { AddPairModal } from './AddPairModal';
import { MatchModal } from './MatchModal';
import { BracketView } from './BracketView';
import { TournamentEngine } from '../services/TournamentEngine';
import { SchedulerEngine } from '../services/SchedulerEngine';
import { SchedulerConfigModal } from './SchedulerConfigModal';
import { ScheduleModal } from './ScheduleModal';
import { ScheduleGridModal } from './ScheduleGridModal';
import { RankingSettingsModal } from './RankingSettingsModal';
import { StatsAdjustmentModal } from './StatsAdjustmentModal';

interface Props {
  ranking: Ranking;
  players: Record<string, Player>;
  onMatchClick?: (m: Match) => void;
  onBack?: () => void;
  onAddDivision?: (division: Division | Division[]) => void;
  onUpdateRanking?: (ranking: Ranking) => void;
  isAdmin?: boolean;
  onUpdatePlayerStats?: (playerId: string, result: 'win' | 'loss' | 'draw') => void;
  onPlayerClick?: (playerId: string) => void;
  clubSlug?: string;
}

export const RankingView = ({ ranking, players: initialPlayers, onMatchClick, onBack, onAddDivision, onUpdateRanking, isAdmin, onUpdatePlayerStats, onPlayerClick, clubSlug }: Props) => {
  const players = React.useMemo(() => {
    const merged = { ...initialPlayers };
    if (ranking.guestPlayers) {
      ranking.guestPlayers.forEach(g => {
        if (!merged[g.id]) {
          // Minimal Player object for Guest
          merged[g.id] = {
            id: g.id,
            nombre: g.nombre,
            apellidos: g.apellidos || '',
            email: '',
            telefono: '',
            stats: { pj: 0, pg: 0, pp: 0, winrate: 0 }
          } as Player;
        }
      });
    }
    return merged;
  }, [initialPlayers, ranking.guestPlayers]);

  // Disable player click for Americano and Mexicano formats
  const isPlayerClickEnabled = ranking.format !== 'americano' && ranking.format !== 'mexicano';

  const [activeDivisionId, setActiveDivisionId] = useState<string>(ranking.divisions[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'global' | 'rules'>('standings');
  const [bracketType, setBracketType] = useState<'main' | 'consolation'>('main');
  const [copied, setCopied] = useState(false);
  const [isAddDivModalOpen, setIsAddDivModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [promotionData, setPromotionData] = useState<{ newDivisions: Division[], movements: any[] } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null); // New State for Option C
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [viewMode, setViewMode] = useState<'groups' | 'playoff'>(
    ranking.format === 'hybrid' && ranking.phase === 'playoff' ? 'playoff' : 'groups'
  );
  const [isGodMode, setIsGodMode] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Stats Editing State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState<string>('');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'; // Default to descending for stats (higher is better)
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'desc') direction = 'asc';
      else {
        setSortConfig(null); // Reset on third click
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
  };

  // Helper function to get players resting in a specific round (Americano/Mexicano)
  const getRestingPlayers = (divisionPlayers: string[], matches: Match[], roundNumber: number): string[] => {
    // Get all players in matches for this round
    const playingPlayers = new Set<string>();

    matches
      .filter(m => m.jornada === roundNumber && m.status !== 'descanso')
      .forEach(m => {
        playingPlayers.add(m.pair1.p1Id);
        playingPlayers.add(m.pair1.p2Id);
        playingPlayers.add(m.pair2.p1Id);
        playingPlayers.add(m.pair2.p2Id);
      });

    // Return players NOT in matches
    return divisionPlayers.filter(p => !playingPlayers.has(p));
  };

  const handleSaveSchedule = (matchId: string, schedule: { startTime?: string, court?: number }) => {
    if (!onUpdateRanking) return;

    // Find the division containing the match
    let targetDivIndex = -1;
    let matchIndex = -1;

    ranking.divisions.forEach((d, idx) => {
      const mIdx = d.matches.findIndex(m => m.id === matchId);
      if (mIdx !== -1) {
        targetDivIndex = idx;
        matchIndex = mIdx;
      }
    });

    if (targetDivIndex === -1 || matchIndex === -1) {
      console.error("Match not found for scheduling:", matchId);
      return;
    }

    const targetDivision = ranking.divisions[targetDivIndex];
    const oldMatch = targetDivision.matches[matchIndex];
    const updatedMatch = { ...oldMatch, ...schedule };

    const updatedMatches = [...targetDivision.matches];
    updatedMatches[matchIndex] = updatedMatch;

    const updatedDivision = { ...targetDivision, matches: updatedMatches };

    // Update the ranking with the modified division
    const newDivisions = [...ranking.divisions];
    newDivisions[targetDivIndex] = updatedDivision;

    let updatedRanking = {
      ...ranking,
      divisions: newDivisions
    };

    // Check conflicts hook or other side-effects?
    // Not needed for simple schedule update unless we want to propagate.

    onUpdateRanking(updatedRanking);
  };
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteData, setSubstituteData] = useState({ oldPlayerId: '', newPlayerId: '', nextPhaseDiv: '' });
  const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState(false);
  const [isAddPairModalOpen, setIsAddPairModalOpen] = useState(false);
  const [promotionOverrides, setPromotionOverrides] = useState<{ playerId: string, forceDiv: number }[]>([]);
  const [isSchedulerConfigModalOpen, setIsSchedulerConfigModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleMatchClick = (m: Match) => {
    setSelectedMatch(m);
    if (onMatchClick) onMatchClick(m);
  };

  const handleUpdateMatch = (matchId: string, data: any) => {
    // Find the match in the active division and update it
    if (!activeDivision || !onUpdateRanking) return;

    const matchIndex = activeDivision.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;

    // Merge existing match with new data
    // If score is present, status becomes finalizado (unless explicitly set otherwise?)
    // Let's rely on data 'status' if present, else infer
    const oldMatch = activeDivision.matches[matchIndex];

    console.log("handleUpdateMatch called", { matchId, data });

    // Determine valid score update
    // MatchModal returns flat data: { set1: ..., points: ..., finalizationType: ... }
    // Or just schedule data: { startTime: ... }
    const hasScoreUpdate = data.set1 || data.points; // Check for actual result data presence

    const updatedMatch: any = {
      ...oldMatch,
      ...data, // This puts startTime, court, etc at root
    };

    if (hasScoreUpdate) {
      updatedMatch.status = 'finalizado';
      updatedMatch.score = {
        set1: data.set1,
        set2: data.set2,
        set3: data.set3,
        pointsScored: data.pointsScored,
        isIncomplete: data.isIncomplete,
        finalizationType: data.finalizationType,
        description: data.description
      };

      // Ensure root points are set for standings/advancement
      if (data.points) updatedMatch.points = data.points;
    }

    console.log("Updated Match Object prepared:", updatedMatch);

    const updatedMatches = [...activeDivision.matches];
    updatedMatches[matchIndex] = updatedMatch;

    const updatedDivision = { ...activeDivision, matches: updatedMatches };
    let updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === activeDivisionId ? updatedDivision : d)
    };

    // ELIMINATION LOGIC
    if (ranking.format === 'elimination' && updatedMatch.status === 'finalizado') {
      try {
        console.log("Processing Elimination Logic...");
        const p1WonVal = updatedMatch.points.p1 > updatedMatch.points.p2;
        const winnerId = p1WonVal ? updatedMatch.pair1 : updatedMatch.pair2;
        const loserId = p1WonVal ? updatedMatch.pair2 : updatedMatch.pair1;

        console.log("Winner Determined:", winnerId);

        let newDivisions = TournamentEngine.advanceWinner(updatedMatch, updatedRanking, { p1: winnerId.p1Id, p2: winnerId.p2Id });
        console.log("advanceWinner result:", newDivisions);

        // Handle Consolation for First-Match Losers (including those who had BYE in R1)
        if (ranking.config?.eliminationConfig?.consolation) {
          // Check if this is the loser's first REAL match (not BYE)
          const isFirstRealMatch = (pairId: { p1Id: string, p2Id: string }) => {
            // Find all matches in main bracket where this pair played
            const mainDiv = newDivisions.find(d => d.type === 'main');
            if (!mainDiv) return false;

            const pairMatches = mainDiv.matches.filter(m =>
              m.status === 'finalizado' &&
              ((m.pair1.p1Id === pairId.p1Id && m.pair1.p2Id === pairId.p2Id) ||
                (m.pair2.p1Id === pairId.p1Id && m.pair2.p2Id === pairId.p2Id))
            );

            // Filter out BYE matches
            const realMatches = pairMatches.filter(m =>
              m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE'
            );

            // If this is their only real match, they should go to consolation
            return realMatches.length === 1;
          };

          if (isFirstRealMatch({ p1Id: loserId.p1Id, p2Id: loserId.p2Id })) {
            console.log("🎯 Loser's first real match-moving to consolation");
            const updatedRankingWithWinner = { ...updatedRanking, divisions: newDivisions };
            newDivisions = TournamentEngine.moveLoserToConsolation(updatedMatch, updatedRankingWithWinner, { p1: loserId.p1Id, p2: loserId.p2Id });
            console.log("consolation result:", newDivisions);
          } else {
            console.log("⏭️ Not first real match-loser eliminated");
          }
        }

        // Reactive Scheduler Hook
        if (ranking.schedulerConfig && ranking.format === 'elimination') {
          const tempRanking = { ...updatedRanking, divisions: newDivisions };
          newDivisions = SchedulerEngine.scheduleNextMatches(updatedMatch, tempRanking, activeDivision.id);
        }

        updatedRanking.divisions = newDivisions;
      } catch (error) {
        console.error("Error in Elimination Logic:", error);
        alert("Error al procesar avance de ronda: " + error);
      }
    }

    console.log("Saving Ranking...", updatedRanking);
    onUpdateRanking(updatedRanking);

    // GLOBAL STATS UPDATE (Fire and Forget)
    // ONLY for Classic (Ranking) and Individual formats. Exclude Americano/Mexicano.
    const isRankedFormat = ranking.format === 'classic' || ranking.format === 'individual';

    // Only update stats if the match was NOT already finished (prevents double counting on edits)
    // Note: If a user edits a result (e.g. changes winner), stats won't auto-correct with this simple check.
    // They would need manual adjustment or a full recalculation feature.
    const previousStatus = activeDivision.matches[matchIndex].status;
    const isFirstTimeFinalizing = updatedMatch.status === 'finalizado' && previousStatus !== 'finalizado';

    if (isFirstTimeFinalizing && onUpdatePlayerStats && activeDivision && isRankedFormat && ranking.isOfficial !== false) {
      // Determine winner
      // P1 vs P2
      // For simplicity in Classic/Individual (Set based)
      let p1Won = false;
      let p2Won = false; // Pair 2 won

      if (ranking.format === 'mexicano' || ranking.format === 'americano') {
        // Points based
        if (updatedMatch.points.p1 > updatedMatch.points.p2) p1Won = true;
        else if (updatedMatch.points.p2 > updatedMatch.points.p1) p2Won = true;
      } else {
        // Set based
        if (updatedMatch.points.p1 > updatedMatch.points.p2) p1Won = true;
        else if (updatedMatch.points.p2 > updatedMatch.points.p1) p2Won = true;
      }

      const p1Ids = [updatedMatch.pair1.p1Id, updatedMatch.pair1.p2Id];
      const p2Ids = [updatedMatch.pair2.p1Id, updatedMatch.pair2.p2Id];

      // Update P1 Pair
      p1Ids.forEach(pid => {
        if (!pid) return;
        if (p1Won) onUpdatePlayerStats(pid, 'win');
        else if (p2Won) onUpdatePlayerStats(pid, 'loss');
        else onUpdatePlayerStats(pid, 'draw');
      });

      // Update P2 Pair
      p2Ids.forEach(pid => {
        if (!pid) return;
        if (p2Won) onUpdatePlayerStats(pid, 'win');
        else if (p1Won) onUpdatePlayerStats(pid, 'loss');
        else onUpdatePlayerStats(pid, 'draw');
      });
    }
  };

  // Auto-select first division if activeDivisionId is invalid
  useEffect(() => {
    if (!ranking.divisions.find(d => d.id === activeDivisionId) && activeTab !== 'global') {
      if (ranking.divisions.length > 0) setActiveDivisionId(ranking.divisions[0].id);
    }
  }, [ranking, activeDivisionId, activeTab]);

  const activeDivision = ranking.divisions.find(d => d.id === activeDivisionId);
  const isLastDivision = activeDivision && activeDivision.numero === ranking.divisions.length;

  // For elimination format, get all divisions of the same category (main + consolation)
  const categoryDivisions = ranking.format === 'elimination' && activeDivision
    ? ranking.divisions.filter(d =>
      d.numero === activeDivision.numero || // Same numero
      (d.category && d.category === activeDivision.category) || //Same category
      (d.name && activeDivision.name && d.name.includes(activeDivision.name.split(' ')[0])) // Same name prefix
    )
    : activeDivision ? [activeDivision] : [];

  // Data for current view
  // Data for current view with Sorting Logic applying to both standard and global standings
  const rawStandings = activeDivision ? generateStandings(activeDivision.id, activeDivision.matches, activeDivision.players, ranking.format as any, ranking.manualPointsAdjustments, ranking.manualStatsAdjustments) : [];
  const rawGlobalStandings = activeTab === 'global' ? generateGlobalStandings(ranking) : [];

  const sortData = (data: any[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const standings = sortData(rawStandings);
  const globalStandings = sortData(rawGlobalStandings);

  // Calculate players already in the tournament to prevent duplicates in new divisions
  const occupiedPlayerIds = new Set<string>();
  ranking.divisions.forEach(div => {
    div.players.forEach(pid => occupiedPlayerIds.add(pid));
  });

  const copyToClipboard = () => {
    const baseUrl = window.location.origin;

    // Format slug for URL safely
    const formatSlug = (text: string) => {
      return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Remove accents
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
    };

    let url = `${baseUrl}?id=${ranking.id}`;

    if (clubSlug) {
      const distinctSlug = formatSlug(clubSlug);
      if (distinctSlug) {
        url = `${baseUrl}/${distinctSlug}?id=${ranking.id}`;
      }
    }

    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPromotionModal = () => {
    // 1. Initialize from Ranking Persistent Overrides
    const initialOverrides = ranking.overrides || [];
    setPromotionOverrides(initialOverrides);

    // 2. Calculate using these overrides
    const result = calculatePromotions(ranking, initialOverrides);
    setPromotionData(result);
    setIsPromotionModalOpen(true);
  };

  const handleOverrideChange = (playerId: string, forceDiv: number | null) => {
    let newOverrides = [...promotionOverrides];
    if (forceDiv === null) {
      newOverrides = newOverrides.filter(o => o.playerId !== playerId);
    } else {
      const existing = newOverrides.find(o => o.playerId === playerId);
      if (existing) {
        existing.forceDiv = forceDiv;
      } else {
        newOverrides.push({ playerId, forceDiv });
      }
    }
    setPromotionOverrides(newOverrides);

    // PERSIST: Save to Ranking state immediately (optional, but safer)
    if (onUpdateRanking) {
      onUpdateRanking({
        ...ranking,
        overrides: newOverrides
      });
    }

    // Recalculate
    const result = calculatePromotions(ranking, newOverrides);
    setPromotionData(result);
  };

  const handleConfirmPromotion = () => {
    if (!promotionData || !onUpdateRanking) return;
    const updatedRanking = {
      ...ranking,
      divisions: promotionData.newDivisions,
      // Archive History
      history: [
        ...(ranking.history || []),
        ...ranking.divisions.flatMap(d => d.matches.filter(m => m.status === 'finalizado'))
      ],
      // Clear overrides for the next phase, as they are one-time use for this transition
      overrides: []
    };
    onUpdateRanking(updatedRanking);
    setIsPromotionModalOpen(false);
    setActiveTab('matches'); // Reset view to matches of new phase
    // Reset active division to first one
    if (updatedRanking.divisions.length > 0) {
      setActiveDivisionId(updatedRanking.divisions[0].id);
    }
  };

  if (!ranking) return <div className="p-8 text-center text-gray-500">Torneo no encontrado</div>;

  const handleSubstitutePlayer = (data: { oldPlayerId: string, newPlayerId: string, nextPhaseDiv?: string }) => {
    if (!activeDivision || !onUpdateRanking || !data.oldPlayerId || !data.newPlayerId) return;

    const { oldPlayerId, newPlayerId } = data; // use directly
    // No new creation logic since we use a real ID.


    // 1. Update Division Players: Keep old (for history), Add new
    const updatedPlayers = [...activeDivision.players];
    if (newPlayerId && !updatedPlayers.includes(newPlayerId)) {
      updatedPlayers.push(newPlayerId);
    }

    // 2. Mark old as retired
    const updatedRetired = [...(activeDivision.retiredPlayers || []), oldPlayerId];

    // 3. Update Pending Matches
    const updatedMatches = activeDivision.matches.map(m => {
      if (m.status !== 'pendiente' || !newPlayerId) return m; // Don't touch finished matches or if no new player

      let p1Changed = false;
      let p2Changed = false;

      let newPair1 = { ...m.pair1 };
      let newPair2 = { ...m.pair2 };

      // Check Pair 1
      if (newPair1.p1Id === oldPlayerId) { newPair1.p1Id = newPlayerId; p1Changed = true; }
      if (newPair1.p2Id === oldPlayerId) { newPair1.p2Id = newPlayerId; p1Changed = true; }

      // Check Pair 2
      if (newPair2.p1Id === oldPlayerId) { newPair2.p1Id = newPlayerId; p2Changed = true; }
      if (newPair2.p2Id === oldPlayerId) { newPair2.p2Id = newPlayerId; p2Changed = true; }

      if (p1Changed || p2Changed) {
        return {
          ...m,
          pair1: newPair1,
          pair2: newPair2
        };
      }
      return m;
    });

    const updatedDivision = {
      ...activeDivision,
      players: updatedPlayers,
      retiredPlayers: updatedRetired,
      matches: updatedMatches
    };

    // 4. Update Ranking with new substitute logic
    let updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === activeDivisionId ? updatedDivision : d)
    };
    // 5. Manual Division Placement (Override) for Next Phase
    const nextPhaseDivStr = data.nextPhaseDiv;

    if (newPlayerId && nextPhaseDivStr && !isNaN(parseInt(nextPhaseDivStr))) {
      const targetDiv = parseInt(nextPhaseDivStr);
      const currentOverrides = updatedRanking.overrides || [];
      // Remove valid existing overrides for this player if any
      const filteredOverrides = currentOverrides.filter(o => o.playerId !== newPlayerId);

      updatedRanking = {
        ...updatedRanking,
        overrides: [...filteredOverrides, { playerId: newPlayerId, forceDiv: targetDiv }]
      };
      // Removed alert, feedback is implicit via UI update
    }

    onUpdateRanking(updatedRanking);
    setIsSubstituteModalOpen(false);
    // setSubstituteData reset not needed as we don't bind state to modal input anymore directly in parent (modal handles its own or we re-init)
  };

  const handleGenerateNextRound = () => {
    if (!onUpdateRanking || !activeDivision) return;

    const currentRound = activeDivision.matches.reduce((max, m) => Math.max(max, m.jornada), 0);
    const nextRound = currentRound + 1;

    let newMatches: Match[] = [];

    // Mexicano Logic
    if (ranking.format === 'mexicano') {
      if (currentRound > 0 && activeDivision.matches.some(m => m.status === 'pendiente')) {
        return alert("Debes finalizar todos los partidos de la ronda actual antes de generar la siguiente en modo Mexicano.");
      }
      newMatches = MatchGenerator.generateMexicanoRound(
        activeDivision.players.map(id => {
          const guest = ranking.guestPlayers?.find(g => g.id === id);
          return players[id] || (guest ? { ...guest, stats: { winrate: 50 }, email: '', telefono: '', fechaNacimiento: '' } as Player : { id, nombre: '?', apellidos: '', stats: { winrate: 0 } as any } as Player);
        }),
        standings,
        nextRound,
        ranking.config?.courts
      );
    }
    // Individual Logic
    else if (ranking.format === 'individual') {
      newMatches = MatchGenerator.generateIndividualRound(activeDivision.players, activeDivision.numero, nextRound);
    }
    // Americano Logic
    else if (ranking.format === 'americano') {
      const pObjs = activeDivision.players.map(id => players[id] || { id } as Player);
      newMatches = MatchGenerator.generateAmericano(pObjs, ranking.config?.courts || 2);
      newMatches.forEach(m => m.jornada = nextRound);
    }

    if (newMatches.length === 0) return alert("No se pudieron generar partidos. Verifica el número de jugadores.");

    const updatedDiv = {
      ...activeDivision,
      matches: [...activeDivision.matches, ...newMatches]
    };

    const updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === updatedDiv.id ? updatedDiv : d)
    };

    onUpdateRanking(updatedRanking);
    alert(`✅ Roda ${nextRound} generada(${newMatches.length} partidos).`);
  };

  const handleGenerateRandomRound = () => {
    if (!onUpdateRanking || !activeDivision) return;
    if (ranking.format !== 'mexicano') return;

    const currentRound = activeDivision.matches.reduce((max, m) => Math.max(max, m.jornada), 0);

    // In Mexicano/Americano, previous round must be finished mainly for ranking based gen, 
    // but for random round it's less critical strictly speaking, BUT good practice to finish rounds.
    if (currentRound > 0 && activeDivision.matches.some(m => m.status === 'pendiente')) {
      return alert("Debes finalizar todos los partidos de la ronda actual antes de generar la siguiente.");
    }

    const nextRound = currentRound + 1;

    const pObjs = activeDivision.players.map(id => {
      const guest = ranking.guestPlayers?.find(g => g.id === id);
      return players[id] || (guest ? { ...guest, stats: { winrate: 50 }, email: '', telefono: '', fechaNacimiento: '' } as Player : { id, nombre: '?', apellidos: '', stats: { winrate: 0 } as any } as Player);
    });

    const newMatches = MatchGenerator.generateMexicanoRoundRandom(pObjs, nextRound, ranking.config?.courts);

    if (newMatches.length === 0) return alert("No se pudieron generar partidos. Verifica el número de jugadores.");

    const updatedDiv = {
      ...activeDivision,
      matches: [...activeDivision.matches, ...newMatches]
    };

    const updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === updatedDiv.id ? updatedDiv : d)
    };

    onUpdateRanking(updatedRanking);
    alert(`✅ Ronda Aleatoria ${nextRound} generada(${newMatches.length} partidos).`);
  };

  const handleAddPairAndRegenerate = async () => {
    setIsAddPairModalOpen(true);
  };

  const onAddPair = (p1Id: string, p2Id: string) => {
    if (!onUpdateRanking || !activeDivision) return;

    // 1. Add players to division if not present
    const updatedPlayers = [...activeDivision.players];
    if (!updatedPlayers.includes(p1Id)) updatedPlayers.push(p1Id);
    if (!updatedPlayers.includes(p2Id)) updatedPlayers.push(p2Id);

    // 2. Identify all pairs in the division to regenerate league
    const existingPairs: string[][] = [];
    const processedPlayers = new Set<string>();

    // extract from matches
    activeDivision.matches.forEach(m => {
      const pair1Key = [m.pair1.p1Id, m.pair1.p2Id].sort().join('-');
      if (!processedPlayers.has(m.pair1.p1Id) && m.pair1.p1Id.toUpperCase() !== 'BYE' && m.pair1.p2Id.toUpperCase() !== 'BYE') {
        existingPairs.push([m.pair1.p1Id, m.pair1.p2Id]);
        processedPlayers.add(m.pair1.p1Id);
        processedPlayers.add(m.pair1.p2Id);
      }

      const pair2Key = [m.pair2.p1Id, m.pair2.p2Id].sort().join('-');
      if (!processedPlayers.has(m.pair2.p1Id) && m.pair2.p1Id.toUpperCase() !== 'BYE' && m.pair2.p2Id.toUpperCase() !== 'BYE') {
        existingPairs.push([m.pair2.p1Id, m.pair2.p2Id]);
        processedPlayers.add(m.pair2.p1Id);
        processedPlayers.add(m.pair2.p2Id);
      }
    });

    // Add the new pair if valid (not strictly enforcing uniqueness here for simplicity, but pairs should be unique)
    existingPairs.push([p1Id, p2Id]);

    const hasPlayedMatches = activeDivision.matches.some(m => m.status === 'finalizado');

    if (hasPlayedMatches) {
      if (!confirm("⚠️ Hay partidos jugados. Regenerar el calendario borrará los partidos PENDIENTES y podría duplicar o romper el orden. ¿Seguro que quieres continuar? (Se recomienda solo importar partidos si la liga ya empezó)")) {
        return;
      }

      const finalizedMatches = activeDivision.matches.filter(m => m.status === 'finalizado');
      const finalMatches: Match[] = [];
      const generated = MatchGenerator.generatePairsLeague(existingPairs, activeDivision.numero);

      generated.forEach(gm => {
        const existing = finalizedMatches.find(fm => {
          const gmP1 = [gm.pair1.p1Id, gm.pair1.p2Id].sort().join('-');
          const gmP2 = [gm.pair2.p1Id, gm.pair2.p2Id].sort().join('-');
          const fmP1 = [fm.pair1.p1Id, fm.pair1.p2Id].sort().join('-');
          const fmP2 = [fm.pair2.p1Id, fm.pair2.p2Id].sort().join('-');
          return (gmP1 === fmP1 && gmP2 === fmP2) || (gmP1 === fmP2 && gmP2 === fmP1);
        });

        if (existing) {
          finalMatches.push(existing);
        } else {
          finalMatches.push(gm);
        }
      });

      const updatedDiv = { ...activeDivision, players: updatedPlayers, matches: finalMatches };
      const updatedRanking = { ...ranking, divisions: ranking.divisions.map(d => d.id === updatedDiv.id ? updatedDiv : d) };
      onUpdateRanking(updatedRanking);

    } else {
      const newMatches = MatchGenerator.generatePairsLeague(existingPairs, activeDivision.numero);
      const updatedDiv = { ...activeDivision, players: updatedPlayers, matches: newMatches };
      const updatedRanking = { ...ranking, divisions: ranking.divisions.map(d => d.id === updatedDiv.id ? updatedDiv : d) };
      onUpdateRanking(updatedRanking);
    }
  };





  const handleImportMatch = (matchData: {
    pair1: { p1Id: string, p2Id: string },
    pair2: { p1Id: string, p2Id: string },
    score: { set1: { p1: number, p2: number }, set2: { p1: number, p2: number }, set3?: { p1: number, p2: number } },
    divisionId: string
  }) => {
    if (!onUpdateRanking) return;

    const divisions = [...ranking.divisions];
    const divIndex = divisions.findIndex(d => d.id === matchData.divisionId);
    if (divIndex === -1) return;

    const division = { ...divisions[divIndex] };
    const newMatch: Match = {
      id: Date.now().toString(),
      jornada: 0,
      pair1: matchData.pair1,
      pair2: matchData.pair2,
      score: matchData.score,
      points: { p1: 0, p2: 0 }, // Will be calculated by logic if needed, or we can assume simple win points here
      status: 'finalizado'
    };

    // Dynamic Point Calculation based on ranking.config
    // Fallback to 3/1/0 if config is missing (standard logic)
    const pointsWin2_0 = ranking.config?.pointsPerWin2_0 ?? 3;
    const pointsWin2_1 = ranking.config?.pointsPerWin2_1 ?? 3;
    const pointsLoss2_1 = ranking.config?.pointsPerLoss2_1 ?? 1;
    const pointsLoss2_0 = ranking.config?.pointsPerLoss2_0 ?? 0; // Check if this exists in type, otherwise 0
    const pointsDraw = ranking.config?.pointsDraw ?? 1;

    // Determine winner based on sets (calculate sets first)
    let p1Sets = 0;
    let p2Sets = 0;
    if (matchData.score.set1.p1 > matchData.score.set1.p2) p1Sets++; else if (matchData.score.set1.p2 > matchData.score.set1.p1) p2Sets++;
    if (matchData.score.set2.p1 > matchData.score.set2.p2) p1Sets++; else if (matchData.score.set2.p2 > matchData.score.set2.p1) p2Sets++;
    if (matchData.score.set3) { if (matchData.score.set3.p1 > matchData.score.set3.p2) p1Sets++; else if (matchData.score.set3.p2 > matchData.score.set3.p1) p2Sets++; }

    // Logic for points
    let p1Points = 0;
    let p2Points = 0;

    // Check for explicit Draw (Empate)
    if (p1Sets === p2Sets) {
      p1Points = pointsDraw;
      p2Points = pointsDraw;
    } else if (p1Sets > p2Sets) {
      // P1 Wins
      // Check if it was 2-0 or 2-1 (or just win if set count difference)
      // Assumption: standard 3 set match max
      const p2WonASet = matchData.score.set1.p2 > matchData.score.set1.p1 || matchData.score.set2.p2 > matchData.score.set2.p1 || (matchData.score.set3 && matchData.score.set3.p2 > matchData.score.set3.p1);

      if (p2WonASet) {
        p1Points = pointsWin2_1;
        p2Points = pointsLoss2_1;
      } else {
        p1Points = pointsWin2_0;
        p2Points = pointsLoss2_0;
      }
    } else {
      // P2 Wins
      const p1WonASet = matchData.score.set1.p1 > matchData.score.set1.p2 || matchData.score.set2.p1 > matchData.score.set2.p2 || (matchData.score.set3 && matchData.score.set3.p1 > matchData.score.set3.p2);

      if (p1WonASet) {
        p2Points = pointsWin2_1;
        p1Points = pointsLoss2_1;
      } else {
        p2Points = pointsWin2_0;
        p1Points = pointsLoss2_0;
      }
    }

    newMatch.points = { p1: p1Points, p2: p2Points };

    division.matches = [...division.matches, newMatch];
    divisions[divIndex] = division;

    onUpdateRanking({ ...ranking, divisions });
  };

  const handleRenameDivision = (divId: string, newName: string) => {
    if (!onUpdateRanking) return;
    const updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === divId ? { ...d, name: newName } : d)
    };
    onUpdateRanking(updatedRanking);
  };

  const handleDeleteDivision = (divId: string) => {
    if (!onUpdateRanking) return;

    // 1. Filter out deleted division
    const remainingDivisions = ranking.divisions.filter(d => d.id !== divId);

    // 2. Re-index remaining divisions
    const reindexedDivisions = remainingDivisions.map((d, index) => ({
      ...d,
      numero: index + 1
    }));

    const updatedRanking = {
      ...ranking,
      divisions: reindexedDivisions
    };

    onUpdateRanking(updatedRanking);

    // If we deleted the active division, switch to the first available one (or null if none)
    if (activeDivisionId === divId) {
      setActiveDivisionId(reindexedDivisions.length > 0 ? reindexedDivisions[0].id : '');
    }
  };

  const handleSaveSchedulerConfig = (config: import('../services/SchedulerEngine').SchedulerConfig, constraints: Record<string, import('../services/SchedulerEngine').PlayerAvailability>) => {
    if (!onUpdateRanking) return;
    const updatedRanking = {
      ...ranking,
      schedulerConfig: config,
      playerConstraints: constraints
    };
    onUpdateRanking(updatedRanking);
  };

  const handleStartPlayoffs = () => {
    if (!onUpdateRanking || ranking.format !== 'hybrid') return;

    // 1. Get Qualified Players (Group Seeds)
    const qualified = getQualifiedPlayers(ranking);
    if (qualified.length < 2) return alert("No hay suficientes parejas clasificadas para un cuadro (mínimo 2).");

    if (!confirm(`Se generará un cuadro de Eliminatoria con ${qualified.length} parejas clasificadas.La fase de grupos se mantendrá visible en la pestaña 'Fase de Grupos'. ¿Continuar ? `)) return;

    // 2. Generate Bracket
    // Default to including Consolation for Hybrid as it's usually desired.
    const newDivs = TournamentEngine.generateBracket(qualified, true);

    // 3. Mark Stages
    const currentDivisions = ranking.divisions.map(d => ({ ...d, stage: 'group' as const }));
    const bracketDivisions = newDivs.map(d => ({ ...d, stage: 'playoff' as const }));

    // 4. Update Ranking with BOTH sets of divisions
    const updatedRanking: Ranking = {
      ...ranking,
      phase: 'playoff',
      // We don't archive matches to history anymore because we keep the divisions alive!
      // history: [...(ranking.history || []), ...ranking.divisions.flatMap(d => d.matches.filter(m => m.status === 'finalizado'))], 
      divisions: [...currentDivisions, ...bracketDivisions]
    };

    onUpdateRanking(updatedRanking);
    setActiveDivisionId(bracketDivisions[0].id);
    setViewMode('playoff');
  };

  // Calculate primary action IDs based on format
  const primaryIds = ['settings', 'share'];

  // Hybrid format: show "Iniciar Playoffs" if not in playoff phase
  if (ranking.format === 'hybrid' && ranking.phase !== 'playoff') {
    primaryIds.unshift('start-playoffs');
  }

  // Classic/Individual/Pairs formats: show "Finalizar Fase"
  if (ranking.format === 'classic' || ranking.format === 'individual' || ranking.format === 'pairs') {
    primaryIds.unshift('finalize-phase');
  }

  // Mexicano format: show "Nueva Ronda"
  if (ranking.format === 'mexicano') {
    primaryIds.unshift('new-round');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:p-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
              <ArrowLeft size={24} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{ranking.nombre}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
              {isAdmin && onUpdateRanking ? (
                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className={`uppercase font-medium text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition-all hover:scale-105 shadow-sm border ${ranking.status === 'activo' ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' :
                    ranking.status === 'pausado' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' :
                      'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    } `}
                  title="Cambiar estado del torneo"
                >
                  {ranking.status === 'activo' ? <Play size={10} fill="currentColor" /> :
                    ranking.status === 'pausado' ? <PauseCircle size={10} /> : <CheckCircle size={10} />}
                  {ranking.status}
                  <Settings size={12} className="ml-1 opacity-50" />
                </button>
              ) : (
                <span className={`uppercase font-medium text-xs px-2 py-0.5 rounded-full ${ranking.status === 'activo' ? 'bg-green-100 text-green-700' :
                  ranking.status === 'pausado' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  } `}>
                  {ranking.status}
                </span>
              )}
              <span>•</span>
              <span>{ranking.categoria}</span>
            </div>
          </div>
        </div>
        <ActionToolbar
          actions={[
            // Import Match-Pairs and Hybrid only
            {
              id: 'import-match',
              icon: Save,
              label: 'Importar Partido',
              onClick: () => setIsManualMatchModalOpen(true),
              visible: isAdmin && onUpdateRanking && (ranking.format === 'pairs' || ranking.format === 'hybrid'),
              variant: 'primary',
              className: 'bg-teal-600 hover:bg-teal-700',
              title: 'Importar partido pasado'
            },
            // Regenerate Playoff-Hybrid only in playoff phase
            {
              id: 'regenerate-playoff',
              icon: Trash2,
              label: 'Regenerar Playoff',
              onClick: () => {
                if (confirm("⚠️ ¡PELIGRO! Esta acción BORRARÁ todo el cuadro de playoff actual y todos sus resultados. Se volverá a generar basado en la clasificación actual de los grupos.\\n\\n¿Estás seguro de que quieres continuar?")) {
                  const qualified = getQualifiedPlayers(ranking);
                  if (qualified.length < 2) return alert("Error: No hay suficientes clasificados (mínimo 2).");

                  const newDivisions = TournamentEngine.regeneratePlayoff(ranking, qualified, true);
                  const updatedRanking = { ...ranking, divisions: newDivisions };
                  onUpdateRanking?.(updatedRanking);
                  alert("✅ Playoff regenerado correctamente.");

                  const mainDiv = newDivisions.find(d => d.type === 'main');
                  if (mainDiv) {
                    setActiveDivisionId(mainDiv.id);
                    setViewMode('playoff');
                  }
                }
              },
              visible: isAdmin && onUpdateRanking && ranking.format === 'hybrid' && ranking.phase === 'playoff',
              variant: 'danger',
              title: 'Borrar y regenerar cuadro desde grupos'
            },
            // Manage Pairs-Pairs format only
            {
              id: 'manage-pairs',
              icon: Users,
              label: 'Gestionar Parejas',
              onClick: handleAddPairAndRegenerate,
              visible: ranking.format === 'pairs',
              variant: 'primary',
              className: 'bg-purple-600 hover:bg-purple-700',
              title: 'Gestionar Parejas y Regenerar'
            },
            // New Round-All formats except pairs
            {
              id: 'new-round',
              icon: Plus,
              label: 'Nueva Ronda',
              onClick: handleGenerateNextRound,
              visible: ranking.format !== 'pairs' && ranking.format !== 'elimination',
              variant: 'primary',
              className: 'bg-orange-600 hover:bg-orange-700'
            },
            // Random Round-Mexicano only
            {
              id: 'random-round',
              icon: Shuffle,
              label: 'Ronda Aleatoria',
              onClick: handleGenerateRandomRound,
              visible: ranking.format === 'mexicano',
              variant: 'primary',
              className: 'bg-purple-600 hover:bg-purple-700',
              title: 'Generar ronda con emparejamientos aleatorios'
            },
            // Schedules-Elimination format only
            {
              id: 'schedules',
              icon: Calendar,
              label: 'Horarios',
              onClick: () => setIsSchedulerConfigModalOpen(true),
              visible: isAdmin && onUpdateRanking && ranking.format === 'elimination',
              variant: 'primary',
              className: 'bg-blue-600 hover:bg-blue-700'
            },
            // Finalize Phase-Classic and Individual formats
            {
              id: 'finalize-phase',
              icon: Flag,
              label: 'Finalizar Fase',
              onClick: handleOpenPromotionModal,
              visible: isAdmin && onUpdateRanking && (ranking.format === 'classic' || ranking.format === 'individual' || ranking.format === 'pairs'),
              variant: 'primary',
              className: 'bg-indigo-600 hover:bg-indigo-700'
            },
            // Start Playoffs-Hybrid format, not in playoff phase
            {
              id: 'start-playoffs',
              icon: Trophy,
              label: 'Iniciar Playoffs',
              onClick: handleStartPlayoffs,
              visible: isAdmin && onUpdateRanking && ranking.format === 'hybrid' && ranking.phase !== 'playoff',
              variant: 'primary',
              className: 'bg-pink-600 hover:bg-pink-700'
            },
            // Substitute Player-All formats when admin
            {
              id: 'substitute-player',
              icon: Users,
              label: 'Sustituir Jugador',
              onClick: () => setIsSubstituteModalOpen(true),
              visible: isAdmin && onUpdateRanking && !!activeDivision,
              variant: 'secondary',
              className: 'bg-gray-600 hover:bg-gray-700 text-white'
            },
            // TV Mode-Admin only
            {
              id: 'tv-mode',
              icon: Monitor,
              label: 'Modo TV',
              onClick: () => window.open(`/?tv=${ranking.id}`, '_blank'),
              visible: isAdmin,
              variant: 'secondary',
              className: 'text-purple-600 hover:bg-purple-50',
              title: 'Abrir Modo TV'
            },
            // Settings
            {
              id: 'settings',
              icon: isAdmin ? Settings : BookOpen,
              label: isAdmin ? 'Configuración' : 'Información',
              onClick: () => setIsSettingsModalOpen(true),
              visible: true,
              variant: 'secondary',
              className: 'text-gray-600 hover:bg-gray-100',
              title: isAdmin ? "Configuración del Torneo" : "Información del Torneo"
            },
            // Share / Copy URL
            {
              id: 'share',
              icon: copied ? Check : Share2,
              label: copied ? 'Copiado' : 'Compartir',
              onClick: copyToClipboard,
              visible: true,
              variant: 'secondary',
              className: `${copied ? 'bg-green-50 text-green-600' : 'text-primary'}`,
              title: 'Copiar URL Pública'
            },
            // Export PDF
            {
              id: 'export-pdf',
              icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              ),
              label: 'PDF',
              onClick: () => {
                import('../services/export').then(({ exportRankingToPDF }) => {
                  const currentStandings = activeTab === 'global' ? globalStandings : standings;
                  const catName = activeTab === 'global' ? 'Global' : activeDivision ? (activeDivision.category || `División ${activeDivision.numero}`) : '';

                  exportRankingToPDF(ranking, () => currentStandings, players, {
                    rankingName: ranking.nombre,
                    categoryName: catName,
                    clubName: 'Racket Grid'
                  });
                });
              },
              visible: true,
              variant: 'secondary',
              className: 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100',
              title: 'Exportar a PDF'
            },
            // GOD MODE
            {
              id: 'god-mode',
              label: isGodMode ? 'Desactivar Modo Dios' : 'Activar Modo Dios',
              icon: Trophy,
              onClick: () => setIsGodMode(!isGodMode),
              visible: isAdmin, // Only visible if admin
              variant: isGodMode ? 'primary' : 'secondary',
              className: isGodMode ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200' : ''
            }
          ]}
          primaryActionIds={primaryIds}
          className="w-full md:w-auto justify-end"
        />
      </div >



      {/* Hybrid Phase Switcher */}
      {
        ranking.format === 'hybrid' && ranking.phase === 'playoff' && (
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-1 rounded-lg inline-flex">
              <button
                onClick={() => {
                  setViewMode('groups');
                  const d = ranking.divisions.find(d => d.stage === 'group' || (!d.stage && d.type !== 'main' && d.type !== 'consolation'));
                  if (d) setActiveDivisionId(d.id);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'groups' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  } `}
              >
                Fase de Grupos
              </button>
              <button
                onClick={() => {
                  setViewMode('playoff');
                  const d = ranking.divisions.find(d => d.stage === 'playoff' || d.type === 'main');
                  if (d) setActiveDivisionId(d.id);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'playoff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  } `}
              >
                Playoff Final
              </button>
            </div>
          </div>
        )
      }

      {/* Bracket View for Hybrid Playoff Phase */}
      {
        ranking.format === 'hybrid' && ranking.phase === 'playoff' && viewMode === 'playoff' ? (
          <BracketView
            divisions={ranking.divisions.filter(d => d.stage === 'playoff' || d.type === 'main' || d.type === 'consolation')}
            players={players}
            onMatchClick={handleMatchClick}
            onScheduleClick={isAdmin ? (m) => setSchedulingMatch(m) : undefined}
            ranking={ranking}
            bracketType={bracketType}
          />
        ) : (
          <>
            {/* Division Tabs */}
            {ranking.format !== 'mexicano' && ranking.format !== 'americano' && (ranking.divisions.length > 1 || (ranking.history && ranking.history.length > 0) || ranking.format === 'individual' || ranking.format === 'classic' || ranking.format === 'pairs' || (ranking.format === 'hybrid' && ranking.phase !== 'playoff')) && (
              <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
                {ranking.format !== 'elimination' && (
                  <button
                    onClick={() => setActiveTab('global')}
                    className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'global'
                      ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      } `}
                  >
                    <BarChart size={16} /> Estadísticas Globales
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'rules'
                    ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    } `}
                >
                  <BookOpen size={16} /> Normas
                </button>
                {ranking.divisions
                  .filter(div => div.type !== 'consolation' && div.stage !== 'playoff') // Hide consolation and playoff divisions from main tabs
                  .sort((a, b) => a.numero - b.numero)
                  .map(div => (
                    <button
                      key={div.id}
                      onClick={() => { setActiveDivisionId(div.id); setActiveTab('standings'); }}
                      className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${activeDivisionId === div.id && activeTab !== 'global' && activeTab !== 'rules'
                        ? 'bg-white text-primary border-b-2 border-primary shadow-sm z-10'
                        : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        } `}
                    >
                      {(() => {
                        // Remove automatic suffixes like "Cuadro Principal", "Cuadro Consolación"
                        const displayName = div.category || div.name || `División ${div.numero} `;
                        return displayName
                          .replace(/Cuadro Principal/gi, '')
                          .replace(/Cuadro Consolación/gi, '')
                          .replace(/\s*-\s*Principal/gi, '')
                          .replace(/\s*-\s*Consolación/gi, '')
                          .trim() || `División ${div.numero} `;
                      })()}
                    </button>
                  ))}
                {isAdmin && (
                  <div className="ml-2 flex items-center gap-1">
                    {onAddDivision && (
                      <button
                        onClick={() => setIsAddDivModalOpen(true)}
                        className="px-3 py-2 rounded-t-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center border-b border-gray-200"
                        title="Añadir nueva división"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Single Group Tabs */}
            {(ranking.format === 'mexicano' || ranking.format === 'americano') && (
              <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'standings' || activeTab === 'matches'
                    ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    } `}
                >
                  <Trophy size={16} /> Competición
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'rules'
                    ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    } `}
                >
                  <BookOpen size={16} /> Normas
                </button>
              </div>
            )}

            {/* Rules Content */}
            {activeTab === 'rules' && (
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-fade-in mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <BookOpen className="text-primary" /> Normativa del Torneo
                  </h3>
                </div>

                {isAdmin && onUpdateRanking ? (
                  <div className="space-y-4">
                    <div className="flex justify-end mb-2 gap-2">
                      {ranking.format === 'classic' && (
                        <Button
                          onClick={() => {
                            const defaultRules = `** 3. PUNTUACIÓN Y CLASIFICACIÓN **\n` +
                              `Se premia cada set conseguido para fomentar la competitividad: \n` +
                              `- Victoria 2-0: 4 Puntos.\n` +
                              `- Victoria 2-1: 3 Puntos.\n` +
                              `- Empate: 2 Puntos.\n` +
                              `- Derrota 1-2: 1 Punto.\n` +
                              `- Derrota 0-2: 0 Puntos.\n` +
                              `* (Nota: Si un partido no se juega, ningún jugador recibe puntos).*\n\n` +
                              `** Criterios de desempate:**\n` +
                              `En caso de igualdad a puntos, el orden se decide por: \n` +
                              `1. Puntos totales.\n` +
                              `2. Diferencia de sets.\n` +
                              `3. Diferencia de juegos.\n` +
                              `4. Sets ganados.\n` +
                              `5. Juegos ganados.\n` +
                              `6. Sorteo.\n\n` +
                              `** 4. FORMATO DE PARTIDO Y REGLAMENTO **\n` +
                              `** Estructura:** Partidos al mejor de 3 sets con Punto de Oro.Los dos primeros sets se juega Tie Break si se llega al 5-5. El tercer set, si fuera necesario, sería un Súper Tie-Break a 11 puntos.Se puede jugar partido completo si se tiene reserva de más de 1 hora y se llega a un acuerdo entre los 4 jugadores, si no, se mantiene el formato anterior.\n\n` +
                              `** Regla de la "Alarma"(Partidos de 1 hora):**\n` +
                              `- Los jugadores deben poner una alarma de 1 hora al inicio de la reserva(recomendamos llegar antes del inicio para calentar y jugar la hora completa).\n` +
                              `- Si suena la alarma y hay reserva posterior: gana quien vaya por delante en el marcador en ese instante. (Ej: si el Equipo A gana el primer set y luego va ganando el segundo set cuando acaba la hora, gana el equipo A, pero si el equipo A gana el primer set pero el segundo set va ganando el equipo B por 3 o más juegos al acabar la hora, se considera ganado el segundo set por el equipo B y el partido quedaría empate).\n` +
                              `- Si hay empate al sonar la alarma, se juega un último punto decisivo.`;
                            onUpdateRanking({ ...ranking, rules: defaultRules });
                          }}
                          variant="secondary"
                          className="text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 flex items-center gap-2 text-sm"
                        >
                          <Edit2 size={16} /> Cargar Normas Clásicas (CPSJ)
                        </Button>
                      )}

                    </div>
                    <textarea
                      className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-700 leading-relaxed bg-gray-50"
                      placeholder="Escribe aquí las normas del torneo (puntuación, desempates, comportamiento, etc.)"
                      defaultValue={ranking.rules || ''}
                      key={ranking.rules}
                      onBlur={(e) => {
                        const newRules = e.target.value;
                        if (newRules !== ranking.rules) {
                          onUpdateRanking({ ...ranking, rules: newRules });
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 italic">
                      ℹ️ Los cambios se guardan automáticamente al salir del campo de texto.
                    </p>
                  </div>
                ) : (
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {ranking.rules ? ranking.rules : (
                      <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-lg">
                        No se han especificado normas para este torneo.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Division/Global Content-Hidden for elimination format */}
            {activeTab !== 'rules' && ranking.format !== 'elimination' && (
              <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-4">
                <h3 className="font-bold text-gray-700 px-2 lg:text-lg">
                  {activeTab === 'global' ? 'Estadísticas Globales' :
                    `División ${activeDivision?.numero} `}
                </h3>
                {activeTab !== 'global' && (
                  <div className="bg-gray-100 p-1 rounded-lg flex">
                    <button
                      onClick={() => setActiveTab('standings')}
                      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'standings' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'} `}
                    >
                      Clasificación
                    </button>
                    <button
                      onClick={() => setActiveTab('matches')}
                      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'matches' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'} `}
                    >
                      Partidos
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'global' && (
              <Card className="overflow-hidden !p-0">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2"><BarChart size={18} className="text-primary" /> Estadísticas Globales</h3>
                  <p className="text-xs text-gray-500 mt-1">Comparativa de rendimiento entre todos los participantes.</p>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden">
                  {globalStandings.map((row) => {
                    let displayName = 'Desconocido';

                    const formatCompactName = (name: string, surname?: string) => {
                      if (!name) return '?';
                      return `${name} ${surname ? surname.charAt(0) + '.' : ''} `;
                    };

                    if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
                      const [p1Id, p2Id] = row.playerId.split('::');
                      const p1 = players[p1Id];
                      const p2 = players[p2Id];
                      displayName = `${formatCompactName(p1?.nombre || '?', p1?.apellidos)} / ${formatCompactName(p2?.nombre || '?', p2?.apellidos)}`;
                    } else {
                      const player = players[row.playerId];
                      const guest = ranking.guestPlayers?.find(g => g.id === row.playerId);

                      if (player) displayName = formatCompactName(player.nombre, player.apellidos);
                      else if (guest) displayName = `${guest.nombre} ${guest.apellidos || ''} (Inv)`;
                    }

                    const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;

                    return (
                      <div key={row.playerId} className="p-4 border border-gray-100 bg-white shadow-sm mb-3 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full ${row.pos === 1 ? 'bg-yellow-100 text-yellow-700' :
                              row.pos === 2 ? 'bg-gray-100 text-gray-700' :
                                row.pos === 3 ? 'bg-orange-100 text-orange-800' : 'text-gray-500 bg-gray-50'
                              }`}>
                              #{row.pos}
                            </span>
                            <div>
                              {isPlayerClickEnabled && onPlayerClick ? (
                                <button
                                  onClick={() => onPlayerClick(row.playerId)}
                                  className="font-semibold text-gray-900 text-base hover:text-primary hover:underline text-left"
                                >
                                  {displayName}
                                </button>
                              ) : (
                                <div className="font-semibold text-gray-900 text-base">{displayName}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              {isGodMode && isAdmin && onUpdateRanking && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPlayerId(row.playerId);
                                    let name = '?';
                                    if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
                                      const [p1Id, p2Id] = row.playerId.split('::');
                                      const p1 = players[p1Id];
                                      const p2 = players[p2Id];
                                      name = `${p1?.nombre || '?'} / ${p2?.nombre || '?'}`;
                                    } else {
                                      const p = players[row.playerId];
                                      name = `${p?.nombre || '?'} ${p?.apellidos || ''}`;
                                    }
                                    setEditingPlayerName(name);
                                    setIsStatsModalOpen(true);
                                  }}
                                  className="p-1.5 bg-amber-100 text-amber-700 rounded-lg mb-1 hover:bg-amber-200 transition-colors"
                                  title="Editar estadísticas manualmente"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <div className="text-2xl font-bold text-primary leading-none flex items-center gap-1">
                                {row.pts}
                                {row.manualAdjustment !== undefined && row.manualAdjustment !== 0 && (
                                  <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded flex items-center gap-0.5" title={`Ajuste manual: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}`}>
                                    <AlertCircle size={8} />
                                    {row.manualAdjustment > 0 ? '+' : ''}{row.manualAdjustment}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Puntos</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center bg-gray-50 rounded-lg p-2">
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-0.5">PJ</div>
                            <div className="font-bold text-gray-800">{row.pj}</div>
                          </div>
                          <div>
                            <div className="text-xs text-green-600 font-medium mb-0.5">PG</div>
                            <div className="font-bold text-gray-800">{row.pg}</div>
                          </div>
                          <div>
                            <div className="text-xs text-red-500 font-medium mb-0.5">PP</div>
                            <div className="font-bold text-gray-800">{row.pj - row.pg}</div>
                          </div>
                          <div>
                            <div className="text-xs text-blue-500 font-medium mb-0.5">%Vic</div>
                            <div className="font-bold text-gray-800">{winrate}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div >

                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3 text-center w-12 sticky left-0 bg-gray-50 z-10">#</th>
                        <th className="px-4 py-3 sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[260px] min-w-[260px] max-w-[260px]">
                          {(ranking.format === 'pairs' || ranking.format === 'hybrid') ? 'Pareja' : 'Jugador'}
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pj')}>
                          <div className="flex items-center justify-center gap-1">Partidos {getSortIcon('pj')}</div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pts')}>
                          <div className="flex items-center justify-center gap-1">PTS {getSortIcon('pts')}</div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pg')}>
                          <div className="flex items-center justify-center gap-1">PG {getSortIcon('pg')}</div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pp')}>
                          <div className="flex items-center justify-center gap-1">PP {getSortIcon('pp')}</div>
                        </th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('setsDiff')}>
                          <div className="flex items-center justify-center gap-1">Dif Sets {getSortIcon('setsDiff')}</div>
                        </th>
                        <th className="px-4 py-3 text-center hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('gamesDiff')}>
                          <div className="flex items-center justify-center gap-1">Dif Juegos {getSortIcon('gamesDiff')}</div>
                        </th>
                        <th className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('winrate')}>
                          <div className="flex items-center justify-center gap-1">% Vic {getSortIcon('winrate')}</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {globalStandings.map((row) => {
                        let displayName = 'Desconocido';
                        if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
                          const [p1Id, p2Id] = row.playerId.split('::');
                          const p1 = players[p1Id];
                          const p2 = players[p2Id];
                          displayName = `${p1?.nombre || '?'} ${p1?.apellidos || ''} / ${p2?.nombre || '?'} ${p2?.apellidos || ''}`;
                        } else {
                          const player = players[row.playerId];
                          if (player) displayName = `${player.nombre} ${player.apellidos}`;
                        }

                        const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;
                        return (
                          <tr key={row.playerId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-center font-bold text-gray-400 sticky left-0 bg-white z-10">{row.pos}</td>
                            <td className="px-4 py-3 font-medium text-gray-900 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              {isPlayerClickEnabled && onPlayerClick ? (
                                <button
                                  onClick={() => onPlayerClick(row.playerId)}
                                  className="truncate max-w-[260px] text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                                  title={displayName}
                                >
                                  {displayName}
                                </button>
                              ) : (
                                <div className="truncate max-w-[260px]" title={displayName}>{displayName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{row.pj}</td>
                            <td className="px-4 py-3 text-center font-bold text-primary">
                              <div className="flex items-center justify-center gap-1 group/pts">
                                {row.pts}
                                {row.manualAdjustment !== undefined && row.manualAdjustment !== 0 && (
                                  <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded flex items-center gap-0.5" title={`Ajuste manual: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}`}>
                                    <AlertCircle size={8} />
                                  </span>
                                )}
                                {isGodMode && isAdmin && onUpdateRanking && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPlayerId(row.playerId);
                                      // Find name
                                      let name = '?';
                                      const [p1, p2] = row.playerId.split('::').map(id => players[id]?.nombre || '?');
                                      name = `${p1} / ${p2}`;
                                      setEditingPlayerName(name);
                                      setIsStatsModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-amber-100 rounded opacity-0 group-hover/pts:opacity-100 transition-opacity text-amber-700"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-green-600">{row.pg}</td>
                            <td className="px-4 py-3 text-center text-red-600">{row.pj - row.pg}</td>
                            <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff}</td>
                            <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${winrate >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {winrate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card >
            )
            }

            {/* Category Header for Elimination-shows category name */}
            {
              ranking.format === 'elimination' && activeDivision && activeTab === 'standings' && (
                <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  {isEditingCategory ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        defaultValue={activeDivision.category || (activeDivision.name ? activeDivision.name.replace(/Cuadro Principal/gi, '').replace(/Cuadro Consolación/gi, '').trim() : `División ${activeDivision.numero}`)}
                        className="px-3 py-2 border rounded-lg flex-1 text-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (val && onUpdateRanking) {
                              // Update all divisions with same number (category group)
                              const updatedDivs = ranking.divisions.map(d =>
                                d.numero === activeDivision.numero ? { ...d, category: val } : d
                              );
                              onUpdateRanking({ ...ranking, divisions: updatedDivs });
                              setIsEditingCategory(false);
                            }
                          }
                          if (e.key === 'Escape') setIsEditingCategory(false);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingCategory(false)}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => {
                            // Trigger save manually via finding input sibling? Or simpler: use Ref.
                            // For simplicity in this replace block without adding refs, assume Enter usage or add specific ID
                            const input = e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement;
                            if (input && input.value && onUpdateRanking) {
                              const updatedDivs = ranking.divisions.map(d =>
                                d.numero === activeDivision.numero ? { ...d, category: input.value } : d
                              );
                              onUpdateRanking({ ...ranking, divisions: updatedDivs });
                              setIsEditingCategory(false);
                            }
                          }}
                          className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">
                        {(() => {
                          // Priority: category > cleaned name > fallback
                          if (activeDivision.category) {
                            return activeDivision.category;
                          }

                          if (activeDivision.name) {
                            const cleaned = activeDivision.name
                              .replace(/Cuadro Principal/gi, '')
                              .replace(/Cuadro Consolación/gi, '')
                              .replace(/\s*-\s*Principal/gi, '')
                              .replace(/\s*-\s*Consolación/gi, '')
                              .trim();

                            if (cleaned) return cleaned;
                          }

                          return `División ${activeDivision.numero}`;
                        })()}
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={() => setIsEditingCategory(true)}
                          className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar nombre de categoría"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            }

            {
              activeTab === 'standings' && (
                <Card className="overflow-hidden !p-0">
                  {ranking.format !== 'elimination' && (
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Trophy size={18} className="text-yellow-500" />
                        Tabla de Clasificación
                      </h3>
                    </div>
                  )}

                  {ranking.format === 'elimination' ? (
                    <>
                      {/* Sub-tabs for Main and Consolation brackets */}
                      <div className="flex gap-2 p-3 border-b bg-gray-50">
                        <button
                          onClick={() => setBracketType('main')}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${bracketType === 'main'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          Cuadro Principal
                        </button>
                        {ranking.config?.eliminationConfig?.consolation && (
                          <button
                            onClick={() => setBracketType('consolation')}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${bracketType === 'consolation'
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                              }`}
                          >
                            Cuadro de Consolación
                          </button>
                        )}

                        <div className="flex-1"></div>

                        <button
                          onClick={() => setIsGridModalOpen(true)}
                          className="px-4 py-2 rounded-lg font-medium text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                        >
                          <Calendar size={16} /> Parrilla de Horarios
                        </button>
                      </div>
                      {activeDivision ? (
                        <div className="p-4 bg-gray-50/50 min-h-[400px]">
                          <BracketView
                            divisions={categoryDivisions}
                            players={players}
                            onMatchClick={handleMatchClick}
                            onScheduleClick={isAdmin ? setSchedulingMatch : undefined}
                            bracketType={bracketType}
                            ranking={ranking}
                            onUpdateRanking={onUpdateRanking}
                          />
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-400">Selecciona una categoría</div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="md:hidden">
                        {activeTab === 'standings' && standings.map((row) => {
                          let displayName = 'Desconocido';
                          const isAmericanoOrMexicano = ranking.format === 'americano' || ranking.format === 'mexicano';
                          const isHybrid = ranking.format === 'hybrid';

                          const promotionCount = ranking.config?.promotionCount !== undefined ? ranking.config.promotionCount : 0;
                          const relegationCount = ranking.config?.relegationCount !== undefined ? ranking.config.relegationCount : 0;
                          const qualifiersCount = ranking.config?.hybridConfig?.qualifiersPerGroup !== undefined ? ranking.config.hybridConfig.qualifiersPerGroup : 2;

                          const isPromoted = !isHybrid && !isAmericanoOrMexicano && row.pos <= promotionCount;
                          const isRelegated = !isHybrid && !isAmericanoOrMexicano && row.pos > standings.length - relegationCount;
                          const isQualified = isHybrid && row.pos <= qualifiersCount;

                          const formatCompactName = (name: string, surname?: string) => {
                            if (!name) return '?';
                            return `${name} ${surname ? surname.charAt(0) + '.' : ''}`;
                          };

                          if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
                            const [p1Id, p2Id] = row.playerId.split('::');
                            const p1 = players[p1Id];
                            const p2 = players[p2Id];
                            displayName = `${formatCompactName(p1?.nombre || '?', p1?.apellidos)} / ${formatCompactName(p2?.nombre || '?', p2?.apellidos)}`;
                          } else {
                            const player = players[row.playerId];
                            if (player) displayName = formatCompactName(player.nombre, player.apellidos);
                          }

                          const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;

                          return (
                            <div key={row.playerId} className={`p-4 border-b border-gray-100 last:border-0 ${isPromoted || isQualified ? 'bg-green-50/30' : isRelegated ? 'bg-red-50/30' : 'bg-white'}`}>
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                  <span className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full ${isAmericanoOrMexicano && row.pos === 1 ? 'bg-yellow-100 text-yellow-700' :
                                    isAmericanoOrMexicano && row.pos === 2 ? 'bg-gray-100 text-gray-700' :
                                      isAmericanoOrMexicano && row.pos === 3 ? 'bg-orange-100 text-orange-800' :
                                        'text-gray-500 bg-gray-50'
                                    }`}>
                                    #{row.pos}
                                  </span>
                                  <div>
                                    {isPlayerClickEnabled && onPlayerClick ? (
                                      <button
                                        onClick={() => onPlayerClick(row.playerId)}
                                        className="font-semibold text-gray-900 text-base hover:text-primary hover:underline text-left"
                                      >
                                        {displayName}
                                      </button>
                                    ) : (
                                      <div className="font-semibold text-gray-900 text-base">{displayName}</div>
                                    )}
                                    <div className="text-xs text-gray-400 font-medium">
                                      {isPromoted && <span className="text-green-600 flex items-center gap-1">🟢 Ascenso</span>}
                                      {isRelegated && <span className="text-red-600 flex items-center gap-1">🔴 Descenso</span>}
                                      {isQualified && <span className="text-green-600 flex items-center gap-1">✅ Clasificado</span>}
                                      {!isAmericanoOrMexicano && !isPromoted && !isRelegated && !isQualified && 'Permanencia'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center gap-1">
                                    {isGodMode && isAdmin && onUpdateRanking && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const currentAdj = ranking.manualPointsAdjustments?.[row.playerId] || 0;
                                          const newPointsStr = prompt(`Puntos Totales Actuales: ${row.pts}\n\nIntroduce el AJUSTE de puntos (ej: +5 o -3):`, currentAdj > 0 ? `+${currentAdj}` : currentAdj.toString());

                                          if (newPointsStr !== null) {
                                            const newAdj = parseInt(newPointsStr.replace('+', ''));
                                            if (!isNaN(newAdj)) {
                                              const newAdjustments = {
                                                ...(ranking.manualPointsAdjustments || {}),
                                                [row.playerId]: newAdj
                                              };
                                              if (newAdj === 0) delete newAdjustments[row.playerId];

                                              onUpdateRanking({
                                                ...ranking,
                                                manualPointsAdjustments: newAdjustments
                                              });
                                            }
                                          }
                                        }}
                                        className="p-1.5 bg-amber-100 text-amber-700 rounded-lg mb-1"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                    <div className="text-2xl font-bold text-primary leading-none flex items-center gap-1">
                                      {row.pts}
                                      {row.manualAdjustment !== undefined && row.manualAdjustment !== 0 && (
                                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded flex items-center gap-0.5" title={`Ajuste manual: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}`}>
                                          <AlertCircle size={8} />
                                          {row.manualAdjustment > 0 ? '+' : ''}{row.manualAdjustment}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Puntos</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 text-center bg-gray-50 rounded-lg p-2">
                                <div>
                                  <div className="text-xs text-gray-500 font-medium mb-0.5">PJ</div>
                                  <div className="font-bold text-gray-800">{row.pj}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-green-600 font-medium mb-0.5">PG</div>
                                  <div className="font-bold text-gray-800">{row.pg}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-red-500 font-medium mb-0.5">PP</div>
                                  <div className="font-bold text-gray-800">{row.pj - row.pg}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-blue-500 font-medium mb-0.5">%</div>
                                  <div className="font-bold text-gray-800">{winrate}%</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 w-12 text-center">#</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Jugador</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pj')}>
                                <div className="flex items-center justify-center gap-1">PJ {getSortIcon('pj')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pts')}>
                                <div className="flex items-center justify-center gap-1">PTS {getSortIcon('pts')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-green-600 uppercase w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pg')}>
                                <div className="flex items-center justify-center gap-1">PG {getSortIcon('pg')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-red-500 uppercase w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('pp')}>
                                <div className="flex items-center justify-center gap-1">PP {getSortIcon('pp')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase hidden sm:table-cell w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('setsDiff')}>
                                <div className="flex items-center justify-center gap-1">Dif S {getSortIcon('setsDiff')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase hidden sm:table-cell w-16 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('gamesDiff')}>
                                <div className="flex items-center justify-center gap-1">Dif J {getSortIcon('gamesDiff')}</div>
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase w-20 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('winrate')}>
                                <div className="flex items-center justify-center gap-1">% Vic {getSortIcon('winrate')}</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {activeTab === 'standings' && standings.map((row) => {
                              let displayName = 'Desconocido';
                              if (ranking.format === 'pairs' || ranking.format === 'hybrid') {
                                const [p1Id, p2Id] = row.playerId.split('::');
                                const p1 = players[p1Id];
                                const p2 = players[p2Id];
                                displayName = `${p1?.nombre || '?'} ${p1?.apellidos || ''} / ${p2?.nombre || '?'} ${p2?.apellidos || ''}`;
                              } else {
                                const player = players[row.playerId];
                                if (player) displayName = `${player.nombre} ${player.apellidos}`;
                              }

                              const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;
                              const isAmericanoOrMexicano = ranking.format === 'americano' || ranking.format === 'mexicano';
                              const isHybrid = ranking.format === 'hybrid';

                              const promotionCount = ranking.config?.promotionCount !== undefined ? ranking.config.promotionCount : 0;
                              const relegationCount = ranking.config?.relegationCount !== undefined ? ranking.config.relegationCount : 0;
                              const qualifiersCount = ranking.config?.hybridConfig?.qualifiersPerGroup !== undefined ? ranking.config.hybridConfig.qualifiersPerGroup : 2;

                              const isPromoted = !isHybrid && !isAmericanoOrMexicano && row.pos <= promotionCount;
                              const isRelegated = !isHybrid && !isAmericanoOrMexicano && row.pos > standings.length - relegationCount;
                              const isQualified = isHybrid && row.pos <= qualifiersCount;

                              return (
                                <tr key={row.playerId} className={`hover:bg-gray-50 transition-colors ${isPromoted || isQualified ? 'bg-green-50/20' : isRelegated ? 'bg-red-50/20' : ''}`}>
                                  <td className="px-4 py-3 text-center font-bold text-gray-400 sticky left-0 bg-white z-10 border-r border-gray-100/50">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isAmericanoOrMexicano && row.pos === 1 ? 'bg-yellow-100 text-yellow-700' :
                                      isAmericanoOrMexicano && row.pos === 2 ? 'bg-gray-100 text-gray-700' :
                                        isAmericanoOrMexicano && row.pos === 3 ? 'bg-orange-100 text-orange-800' :
                                          'text-gray-500'
                                      }`}>
                                      {row.pos}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-900 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="flex items-center gap-2">
                                      {isPlayerClickEnabled && onPlayerClick ? (
                                        <button
                                          onClick={() => onPlayerClick(row.playerId)}
                                          className="truncate max-w-[260px] text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                                          title={displayName}
                                        >
                                          {displayName}
                                        </button>
                                      ) : (
                                        <div className="truncate max-w-[260px]" title={displayName}>{displayName}</div>
                                      )}
                                      {isPromoted && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ASC</span>}
                                      {isRelegated && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">DESC</span>}
                                      {isQualified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Q</span>}
                                    </div>

                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-600">{row.pj}</td>
                                  <td className="px-4 py-3 text-center font-bold text-primary bg-primary/5 rounded-lg my-1">
                                    <div className="flex items-center justify-center gap-1 group/pts">
                                      {row.pts}
                                      {row.manualAdjustment !== undefined && row.manualAdjustment !== 0 && (
                                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded flex items-center gap-0.5" title={`Ajuste manual: ${row.manualAdjustment > 0 ? '+' : ''}${row.manualAdjustment}`}>
                                          <AlertCircle size={8} />
                                        </span>
                                      )}
                                      {isGodMode && isAdmin && onUpdateRanking && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingPlayerId(row.playerId);
                                            setEditingPlayerName(displayName);
                                            setIsStatsModalOpen(true);
                                          }}
                                          className="p-1 hover:bg-amber-100 rounded opacity-0 group-hover/pts:opacity-100 transition-opacity text-amber-700"
                                          title="Editar estadísticas manualmente"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-green-600 font-medium">{row.pg}</td>
                                  <td className="px-4 py-3 text-center text-red-600 font-medium">{row.pj - row.pg}</td>
                                  <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell text-xs">{row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff}</td>
                                  <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell text-xs">{row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff}</td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                                      <div className={`h-1.5 rounded-full ${winrate >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${winrate}%` }}></div>
                                    </div>
                                    <span className="text-xs text-gray-500">{winrate}%</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-2 bg-gray-50 text-xs text-gray-400 flex gap-4 justify-end border-t">
                        {ranking.format !== 'americano' && ranking.format !== 'mexicano' && (
                          <>
                            {activeDivision && activeDivision.numero > 1 && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-200"></div> Zona Ascenso</span>}
                            {!isLastDivision && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-200"></div> Zona Descenso</span>}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              )
            }

            {
              activeTab === 'matches' && activeDivision && (
                <div className="space-y-8">
                  {Object.entries(
                    activeDivision.matches.reduce((acc, m) => {
                      if (!acc[m.jornada]) acc[m.jornada] = [];
                      acc[m.jornada].push(m);
                      return acc;
                    }, {} as Record<number, Match[]>)
                  ).sort((a, b) => Number(a[0]) - Number(b[0])).map(([round, matches]) => (
                    <div key={round} className="animate-fade-in">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                        <Calendar size={20} className="text-primary" /> Jornada {round}
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {matches.map((m) => {
                          const p1 = players[m.pair1.p1Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair1.p1Id };
                          const p2 = players[m.pair1.p2Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair1.p2Id };
                          const p3 = players[m.pair2.p1Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair2.p1Id };
                          const p4 = players[m.pair2.p2Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair2.p2Id };

                          if (m.status === 'descanso') {
                            return (
                              <div key={m.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 opacity-75">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Jornada {m.jornada}</span>
                                  <Badge type="neutral">Descanso</Badge>
                                </div>
                                <div className="text-center py-2">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pareja que descansa</div>
                                  <div className="font-bold text-gray-700">
                                    {p1.nombre} {p1.apellidos} - {p2.nombre} {p2.apellidos}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={m.id}
                              className={`bg-white p-0 rounded-xl border transition-all ${isAdmin ? 'hover:border-primary hover:shadow-md' : 'border-gray-100'}`}
                            >
                              {/* Main Clickable Area -> Opens MatchModal (Score) */}
                              <div
                                className={`p-4 ${isAdmin ? 'cursor-pointer' : ''}`}
                                onClick={() => isAdmin && handleMatchClick(m)}
                              >
                                <div className="flex justify-between items-center mb-4">
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Jornada {m.jornada}</span>
                                  {/* Removed Court Badge from here, moving to Schedule Area */}
                                  {m.status === 'finalizado' ? (
                                    <Badge type={m.score?.isIncomplete ? 'incomplete' : 'success'}>
                                      {m.score?.isIncomplete ? 'Incompleto' : 'Finalizado'}
                                    </Badge>
                                  ) : (
                                    <Badge>Pendiente</Badge>
                                  )}
                                </div>

                                <div className="text-center mb-2">
                                  <div className="text-sm font-medium text-gray-900 border-b pb-2 mb-2 border-dashed border-gray-100">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="text-right pr-2 border-r border-gray-100">
                                        <span className="block font-bold">{p1.nombre} {p1.apellidos}</span>
                                        <span className="block font-bold">{p2.nombre} {p2.apellidos}</span>
                                      </div>
                                      <div className="text-left pl-2">
                                        <span className="block font-bold">{p3.nombre} {p3.apellidos}</span>
                                        <span className="block font-bold">{p4.nombre} {p4.apellidos}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {m.status === 'finalizado' && (
                                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                                    <span className="font-mono font-bold text-lg text-gray-800 tracking-widest">
                                      {m.score?.set1 ? (
                                        <>
                                          {m.score.set1.p1}-{m.score.set1.p2}
                                          {m.score.set2 && `  ${m.score.set2.p1}-${m.score.set2.p2}`}
                                          {m.score.set3 && `  ${m.score.set3.p1}-${m.score.set3.p2}`}
                                        </>
                                      ) : (
                                        <span>{m.points?.p1 || 0} - {m.points?.p2 || 0}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Dedicated Schedule Area-Bottom of Card */}
                              {/* Only show for formats that use scheduling */}
                              {ranking.format !== 'americano' && ranking.format !== 'mexicano' && (
                                <div
                                  className={`border-t border-gray-100 py-2 px-4 bg-gray-50 flex items-center justify-between rounded-b-xl transition-colors ${isAdmin ? 'cursor-pointer hover:bg-blue-50 group' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid opening Score Modal
                                    if (isAdmin) setSchedulingMatch(m);
                                  }}
                                >
                                  {/* Content based on state */}
                                  {(m.startTime || m.court) ? (
                                    <div className="flex items-center gap-3 text-xs font-semibold text-blue-700 w-full">
                                      <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {m.startTime ? new Date(m.startTime).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                      </div>
                                      {m.court && (
                                        <div className="flex items-center gap-1 border-l border-blue-200 pl-3 ml-auto">
                                          <span>Pista {m.court}</span>
                                        </div>
                                      )}

                                      {/* Conflict Indicator */}
                                      {isAdmin && ranking.schedulerConfig && ranking.playerConstraints && (() => {
                                        const start = new Date(m.startTime!);
                                        const end = SchedulerEngine.addMinutes(start, ranking.schedulerConfig.slotDurationMinutes);
                                        const occupied = SchedulerEngine.getAllOccupiedSlots(ranking, m.id);

                                        const courtConflict = m.court && SchedulerEngine.checkMatchConflict(start, end, m.court, occupied);

                                        const pIds = [m.pair1.p1Id, m.pair1.p2Id, m.pair2.p1Id, m.pair2.p2Id].filter(Boolean) as string[];
                                        const playerConflict = SchedulerEngine.checkPlayerAvailability(start, end, pIds, ranking.playerConstraints || {});

                                        if (courtConflict || !playerConflict.valid) {
                                          return (
                                            <div className="ml-2 text-red-500 animate-pulse" title="Conflicto de horario detectado">
                                              <AlertTriangle size={14} />
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center w-full text-xs font-medium text-gray-400 group-hover:text-blue-600 gap-1">
                                      {isAdmin ? (
                                        <>
                                          <Calendar size={14} /> Programar Partido
                                        </>
                                      ) : (
                                        <span>Sin programar</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Resting Players Section-Only for Americano/Mexicano */}
                      {(ranking.format === 'americano' || ranking.format === 'mexicano') && (() => {
                        const restingPlayers = getRestingPlayers(activeDivision.players, activeDivision.matches, Number(round));

                        if (restingPlayers.length === 0) return null;

                        return (
                          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                <circle cx="12" cy="12" r="10" />
                                <rect x="9" y="9" width="6" height="6" />
                              </svg>
                              <h4 className="font-semibold text-gray-700 text-sm">
                                Descansan esta ronda ({restingPlayers.length})
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {restingPlayers.map(playerId => {
                                const player = players[playerId];
                                if (!player) return null;

                                return (
                                  <div
                                    key={playerId}
                                    className="px-3 py-1.5 bg-white rounded-md border border-gray-300 text-sm text-gray-700 font-medium shadow-sm"
                                  >
                                    {player.nombre} {player.apellidos}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )
            }

          </>
        )
      }

      {/* Match Result Modal */}
      {
        selectedMatch && (
          <MatchModal
            isOpen={!!selectedMatch}
            onClose={() => setSelectedMatch(null)}
            match={selectedMatch}
            players={players}
            onSave={handleUpdateMatch}
            rankingConfig={ranking.config}
            format={ranking.format}
            schedulerConfig={ranking.schedulerConfig}
            occupiedSlots={SchedulerEngine.getAllOccupiedSlots(ranking, selectedMatch.id)}
          />
        )
      }

      {/* Schedule Modal */}
      {
        schedulingMatch && (
          <ScheduleModal
            isOpen={!!schedulingMatch}
            onClose={() => setSchedulingMatch(null)}
            match={schedulingMatch}
            onSave={handleSaveSchedule}
            schedulerConfig={ranking.schedulerConfig}
            occupationSlots={SchedulerEngine.getAllOccupiedSlots(ranking, schedulingMatch.id)}
            playerConstraints={ranking.playerConstraints}
            players={players}
          />
        )
      }

      {/* Add Division Modal */}
      {
        isAdmin && isAddDivModalOpen && onAddDivision && (


          <AddDivisionModal
            isOpen={isAddDivModalOpen}
            onClose={() => setIsAddDivModalOpen(false)}
            nextDivisionNumber={ranking.divisions.length + 1}
            players={players}
            occupiedPlayerIds={occupiedPlayerIds}
            rankingFormat={ranking.format}
            rankingConfig={ranking.config}
            hasConsolation={ranking.config?.eliminationConfig?.consolation}
            onSave={(div) => {
              onAddDivision(div);
              // Handle array vs single division for UI switch
              if (Array.isArray(div)) {
                if (div.length > 0) setActiveDivisionId(div[0].id);
              } else {
                setActiveDivisionId(div.id);
              }
              setIsAddDivModalOpen(false);
            }}
          />
        )
      }


      {/* Promotion Modal */}
      {
        isPromotionModalOpen && promotionData && (
          <PromotionModal
            isOpen={isPromotionModalOpen}
            onClose={() => setIsPromotionModalOpen(false)}
            movements={promotionData.movements}
            players={players}
            onConfirm={handleConfirmPromotion}
            overrides={promotionOverrides}
            onOverrideChange={handleOverrideChange}
          />
        )
      }


      {/* Status Management Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Gestión del Estado del Torneo"
      >
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => { onUpdateRanking && onUpdateRanking({ ...ranking, status: 'activo' }); setIsStatusModalOpen(false); }}
            className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${ranking.status === 'activo'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
              }`}
          >
            <div className={`p-3 rounded-full ${ranking.status === 'activo' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Play size={24} fill="currentColor" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-gray-900">Activo</h4>
              <p className="text-sm text-gray-500">El torneo está en curso. Los jugadores pueden ver resultados y clasificaciones.</p>
            </div>
            {ranking.status === 'activo' && <CheckCircle className="ml-auto text-green-500" />}
          </button>

          <button
            onClick={() => { onUpdateRanking && onUpdateRanking({ ...ranking, status: 'pausado' }); setIsStatusModalOpen(false); }}
            className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${ranking.status === 'pausado'
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
              }`}
          >
            <div className={`p-3 rounded-full ${ranking.status === 'pausado' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <PauseCircle size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-gray-900">Pausado</h4>
              <p className="text-sm text-gray-500">Detener temporalmente. No se pueden introducir nuevos resultados.</p>
            </div>
            {ranking.status === 'pausado' && <CheckCircle className="ml-auto text-orange-500" />}
          </button>

          <button
            onClick={() => {
              if (confirm('¿Estás seguro de finalizar el torneo? Se moverá al historial.')) {
                onUpdateRanking && onUpdateRanking({ ...ranking, status: 'finalizado' });
                setIsStatusModalOpen(false);
              }
            }}
            className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${ranking.status === 'finalizado'
              ? 'border-gray-500 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
          >
            <div className={`p-3 rounded-full ${ranking.status === 'finalizado' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <CheckCircle size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-gray-900">Finalizado</h4>
              <p className="text-sm text-gray-500">Torneo concluido. Se archiva en el historial y es de solo lectura.</p>
            </div>
            {ranking.status === 'finalizado' && <CheckCircle className="ml-auto text-gray-800" />}
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>Cancelar</Button>
        </div>
      </Modal>

      <SubstituteModal
        isOpen={isSubstituteModalOpen}
        onClose={() => setIsSubstituteModalOpen(false)}
        onSubstitute={handleSubstitutePlayer}
        divisionPlayers={activeDivision ? activeDivision.players.map(id => players[id]).filter(Boolean) : []}
        availablePlayers={Object.values(players)}
        currentDiv={activeDivision?.numero || 1}
      />

      <AddManualMatchModal
        isOpen={isManualMatchModalOpen}
        onClose={() => setIsManualMatchModalOpen(false)}
        players={players}
        divisions={ranking.divisions}
        onImport={handleImportMatch}
      />

      <AddPairModal
        isOpen={isAddPairModalOpen}
        onClose={() => setIsAddPairModalOpen(false)}
        players={players}
        occupiedPlayerIds={Array.from(occupiedPlayerIds)}
        onAddPair={onAddPair}
      />

      <SchedulerConfigModal
        isOpen={isSchedulerConfigModalOpen}
        onClose={() => setIsSchedulerConfigModalOpen(false)}
        tournament={ranking}
        players={players}
        onSave={handleSaveSchedulerConfig}
        initialConfig={ranking.schedulerConfig}
        initialConstraints={ranking.playerConstraints}
      />

      <ScheduleGridModal
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        matches={ranking.divisions.flatMap(d => d.matches)}
        players={players}
        divisions={ranking.divisions}
        config={ranking.schedulerConfig}
      />


      <RankingSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        ranking={ranking}
        onUpdateRanking={onUpdateRanking}
        isAdmin={isAdmin}
      />

      <StatsAdjustmentModal
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          setEditingPlayerId(null);
        }}
        initialStats={editingPlayerId ? ranking.manualStatsAdjustments?.[editingPlayerId] || {} : {}}
        playerName={editingPlayerName}
        onSave={(stats) => {
          if (!editingPlayerId || !onUpdateRanking) return;
          const newHelper = { ...(ranking.manualStatsAdjustments || {}) };

          // Remove empty keys to verify if object is empty
          // Check if all values are 0 or undefined
          const isEmpty = Object.values(stats).every(val => !val || val === 0);

          if (isEmpty) {
            delete newHelper[editingPlayerId];
          } else {
            newHelper[editingPlayerId] = stats;
          }

          onUpdateRanking({
            ...ranking,
            manualStatsAdjustments: newHelper
          });
        }}
      />
    </div >
  );
};
