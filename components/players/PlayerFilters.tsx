import { Search, Filter, List } from 'lucide-react';
import { Button } from '../ui/Components';

export type PlayerSegment = 'all' | 'top' | 'new' | 'inactive';

interface PlayerFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    activeSegment: PlayerSegment;
    onSegmentChange: (segment: PlayerSegment) => void;
    totalCount: number;
    filteredCount: number;
}

export const PlayerFilters = ({
    searchTerm,
    onSearchChange,
    activeSegment,
    onSegmentChange,
    totalCount,
    filteredCount
}: PlayerFiltersProps) => {
    const segments = [
        { id: 'all' as PlayerSegment, label: 'Todos', count: totalCount },
        { id: 'top' as PlayerSegment, label: 'Top Players', count: 0 },
        { id: 'new' as PlayerSegment, label: 'Nuevos', count: 0 },
        { id: 'inactive' as PlayerSegment, label: 'Inactivos', count: 0 }
    ];

    return (
        <div className="space-y-4">
            {/* Search & View Toggle */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    {searchTerm && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {filteredCount} resultados
                        </div>
                    )}
                </div>
            </div>

            {/* Segment Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {segments.map((segment) => (
                    <button
                        key={segment.id}
                        onClick={() => onSegmentChange(segment.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeSegment === segment.id
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {segment.label}
                        {segment.count > 0 && (
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeSegment === segment.id
                                ? 'bg-white/20'
                                : 'bg-gray-200'
                                }`}>
                                {segment.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
