import { RankingConfig, Division, Player, RankingFormat } from '../types';
import * as PozoEngine from './PozoEngine';
import { MatchGenerator } from './matchGenerator';
import { TournamentEngine } from './TournamentEngine';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface GeneratorInput {
    format: RankingFormat;
    assignments: Record<number, string[]>;
    config: RankingConfig;
    numDivisions: number;
    individualMaxPlayers: number;
    // Only used by elimination
    categories?: string[];
    categorySizes?: Record<number, number>;
    // Only used by americano/mexicano individual fallback
    selectedPlayerIds?: string[];
    availablePlayers?: Player[];
}

// ─── Elimination ──────────────────────────────────────────────────────────────

export function generateEliminationDivisions(input: GeneratorInput): Division[] {
    const { config, assignments, categories = [], categorySizes = {} } = input;
    if (categories.length === 0) throw new Error('Debes configurar al menos una categoría');

    const divisions: Division[] = [];

    for (let i = 0; i < categories.length; i++) {
        const catName = categories[i];
        let playersList: string[] = [];

        if (config.eliminationConfig?.type === 'pairs') {
            const p = assignments[i] || [];
            playersList = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
            if (playersList.length < 2)
                throw new Error(`Se necesitan al menos 2 parejas completas para la categoría ${catName}`);
        } else {
            const p = assignments[i] || [];
            playersList = p.filter(x => x);
            if (playersList.length < 2)
                throw new Error(`Mínimo 2 jugadores para ${catName}`);
        }

        const bracketDivisions = TournamentEngine.generateBracket(
            playersList,
            config.eliminationConfig?.consolation || false
        );

        bracketDivisions.forEach(d => {
            d.category = catName;
            d.name = `${catName} - ${d.type === 'main' ? 'Principal' : 'Consolación'}`;
        });

        divisions.push(...bracketDivisions);
    }

    return divisions;
}

// ─── Americano & Mexicano ─────────────────────────────────────────────────────

export function generateAmericanoDivisions(input: GeneratorInput): Division[] {
    const { format, assignments, config, numDivisions, selectedPlayerIds = [], availablePlayers = [] } = input;
    const isPairs = format === 'americano'
        ? config.americanoConfig?.variant === 'pairs'
        : config.mexicanoConfig?.variant === 'pairs';

    const divisions: Division[] = [];

    if (isPairs) {
        for (let i = 0; i < numDivisions; i++) {
            const p = assignments[i] || [];
            const pairStrings = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
            if (pairStrings.length < 2)
                throw new Error(`Se necesitan al menos 2 parejas completas para la División ${i + 1} del formato de parejas.`);

            const pairs = pairStrings.map(s => s.split('::'));
            let matches: any[];

            if (format === 'americano') {
                matches = MatchGenerator.generatePairsLeague(pairs, 1);
            } else {
                const dummyPlayers: any[] = pairStrings.map(id => ({ id, nombre: '', stats: {} }));
                matches = MatchGenerator.generateMexicanoRoundRandom(dummyPlayers, 1, config.courts || 2, 'pairs');
            }

            divisions.push({
                id: `div-${crypto.randomUUID()}`,
                numero: i + 1,
                status: 'activa',
                players: pairs.flat(),
                matches,
            });
        }
    } else {
        // Individual variant
        const manuallyAssignedCount = Object.values(assignments).flat().filter(Boolean).length;
        if (selectedPlayerIds.length < 4 && manuallyAssignedCount < 4)
            throw new Error('Selecciona al menos 4 jugadores (en la bolsa o asignados manualmente)');

        for (let i = 0; i < numDivisions; i++) {
            const p = assignments[i] || [];
            let activePlayers = p.filter(x => x);

            if (numDivisions === 1 && activePlayers.length === 0 && selectedPlayerIds.length >= 4) {
                activePlayers = selectedPlayerIds;
            }
            if (activePlayers.length < 4)
                throw new Error(`La División ${i + 1} debe tener al menos 4 jugadores`);

            let matches: any[];
            if (format === 'mexicano') {
                matches = MatchGenerator.generateIndividualRound(activePlayers, i, 1);
            } else {
                const selected = activePlayers
                    .map(id => availablePlayers.find(p => p.id === id))
                    .filter(Boolean) as Player[];
                matches = MatchGenerator.generateAmericano(selected, config.courts || 2);
            }

            divisions.push({
                id: `div-${crypto.randomUUID()}`,
                numero: i + 1,
                status: 'activa',
                players: activePlayers,
                matches,
            });
        }
    }

    return divisions;
}

