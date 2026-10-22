import { Ranking, TVConfig } from '../../types';

export type SlideType = 'standings' | 'matches' | 'bracket' | 'schedule' | 'qr' | 'sponsors';

export type Slide = {
    type: SlideType;
    divisionId?: string;
    bracketType?: 'main' | 'consolation';
    title?: string;
};

/** The slides TV mode cycles through, from the tournament's format and its TV switches */
export const buildSlides = (ranking: Ranking, config: TVConfig): Slide[] => {
    const list: Slide[] = [];
    const divisions = ranking.divisions || [];
    const isElimination = ranking.format === 'elimination';
    const isHybridPlayoff = ranking.format === 'hybrid' && ranking.phase === 'playoff';
    const showBrackets = config.showBrackets ?? true;
    const showSchedule = config.showSchedule ?? true;

    if (isElimination || isHybridPlayoff) {
        if (showBrackets) {
            divisions.forEach(d => {
                const isMainType = d.type === 'main' || !d.type || d.type === 'consolation' || (isElimination && d.type !== 'league-consolation-main');
                const isConsolationType = d.type === 'league-consolation-main';

                if (isMainType) {
                    const hasMainMatches = d.matches.some(m => !m.roundName?.includes('(Cons.)'));
                    if (hasMainMatches || d.matches.length === 0) {
                        list.push({ type: 'bracket', bracketType: 'main', divisionId: d.id, title: d.name ? `Cuadro ${d.name}` : 'Cuadro Principal' });
                    }
                    if (d.matches.some(m => m.roundName?.includes('(Cons.)'))) {
                        list.push({ type: 'bracket', bracketType: 'consolation', divisionId: d.id, title: d.name ? `Consolación ${d.name}` : 'Cuadro Consolación' });
                    }
                }
                if (isConsolationType) {
                    list.push({ type: 'bracket', bracketType: 'consolation', divisionId: d.id, title: d.name || 'Cuadro Consolación' });
                }
            });
        }
        if (isElimination && showSchedule) list.push({ type: 'schedule', title: 'Horarios' });
    } else {
        // Pozo plays everything in one division: one overall table
        const isPozo = ranking.format === 'pozo';
        const groups = divisions.filter(d => !d.stage || d.stage === 'group');
        const titleOf = (d: typeof divisions[number], kind: 'standings' | 'matches') =>
            isPozo ? (kind === 'standings' ? 'Clasificación general' : 'Partidos') : (d.name || `División ${d.numero}`);

        (['standings', 'matches'] as const).forEach(kind => {
            const on = kind === 'standings' ? config.showStandings : config.showMatches;
            if (!on) return;
            if (divisions.length === 0) list.push({ type: kind });
            else groups.forEach(d => list.push({ type: kind, divisionId: d.id, title: titleOf(d, kind) }));
        });
    }

    if (config.showQR) list.push({ type: 'qr' });
    if (config.showSponsors) list.push({ type: 'sponsors' });
    return list;
};
