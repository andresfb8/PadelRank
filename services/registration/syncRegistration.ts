import type { Ranking, TournamentRegistration } from '../../types';
import { SchedulerEngine, makePairKey } from '../scheduler';
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
