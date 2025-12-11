
import React, { useState, useEffect } from 'react';
import { Play, Calendar, Trophy, Share2, Volume2, ArrowLeft, Check, Copy, Plus, ChevronDown, BarChart, Flag } from 'lucide-react';
import { Button, Card, Badge } from './ui/Components';
import { generateStandings, generateGlobalStandings, calculatePromotions } from '../services/logic';
import { Match, Player, Ranking, Division } from '../types';
import { generateSpeech } from '../services/geminiService';
import { AddDivisionModal } from './AddDivisionModal';
import { PromotionModal } from './PromotionModal';

interface Props {
  ranking: Ranking;
  players: Record<string, Player>;
  onMatchClick?: (m: Match) => void;
  onBack?: () => void;
  onAddDivision?: (division: Division) => void;
  onUpdateRanking?: (ranking: Ranking) => void;
  isAdmin?: boolean;
}

export const RankingView = ({ ranking, players, onMatchClick, onBack, onAddDivision, onUpdateRanking, isAdmin }: Props) => {
  const [activeDivisionId, setActiveDivisionId] = useState<string>(ranking.divisions[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'global'>('standings');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAddDivModalOpen, setIsAddDivModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [promotionData, setPromotionData] = useState<{ newDivisions: Division[], movements: any[] } | null>(null);

  // Auto-select first division if activeDivisionId is invalid
  useEffect(() => {
    if (!ranking.divisions.find(d => d.id === activeDivisionId) && activeTab !== 'global') {
      if (ranking.divisions.length > 0) setActiveDivisionId(ranking.divisions[0].id);
    }
  }, [ranking, activeDivisionId, activeTab]);

  const activeDivision = ranking.divisions.find(d => d.id === activeDivisionId);
  const isLastDivision = activeDivision && activeDivision.numero === ranking.divisions.length;

  // Data for current view
  const standings = activeDivision ? generateStandings(activeDivision.id, activeDivision.matches, activeDivision.players) : [];
  const globalStandings = activeTab === 'global' ? generateGlobalStandings(ranking) : [];

  // Calculate players already in the tournament to prevent duplicates in new divisions
  const occupiedPlayerIds = new Set<string>();
  ranking.divisions.forEach(div => {
    div.players.forEach(pid => occupiedPlayerIds.add(pid));
  });

  const handleReadStandings = async () => {
    if (isPlayingAudio || !activeDivision) return;
    setIsPlayingAudio(true);

    const top3 = standings.slice(0, 3).map(s => {
      const p = players[s.playerId];
      return `${s.pos}º lugar, ${p.nombre} ${p.apellidos} con ${s.pts} puntos.`;
    }).join(' ');

    const text = `Clasificación para ${ranking.nombre}, División ${activeDivision.numero}. ${top3}`;

    try {
      const audioBuffer = await generateSpeech(text);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(audioBuffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      source.onended = () => setIsPlayingAudio(false);
    } catch (e) {
      console.error(e);
      setIsPlayingAudio(false);
    }
  };

  const copyToClipboard = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?id=${ranking.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPromotionModal = () => {
    const result = calculatePromotions(ranking);
    setPromotionData(result);
    setIsPromotionModalOpen(true);
  };

  const handleConfirmPromotion = () => {
    if (!promotionData || !onUpdateRanking) return;
    const updatedRanking = {
      ...ranking,
      divisions: promotionData.newDivisions
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
              <span className={`uppercase font-medium text-xs px-2 py-0.5 rounded-full ${ranking.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {ranking.status}
              </span>
              <span>•</span>
              <span>{ranking.categoria}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          {isAdmin && onUpdateRanking && (
            <Button onClick={handleOpenPromotionModal} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 text-sm px-3 py-2">
              <Flag size={16} /> <span className="hidden sm:inline">Finalizar Fase</span>
            </Button>
          )}
          <Button
            variant="secondary"
            className={`!p-2 text-primary flex items-center gap-2 transition-all ${copied ? 'bg-green-50 !text-green-600' : ''}`}
            onClick={copyToClipboard}
            title="Copiar URL Pública"
          >
            {copied ? (
              <>
                <Check size={18} /> <span className="text-sm font-medium">Copiado</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Share2 size={18} /> <span className="md:hidden text-sm">Compartir</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Division Tabs */}
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
        {ranking.divisions.sort((a, b) => a.numero - b.numero).map(div => (
          <button
            key={div.id}
            onClick={() => { setActiveDivisionId(div.id); setActiveTab('standings'); }}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap ${activeDivisionId === div.id && activeTab !== 'global'
              ? 'bg-white border-b-2 border-primary text-primary shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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

      {/* Division/Global Content */}
      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-700 px-2">
          {activeTab === 'global' ? 'Estadísticas Globales del Torneo' : `División ${activeDivision?.numero}`}
        </h3>
        {activeTab !== 'global' && (
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'standings' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Clasificación
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'matches' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Partidos
            </button>
          </div>
        )}
      </div>

      {activeTab === 'global' && (
        <Card className="overflow-hidden !p-0">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><BarChart size={18} className="text-primary" /> Ranking General Unificado</h3>
            <p className="text-xs text-gray-500 mt-1">Estadísticas acumuladas de todos los jugadores independientemente de su división.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3 text-center w-12 sticky left-0 bg-gray-50 z-10">#</th>
                  <th className="px-4 py-3 sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Jugador</th>
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
                  const player = players[row.playerId];
                  if (!player) return null;
                  const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;
                  return (
                    <tr key={row.playerId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-gray-400 sticky left-0 bg-white z-10">{row.pos}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="truncate max-w-[120px] sm:max-w-none">{player.nombre} {player.apellidos}</div>
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
      )}

      {activeTab === 'standings' && (
        <Card className="overflow-hidden !p-0">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> Tabla de Clasificación</h3>
            <Button variant="secondary" onClick={handleReadStandings} disabled={isPlayingAudio} className="text-xs">
              <Volume2 size={14} className="mr-1" /> {isPlayingAudio ? 'Leyendo...' : 'Leer voz alta'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-4 py-3 text-center w-12 sticky left-0 bg-gray-50 z-10">Pos</th>
                  <th className="px-4 py-3 sticky left-12 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Jugador</th>
                  <th className="px-4 py-3 text-center">PJ</th>
                  <th className="px-4 py-3 text-center">PTS</th>
                  <th className="px-4 py-3 text-center">% Vic</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Sets +/-</th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">Juegos +/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((row) => {
                  const player = players[row.playerId];
                  if (!player) return null;

                  let rowClass = "";
                  // Promotion zone: Pos 1-2, but not for Div 1
                  if (activeDivision && activeDivision.numero > 1 && row.pos <= 2) rowClass = "bg-green-50/50";
                  // Relegation zone: Pos 3-4, BUT NOT for the LAST division
                  if (!isLastDivision && row.pos >= 3) rowClass = "bg-red-50/50";

                  const winrate = row.pj > 0 ? Math.round((row.pg / row.pj) * 100) : 0;

                  return (
                    <tr key={row.playerId} className={`hover:bg-gray-50 transition-colors ${rowClass}`}>
                      <td className="px-4 py-3 text-center font-bold text-gray-700 sticky left-0 bg-white z-10">{row.pos}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="truncate max-w-[120px] sm:max-w-none">{player.nombre} {player.apellidos}</div>
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
      )}

      {activeTab === 'matches' && activeDivision && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeDivision.matches.map((m) => {
            const p1 = players[m.pair1.p1Id];
            const p2 = players[m.pair1.p2Id];
            const p3 = players[m.pair2.p1Id];
            const p4 = players[m.pair2.p2Id];

            if (!p1 || !p2 || !p3 || !p4) return null;

            return (
              <div
                key={m.id}
                onClick={() => isAdmin && onMatchClick && onMatchClick(m)}
                className={`bg-white p-4 rounded-xl border transition-all ${isAdmin ? 'cursor-pointer hover:border-primary hover:shadow-md' : 'border-gray-100'}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Jornada {m.jornada}</span>
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
                    <span className="block mb-1">{p1.nombre} - {p2.nombre}</span>
                    <span className="text-primary font-black text-xs uppercase tracking-widest my-1 block">VS</span>
                    <span className="block mt-1">{p3.nombre} - {p4.nombre}</span>
                  </div>
                </div>

                {m.status === 'finalizado' && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center mb-2">
                    <span className="font-mono font-bold text-lg text-gray-800 tracking-widest">
                      {m.score?.set1.p1}-{m.score?.set1.p2}
                      {m.score?.set2 && `  ${m.score.set2.p1}-${m.score.set2.p2}`}
                      {m.score?.set3 && `  ${m.score.set3.p1}-${m.score.set3.p2}`}
                    </span>
                  </div>
                )}

                {m.status === 'finalizado' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>Puntos: {m.points.p1} - {m.points.p2}</span>
                    <span>{m.score?.description}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Division Modal */}
      {isAdmin && isAddDivModalOpen && onAddDivision && (
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
      )}

      {/* Promotion Modal */}
      {isPromotionModalOpen && promotionData && (
        <PromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          movements={promotionData.movements}
          players={players}
          onConfirm={handleConfirmPromotion}
        />
      )}
    </div>
  );
};
