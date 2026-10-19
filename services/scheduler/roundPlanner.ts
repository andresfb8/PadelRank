import type { Division, Match } from '../../types';
import type { FeasibilityWarning, SchedulerConfig } from './types';
import { normalizeRoundName } from './types';
import {
    Interval, addMinutes, getOperatingIntervals, getRoundIntervals, getStartTimes, hasRoundWindows,
} from './timeGrid';

export interface RoundPlan {
    key: string;
    divisionId: string;
    jornada: number;
    roundName: string;
    label: string;              // category label for messages
    matchCount: number;         // matches that will actually be played
    intervals: Interval[];      // where this round may be played
    windowed: boolean;          // has its own phase windows
    earliestStart: Date | null; // IT
    latestStart: Date | null;   // latest start of the round's first wave: priority key (smaller = more urgent)
    deadline: Date | null;      // FT: matches of this round should end by this time
}

export const roundKeyOf = (divisionId: string, jornada: number): string => `${divisionId}#${jornada}`;

export const isPlayable = (m: Match): boolean =>
    m.status !== 'no_disputado' && m.score?.description !== 'BYE' &&
    m.pair1.p1Id !== 'BYE' && m.pair2.p1Id !== 'BYE';

export const divisionLabel = (div: Division): string => {
    const base = div.category || div.name || `División ${div.numero}`;
    return div.category && div.type === 'consolation' ? `${base} (Cons.)` : base;
};

const fmt = (d: Date) => d.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const firstFit = (from: Date, starts: Date[]): Date | null => starts.find(s => s >= from) ?? null;

const lastFit = (latestEnd: Date, starts: Date[], duration: number): Date | null => {
    for (let i = starts.length - 1; i >= 0; i--) {
        if (addMinutes(starts[i], duration) <= latestEnd) return starts[i];
    }
    return null;
};

/** Places `waves` consecutive waves no earlier than `from`. */
const forwardWaves = (from: Date, waves: number, starts: Date[], duration: number): { start: Date; end: Date } | null => {
    let first: Date | null = null;
    let t = from;
    for (let w = 0; w < waves; w++) {
        const s = firstFit(t, starts);
        if (!s) return null;
        if (!first) first = s;
        t = addMinutes(s, duration);
    }
    return first ? { start: first, end: t } : null;
};

/** Places `waves` consecutive waves ending no later than `latestEnd`; returns the first wave's start. */
const backwardWaves = (latestEnd: Date, waves: number, starts: Date[], duration: number): Date | null => {
    let t = latestEnd;
    let start: Date | null = null;
    for (let w = 0; w < waves; w++) {
        start = lastFit(t, starts, duration);
        if (!start) return null;
        t = start;
    }
    return start;
};

const findMainFor = (cons: Division, divisions: Division[]): Division | undefined => {
    if (cons.category) {
        const sameCat = divisions.find(d => d.type === 'main' && d.category === cons.category);
        if (sameCat) return sameCat;
    }
    const idx = divisions.indexOf(cons);
    for (let i = idx - 1; i >= 0; i--) if (divisions[i].type === 'main') return divisions[i];
    return undefined;
};

const slotCapacity = (intervals: Interval[], duration: number, courts: number): number =>
    intervals.reduce((sum, iv) => sum + Math.floor((iv.end.getTime() - iv.start.getTime()) / 60000 / duration), 0) * courts;

/**
 * Phase 1: for every round of every division computes the window [earliestStart, deadline]
 * and its urgency (latestStart), going forward from the tournament start and backward from the finals.
 */
