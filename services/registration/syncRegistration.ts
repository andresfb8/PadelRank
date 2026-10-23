import type { Division, Ranking, TournamentRegistration } from '../../types';
import { SchedulerEngine, makePairKey } from '../scheduler';
import { TournamentEngine } from '../TournamentEngine';
import { MatchGenerator } from '../matchGenerator';
import type { ResultCheck } from '../scheduler';
import { clipToDays, effectiveBlockedRanges } from './blockedTimes';

/** Guest player ids created when a registration is imported into the tournament. */
export const guestIdsOf = (regId: string) => ({ p1: `guest_reg_${regId}_1`, p2: `guest_reg_${regId}_2` });

export const isImported = (ranking: Ranking, reg: TournamentRegistration): boolean =>
    (ranking.guestPlayers ?? []).some(p => p.id === guestIdsOf(reg.id).p1);

const pairKeyOfRegistration = (reg: TournamentRegistration): string => {
    const { p1, p2 } = guestIdsOf(reg.id);
    return makePairKey(p1, reg.player2 ? p2 : undefined);
};

/** Sets (or removes, when empty) the registration's blocks in pairConstraints, cut to the tournament days. */
const withRegistrationBlocks = (ranking: Ranking, reg: TournamentRegistration): Ranking => {
    const days = ranking.schedulerConfig?.dailySchedule ?? [];
    const { kept } = clipToDays(effectiveBlockedRanges(reg, days, ranking.fechaInicio), days);
    const pairConstraints = { ...(ranking.pairConstraints ?? {}) };
    const key = pairKeyOfRegistration(reg);
    if (kept.length) pairConstraints[key] = { unavailableRanges: kept };
    else delete pairConstraints[key];
    return { ...ranking, pairConstraints };
};

/**
 * After editing an imported registration: updates its pair's constraints and re-checks the conflicts of
 * the matches that already have a time, without moving any of them. A registration that is not imported
 * leaves the ranking untouched.
 */
export const applyRegistrationBlocks = (
    ranking: Ranking,
    reg: TournamentRegistration
): { ranking: Ranking; newConflicts: ResultCheck['newConflicts'] } => {
    if (!isImported(ranking, reg)) return { ranking, newConflicts: [] };
    const updated = withRegistrationBlocks(ranking, reg);
    const check = SchedulerEngine.onResultEntered(updated);
    return { ranking: { ...updated, divisions: check.divisions }, newConflicts: check.newConflicts };
};

/** Adds the approved registrations as guest players with their blocks as pair constraints. */
export const importRegistrations = (ranking: Ranking, approved: TournamentRegistration[]): Ranking => {
    const guestPlayers = [...(ranking.guestPlayers ?? [])];
    let updated: Ranking = ranking;
    approved.forEach(reg => {
        const { p1, p2 } = guestIdsOf(reg.id);
        const apellidos = `(${reg.assignedCategory || reg.selectedCategory})`;
        if (!guestPlayers.some(p => p.id === p1)) guestPlayers.push({ id: p1, nombre: reg.player1.name, apellidos });
        if (reg.player2 && !guestPlayers.some(p => p.id === p2)) guestPlayers.push({ id: p2, nombre: reg.player2.name, apellidos });
        updated = withRegistrationBlocks(updated, reg);
    });
    return { ...updated, guestPlayers };
};

/**
 * Builds the tournament divisions from the approved registrations: one bracket per category
 * (elimination) or one division per category (pairs league / hybrid groups). Also imports the
 * registrations as guest players with their availability blocks.
 * Returns null when there are fewer than 2 complete pairs.
 */
export const generateDivisionsFromRegistrations = (
    ranking: Ranking,
    approved: TournamentRegistration[]
): Ranking | null => {
    const approvedPairs = approved.filter(r => r.player2);
    if (approvedPairs.length < 2) return null;

    // Guests + availability constraints first, so the pair ids used in the divisions are known players.
    const withGuests = importRegistrations(ranking, approved);

    const pairStringOf = (reg: TournamentRegistration): string => {
        const { p1, p2 } = guestIdsOf(reg.id);
        return `${p1}::${p2}`;
    };

    // Group the complete pairs by category; categories with a single pair fall into "General".
    const byCategory = new Map<string, string[]>();
    approvedPairs.forEach(reg => {
        const cat = (reg.assignedCategory || reg.selectedCategory || '').trim() || 'General';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(pairStringOf(reg));
    });

    const valid = new Map<string, string[]>();
    let leftovers: string[] = [];
    byCategory.forEach((list, cat) => {
        if (list.length >= 2) valid.set(cat, list);
        else leftovers.push(...list);
    });
    if (valid.size === 0 && leftovers.length < 2) return null;
    if (leftovers.length >= 2) valid.set('General', leftovers);

    const isElimination = ranking.format === 'elimination';
    const consolation = !!ranking.config?.eliminationConfig?.consolation;
    const doubleRoundRobin = ranking.format === 'hybrid'
        ? !!ranking.config?.hybridConfig?.doubleRoundRobin
        : !!ranking.config?.pairsConfig?.doubleRoundRobin;

    const divisions: Division[] = [];
    let numero = 0;
    valid.forEach((list, cat) => {
        numero++;
        if (isElimination) {
            const bracketDivisions = TournamentEngine.generateBracket(list, consolation);
            bracketDivisions.forEach(d => {
                d.category = cat;
                d.name = `${cat} - ${d.type === 'main' ? 'Principal' : 'Consolación'}`;
            });
            divisions.push(...bracketDivisions);
        } else {
            const pairs = list.map(s => s.split('::'));
            const matches = MatchGenerator.generatePairsLeague(pairs, numero - 1, doubleRoundRobin);
            divisions.push({
                id: crypto.randomUUID(),
                numero,
                status: 'activa',
                players: pairs.flat(),
                stage: ranking.format === 'hybrid' ? 'group' : undefined,
                name: ranking.format === 'hybrid' ? `Grupo ${String.fromCharCode(64 + numero)}` : cat || undefined,
                category: cat || undefined,
                matches
            });
        }
    });

    return { ...withGuests, divisions };
};
