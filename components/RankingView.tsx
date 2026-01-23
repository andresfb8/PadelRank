import React, { useState, useEffect } from 'react';
import { Play, Calendar, Trophy, Share2, ArrowLeft, Check, Copy, Plus, ChevronDown, BarChart, Flag, BookOpen, Edit2, Save, Settings, PauseCircle, CheckCircle, Users } from 'lucide-react';
import { Button, Card, Badge, Modal } from './ui/Components';

import { generateStandings, generateGlobalStandings, calculatePromotions } from '../services/logic';
import { Match, Player, Ranking, Division } from '../types';
import { MatchGenerator } from '../services/matchGenerator';
import { AddDivisionModal } from './AddDivisionModal';
import { PromotionModal } from './PromotionModal';
import { SubstituteModal } from './SubstituteModal';
import { AddManualMatchModal } from './AddManualMatchModal';
import { AddPairModal } from './AddPairModal';
import { MatchModal } from './MatchModal';

interface Props {
  ranking: Ranking;
  players: Record<string, Player>;
  onMatchClick?: (m: Match) => void;
  onBack?: () => void;
  onAddDivision?: (division: Division) => void;
  onUpdateRanking?: (ranking: Ranking) => void;
  isAdmin?: boolean;
  onUpdatePlayerStats?: (playerId: string, result: 'win' | 'loss' | 'draw') => void;
  onPlayerClick?: (playerId: string) => void;
}