export const planRounds = (
    divisions: Division[],
    config: SchedulerConfig
): { plans: Map<string, RoundPlan>; warnings: FeasibilityWarning[] } => {
    const D = config.slotDurationMinutes;
    const rest = config.restMinutes;
    const courts = Math.max(1, config.courts);
    const plans = new Map<string, RoundPlan>();
    const warnings: FeasibilityWarning[] = [];

    const operating = getOperatingIntervals(config);
    if (!operating.length) return { plans, warnings: [{ message: 'No hay días del torneo configurados.' }] };
    const tournamentStart = operating[0].start;
    const tournamentEnd = operating[operating.length - 1].end;

    const ordered = [...divisions.filter(d => d.type !== 'consolation'), ...divisions.filter(d => d.type === 'consolation')];

    for (const div of ordered) {
        const label = divisionLabel(div);
        const jornadas = Array.from(new Set(div.matches.map(m => m.jornada))).sort((a, b) => a - b);
        const rounds = jornadas.map(j => {
            const matches = div.matches.filter(m => m.jornada === j);
            const roundName = matches[0]?.roundName ?? `Ronda ${j}`;
            const intervals = getRoundIntervals(roundName, config);
            return {
                jornada: j,
                roundName,
                count: matches.filter(isPlayable).length,
                intervals,
                windowed: hasRoundWindows(roundName, config),
                starts: getStartTimes(intervals, D),
            };
        });

        // Forward pass: earliest start of each round
        let t = tournamentStart;
        if (div.type === 'consolation') {
            const main = findMainFor(div, divisions);
            const mainFirst = main && Math.min(...main.matches.map(m => m.jornada));
            const mainPlan = main ? plans.get(roundKeyOf(main.id, mainFirst!)) : undefined;
            if (mainPlan?.earliestStart) t = addMinutes(mainPlan.earliestStart, D + rest);
        }
        const earliest = rounds.map(r => {
            if (r.count === 0) return firstFit(t, r.starts);
            const res = forwardWaves(t, Math.ceil(r.count / courts), r.starts, D);
            if (!res) return null;
            t = addMinutes(res.end, rest);
            return res.start;
        });

        // Backward pass: deadline and latest start of each round
        let latestEnd = tournamentEnd;
        const backward: { latestStart: Date | null; deadline: Date }[] = new Array(rounds.length);
        for (let i = rounds.length - 1; i >= 0; i--) {
            const r = rounds[i];
            const lastIntervalEnd = r.intervals.length ? r.intervals[r.intervals.length - 1].end : null;
            const deadline = lastIntervalEnd && lastIntervalEnd < latestEnd ? lastIntervalEnd : latestEnd;
            const latestStart = r.count === 0
                ? lastFit(deadline, r.starts, D)
                : backwardWaves(deadline, Math.ceil(r.count / courts), r.starts, D);
            backward[i] = { latestStart, deadline };
            if (latestStart && r.count > 0) latestEnd = addMinutes(latestStart, -rest);
        }

        rounds.forEach((r, i) => {
            const key = roundKeyOf(div.id, r.jornada);
            const es = earliest[i];
            const { latestStart: ls, deadline } = backward[i];
            plans.set(key, {
                key, divisionId: div.id, jornada: r.jornada, roundName: r.roundName, label,
                matchCount: r.count, intervals: r.intervals, windowed: r.windowed,
                earliestStart: es, latestStart: ls, deadline,
            });
            if (r.count === 0) return;
            const name = `${normalizeRoundName(r.roundName)} de ${label}`;
            if (!es) warnings.push({ roundKey: key, message: `${name}: no hay horario disponible para jugarla.` });
            else if (!ls) warnings.push({ roundKey: key, message: `${name}: no cabe antes de las rondas siguientes.` });
            else if (es > ls) warnings.push({
                roundKey: key,
                message: `${name} no cabe: puede empezar como pronto ${fmt(es)} pero debería empezar como tarde ${fmt(ls)}.`,
            });
        });
    }

    // Phase windows: total matches of a round name vs slots in its windows
    const perWindowedRound = new Map<string, number>();
    plans.forEach(p => {
        if (!p.windowed || !p.matchCount) return;
        const name = normalizeRoundName(p.roundName);
        perWindowedRound.set(name, (perWindowedRound.get(name) ?? 0) + p.matchCount);
    });
    perWindowedRound.forEach((total, name) => {
        const capacity = slotCapacity(getRoundIntervals(name, config), D, courts);
        if (total > capacity) {
            warnings.push({ message: `${name}: ${total} partidos no caben en sus franjas (${capacity} huecos con ${courts} pistas).` });
        }
    });

    // Whole tournament
    const totalMatches = Array.from(plans.values()).reduce((s, p) => s + p.matchCount, 0);
    const totalCapacity = slotCapacity(operating, D, courts);
    if (totalMatches > totalCapacity) {
        warnings.push({ message: `El torneo tiene ${totalMatches} partidos y solo hay ${totalCapacity} huecos disponibles.` });
    }

    return { plans, warnings };
};
