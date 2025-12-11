
import React from 'react';
import { Modal, Button, Badge } from './ui/Components';
import { Player } from '../types';
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  movements: { playerId: string, fromDiv: number, toDiv: number, type: 'up' | 'down' | 'stay' }[];
  players: Record<string, Player>;
  onConfirm: () => void;
}

export const PromotionModal = ({ isOpen, onClose, movements, players, onConfirm }: Props) => {
  const sortedMovements = [...movements].sort((a, b) => {
    if (a.fromDiv !== b.fromDiv) return a.fromDiv - b.fromDiv;
    // Sort by type: up, stay, down
    const typeOrder = { 'up': 0, 'stay': 1, 'down': 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finalizar Fase y Ejecutar Ascensos">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
           <AlertTriangle className="text-yellow-600 flex-shrink-0" />
           <p className="text-sm text-yellow-800">
             Al confirmar, se cerrará la fase actual, se moverán los jugadores según sus resultados y se generará un nuevo calendario de partidos. Esta acción no se puede deshacer.
           </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
           <h4 className="font-bold text-gray-700 mb-3">Vista Previa de Movimientos</h4>
           <div className="space-y-1">
             {sortedMovements.map((mov, idx) => {
                const player = players[mov.playerId];
                if (!player) return null;
                
                let icon = <Minus size={16} className="text-gray-400" />;
                let textClass = "text-gray-600";
                let bgClass = "bg-white";
                let actionText = "Mantiene categoría";

                if (mov.type === 'up') {
                    icon = <ArrowUp size={16} className="text-green-600" />;
                    textClass = "text-green-700 font-medium";
                    bgClass = "bg-green-50 border-green-100";
                    actionText = `Asciende a Div ${mov.toDiv}`;
                } else if (mov.type === 'down') {
                    icon = <ArrowDown size={16} className="text-red-600" />;
                    textClass = "text-red-700 font-medium";
                    bgClass = "bg-red-50 border-red-100";
                    actionText = `Desciende a Div ${mov.toDiv}`;
                }

                return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded border ${bgClass} text-sm`}>
                     <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-mono text-xs w-12">Div {mov.fromDiv}</span>
                        <span className="font-medium text-gray-900">{player.nombre} {player.apellidos}</span>
                     </div>
                     <div className={`flex items-center gap-2 ${textClass}`}>
                        {actionText} {icon}
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
