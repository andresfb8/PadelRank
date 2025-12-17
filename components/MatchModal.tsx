import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Modal, Button, Input, Badge } from './ui/Components';
import { Match, Player, RankingConfig } from '../types';
import { calculateMatchPoints } from '../services/logic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  players: Record<string, Player>;
  onSave: (matchId: string, result: any) => void;
  rankingConfig?: RankingConfig;
  // New prop
  format?: 'classic' | 'americano' | 'mexicano' | 'individual' | 'pairs';
}

export const MatchModal = ({ isOpen, onClose, match, players, onSave, rankingConfig, format }: Props) => {
  const [s1, setS1] = useState({ p1: '', p2: '' });
  const [s2, setS2] = useState({ p1: '', p2: '' });
  const [s3, setS3] = useState({ p1: '', p2: '' });
  const [isIncomplete, setIsIncomplete] = useState(false);

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
  const pointsP2 = isCustomMode ? (parseInt(pointsP2Manual) || 0) : ((totalPoints && pointsP1) ? totalPoints - parseInt(pointsP1) : 0);


  useEffect(() => {
    if (match && match.score) {
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
  };

  const calculatePreview = () => {

    const v1 = { p1: parseInt(s1.p1) || 0, p2: parseInt(s1.p2) || 0 };
    const v2 = (s2.p1 !== '' && s2.p2 !== '') ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined;
    const v3 = (s3.p1 !== '' && s3.p2 !== '') ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined;

    try {
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

    // Point-based scoring (Mexicano/Americano)
    if ((format === 'mexicano' || format === 'americano') && (totalPoints || isCustomMode)) {
      let p1 = 0;
      let p2 = 0;

      if (isCustomMode) {
        p1 = parseInt(pointsP1) || 0;
        p2 = parseInt(pointsP2Manual) || 0;
      } else if (totalPoints) {
        p1 = parseInt(pointsP1) || 0;
        p2 = totalPoints - p1;
      }

      onSave(match.id, {
        pointsScored: { p1, p2 },
        points: { p1, p2 }, // For standings calculation
        description: `${p1} - ${p2}`,
        finalizationType: 'completo'
      });
    }
    // Set-based scoring (Classic/Individual)
    else {
      if (!preview) return;
      onSave(match.id, {
        set1: { p1: parseInt(s1.p1), p2: parseInt(s1.p2) },
        set2: s2.p1 ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined,
        set3: s3.p1 ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined,
        isIncomplete: isIncomplete,
        ...preview
      });
    }

    onClose();
  };

  if (!match) return null;

  const p1Name = players[match.pair1.p1Id]?.nombre + ' & ' + players[match.pair1.p2Id]?.nombre;
  const p2Name = players[match.pair2.p1Id]?.nombre + ' & ' + players[match.pair2.p2Id]?.nombre;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Resultado: Jornada ${match.jornada}`}>
      <div className="space-y-6">

        {/* Point-Based Input (Mexicano/Americano) */}
        {(format === 'mexicano' || format === 'americano') && (totalPoints || isCustomMode) ? (
          <div className="space-y-4">
            {!isCustomMode && (
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Sistema: <span className="font-bold text-primary">{totalPoints} Puntos Totales</span></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{p1Name}</label>
                <input
                  type="number"
                  value={pointsP1}
                  onChange={(e) => setPointsP1(e.target.value)}
                  className="border p-3 rounded text-center w-full text-2xl font-bold focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0"
                  min={0}
                  max={totalPoints}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{p2Name}</label>
                {isCustomMode ? (
                  <input
                    type="number"
                    value={pointsP2Manual}
                    onChange={(e) => setPointsP2Manual(e.target.value)}
                    className="border p-3 rounded text-center w-full text-2xl font-bold focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0"
                    min={0}
                  />
                ) : (
                  <>
                    <div className="border p-3 rounded text-center w-full text-2xl font-bold bg-gray-50 text-gray-600">
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
          <div className={`grid grid-cols-3 gap-4 text-center`}>
            <div className="col-span-1"></div>
            <div className="font-bold text-sm text-gray-600 truncate px-1">{p1Name}</div>
            <div className="font-bold text-sm text-gray-600 truncate px-1">{p2Name}</div>

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

        {/* Incomplete Toggle - Hide for Individual and Mexicano/Americano */}
        {format !== 'individual' && format !== 'mexicano' && format !== 'americano' && (
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

        {/* Analysis Result */}
        {preview && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Info size={16} /> Análisis del Resultado
            </h4>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Estado:</span>
              <Badge type={preview.finalizationType === 'completo' ? 'success' : (preview.finalizationType === 'empate_manual' ? 'default' : 'warning')}>
                {preview.description}
              </Badge>
            </div>
            <div className="flex justify-between items-center font-mono text-sm">
              <span>Reparto de Puntos:</span>
              <span className="font-bold">{preview.points.p1} - {preview.points.p2}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={
              (format === 'mexicano' || format === 'americano') && (totalPoints || isCustomMode)
                ? (isCustomMode
                  ? (!pointsP1 || !pointsP2Manual)
                  : (!pointsP1 || parseInt(pointsP1) > totalPoints! || parseInt(pointsP1) < 0)
                )
                : !preview
            }
          >
            Guardar Resultado
          </Button>
        </div>
      </div>
    </Modal>
  );
};