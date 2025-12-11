import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Modal, Button, Input, Badge } from './ui/Components';
import { Match, Player } from '../types';
import { calculateMatchPoints } from '../services/logic';
import { analyzeScorecardImage } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  players: Record<string, Player>;
  onSave: (matchId: string, result: any) => void;
}

export const MatchModal = ({ isOpen, onClose, match, players, onSave }: Props) => {
  const [s1, setS1] = useState({ p1: '', p2: '' });
  const [s2, setS2] = useState({ p1: '', p2: '' });
  const [s3, setS3] = useState({ p1: '', p2: '' });
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (match && match.score) {
      setS1({ p1: match.score.set1.p1.toString(), p2: match.score.set1.p2.toString() });
      setS2(match.score.set2 ? { p1: match.score.set2.p1.toString(), p2: match.score.set2.p2.toString() } : { p1: '', p2: '' });
      setS3(match.score.set3 ? { p1: match.score.set3.p1.toString(), p2: match.score.set3.p2.toString() } : { p1: '', p2: '' });
      setIsIncomplete(match.score.isIncomplete);
    } else {
      resetForm();
    }
  }, [match]);

  const resetForm = () => {
    setS1({ p1: '', p2: '' });
    setS2({ p1: '', p2: '' });
    setS3({ p1: '', p2: '' });
    setIsIncomplete(false);
    setAnalysis(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const data = await analyzeScorecardImage(base64);
        if (data.set1) setS1({ p1: data.set1.p1, p2: data.set1.p2 });
        if (data.set2) setS2({ p1: data.set2.p1, p2: data.set2.p2 });
        if (data.set3) setS3({ p1: data.set3.p1, p2: data.set3.p2 });
      } catch (err) {
        alert("No se pudo analizar la imagen. Por favor ingresa los datos manualmente.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const calculatePreview = () => {
    const v1 = { p1: parseInt(s1.p1) || 0, p2: parseInt(s1.p2) || 0 };
    const v2 = (s2.p1 !== '' && s2.p2 !== '') ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined;
    const v3 = (s3.p1 !== '' && s3.p2 !== '') ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined;

    try {
      if (!v2 && isIncomplete) return null; // Need set 2 for incomplete
      return calculateMatchPoints(v1, v2, v3, isIncomplete);
    } catch (e) {
      return null;
    }
  };

  const preview = calculatePreview();

  const handleSave = () => {
    if (!preview || !match) return;
    onSave(match.id, {
      set1: { p1: parseInt(s1.p1), p2: parseInt(s1.p2) },
      set2: s2.p1 ? { p1: parseInt(s2.p1), p2: parseInt(s2.p2) } : undefined,
      set3: s3.p1 ? { p1: parseInt(s3.p1), p2: parseInt(s3.p2) } : undefined,
      isIncomplete,
      ...preview
    });
    onClose();
  };

  if (!match) return null;

  const p1Name = players[match.pair1.p1Id]?.nombre + ' & ' + players[match.pair1.p2Id]?.nombre;
  const p2Name = players[match.pair2.p1Id]?.nombre + ' & ' + players[match.pair2.p2Id]?.nombre;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Resultado: Jornada ${match.jornada}`}>
      <div className="space-y-6">
        {/* AI Scan */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <Camera size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Auto-completar con IA</p>
              <p className="text-xs text-blue-700">Sube una foto del acta/marcador</p>
            </div>
          </div>
          <label className="cursor-pointer bg-white text-blue-600 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-200 hover:bg-blue-50 transition-colors">
            {isAnalyzing ? 'Analizando...' : 'Subir Foto'}
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isAnalyzing} />
          </label>
        </div>

        {/* Score Inputs */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="col-span-1"></div>
          <div className="font-bold text-sm text-gray-600 truncate px-1">{p1Name}</div>
          <div className="font-bold text-sm text-gray-600 truncate px-1">{p2Name}</div>

          {/* Set 1 */}
          <div className="flex items-center text-sm font-medium text-gray-700">Set 1 *</div>
          <input type="number" value={s1.p1} onChange={e => setS1({...s1, p1: e.target.value})} className="border p-2 rounded text-center" />
          <input type="number" value={s1.p2} onChange={e => setS1({...s1, p2: e.target.value})} className="border p-2 rounded text-center" />

          {/* Set 2 */}
          <div className="flex items-center text-sm font-medium text-gray-700">Set 2</div>
          <input type="number" value={s2.p1} onChange={e => setS2({...s2, p1: e.target.value})} className="border p-2 rounded text-center" />
          <input type="number" value={s2.p2} onChange={e => setS2({...s2, p2: e.target.value})} className="border p-2 rounded text-center" />

          {/* Set 3 */}
          <div className={`flex items-center text-sm font-medium text-gray-700 ${isIncomplete ? 'opacity-50' : ''}`}>Set 3</div>
          <input type="number" value={s3.p1} onChange={e => setS3({...s3, p1: e.target.value})} className="border p-2 rounded text-center" disabled={isIncomplete} />
          <input type="number" value={s3.p2} onChange={e => setS3({...s3, p2: e.target.value})} className="border p-2 rounded text-center" disabled={isIncomplete} />
        </div>

        {/* Incomplete Toggle */}
        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
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

        {/* Analysis Result */}
        {preview && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Info size={16} /> Análisis del Resultado
            </h4>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Estado:</span>
              <Badge type={preview.finalizationType === 'completo' ? 'success' : 'warning'}>
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
          <Button onClick={handleSave} disabled={!preview}>Guardar Resultado</Button>
        </div>
      </div>
    </Modal>
  );
};