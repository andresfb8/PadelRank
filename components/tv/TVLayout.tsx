import React, { useState, useEffect } from 'react';
import { Ranking, Player } from '../../types';
import { StandingsSlide } from './slides/StandingsSlide';
import { MatchesSlide } from './slides/MatchesSlide';
import { BracketsSlide } from './slides/BracketsSlide';
import { ScheduleSlide } from './slides/ScheduleSlide';
import { QRSlide } from './slides/QRSlide';
import { SponsorsSlide } from './slides/SponsorsSlide';
import { Maximize, Minimize, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
}

type SlideType = 'standings' | 'matches' | 'bracket' | 'schedule' | 'qr' | 'sponsors';

export const TVLayout = ({ ranking, players }: Props) => {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Configuration (with defensive defaults)
    const config = React.useMemo(() => {
        const defaults = {
            enabled: true,
            slideDuration: 15,
            showStandings: true,
            showMatches: true,
            showQR: true,
            showSponsors: true,
            theme: 'dark' as const
        };

        if (!ranking || !ranking.tvConfig) return defaults;

        return {
            ...defaults,
            ...ranking.tvConfig
        };
    }, [ranking]);

    // Define extended slide type to include division/bracket context
    type ExtendedSlide = {
        type: SlideType;
        divisionId?: string;
        bracketType?: 'main' | 'consolation';
        title?: string;
    };

    // Determine active slides based on config AND divisions
    const slides: ExtendedSlide[] = React.useMemo(() => {
        const list: ExtendedSlide[] = [];
        const activeDivisions = ranking.divisions;
        const isElimination = ranking.format === 'elimination';
        const isHybridPlayoff = ranking.format === 'hybrid' && ranking.phase === 'playoff';

        if (isElimination || isHybridPlayoff) {
            // BRACKET LOGIC: Iterate ALL divisions to generate specific slides for each
            activeDivisions.forEach(d => {
                // Determine if this division should have a Main Bracket Slide
                // Rule: It is a Main/Default type OR it is a Hybrid Playoff division
                const isMainType = d.type === 'main' || !d.type || d.type === 'consolation' || (isElimination && d.type !== 'league-consolation-main');

                // Determine if this division is explicitly a Consolation Division
                const isConsolationType = d.type === 'league-consolation-main';

                if (isMainType) {
                    // Check if it has matches that constitute a "Main Bracket" (not marked as Consolation)
                    const hasMainMatches = d.matches.some(m => !m.roundName?.includes('(Cons.)'));
                    if (hasMainMatches || d.matches.length === 0) { // Show even if empty? Usually yes.
                        list.push({
                            type: 'bracket',
                            bracketType: 'main',
                            divisionId: d.id,
                            title: d.name ? `Cuadro ${d.name}` : `Cuadro Principal`
                        });
                    }

                    // Check if it has INTERNAL Consolation matches
                    const hasInternalConsolation = d.matches.some(m => m.roundName?.includes('(Cons.)'));
                    if (hasInternalConsolation) {
                        list.push({
                            type: 'bracket',
                            bracketType: 'consolation',
                            divisionId: d.id,
                            title: d.name ? `Consolación ${d.name}` : `Cuadro Consolación`
                        });
                    }
                }

                if (isConsolationType) {
                    // It is a dedicated Consolation Division
                    list.push({
                        type: 'bracket',
                        bracketType: 'consolation',
                        divisionId: d.id,
                        title: d.name || `Cuadro Consolación`
                    });
                }
            });

            // 3. Schedule Slide (Strictly for Elimination format as requested)
            if (isElimination) {
                list.push({ type: 'schedule', title: 'Horarios' });
            }
        } else {
            // STANDARD / GROUP LOGIC (Inc. Hybrid Group Phase)

            // 1. Standings Slides (one per division)
            if (config.showStandings) {
                if (activeDivisions.length > 0) {
                    activeDivisions
                        .filter(d => !d.stage || d.stage === 'group') // Only group divisions
                        .forEach(div => {
                            list.push({
                                type: 'standings',
                                divisionId: div.id,
                                title: div.name || `División ${div.numero}`
                            });
                        });
                } else {
                    list.push({ type: 'standings' });
                }
            }

            // 2. Matches Slides (one per division)
            if (config.showMatches) {
                if (activeDivisions.length > 0) {
                    activeDivisions
                        .filter(d => !d.stage || d.stage === 'group')
                        .forEach(div => {
                            list.push({
                                type: 'matches',
                                divisionId: div.id,
                                title: div.name || `División ${div.numero}`
                            });
                        });
                } else {
                    list.push({ type: 'matches' });
                }
            }
        }

        if (config.showQR) list.push({ type: 'qr' });
        if (config.showSponsors) list.push({ type: 'sponsors' });

        return list;
    }, [config, ranking.divisions, ranking.status, ranking.format, ranking.phase]);

    // If no slides enabled, show fallback
    if (slides.length === 0) {
        return <div className="h-screen flex items-center justify-center bg-black text-white">Modo TV no configurado</div>;
    }

    // Timer Logic
    useEffect(() => {
        const durationMs = (config.slideDuration || 15) * 1000;
        const intervalMs = 100; // Update progress every 100ms
        const step = 100 / (durationMs / intervalMs);

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    // Next slide
                    setActiveSlideIndex(current => (current + 1) % slides.length);
                    return 0;
                }
                return prev + step;
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [config.slideDuration, slides.length]); // Reset if duration or slides change

    // Reset progress when slide changes manually
    useEffect(() => {
        setProgress(0);
    }, [activeSlideIndex]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const renderSlide = () => {
        const slide = slides[activeSlideIndex];
        switch (slide.type) {
            case 'standings':
                return <StandingsSlide ranking={ranking} players={players} divisionId={slide.divisionId} />;
            case 'matches':
                return <MatchesSlide ranking={ranking} players={players} divisionId={slide.divisionId} />;
            case 'bracket':
                return <BracketsSlide ranking={ranking} players={players} bracketType={slide.bracketType!} title={slide.title} />;
            case 'schedule':
                return <ScheduleSlide ranking={ranking} players={players} />;
            case 'qr': return <QRSlide ranking={ranking} />;
            case 'sponsors': return <SponsorsSlide ranking={ranking} />;
            default: return null;
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative flex flex-col font-sans">
            {/* Main Content Area */}
            <div className="flex-1 relative z-0">
                {renderSlide()}
            </div>

            {/* Info Bar / Footer */}
            <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 relative z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">EN VIVO</span>
                    <h1 className="text-xl font-bold text-white truncate max-w-xl">{ranking.nombre}</h1>
                    {/* Slide Title Indicator */}
                    <span className="text-slate-400 text-sm border-l border-slate-700 pl-4 ml-4">
                        {slides[activeSlideIndex].title ||
                            (slides[activeSlideIndex].type === 'qr' ? 'Escanea para seguir' :
                                slides[activeSlideIndex].type === 'sponsors' ? 'Patrocinadores' : '')}
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    {/* Slide Indicators */}
                    <div className="flex gap-2">
                        {slides.map((s, idx) => (
                            <div
                                key={idx}
                                className={`h-2 rounded-full transition-all duration-500 ${idx === activeSlideIndex ? 'w-8 bg-primary' : 'w-2 bg-slate-700'}`}
                            />
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 mr-4 border-r border-slate-700 pr-4">
                        <button
                            onClick={() => setActiveSlideIndex(curr => (curr - 1 + slides.length) % slides.length)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            title="Anterior"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={() => setActiveSlideIndex(curr => (curr + 1) % slides.length)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            title="Siguiente"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <button onClick={toggleFullscreen} className="text-slate-500 hover:text-white transition-colors p-2" title="Pantalla Completa">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>

                {/* Progress Line */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
};
