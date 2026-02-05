import React from 'react';
import { Match, Player, Ranking, Division } from '../types';
import { Button } from './ui/Components';
import { Trophy, ArrowUp, ArrowDown, Award, Edit2, PlayCircle, CheckCircle2, Minus } from 'lucide-react';

interface Props {
    ranking: Ranking;
    division: Division;
    players: Record<string, Player>;
    onMatchUpdate: (matchId: string, data: any) => void;
    isAdmin: boolean;
    onGenerateNextRound?: () => void;
    onMatchClick?: (match: Match) => void;
}

export const PozoView = ({ ranking, division, players, onMatchUpdate, isAdmin, onGenerateNextRound, onMatchClick }: Props) => {
    const currentRound = division.matches.reduce((max, m) => Math.max(max, m.jornada), 0);
    const currentMatches = division.matches
        .filter(m => m.jornada === currentRound)
        .sort((a, b) => (a.court || 99) - (b.court || 99));

    const config = ranking.config?.pozoConfig;
    const isRoundComplete = currentMatches.length > 0 && currentMatches.every(m => m.status === 'finalizado');

    if (!config) return <div className="p-8 text-center text-gray-500">Error: Configuración de Pozo no encontrada.</div>;

    return (
        <div className="flex flex-col items-center w-full px-4 py-6">
            <div className="w-full max-w-5xl space-y-6">
                {/* Unified Header */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-3 rounded-xl shadow-inner">
                            <Trophy className="text-amber-600 w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                                Ronda {currentRound}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {config.variant === 'individual' ? 'Individual' : 'Parejas Fijas'} • {
                                    ranking.config?.scoringMode === 'per-game' ? '1 Set' :
                                        ranking.config?.scoringMode ? `${ranking.config.scoringMode} Ptos` : '1 Set'
                                }
                            </p>
                        </div>
                    </div>

                    {isAdmin && onGenerateNextRound && (
                        <Button
                            onClick={onGenerateNextRound}
                            disabled={!isRoundComplete}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${isRoundComplete
                                    ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                }`}
                        >
                            {isRoundComplete ? "Generar Siguiente Ronda →" : "Esperando resultados..."}
                        </Button>
                    )}
                </div>

                {/* The Ledger (Compact List) */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-200 overflow-hidden">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <div className="col-span-1 text-center">Pista</div>
                        <div className="col-span-5 pl-2">Enfrentamiento</div>
                        <div className="col-span-2 text-center">Movimiento</div>
                        <div className="col-span-2 text-center">Marcador</div>
                        <div className="col-span-2 text-right">Acción</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {currentMatches.map((match, index) => {
                            const courtNum = match.court || index + 1;
                            const isWinnersCourt = courtNum === 1;
                            const isLosersCourt = courtNum === config.numCourts;

                            return (
                                <MatchRow
                                    key={match.id}
                                    match={match}
                                    courtNum={courtNum}
                                    isWinnersCourt={isWinnersCourt}
                                    isLosersCourt={isLosersCourt}
                                    players={players}
                                    isAdmin={isAdmin}
                                    onMatchClick={onMatchClick}
                                />
                            );
                        })}
                    </div>
                </div>

                {!currentMatches.length && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <PlayCircle size={32} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No hay partidos activos.</p>
                        <p className="text-sm text-gray-400">Genera una nueva ronda para comenzar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MatchRow = ({ match, courtNum, isWinnersCourt, isLosersCourt, players, isAdmin, onMatchClick }: any) => {
    const p1 = players[match.pair1.p1Id];
    const p2 = players[match.pair1.p2Id];
    const p3 = players[match.pair2.p1Id];
    const p4 = players[match.pair2.p2Id];

    const isFinished = match.status === 'finalizado';

    // Fix: Display logic for multiple sets
    const getScoreDisplay = () => {
        if (!isFinished) return <span className="text-gray-400">-</span>;

        if (match.score?.pointsScored) {
            return <>{match.score.pointsScored.p1} - {match.score.pointsScored.p2}</>;
        }

        const sets = [];
        if (match.score?.set1) sets.push(match.score.set1);
        if (match.score?.set2) sets.push(match.score.set2);
        if (match.score?.set3) sets.push(match.score.set3);

        if (sets.length === 0 && match.points) return <>{match.points.p1} - {match.points.p2}</>;

        // If only 1 set, return simplified view big
        if (sets.length === 1) {
            return <>{sets[0].p1} - {sets[0].p2}</>;
        }

        // Multiple sets: smaller font, stacked or inline
        return (
            <div className="flex flex-col items-center leading-tight">
                {sets.map((s: any, idx) => (
                    <span key={idx} className={idx === 0 ? "text-lg font-bold" : "text-sm font-medium text-gray-600"}>
                        {s.p1}-{s.p2}
                    </span>
                ))}
            </div>
        );
    };

    const scoreDisplay = getScoreDisplay();

    // Logic for winner detection
    const p1Won = (match.points?.p1 || 0) > (match.points?.p2 || 0) || (match.score?.set1?.p1 || 0) > (match.score?.set1?.p2 || 0);
    const p2Won = (match.points?.p2 || 0) > (match.points?.p1 || 0) || (match.score?.set1?.p2 || 0) > (match.score?.set1?.p1 || 0);

    // Row styles based on court type
    let rowBgCheck = 'hover:bg-gray-50';
    let courtBadgeColors = 'bg-white text-gray-700 border-gray-200';
    let courtIcon = <span className="text-xl font-bold font-mono tracking-tighter">{courtNum}</span>;

    if (isWinnersCourt) {
        rowBgCheck = 'bg-amber-50/30 hover:bg-amber-50/60';
        courtBadgeColors = 'bg-gradient-to-br from-amber-300 to-yellow-400 text-yellow-900 border-yellow-500 shadow-sm';
        courtIcon = <Award size={22} strokeWidth={2.5} />;
    } else if (isLosersCourt) {
        rowBgCheck = 'bg-slate-50 hover:bg-slate-100';
        courtBadgeColors = 'bg-slate-800 text-slate-200 border-slate-900 shadow-sm';
        // Keep number for Losers court, but dark
    }

    return (
        <div className={`grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-3 transition-colors ${rowBgCheck}`}>

            {/* 1. Court Badge */}
            <div className="col-span-12 md:col-span-1 flex md:justify-center justify-between items-center mb-2 md:mb-0">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border-2 ${courtBadgeColors}`}>
                    {courtIcon}
                </div>
                <div className="md:hidden">
                    {isFinished ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold">
                            <CheckCircle2 size={12} /> FINALIZADO
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold">
                            <PlayCircle size={12} /> JUGANDO
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Matchup */}
            <div className="col-span-12 md:col-span-5 flex flex-col md:pl-2 gap-2">
                {/* Team 1 */}
                <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${p1Won && isFinished ? 'bg-green-100/50 border-green-200 shadow-sm' : 'bg-white border-transparent'}`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${p1Won && isFinished ? 'text-green-800' : 'text-gray-700'}`}>
                            {p1?.nombre} {p1?.apellidos?.charAt(0)}. / {p2?.nombre} {p2?.apellidos?.charAt(0)}.
                        </span>
                    </div>
                    {p1Won && isFinished && <ArrowUp size={16} className="text-green-600" />}
                    {!p1Won && isFinished && !isLosersCourt && <ArrowDown size={16} className="text-red-400" />}
                    {!p1Won && isFinished && isLosersCourt && <Minus size={16} className="text-gray-400" />}
                </div>

                {/* Team 2 */}
                <div className={`flex justify-between items-center p-2 rounded-lg border transition-all ${p2Won && isFinished ? 'bg-green-100/50 border-green-200 shadow-sm' : 'bg-white border-transparent'}`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${p2Won && isFinished ? 'text-green-800' : 'text-gray-700'}`}>
                            {p3?.nombre} {p3?.apellidos?.charAt(0)}. / {p4?.nombre} {p4?.apellidos?.charAt(0)}.
                        </span>
                    </div>
                    {p2Won && isFinished && <ArrowUp size={16} className="text-green-600" />}
                    {!p2Won && isFinished && !isLosersCourt && <ArrowDown size={16} className="text-red-400" />}
                    {!p2Won && isFinished && isLosersCourt && <Minus size={16} className="text-gray-400" />}
                </div>
            </div>

            {/* 3. Movement Indicators (Desktop Only for Space) */}
            <div className="hidden md:flex col-span-2 flex-col items-center justify-center opacity-80">
                {!isFinished && <Minus className="text-gray-200" />}
                {isFinished && (
                    <div className="flex flex-col gap-1 w-full px-4">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full pb-1 border-b border-gray-100">
                            <span>Ganador</span>
                            <span>Perdedor</span>
                        </div>
                        <div className="flex justify-between w-full text-xs font-bold pt-1">
                            {/* Winner Dest */}
                            <div className="flex items-center text-green-600">
                                {isWinnersCourt ? (
                                    <> <CheckCircle2 size={12} className="mr-1" /> Mantiene </>
                                ) : (
                                    <> <ArrowUp size={12} className="mr-1" /> Sube </>
                                )}
                            </div>
                            {/* Loser Dest */}
                            <div className="flex items-center text-red-500">
                                {isLosersCourt ? (
                                    <> <CheckCircle2 size={12} className="mr-1" /> Mantiene </>
                                ) : (
                                    <> <ArrowDown size={12} className="mr-1" /> Baja </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Score */}
            <div className="col-span-12 md:col-span-2 flex justify-center py-2 md:py-0">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-200">
                    <span className={`text-xl font-black text-gray-800`}>
                        {scoreDisplay}
                    </span>
                </div>
            </div>

            {/* 5. Actions */}
            <div className="col-span-12 md:col-span-2 flex justify-end md:pl-4">
                {isAdmin && (
                    <button
                        onClick={() => onMatchClick && onMatchClick(match)}
                        className={`w-full md:w-auto flex items-center justify-center gap-2 pl-3 pr-4 py-2 rounded-lg text-xs font-bold transition-all transform active:scale-95 ${isFinished
                                ? 'bg-white border-2 border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500'
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl'
                            }`}
                    >
                        {isFinished ? <Edit2 size={14} /> : <PlayCircle size={14} />}
                        {isFinished ? 'Modificar' : 'Registra Resultado'}
                    </button>
                )}
            </div>

        </div>
    );
};
