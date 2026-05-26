import React, { useState, useEffect } from 'react';
import { Modal, Button } from './ui/Components';
import { SearchableSelect } from './SearchableSelect';
import { AlertTriangle, Eraser, MinusCircle } from 'lucide-react';

interface Participant {
    id: string;   // "p1::p2" or "p1"
    label: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    currentId: string;       // current participant id in the slot ("" if empty)
    currentLabel: string;    // human-readable current occupant
    onSelect: (newId: string) => void; // "" = clear, "BYE" = bye, else participant id
}

/**
 * Manual override picker for a bracket slot. Lets an admin set which pair
 * occupies a match slot (or BYE / clear) without going through auto-advancement.
 */
export const ParticipantPickerModal = ({ isOpen, onClose, participants, currentId, currentLabel, onSelect }: Props) => {
    const [value, setValue] = useState(currentId);

    useEffect(() => { setValue(currentId); }, [currentId, isOpen]);

    const apply = (id: string) => {
        onSelect(id);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar participante (manual)">
            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                        Cambio manual del cuadro. Sustituye directamente quién ocupa este hueco
                        (no recalcula el avance automático). Úsalo solo para corregir errores.
                    </span>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ocupante actual</label>
                    <div className="text-sm bg-gray-50 border rounded-md px-3 py-2 text-gray-700">{currentLabel || 'Vacío'}</div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asignar pareja</label>
                    <SearchableSelect
                        options={participants}
                        value={value}
                        onChange={setValue}
                        placeholder="Buscar pareja..."
                    />
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button variant="secondary" onClick={() => apply('BYE')} className="flex items-center gap-1 text-gray-600">
                        <MinusCircle size={14} /> Marcar BYE
                    </Button>
                    <Button variant="secondary" onClick={() => apply('')} className="flex items-center gap-1 text-red-600">
                        <Eraser size={14} /> Vaciar hueco
                    </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => apply(value)} disabled={!value || value === currentId}>
                        Asignar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
