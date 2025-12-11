import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    className = ""
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Limit to 5 for performance/UX as requested, ensuring selected is always visible if it exists in filtered? 
    // actually for a custom scrollable dropdown, we can show more, but let's stick to the "5 + selected" logic 
    // or just show a scrollable list of matches. 
    // User asked for "Filtro de busqueda", implying they want to find people. 
    // A scrollable list of 5-10 items is standard. Let's do top 10 for custom dropdowns.
    const displayedOptions = filteredOptions.slice(0, 50); // Relaxed limit for custom component

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {/* Trigger Button */}
            <div
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center cursor-pointer hover:border-primary transition-colors text-sm"
                onClick={() => {
                    setIsOpen(!isOpen);
                    // Focus input on open? 
                    if (!isOpen) setSearchTerm('');
                }}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg animation-fade-in-down">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {displayedOptions.length > 0 ? (
                            displayedOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center ${option.id === value ? 'bg-blue-50 text-primary' : 'text-gray-700'}`}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <span>{option.label}</span>
                                    {option.id === value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-xs text-center text-gray-400">
                                No se encontraron resultados
                            </div>
                        )}

                        {/* Show "Clear Selection" if value exists */}
                        {value && (
                            <div
                                className="px-3 py-2 text-xs text-red-500 border-t border-gray-100 cursor-pointer hover:bg-red-50 text-center"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                            >
                                Quitar Selección
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
