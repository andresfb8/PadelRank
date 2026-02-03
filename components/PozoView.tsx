import React from 'react';
import { Match, Player, Ranking, Division } from '../types';
import { Card, Button, Input } from './ui/Components';
import { Trophy, ArrowUp, ArrowDown, Shield, Award, AlertCircle } from 'lucide-react';

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
    // If no matches, round is 0, but we expect at least initial round to be generated at start.

    const currentMatches = division.matches.filter(m => m.jornada === currentRound).sort((a, b) => (a.court || 99) - (b.court || 99));

    const roundsMatches = division.matches.sort((a, b) => b.jornada - a.jornada); // Newest first

    const config = ranking.config?.pozoConfig;
    const isRoundComplete = currentMatches.every(m => m.status === 'finalizado');

    if (!config) return <div>Error: Configuración de Pozo no encontrada.</div>;

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        Ronda {currentRound}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {config.variant === 'individual' ? 'Individual (Cambio de pareja)' : 'Parejas Fijas'} • {
                            ranking.config?.scoringMode === 'per-game' ? '1 Set' :
                                ranking.config?.scoringMode ? `A ${ranking.config.scoringMode} Puntos` :
                                    (config.scoringType === 'sets' ? '1 Set' : 'Por Puntos')
                        }
                    </p>
                </div>
                {isAdmin && onGenerateNextRound && (
                    <Button
                        onClick={onGenerateNextRound}
                        disabled={!isRoundComplete}
                        className={isRoundComplete ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                    >
                        {isRoundComplete ? "Siguiente Ronda ➡️" : "Finalizar Partidos Primero"}
                    </Button>
                )}
            </div>

            {/* Courts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentMatches.map((match, index) => {
                    const courtNum = match.court || index + 1;
                    const isWinnersCourt = courtNum === 1;
                    const isLosersCourt = courtNum === config.numCourts;

                    return (
                        <Card key={match.id} className={`relative overflow-hidden ${isWinnersCourt ? 'ring-2 ring-yellow-400 bg-yellow-50' : isLosersCourt ? 'bg-gray-50' : 'bg-white'}`}>
                            {/* Court Badge */}
                            <div className="absolute top-0 left-0 bg-gray-800 text-white px-3 py-1 rounded-br-lg font-bold text-xs flex items-center gap-1">
                                {isWinnersCourt && <Award size={12} className="text-yellow-400" />}
                                Pista {courtNum}
                                {isWinnersCourt && " (Cielo)"}
                                {isLosersCourt && " (Pozo)"}
                            </div>

                            {/* Status Badge */}
                            <div className="absolute top-0 right-0 p-2">
                                {match.status === 'finalizado' ? <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">Finalizado</span> : <span className="text-orange-600 text-xs font-bold bg-orange-100 px-2 py-1 rounded-full">Jugando</span>}
                            </div>

                            <div className="pt-10 pb-4 px-4">
                                {/* Team 1 */}
                                <TeamRow
                                    pair={match.pair1}
                                    players={players}
                                    score={match.status === 'finalizado' ? match.score?.set1?.p1 ?? match.points.p1 : undefined}
                                    isWinner={match.points.p1 > match.points.p2}
                                    onChange={(val) => isAdmin && onMatchUpdate(match.id, { ...match, points: { ...match.points, p1: parseInt(val) || 0 } })} // Simple point update for now, ideally full score modal
                                />

                                <div className="my-2 flex items-center justify-center relative">
                                    <span className="text-xs font-bold text-gray-400 bg-white px-2 z-10">VS</span>
                                    <div className="absolute w-full h-px bg-gray-200 top-1/2 left-0"></div>
                                </div>

                                {/* Team 2 */}
                                <TeamRow
                                    pair={match.pair2}
                                    players={players}
                                    score={match.status === 'finalizado' ? match.score?.set1?.p2 ?? match.points.p2 : undefined}
                                    isWinner={match.points.p2 > match.points.p1}
                                    onChange={(val) => isAdmin && onMatchUpdate(match.id, { ...match, points: { ...match.points, p2: parseInt(val) || 0 } })}
                                />

                                {/* Admin Actions */}
                                {isAdmin && match.status !== 'finalizado' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center">
                                        <Button
                                            size="sm"
                                            className="text-xs w-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            onClick={() => {
                                                if (onMatchClick) onMatchClick(match);
                                            }}
                                        >
                                            <Edit2 size={12} className="mr-1" /> Registrar Resultadoo
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Movement Indicators */}
                            <div className="bg-gray-100 p-2 text-xs flex justify-between text-gray-500 font-medium">
                                <div className="flex items-center gap-1 text-green-700">
                                    <ArrowUp size={12} /> {isWinnersCourt ? 'Mantiene Pista 1' : `Sube a Pista ${courtNum - 1}`}
                                </div>
                                <div className="flex items-center gap-1 text-red-700">
                                    <ArrowDown size={12} /> {isLosersCourt ? 'Mantiene Pozo' : `Baja a Pista ${courtNum + 1}`}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

        </div>
    );
};

const TeamRow = ({ pair, players, score, isWinner, onChange }: any) => {
    const p1 = players[pair.p1Id];
    const p2 = players[pair.p2Id];

    return (
        <div className={`flex justify-between items-center p-2 rounded-lg ${isWinner ? 'bg-green-50' : ''}`}>
            <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-800">{p1?.nombre || 'Unknown'} {p1?.apellidos?.charAt(0)}.</span>
                <span className="font-semibold text-sm text-gray-800">{p2?.nombre || 'Unknown'} {p2?.apellidos?.charAt(0)}.</span>
            </div>
            <div className="text-xl font-bold text-gray-800">
                {score !== undefined ? score : '-'}
            </div>
        </div>
    )
}

function Edit2({ size, className }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
    )
}
