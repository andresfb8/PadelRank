
import React, { useState, useMemo } from 'react';
import { HelpCircle, X, Search, ChevronRight, BookOpen, Trophy, Settings, Users, Info, ChevronLeft } from 'lucide-react';
import { HELP_ARTICLES, HELP_CATEGORIES, HelpArticle } from '../data/helpContent';
import { Input } from './ui/Components';

export const HelpCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

    // Derived State
    const filteredArticles = useMemo(() => {
        if (!searchQuery) {
            if (selectedCategory) return HELP_ARTICLES.filter(a => a.categoryId === selectedCategory);
            return []; // Show categories view if no search/selection
        }

        const q = searchQuery.toLowerCase();
        return HELP_ARTICLES.filter(a =>
            a.title.toLowerCase().includes(q) ||
            a.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [searchQuery, selectedCategory]);

    const handleClose = () => {
        setIsOpen(false);
        // Reset state after transition for better UX next time
        setTimeout(() => {
            setSearchQuery('');
            setSelectedCategory(null);
            setSelectedArticle(null);
        }, 300);
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Trophy': return <Trophy size={20} />;
            case 'Settings': return <Settings size={20} />;
            case 'Users': return <Users size={20} />;
            case 'Info': return <Info size={20} />;
            default: return <BookOpen size={20} />;
        }
    };

    return (
        <>
            {/* Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-24 md:bottom-6 right-6 z-50 h-14 w-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 animate-bounce-subtle"
                    title="Centro de Ayuda"
                >
                    <HelpCircle size={28} />
                </button>
            )}

            {/* Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={handleClose}></div>
            )}

            {/* Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-indigo-600 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <HelpCircle size={24} /> Centro de Ayuda
                        </h2>
                        <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-indigo-200" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar ayuda (ej. americano, puntos...)"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedArticle) setSelectedArticle(null); // Exit article view on search
                            }}
                            className="w-full bg-white/10 border border-indigo-400/30 text-white placeholder-indigo-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:bg-white/20 focus:border-white/50 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {/* VIEW: Article Detail */}
                    {selectedArticle ? (
                        <div className="animate-fade-in">
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
                            >
                                <ChevronLeft size={16} className="mr-1" /> Volver
                            </button>

                            <article className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 prose prose-indigo max-w-none">
                                <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedArticle.title}</h1>
                                <div
                                    className="text-gray-600 leading-relaxed space-y-4"
                                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                                />
                                <div className="mt-8 flex flex-wrap gap-2">
                                    {selectedArticle.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">#{tag}</span>
                                    ))}
                                </div>
                            </article>
                        </div>
                    ) : (

                        /* VIEW: List / Categories */
                        <div className="space-y-6 animate-fade-in">

                            {/* If searching or category selected */}
                            {(searchQuery || selectedCategory) && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-900">
                                            {searchQuery ? 'Resultados de búsqueda' : HELP_CATEGORIES.find(c => c.id === selectedCategory)?.title}
                                        </h3>
                                        {selectedCategory && !searchQuery && (
                                            <button onClick={() => setSelectedCategory(null)} className="text-xs text-indigo-600 font-semibold hover:underline">Ver todo</button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {filteredArticles.map(article => (
                                            <div
                                                key={article.id}
                                                onClick={() => setSelectedArticle(article)}
                                                className="bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{article.title}</h4>
                                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400" />
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                    {/* Strip HTML tags for preview */}
                                                    {article.content.replace(/<[^>]*>?/gm, '').substring(0, 80)}...
                                                </p>
                                            </div>
                                        ))}

                                        {filteredArticles.length === 0 && (
                                            <div className="text-center py-8 opacity-60">
                                                <p>No se encontraron artículos.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* If HOME (Categories) */}
                            {!searchQuery && !selectedCategory && (
                                <>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Explorar por temas</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {HELP_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setSelectedCategory(cat.id)}
                                                    className="bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left flex flex-col items-center justify-center gap-3 h-32 group"
                                                >
                                                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        {getIcon(cat.icon)}
                                                    </div>
                                                    <span className="font-bold text-gray-700 text-sm text-center group-hover:text-indigo-700">{cat.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preguntas Frecuentes</h3>
                                        <div className="space-y-3">
                                            {HELP_ARTICLES.slice(0, 3).map(article => (
                                                <div
                                                    key={article.id}
                                                    onClick={() => setSelectedArticle(article)}
                                                    className="bg-white p-3 rounded-xl border border-gray-100 hover:border-indigo-200 cursor-pointer transition-all flex items-center gap-3 px-4"
                                                >
                                                    <div className="text-indigo-500"><BookOpen size={16} /></div>
                                                    <span className="text-sm font-medium text-gray-700">{article.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-100 text-center border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        Racket Grid v1.2 • <a href="#" className="underline hover:text-gray-800">Soporte Técnico</a>
                    </p>
                </div>
            </div>
        </>
    );
};
