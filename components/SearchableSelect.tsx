import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

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

    const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

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

    // Auto-positioning logic
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // Provide 280px buffer for dropdown (max-h-60 is approx 240px + search input)
            if (spaceBelow < 280 && rect.top > 280) {
                setPosition('top');
            } else {
                setPosition('bottom');
            }
        }
    }, [isOpen]);

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Limit to 50 for performance
    const displayedOptions = filteredOptions.slice(0, 50);

    const selectedOption = options.find(o => o.id === value);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {/* Trigger Button */}
            <div
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center cursor-pointer hover:border-primary transition-colors text-sm"
                onClick={() => {
                    setIsOpen(!isOpen);
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
                <div
                    className={`absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg animation-fade-in-down ${position === 'top' ? 'bottom-full mb-1' : 'mt-1'
                        }`}
                >
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
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2">
                                <button
                                    className="w-full text-center text-xs text-red-500 hover:bg-red-50 hover:text-red-700 py-2 rounded transition-colors font-medium flex items-center justify-center gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange('');
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <X size={12} /> Quitar Selección
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

