import React, { useState, useEffect } from 'react';
import { Ranking, Player } from '../../types';
import { StandingsSlide } from './slides/StandingsSlide';
import { MatchesSlide } from './slides/MatchesSlide';
import { QRSlide } from './slides/QRSlide';
import { SponsorsSlide } from './slides/SponsorsSlide';
import { Maximize, Minimize } from 'lucide-react';

interface Props {
    ranking: Ranking;
    players: Record<string, Player>;
}

type SlideType = 'standings' | 'matches' | 'qr' | 'sponsors';

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

    // Determine active slides based on config
    const slides: SlideType[] = React.useMemo(() => {
        const list: SlideType[] = [];
        if (config.showStandings) list.push('standings');
        if (config.showMatches) list.push('matches');
        if (config.showQR) list.push('qr');
        if (config.showSponsors) list.push('sponsors');
        return list;
    }, [config]);

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

    // Reset progress when slide changes manually (if we add buttons) or by index change
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
        const type = slides[activeSlideIndex];
        switch (type) {
            case 'standings': return <StandingsSlide ranking={ranking} players={players} />;
            case 'matches': return <MatchesSlide ranking={ranking} players={players} />;
            case 'qr': return <QRSlide ranking={ranking} />;
            case 'sponsors': return <SponsorsSlide ranking={ranking} />;
            default: return null;
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-black relative flex flex-col font-sans">
            {/* Main Content Area */}
            <div className="flex-1 relative z-0">
                <div style={{ position: 'absolute', top: 50, left: 10, zIndex: 9999, background: 'blue', color: 'white', padding: '10px' }}>
                    DEBUG: TVLayout Rendered. Active Slide: {slides[activeSlideIndex]}
                </div>
                {renderSlide()}
            </div>

            {/* Info Bar / Footer */}
            <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 relative z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">EN VIVO</span>
                    <h1 className="text-xl font-bold text-white truncate max-w-xl">{ranking.nombre}</h1>
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
                    <button onClick={toggleFullscreen} className="text-slate-500 hover:text-white transition-colors">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>

                {/* Progress Line */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
};