export const RankingView = ({ ranking, players, onMatchClick, onBack, onAddDivision, onUpdateRanking, isAdmin, onUpdatePlayerStats, onPlayerClick }: Props) => {
  const [activeDivisionId, setActiveDivisionId] = useState<string>(ranking.divisions[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'global' | 'rules'>('standings');
  const [copied, setCopied] = useState(false);
  const [isAddDivModalOpen, setIsAddDivModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [promotionData, setPromotionData] = useState<{ newDivisions: Division[], movements: any[] } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteData, setSubstituteData] = useState({ oldPlayerId: '', newPlayerName: '', newPlayerEmail: '', nextPhaseDiv: '' });
  const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState(false);
  const [isAddPairModalOpen, setIsAddPairModalOpen] = useState(false);
  const [promotionOverrides, setPromotionOverrides] = useState<{ playerId: string, forceDiv: number }[]>([]);

  const handleMatchClick = (m: Match) => {
    setSelectedMatch(m);
    if (onMatchClick) onMatchClick(m);
  };

  const handleSaveMatchResult = (matchId: string, result: any) => {
    // Find the match in the active division and update it
    // Then propagate up via onUpdateRanking
    if (!activeDivision || !onUpdateRanking) return;

    const matchIndex = activeDivision.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;

    const updatedMatch = { ...activeDivision.matches[matchIndex], score: result, status: 'finalizado' as const, points: result.points };
    const updatedMatches = [...activeDivision.matches];
    updatedMatches[matchIndex] = updatedMatch;

    const updatedDivision = { ...activeDivision, matches: updatedMatches };
    const updatedRanking = {
      ...ranking,
      divisions: ranking.divisions.map(d => d.id === activeDivisionId ? updatedDivision : d)
    };

    onUpdateRanking(updatedRanking);

    // GLOBAL STATS UPDATE (Fire and Forget)
    // ONLY for Classic (Ranking) and Individual formats. Exclude Americano/Mexicano.
    const isRankedFormat = ranking.format === 'classic' || ranking.format === 'individual';

    // Only update stats if the match was NOT already finished (prevents double counting on edits)
    // Note: If a user edits a result (e.g. changes winner), stats won't auto-correct with this simple check.
    // They would need manual adjustment or a full recalculation feature.
    const previousStatus = activeDivision.matches[matchIndex].status;
    const isFirstTimeFinalizing = updatedMatch.status === 'finalizado' && previousStatus !== 'finalizado';

    if (isFirstTimeFinalizing && onUpdatePlayerStats && activeDivision && isRankedFormat) {
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

  // Data for current view
  const standings = activeDivision ? generateStandings(activeDivision.id, activeDivision.matches, activeDivision.players, ranking.format as any) : [];
  const globalStandings = activeTab === 'global' ? generateGlobalStandings(ranking) : [];

  // Calculate players already in the tournament to prevent duplicates in new divisions
  const occupiedPlayerIds = new Set<string>();
  ranking.divisions.forEach(div => {
    div.players.forEach(pid => occupiedPlayerIds.add(pid));
  });

  const copyToClipboard = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?id=${ranking.id}`;
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

  const handleSubstitutePlayer = () => {
    if (!activeDivision || !onUpdateRanking || !substituteData.oldPlayerId || (!substituteData.newPlayerName && !substituteData.newPlayerEmail)) return;

    const { oldPlayerId, newPlayerName, newPlayerEmail } = substituteData;

    // Create a new player object if newPlayerName/Email is provided
    let newPlayerId = '';
    if (newPlayerName || newPlayerEmail) {
      // Generate a unique ID for the new player
      newPlayerId = `sub_${Date.now()}`;
      // Add new player to the global players object (this would typically be handled by a parent component)
      // For now, we'll assume the parent `onUpdateRanking` will handle player creation if needed.
      // This is a simplified client-side substitution.
    } else {
      // If no new player name/email, it means the player is just removed.
      // In this case, newPlayerId remains empty, and the old player is just marked retired.
    }


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
    const nextPhaseDivStr = substituteData.nextPhaseDiv;

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
    setSubstituteData({ oldPlayerId: '', newPlayerName: '', newPlayerEmail: '', nextPhaseDiv: '' });
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
        activeDivision.players.map(id => players[id] || { id, nombre: '?', apellidos: '' } as Player),
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
    alert(`✅ Roda ${nextRound} generada (${newMatches.length} partidos).`);
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

    // Simple point calculation for imported match (assuming standard rules or just recording history)
    // For pairs league we usually want points. Let's start with basic win/loss logic for points.
    let p1Points = 0;
    let p2Points = 0;

    // Determine winner based on sets
    let p1Sets = 0;
    let p2Sets = 0;
    if (matchData.score.set1.p1 > matchData.score.set1.p2) p1Sets++; else p2Sets++;
    if (matchData.score.set2.p1 > matchData.score.set2.p2) p1Sets++; else p2Sets++;
    if (matchData.score.set3) { if (matchData.score.set3.p1 > matchData.score.set3.p2) p1Sets++; else p2Sets++; }

    // Classic Pairs Points (usually 3 for win, 1 for loss etc.. let's default to standard logic)
    // To match calculateMatchPoints default config:
    if (p1Sets > p2Sets) { p1Points = 3; p2Points = 1; }
    else { p1Points = 1; p2Points = 3; }

    newMatch.points = { p1: p1Points, p2: p2Points };

    division.matches = [...division.matches, newMatch];
    divisions[divIndex] = division;

    onUpdateRanking({ ...ranking, divisions });
  };

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
                    }`}
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
                  }`}>
                  {ranking.status}
                </span>
              )}
              <span>•</span>
              <span>{ranking.categoria}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          {isAdmin && onUpdateRanking && (ranking.format === 'mexicano' || ranking.format === 'americano' || ranking.format === 'pairs') && (
            <div className="flex gap-2">
              {ranking.format === 'pairs' && (
                <Button onClick={() => setIsManualMatchModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 text-sm px-3 py-2" title="Importar partido pasado">
                  <Save size={16} /> <span className="hidden sm:inline">Importar Partido</span>
                </Button>
              )}
              {ranking.format === 'pairs' && (
                <Button onClick={handleAddPairAndRegenerate} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-sm px-3 py-2" title="Gestionar Parejas y Regenerar">
                  <Users size={16} /> <span className="hidden sm:inline">Gestionar Parejas</span>
                </Button>
              )}
              {ranking.format !== 'pairs' && (
                <Button onClick={handleGenerateNextRound} className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 text-sm px-3 py-2">
                  <Plus size={16} /> <span className="hidden sm:inline">Nueva Ronda</span>
                </Button>
              )}
            </div>
          )}
          {isAdmin && onUpdateRanking && (ranking.format === 'classic' || ranking.format === 'individual') && (
            <Button onClick={handleOpenPromotionModal} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 text-sm px-3 py-2">
              <Flag size={16} /> <span className="hidden sm:inline">Finalizar Fase</span>
            </Button>
          )}
          {isAdmin && onUpdateRanking && activeDivision && (
            <Button onClick={() => setIsSubstituteModalOpen(true)} className="bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2 text-sm px-3 py-2">
              <Users size={16} /> <span className="hidden sm:inline">Sustituir Jugador</span>
            </Button>
          )}
          <Button
            variant="secondary"
            className={`!p-2 text-primary flex items-center gap-2 transition-all ${copied ? 'bg-green-50 !text-green-600' : ''}`}
            onClick={copyToClipboard}
            title="Copiar URL Pública"
          >
            {copied ? (
              <> <Check size={18} /> <span className="text-sm font-medium">Copiado</span> </>
            ) : (
              <div className="flex items-center gap-2"> <Share2 size={18} /> <span className="md:hidden text-sm">Compartir</span> </div>
            )}
          </Button>
        </div>
      </div>

      {/* Division Tabs */}
      {ranking.format !== 'mexicano' && ranking.format !== 'americano' && (ranking.divisions.length > 1 || (ranking.history && ranking.history.length > 0) || ranking.format === 'individual' || ranking.format === 'classic' || ranking.format === 'pairs') && (
        <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'global'
              ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
          >
            <BarChart size={16} /> Global
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'rules'
              ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
          >
            <BookOpen size={16} /> Normas
          </button>
          {ranking.divisions.sort((a, b) => a.numero - b.numero).map(div => (
            <button
              key={div.id}
              onClick={() => { setActiveDivisionId(div.id); setActiveTab('standings'); }}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${activeDivisionId === div.id && activeTab !== 'global' && activeTab !== 'rules'
                ? 'bg-white text-primary border-b-2 border-primary shadow-sm z-10'
                : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              División {div.numero}
            </button>
          ))}
          {isAdmin && onAddDivision && (
            <button
              onClick={() => setIsAddDivModalOpen(true)}
              className="px-3 py-2 rounded-t-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center"
              title="Añadir nueva división"
            >
              <Plus size={16} />
            </button>
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
              }`}
          >
            <Trophy size={16} /> Competición
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'rules'
              ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
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
                      const defaultRules = `**3. PUNTUACIÓN Y CLASIFICACIÓN**\n` +
                        `Se premia cada set conseguido para fomentar la competitividad:\n` +
                        `- Victoria 2-0: 4 Puntos.\n` +
                        `- Victoria 2-1: 3 Puntos.\n` +
                        `- Empate: 2 Puntos.\n` +
                        `- Derrota 1-2: 1 Punto.\n` +
                        `- Derrota 0-2: 0 Puntos.\n` +
                        `*(Nota: Si un partido no se juega, ningún jugador recibe puntos).*\n\n` +
                        `**Criterios de desempate:**\n` +
                        `En caso de igualdad a puntos, el orden se decide por:\n` +
                        `1. Puntos totales.\n` +
                        `2. Diferencia de sets.\n` +
                        `3. Diferencia de juegos.\n` +
                        `4. Sets ganados.\n` +
                        `5. Juegos ganados.\n` +
                        `6. Sorteo.\n\n` +
                        `**4. FORMATO DE PARTIDO Y REGLAMENTO**\n` +
                        `**Estructura:** Partidos al mejor de 3 sets con Punto de Oro. Los dos primeros sets se juega Tie Break si se llega al 5-5. El tercer set, si fuera necesario, sería un Súper Tie-Break a 11 puntos. Se puede jugar partido completo si se tiene reserva de más de 1 hora y se llega a un acuerdo entre los 4 jugadores, si no, se mantiene el formato anterior.\n\n` +
                        `**Regla de la "Alarma" (Partidos de 1 hora):**\n` +
                        `- Los jugadores deben poner una alarma de 1 hora al inicio de la reserva (recomendamos llegar antes del inicio para calentar y jugar la hora completa).\n` +
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

      {/* Division/Global Content */}
      {activeTab !== 'rules' && (
        <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 px-2 lg:text-lg">
            {activeTab === 'global' ? 'Estadísticas Globales' :
              `División ${activeDivision?.numero}`}
          </h3>
          {activeTab !== 'global' && (
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'standings' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Clasificación
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'matches' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
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
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><BarChart size={18} className="text-primary" /> Ranking General Unificado</h3>
            <p className="text-xs text-gray-500 mt-1">Estadísticas acumuladas de todos los jugadores independientemente de su división.</p>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden">
            {globalStandings.map((row) => {
              let displayName = 'Desconocido';

              const formatCompactName = (name: string, surname?: string) => {
                if (!name) return '?';
                return `${name} ${surname ? surname.charAt(0) + '.' : ''}`;
              };

              if (ranking.format === 'pairs') {
                const [p1Id, p2Id] = row.playerId.split('-');
                const p1 = players[p1Id];
                const p2 = players[p2Id];
                displayName = `${formatCompactName(p1?.nombre || '?', p1?.apellidos)} / ${formatCompactName(p2?.nombre || '?', p2?.apellidos)}`;
              } else {
                const player = players[row.playerId];
                if (player) displayName = formatCompactName(player.nombre, player.apellidos);
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
                        <div className="font-semibold text-gray-900 text-base">{displayName}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-2xl font-bold text-primary leading-none">{row.pts}</div>
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
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3 text-center w-12 sticky left-0 bg-gray-50 z-10">#</th>
                  <th className="px-4 py-3 sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[260px] min-w-[260px] max-w-[260px]">
                    {ranking.format === 'pairs' ? 'Pareja' : 'Jugador'}
                  </th>
                  <th className="px-4 py-3 text-center">Partidos</th>
                  <th className="px-4 py-3 text-center">PTS</th>
                  <th className="px-4 py-3 text-center">PG</th>
                  <th className="px-4 py-3 text-center">PP</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Dif Sets</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Dif Juegos</th>
                  <th className="px-4 py-3 text-center">% Vic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {globalStandings.map((row) => {
                  let displayName = 'Desconocido';
                  if (ranking.format === 'pairs') {
                    const [p1Id, p2Id] = row.playerId.split('-');
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
                        {onPlayerClick ? (
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
                      <td className="px-4 py-3 text-center font-bold text-primary">{row.pts}</td>
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
        </Card>
      )
      }

      {
        activeTab === 'standings' && (
          <Card className="overflow-hidden !p-0">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> Tabla de Clasificación</h3>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {activeTab === 'standings' && standings.map((row) => {
                let displayName = 'Desconocido';
                const isPromoted = row.pos <= (ranking.config?.promotionCount || 2);
                const isRelegated = row.pos > standings.length - (ranking.config?.relegationCount || 2);

                const formatCompactName = (name: string, surname?: string) => {
                  if (!name) return '?';
                  return `${name} ${surname ? surname.charAt(0) + '.' : ''}`;
                };

                if (ranking.format === 'pairs') {
                  const [p1Id, p2Id] = row.playerId.split('-');
                  const p1 = players[p1Id];
                  const p2 = players[p2Id];
                  displayName = `${formatCompactName(p1?.nombre || '?', p1?.apellidos)} / ${formatCompactName(p2?.nombre || '?', p2?.apellidos)}`;
                } else {
                  const player = players[row.playerId];
                  if (player) displayName = formatCompactName(player.nombre, player.apellidos);
                }

                const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;

                return (
                  <div key={row.playerId} className={`p-4 border-b border-gray-100 last:border-0 ${isPromoted ? 'bg-green-50/30' : isRelegated ? 'bg-red-50/30' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full ${row.pos === 1 ? 'bg-yellow-100 text-yellow-700' :
                          row.pos === 2 ? 'bg-gray-100 text-gray-700' :
                            row.pos === 3 ? 'bg-orange-100 text-orange-800' : 'text-gray-500 bg-gray-50'
                          }`}>
                          #{row.pos}
                        </span>
                        <div>
                          <div className="font-semibold text-gray-900 text-base">{displayName}</div>
                          <div className="text-xs text-gray-400 font-medium">
                            {isPromoted ? <span className="text-green-600 flex items-center gap-1">🟢 Ascenso</span> :
                              isRelegated ? <span className="text-red-600 flex items-center gap-1">🔴 Descenso</span> :
                                'Permanencia'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-2xl font-bold text-primary leading-none">{row.pts}</div>
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
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                  <tr>
                    <th className="px-4 py-3 text-center w-12 sticky left-0 bg-gray-50 z-10">Pos</th>
                    <th className="px-4 py-3 sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[260px] min-w-[260px] max-w-[260px]">Jugador</th>
                    <th className="px-4 py-3 text-center">PJ</th>
                    <th className="px-4 py-3 text-center">PTS</th>
                    <th className="px-4 py-3 text-center">% Vic</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Sets +/-</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">Juegos +/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {standings.map((row) => {
                    const isPair = row.playerId.includes('-');
                    let playerName = 'Desconocido';

                    if (isPair) {
                      const [p1Id, p2Id] = row.playerId.split('-');
                      const p1 = players[p1Id];
                      const p2 = players[p2Id];
                      playerName = `${p1?.nombre || '?'} ${p1?.apellidos || ''} / ${p2?.nombre || '?'} ${p2?.apellidos || ''}`;
                    } else {
                      const player = players[row.playerId];
                      if (!player) return null;
                      playerName = `${player.nombre} ${player.apellidos}`;
                    }

                    let posClass = "bg-white text-gray-700";
                    if (activeDivision && activeDivision.numero > 1 && row.pos <= 2) posClass = "bg-green-100 text-green-800 border-r border-green-200";
                    if (!isLastDivision && row.pos >= 3) posClass = "bg-red-100 text-red-800 border-r border-red-200";

                    const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;

                    return (
                      <tr key={row.playerId} className="hover:bg-gray-50 transition-colors">
                        <td className={`px-4 py-3 text-center font-bold sticky left-0 z-10 ${posClass}`}>{row.pos}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {onPlayerClick ? (
                            <button
                              onClick={() => onPlayerClick(row.playerId)}
                              className="truncate max-w-[260px] text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                              title={playerName}
                            >
                              {playerName}
                            </button>
                          ) : (
                            <div className="truncate max-w-[260px]" title={playerName}>{playerName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.pj}</td>
                        <td className="px-4 py-3 text-center font-bold text-primary">{row.pts}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{winrate}%</td>
                        <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{row.setsDiff > 0 ? `+${row.setsDiff}` : row.setsDiff}</td>
                        <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-2 bg-gray-50 text-xs text-gray-400 flex gap-4 justify-end border-t">
              {activeDivision && activeDivision.numero > 1 && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-200"></div> Zona Ascenso</span>}
              {!isLastDivision && <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-200"></div> Zona Descenso</span>}
            </div>
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
                    const p2 = players[m.pair1.p2Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair1.p1Id };
                    const p3 = players[m.pair2.p1Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair2.p1Id };
                    const p4 = players[m.pair2.p2Id] || { nombre: 'Desconocido', apellidos: '', id: m.pair2.p1Id };

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
                        onClick={() => isAdmin && handleMatchClick(m)}
                        className={`bg-white p-4 rounded-xl border transition-all ${isAdmin ? 'cursor-pointer hover:border-primary hover:shadow-md' : 'border-gray-100'}`}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Jornada {m.jornada}</span>
                          {m.court && <Badge type="neutral" className="ml-2">Pista {m.court}</Badge>}
                          {m.status === 'finalizado' ? (
                            <Badge type={m.score?.isIncomplete ? 'incomplete' : 'success'}>
                              {m.score?.isIncomplete ? 'Incompleto' : 'Finalizado'}
                            </Badge>
                          ) : (
                            <Badge>Pendiente</Badge>
                          )}
                        </div>

                        <div className="text-center mb-4">
                          <div className="text-sm font-medium text-gray-900">
                            <span className="block mb-1">{p1.nombre} {p1.apellidos} - {p2.nombre} {p2.apellidos}</span>
                            <span className="text-primary font-black text-xs uppercase tracking-widest my-1 block">VS</span>
                            <span className="block mt-1">{p3.nombre} {p3.apellidos} - {p4.nombre} {p4.apellidos}</span>
                          </div>
                        </div>

                        {m.status === 'finalizado' && (
                          <div className="bg-gray-50 rounded-lg p-2 text-center mb-2">
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

                        {m.status === 'finalizado' && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                            <span>Puntos: {m.points?.p1 || 0} - {m.points?.p2 || 0}</span>
                            <span>{m.score?.description}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
            onSave={handleSaveMatchResult}
            rankingConfig={ranking.config}
            format={ranking.format}
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
            onSave={(div) => {
              onAddDivision(div);
              setActiveDivisionId(div.id); // Switch to new division
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
        players={players}
        divisions={ranking.divisions}
        data={substituteData}
        onChange={(field, value) => setSubstituteData({ ...substituteData, [field]: value })}
        onConfirm={handleSubstitutePlayer}
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


    </div >
  );
};