// ─── Pozo ─────────────────────────────────────────────────────────────────────

export function generatePozoDivisions(input: GeneratorInput): Division[] {
    const { assignments, config } = input;
    const p = assignments[0] || [];
    const activePlayers = p.filter(x => x);
    const divisions: Division[] = [];

    let pozoPlayers: string[];
    if (config.pozoConfig?.variant === 'fixed-pairs') {
        pozoPlayers = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
        if (pozoPlayers.length < 2)
            throw new Error('Mínimo 2 Parejas completas en Div 1 para Pozo');
    } else {
        pozoPlayers = activePlayers;
    }

    const matches = PozoEngine.generateInitialRound(pozoPlayers, config);

    const flatPlayers = config.pozoConfig?.variant === 'fixed-pairs'
        ? pozoPlayers.map(s => s.split('::')).flat()
        : pozoPlayers;

    divisions.push({
        id: `div-${crypto.randomUUID()}`,
        numero: 1,
        status: 'activa',
        players: flatPlayers,
        matches,
    });

    return divisions;
}

// ─── Classic / Individual / Pairs / Hybrid ────────────────────────────────────

export function generateLeagueDivisions(input: GeneratorInput): Division[] {
    const { format, assignments, config, numDivisions } = input;
    const divisions: Division[] = [];

    for (let i = 0; i < numDivisions; i++) {
        const p = assignments[i] || [];
        const activePlayers = p.filter(x => x);

        // Validation
        if (format === 'pairs' || format === 'hybrid') {
            const pairStrings = p.filter(x => x && x.includes('::') && !x.startsWith('::') && !x.endsWith('::'));
            if (pairStrings.length < 2)
                throw new Error(`Mínimo 2 Parejas completas en Div ${i + 1}`);

            const pairs = pairStrings.map(s => s.split('::'));
            const flatPlayers = pairs.flat();
            const doubleRoundRobin = format === 'hybrid'
                ? !!config.hybridConfig?.doubleRoundRobin
                : !!config.pairsConfig?.doubleRoundRobin;
            const matches = MatchGenerator.generatePairsLeague(pairs, i, doubleRoundRobin);

            divisions.push({
                id: `div-${crypto.randomUUID()}`,
                numero: i + 1,
                status: 'activa',
                players: flatPlayers,
                stage: format === 'hybrid' ? 'group' : undefined,
                name: format === 'hybrid' ? `Grupo ${String.fromCharCode(65 + i)}` : undefined,
                matches,
            });
            continue;
        }

        // Classic / Individual
        const minP = 4;
        if (activePlayers.length < minP)
            throw new Error(`Mínimo 4 jugadores en Div ${i + 1}`);

        let matches: any[];
        if (format === 'classic') {
            if (activePlayers.length !== 4)
                throw new Error(`La División ${i + 1} debe tener exactamente 4 jugadores en liga clásica`);
            matches = MatchGenerator.generateClassic4(activePlayers, i);
        } else {
            matches = MatchGenerator.generateIndividualLeague(activePlayers, i);
        }

        divisions.push({
            id: `div-${crypto.randomUUID()}`,
            numero: i + 1,
            status: 'activa',
            players: activePlayers,
            matches,
        });
    }

    return divisions;
}

// ─── Router: pick the right generator based on format ─────────────────────────

export function generateDivisions(input: GeneratorInput): Division[] {
    const { format } = input;

    switch (format) {
        case 'elimination':
            return generateEliminationDivisions(input);
        case 'americano':
        case 'mexicano':
            return generateAmericanoDivisions(input);
        case 'pozo':
            return generatePozoDivisions(input);
        default:
            return generateLeagueDivisions(input);
    }
}

