import React, { useState } from 'react';
import { Modal, Button, Badge } from './ui/Components';
import { Player } from '../types';
import { ArrowUp, ArrowDown, Minus, AlertTriangle, Settings, RefreshCw, ChevronsRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[];
  players: Record<string, Player>;
  onConfirm: () => void;
  overrides?: { playerId: string, forceDiv: number }[];
  onOverrideChange?: (playerId: string, forceDiv: number | null) => void;
}

export const PromotionModal = ({ isOpen, onClose, movements, players, onConfirm, overrides = [], onOverrideChange }: Props) => {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const sortedMovements = [...movements].sort((a, b) => {
    // Sort by ToDiv first to group by results
    if (a.toDiv !== b.toDiv) return a.toDiv - b.toDiv;
    if (a.fromDiv !== b.fromDiv) return a.fromDiv - b.fromDiv;
    return 0;
  });

  const maxDiv = Math.max(...movements.map(m => m.toDiv), ...movements.map(m => m.fromDiv), 0);
  const targetDivisions = Array.from({ length: maxDiv + 1 }, (_, i) => i + 1); // Allow +1 expansion? Yes.

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar Fase y Ejecutar Ascensos">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="mb-2">
              Al confirmar, se cerrará la fase actual, se moverán los jugadores según sus resultados y se generará un nuevo calendario.
            </p>
            {(() => {
              // Validation: Check resulting division sizes
              const counts: Record<number, number> = {};
              movements.forEach(m => {
                counts[m.toDiv] = (counts[m.toDiv] || 0) + 1;
              });
              const badDivs = Object.entries(counts)
                .filter(([div, count]) => count !== 4)
                .map(([div]) => div);

              if (badDivs.length > 0) {
                return (
                  <div className="font-bold text-red-600 mt-2">
                    ⚠️ Atención: Las siguientes divisiones no tendrán 4 jugadores: {badDivs.map(d => `Div ${d}`).join(', ')}.
                    Esto puede romper el formato Clásico.
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <h4 className="font-bold text-gray-700 mb-3 flex items-center justify-between">
            <span>Vista Previa de Movimientos</span>
            {overrides.length > 0 && (
              <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {overrides.length} ajustes manuales activos
              </span>
            )}
          </h4>
          <div className="space-y-1">
            {sortedMovements.map((mov, idx) => {
              const player = players[mov.playerId];
              if (!player) return null;

              const isOverridden = overrides.some(o => o.playerId === mov.playerId);
              const isEditing = editingPlayerId === mov.playerId;

              let icon = <Minus size={16} className="text-gray-400" />;
              let textClass = "text-gray-600";
              let bgClass = "bg-white";

              if (isOverridden) {
                bgClass = "bg-blue-50 border-blue-200";
                textClass = "text-blue-700 font-medium";
                icon = <Settings size={14} className="text-blue-500" />;
              } else if (mov.type === 'up') {
                icon = <ArrowUp size={16} className="text-green-600" />;
                textClass = "text-green-700 font-medium";
                bgClass = "bg-green-50 border-green-100";
              } else if (mov.type === 'down') {
                icon = <ArrowDown size={16} className="text-red-600" />;
                textClass = "text-red-700 font-medium";
                bgClass = "bg-red-50 border-red-100";
              }

              return (
                <div key={idx} className={`flex items-center justify-between p-2 rounded border ${bgClass} text-sm group`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col items-center w-12 shrink-0">
                      <span className="text-xs text-gray-500">Div {mov.fromDiv}</span>
                      {mov.type !== 'stay' && <ArrowDown size={10} className="text-gray-300 my-0.5" />}
                    </div>

                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{player.nombre} {player.apellidos}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {isOverridden ? 'Manual' : (mov.type === 'up' ? 'Ascenso Automático' : mov.type === 'down' ? 'Descenso Automático' : 'Mantiene')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <select
                        autoFocus
                        className="p-1 border rounded text-sm bg-white shadow-sm"
                        value={mov.toDiv}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          onOverrideChange?.(mov.playerId, val);
                          setEditingPlayerId(null);
                        }}
                        onBlur={() => setEditingPlayerId(null)}
                      >
                        {targetDivisions.map(d => (
                          <option key={d} value={d}>Div {d}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-black/5 transition-colors ${textClass}`}
                        onClick={() => onOverrideChange && setEditingPlayerId(mov.playerId)}
                        title="Click para ajustar manualmente"
                      >
                        <span className="font-bold">Div {mov.toDiv}</span>
                        {icon}
                      </div>
                    )}

                    {isOverridden && !isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOverrideChange?.(mov.playerId, null); // Clear override
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Quitar ajuste manual"
                      >
                        <RefreshCw size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white">
            Confirmar y Generar Nueva Fase
          </Button>
        </div>
      </div>
    </Modal>
  );
};
