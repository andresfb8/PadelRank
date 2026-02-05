import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, CheckCircle, Info, Calendar, Clock } from 'lucide-react';
import { Modal, Button, Input, Badge } from './ui/Components';
import { Match, Player, RankingConfig } from '../types';
import { calculateMatchPoints } from '../services/logic';
import { SchedulerEngine } from '../services/SchedulerEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  players: Record<string, Player>;
  onSave: (matchId: string, result: any) => void;
  rankingConfig?: RankingConfig;
  format?: import('../types').RankingFormat;
  schedulerConfig?: import('../services/SchedulerEngine').SchedulerConfig;
  occupiedSlots?: { start: Date; end: Date; court: number }[];
}

export const MatchModal = ({ isOpen, onClose, match, players, onSave, rankingConfig, format, schedulerConfig, occupiedSlots }: Props) => {
  const [s1, setS1] = useState({ p1: '', p2: '' });
  const [s2, setS2] = useState({ p1: '', p2: '' });
  const [s3, setS3] = useState({ p1: '', p2: '' });
  const [isIncomplete, setIsIncomplete] = useState(false);

  // Scheduling State
  const [startTime, setStartTime] = useState('');
  const [court, setCourt] = useState('');

  // For point-based scoring (Mexicano/Americano)
  const [pointsP1, setPointsP1] = useState<string>('');
  const [pointsP2Manual, setPointsP2Manual] = useState<string>(''); // For custom mode

  // Calculate total points based on scoring mode
  const getTotalPoints = () => {
    if (!rankingConfig?.scoringMode) return null;
    if (rankingConfig.scoringMode === 'per-game') return null; // Use traditional sets
    if (rankingConfig.scoringMode === 'custom') return null; // No fixed total for custom
    return parseInt(rankingConfig.scoringMode);
  };

  const totalPoints = getTotalPoints();
  const isCustomMode = rankingConfig?.scoringMode === 'custom';
  // If not custom and totalPoints exists, P2 is auto-calculated.
  // If custom, P2 is manual (or 0 if empty).
  const pointsP2 = isCustomMode ? (parseInt(pointsP2Manual) || 0) : ((totalPoints && pointsP1) ? totalPoints - (parseInt(pointsP1) || 0) : 0);


  useEffect(() => {
    if (match) {
      if (match.score) {
        // Point-based scoring
        if (match.score.pointsScored) {
          setPointsP1(match.score.pointsScored.p1.toString());
          setPointsP2Manual(match.score.pointsScored.p2.toString());
        }
        // Set-based scoring
        else if (match.score.finalizationType === 'empate_manual') {
          setS1({ p1: '', p2: '' });
        } else if (match.score.set1) {
          setS1({ p1: match.score.set1.p1.toString(), p2: match.score.set1.p2.toString() });
          setS2(match.score.set2 ? { p1: match.score.set2.p1.toString(), p2: match.score.set2.p2.toString() } : { p1: '', p2: '' });
          setS3(match.score.set3 ? { p1: match.score.set3.p1.toString(), p2: match.score.set3.p2.toString() } : { p1: '', p2: '' });
          setIsIncomplete(match.score.isIncomplete || false);
        }
      }

      // Scheduling
      if (match.startTime) setStartTime(match.startTime);
      else setStartTime('');

      if (match.court) setCourt(match.court.toString());
      else setCourt('');

    } else {
      resetForm();
    }
  }, [match]);

  const resetForm = () => {
    setS1({ p1: '', p2: '' });
    setS2({ p1: '', p2: '' });
    setS3({ p1: '', p2: '' });
    setIsIncomplete(false);
    setPointsP1('');
    setPointsP2Manual('');
    setStartTime('');
    setCourt('');
  };

  const calculatePreview = () => {

    const v1 = { p1: parseInt(s1.p1) || 0, p2: parseInt(s1.p2) || 0 };
    const v2 = (s2.p1 !== '' && s2.p2 !== '') ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined;
    const v3 = (s3.p1 !== '' && s3.p2 !== '') ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined;

    try {
      // FIX: If Set 1 is empty, it's not a valid match result (it's just a schedule update or empty)
      if (s1.p1 === '' || s1.p2 === '') return null;

      if (!v2 && isIncomplete && format !== 'individual') return null; // Need set 2 for incomplete (unless individual)
      // Only pass fields if config exists
      const configClean = rankingConfig ? {
        pointsPerWin2_0: rankingConfig.pointsPerWin2_0,
        pointsPerWin2_1: rankingConfig.pointsPerWin2_1,
        pointsDraw: rankingConfig.pointsDraw,
        pointsPerLoss2_1: rankingConfig.pointsPerLoss2_1,
        pointsPerLoss2_0: rankingConfig.pointsPerLoss2_0
      } : undefined;
      return calculateMatchPoints(v1, v2, v3, isIncomplete, configClean, false, format === 'individual');
    } catch (e) {
      return null;
    }
  };

  const preview = calculatePreview();

  const handleSave = () => {
    if (!match) return;

    const scheduleUpdate = {
      startTime: startTime || undefined,
      court: court ? parseInt(court) : undefined
    };

    // Point-based scoring (Mexicano/Americano/Pozo)
    if ((format === 'mexicano' || format === 'americano' || format === 'pozo') && (totalPoints || isCustomMode)) {
      let p1 = 0;
      let p2 = 0;

      if (isCustomMode) {
        p1 = parseInt(pointsP1) || 0;
        p2 = parseInt(pointsP2Manual) || 0;
      } else if (totalPoints) {
        p1 = parseInt(pointsP1) || 0;
        p2 = totalPoints - p1;
      }

      // Valid score save
      onSave(match.id, {
        pointsScored: { p1, p2 },
        points: { p1, p2 }, // For standings calculation
        description: `${p1} - ${p2}`,
        finalizationType: 'completo',
        ...scheduleUpdate
      });
    }
    // Set-based scoring (Classic/Individual)
    else {
      // Check if we have a valid result to save
      if (preview) {
        onSave(match.id, {
          set1: { p1: parseInt(s1.p1), p2: parseInt(s1.p2) },
          set2: s2.p1 ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined,
          set3: s3.p1 ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined,
          isIncomplete: isIncomplete,
          ...preview,
          ...scheduleUpdate
        });
      } else {
        // If no score but scheduling info changed, save schedule only
        // We assume 'startTime' or 'court' changed if they are truthy or different?
        // Let's just pass them if they exist
        if (startTime !== (match.startTime || '') || court !== (match.court?.toString() || '')) {
          onSave(match.id, { ...scheduleUpdate });
        }
      }
    }

    onClose();
  };

  if (!match) return null;

  const getPlayer = (id?: string) => {
    if (!id) return null;
    return players[id];
  };

  const p1_1 = getPlayer(match.pair1.p1Id);
  const p1_2 = getPlayer(match.pair1.p2Id);
  const p2_1 = getPlayer(match.pair2.p1Id);
  const p2_2 = getPlayer(match.pair2.p2Id);

  // Helper for names
  const PlayerBlock = ({ p1, p2 }: { p1: Player | null, p2: Player | null }) => (
    <div className="flex flex-col gap-1 text-left px-2">
      <div className="font-bold text-sm text-gray-800 truncate" title={p1 ? `${p1.nombre} ${p1.apellidos}` : ''}>
        {p1 ? `${p1.nombre} ${p1.apellidos}` : '???'}
      </div>
      {p2 && (
        <div className="font-bold text-sm text-gray-600 truncate" title={`${p2.nombre} ${p2.apellidos}`}>
          {p2.nombre} {p2.apellidos}
        </div>
      )}
    </div>
  );

  const title = match.roundName
    ? `Resultado: ${match.roundName}`
    : `Resultado: Jornada ${match.jornada}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">

        {/* Read-Only Schedule Context - Hide for Pozo */}
        {format !== 'pozo' && (match.startTime || match.court) && (
          <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-md flex items-center gap-2 border border-blue-100">
            <Calendar size={14} />
            <span>
              Programado el <strong>{match.startTime ? new Date(match.startTime).toLocaleString() : 'Fecha PDte'}</strong>
              {match.court && <span> en <strong>Pista {match.court}</strong></span>}
            </span>
          </div>
        )}

        {/* Point-Based Input (Mexicano/Americano/Pozo) */}
        {(format === 'mexicano' || format === 'americano' || format === 'pozo') && (totalPoints || isCustomMode) ? (
          <div className="space-y-4">
            {!isCustomMode && (
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Sistema: <span className="font-bold text-primary">{totalPoints} Puntos Totales</span></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PlayerBlock p1={p1_1} p2={p1_2} />
                </label>
                <input
                  type="number"
                  value={pointsP1}
                  onChange={(e) => setPointsP1(e.target.value)}
                  className="border p-3 rounded text-center w-full text-2xl font-bold focus:ring-2 focus:ring-primary focus:border-primary mt-2"
                  placeholder="0"
                  min={0}
                  max={totalPoints}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PlayerBlock p1={p2_1} p2={p2_2} />
                </label>
                {isCustomMode ? (
                  <input
                    type="number"
                    value={pointsP2Manual}
                    onChange={(e) => setPointsP2Manual(e.target.value)}
                    className="border p-3 rounded text-center w-full text-2xl font-bold focus:ring-2 focus:ring-primary focus:border-primary mt-2"
                    placeholder="0"
                    min={0}
                  />
                ) : (
                  <>
                    <div className="border p-3 rounded text-center w-full text-2xl font-bold bg-gray-50 text-gray-600 mt-2">
                      {pointsP2}
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-1">Auto-calculado</p>
                  </>
                )}
              </div>
            </div>

            {!isCustomMode && pointsP1 && parseInt(pointsP1) > totalPoints! && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700 text-center">
                ⚠️ Los puntos no pueden superar el total ({totalPoints})
              </div>
            )}
          </div>
        ) : (
          // Set-Based Input (Classic/Individual)
          <div className={`grid grid-cols-3 gap-4 text-center items-center`}>
            <div className="col-span-1"></div>
            {/* Headers with PlayerBlock */}
            <div className="overflow-hidden"><PlayerBlock p1={p1_1} p2={p1_2} /></div>
            <div className="overflow-hidden"><PlayerBlock p1={p2_1} p2={p2_2} /></div>

            {/* Set 1 */}
            <div className="flex items-center text-sm font-medium text-gray-700">Set 1 *</div>
            <input type="number" value={s1.p1} onChange={e => setS1({ ...s1, p1: e.target.value })} className="border p-2 rounded text-center" />
            <input type="number" value={s1.p2} onChange={e => setS1({ ...s1, p2: e.target.value })} className="border p-2 rounded text-center" />

            {/* Set 2 */}
            <div className="flex items-center text-sm font-medium text-gray-700">Set 2</div>
            <input type="number" value={s2.p1} onChange={e => setS2({ ...s2, p1: e.target.value })} className="border p-2 rounded text-center" />
            <input type="number" value={s2.p2} onChange={e => setS2({ ...s2, p2: e.target.value })} className="border p-2 rounded text-center" />

            {/* Set 3 */}
            <div className={`flex items-center text-sm font-medium text-gray-700 ${isIncomplete ? 'opacity-50' : ''}`}>Set 3</div>
            <input type="number" value={s3.p1} onChange={e => setS3({ ...s3, p1: e.target.value })} className="border p-2 rounded text-center" disabled={isIncomplete} />
            <input type="number" value={s3.p2} onChange={e => setS3({ ...s3, p2: e.target.value })} className="border p-2 rounded text-center" disabled={isIncomplete} />
          </div>
        )}

        {/* Incomplete Toggle - Hide for Individual, Mexicano/Americano AND POZO */}
        {format !== 'individual' && format !== 'mexicano' && format !== 'americano' && format !== 'pozo' && format !== 'elimination' && (
          <div className={`flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100`}>
            <input
              type="checkbox"
              id="incomplete"
              checked={isIncomplete}
              onChange={e => setIsIncomplete(e.target.checked)}
              className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
            />
            <label htmlFor="incomplete" className="text-sm font-medium text-orange-900 cursor-pointer">
              Finalizar partido aquí (Set Incompleto)
            </label>
          </div>
        )}

        {/* Analysis Result - Hide for Pozo */}
        {preview && format !== 'pozo' && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Info size={16} /> Análisis del Resultado
            </h4>
            {format === 'elimination' ? (
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">Ganador:</span>
                <span className="font-bold text-green-600">
                  {(() => {
                    let p1Sets = 0;
                    let p2Sets = 0;
                    const v1 = { p1: parseInt(s1.p1) || 0, p2: parseInt(s1.p2) || 0 };
                    const v2 = { p1: parseInt(s2.p1) || 0, p2: parseInt(s2.p2) || 0 };
                    const v3 = { p1: parseInt(s3.p1) || 0, p2: parseInt(s3.p2) || 0 };

                    if (v1.p1 > v1.p2) p1Sets++; else if (v1.p2 > v1.p1) p2Sets++;
                    if (s2.p1 && s2.p2) { if (v2.p1 > v2.p2) p1Sets++; else if (v2.p2 > v2.p1) p2Sets++; }
                    const getPName = (p: { p1Id: string, p2Id?: string }) => {
                      const pp1 = getPlayer(p.p1Id);
                      const pp2 = p.p2Id ? getPlayer(p.p2Id) : null;
                      return `${pp1?.nombre || '?'}${pp2 ? ' & ' + pp2.nombre : ''}`;
                    };
                    const name1 = getPName(match.pair1);
                    const name2 = getPName(match.pair2);

                    return p1Sets > p2Sets ? name1 : (p2Sets > p1Sets ? name2 : 'Empate');
                  })()}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <Badge type={preview.finalizationType === 'completo' ? 'success' : (preview.finalizationType === 'empate_manual' ? 'default' : 'warning')}>
                    {preview.description}
                  </Badge>
                </div>
                <div className="flex justify-between items-center font-mono text-sm">
                  <span>Reparto de Puntos:</span>
                  <span className="font-bold">
                    {`${preview.points.p1} - ${preview.points.p2}`}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={
              // Disable if:
              // 1. Trying to save score but score is invalid
              // 2. AND Trying to save schedule but schedule didn't change (and no score) -> handled in logic but here we check validity for Button
              // Actually, we should enable button if:
              // A) Preview is valid (Score valid)
              // B) Schedule changed (Time or Court)
              // C) Unless Mexicano invalid score

              (format === 'mexicano' || format === 'americano' || format === 'pozo') && (totalPoints || isCustomMode)
                ? (isCustomMode
                  ? (!pointsP1 || !pointsP2Manual)
                  : (!pointsP1 || parseInt(pointsP1) > totalPoints! || parseInt(pointsP1) < 0)
                )
                : (!preview && (startTime === (match.startTime || '') && court === (match.court?.toString() || '')))
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
};