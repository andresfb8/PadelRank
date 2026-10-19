import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui/Components';
import { FeasibilityWarning } from '../../services/SchedulerEngine';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    warnings: FeasibilityWarning[];
    hasLocked: boolean;
    onGenerate: (includeLocked: boolean) => void;
    onConfigure: () => void;
}

/** Shown before generating when the plan does not fit or some matches are already locked. */
export const GenerateScheduleModal = ({ isOpen, onClose, warnings, hasLocked, onGenerate, onConfigure }: Props) => {
    const [includeLocked, setIncludeLocked] = useState(false);

    const handleGenerate = () => {
        if (includeLocked && !window.confirm('Se recalcularán también los partidos ya fijados y sus horas pueden cambiar. ¿Continuar?')) return;
        onGenerate(includeLocked);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generar horario">
            <div className="space-y-4">
                {warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
                            <AlertTriangle size={16} /> El horario no cabe tal como está configurado
                        </div>
                        <ul className="list-disc pl-5 text-xs text-amber-900 space-y-1">
                            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                        </ul>
                        <p className="text-xs text-amber-700 mt-2">
                            Si generas igualmente, los partidos que no quepan saldrán marcados como conflicto.
                        </p>
                    </div>
                )}
                {hasLocked && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={includeLocked} onChange={e => setIncludeLocked(e.target.checked)} />
                        Regenerar también los partidos ya fijados
                    </label>
                )}
                <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button variant="secondary" onClick={() => { onClose(); onConfigure(); }}>Volver a configurar</Button>
                    <Button onClick={handleGenerate}>{warnings.length ? 'Generar igualmente' : 'Generar'}</Button>
                </div>
            </div>
        </Modal>
    );
};
