import React, { useState } from 'react';
import { X, FileText, Download, Sheet, Code } from 'lucide-react';
import { Button, Card, Modal } from './ui/Components';
import { Division, Ranking, StandingRow, Player } from '../types';
import {
  exportRankingToPDF,
  exportRankingToCSV,
  exportRankingToExcel,
  exportRankingToJSON,
  exportMatchesToCSV,
  exportMatchesToExcel,
  exportMatchesToJSON,
  exportMatchesToPDF,
  exportRankingAndMatchesToPDF
} from '../services/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ranking: Ranking;
  divisions: Division[];
  players: Record<string, Player>;
  standingsCallback: () => StandingRow[];
}

type ExportType = 'standings' | 'matches' | 'both';
type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  ranking,
  divisions,
  players,
  standingsCallback
}) => {
  const [exportType, setExportType] = useState<ExportType>('both');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(
    divisions.map(d => d.id)
  );

  const handleDivisionToggle = (divisionId: string) => {
    setSelectedDivisions(prev =>
      prev.includes(divisionId)
        ? prev.filter(id => id !== divisionId)
        : [...prev, divisionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDivisions.length === divisions.length) {
      setSelectedDivisions([]);
    } else {
      setSelectedDivisions(divisions.map(d => d.id));
    }
  };

  const filteredDivisions = divisions.filter(d =>
    selectedDivisions.includes(d.id)
  );

  const handleExport = () => {
    const config = {
      rankingName: ranking.nombre,
      categoryName: 'Todas las divisiones',
      clubName: 'Racket Grid'
    };

    // Special case: Both standings and matches as PDF
    if (exportType === 'both' && exportFormat === 'pdf') {
      exportRankingAndMatchesToPDF(ranking, standingsCallback, filteredDivisions, players, config);
      onClose();
      return;
    }

    if (exportType === 'standings' || exportType === 'both') {
      switch (exportFormat) {
        case 'pdf':
          exportRankingToPDF(ranking, standingsCallback, players, config);
          break;
        case 'csv':
          exportRankingToCSV(ranking, standingsCallback, players, config);
          break;
        case 'excel':
          exportRankingToExcel(ranking, standingsCallback, players, config);
          break;
        case 'json':
          exportRankingToJSON(ranking, standingsCallback, players, config);
          break;
      }
    }

    if ((exportType === 'matches' || exportType === 'both') && exportFormat !== 'pdf') {
      switch (exportFormat) {
        case 'csv':
          exportMatchesToCSV(ranking, filteredDivisions, players, config);
          break;
        case 'excel':
          exportMatchesToExcel(ranking, filteredDivisions, players, config);
          break;
        case 'json':
          exportMatchesToJSON(ranking, filteredDivisions, players, config);
          break;
      }
    }

    if (exportType === 'matches' && exportFormat === 'pdf') {
      exportMatchesToPDF(ranking, filteredDivisions, players, config);
    }

    onClose();
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    pdf: <FileText className="w-4 h-4" />,
    csv: <Download className="w-4 h-4" />,
    excel: <Sheet className="w-4 h-4" />,
    json: <Code className="w-4 h-4" />
  };

  const formatLabels: Record<ExportFormat, string> = {
    pdf: 'PDF',
    csv: 'CSV',
    excel: 'Excel',
    json: 'JSON'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exportar Torneo">
      <div className="space-y-6">
        {/* Qué exportar */}
        <div>
          <h3 className="text-sm font-semibold mb-3">¿Qué deseas exportar?</h3>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setExportType('standings')}>
              <input
                type="radio"
                name="exportType"
                value="standings"
                checked={exportType === 'standings'}
                onChange={(e) => setExportType(e.target.value as ExportType)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">Clasificación</span>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setExportType('matches')}>
              <input
                type="radio"
                name="exportType"
                value="matches"
                checked={exportType === 'matches'}
                onChange={(e) => setExportType(e.target.value as ExportType)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">Partidos</span>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => setExportType('both')}>
              <input
                type="radio"
                name="exportType"
                value="both"
                checked={exportType === 'both'}
                onChange={(e) => setExportType(e.target.value as ExportType)}
                className="w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium">Ambos (Clasificación + Partidos)</span>
            </label>
          </div>
        </div>

        {/* Formato */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Formato</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['pdf', 'csv', 'excel', 'json'] as ExportFormat[]).map(format => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  exportFormat === format
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {formatIcons[format]}
                <span className="text-sm font-medium">{formatLabels[format]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divisiones */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Divisiones a incluir ({selectedDivisions.length}/{divisions.length})</h3>
            <button
              onClick={handleSelectAll}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {selectedDivisions.length === divisions.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {divisions.map(division => (
              <label
                key={division.id}
                className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDivisions.includes(division.id)}
                  onChange={() => handleDivisionToggle(division.id)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-sm">
                  {division.category || `División ${division.numero}`}
                  <span className="text-gray-500 ml-2">
                    ({division.matches.length} partidos, {division.players.length} jugadores)
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedDivisions.length === 0}
            className="flex-1"
          >
            Exportar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
