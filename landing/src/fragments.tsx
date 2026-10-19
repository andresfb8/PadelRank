import React, { useEffect, useMemo, useRef } from 'react';

// Interface fragments of Racket Grid, built at true size with the app's own look.
// Each root carries data-ui: they are pictures of the product, not page chrome.
// taste-skill-ignore: row rules and the header line below belong to these interface fragments.

// ---------------------------------------------------------------------------
// The live parrilla: a real greedy scheduler over one Saturday, three courts.
// ---------------------------------------------------------------------------

export const SLOTS = ['09:00', '10:30', '12:00', '13:30'] as const;
const COURTS = [1, 2, 3];
const FOLLOWED = 'Laura M. / Marta S.';

type Fixture = { id: string; a: string; b: string; cat: 'Primera' | 'Segunda' };

// Entered in the order the draw produced them
const FIXTURES: Fixture[] = [
    { id: 'm1', a: 'Elena P. / Fátima G.', b: 'Ana G. / Bea L.', cat: 'Primera' },
    { id: 'm2', a: 'Gema R. / Helena D.', b: 'Carla M. / Diana S.', cat: 'Primera' },
    { id: 'm3', a: FOLLOWED, b: 'Irene G. / Julia L.', cat: 'Primera' },
    { id: 'm4', a: 'Rosa D. / Paula L.', b: 'Nuria P. / Olga G.', cat: 'Segunda' },
    { id: 'm5', a: 'Hugo R. / Iván S.', b: 'Bruno L. / Carlos M.', cat: 'Segunda' },
    { id: 'm6', a: 'Álex G. / David P.', b: 'Mario D. / Pablo R.', cat: 'Segunda' },
    { id: 'm7', a: FOLLOWED, b: 'Gema R. / Helena D.', cat: 'Primera' },
];

type Placement = { slot: number; court: number };

/** "Laura M. / Marta S." → "Laura / Marta", for the phone-sized parrilla */
const firstNames = (pair: string) => pair.split(' / ').map(n => n.split(' ')[0]).join(' / ');

/**
 * Places every match in the earliest free court and half-day slot where neither pair
 * has said it cannot play and both have rested one slot since their last match.
 */
export const schedule = (blocked: Set<number>) => {
    const placed: Record<string, Placement> = {};
    const unplaced: Fixture[] = [];
    const busy = new Map<string, number[]>(); // pair -> slots it plays
    const taken = new Set<string>(); // "slot:court"

    for (const f of FIXTURES) {
        let spot: Placement | null = null;
        for (let s = 0; s < SLOTS.length && !spot; s++) {
            const pairs = [f.a, f.b];
            if (pairs.includes(FOLLOWED) && blocked.has(s)) continue;
            const rested = pairs.every(p => (busy.get(p) || []).every(t => Math.abs(t - s) > 1));
            if (!rested) continue;
            const court = COURTS.find(c => !taken.has(`${s}:${c}`));
            if (court) spot = { slot: s, court };
        }
        if (!spot) { unplaced.push(f); continue; }
        placed[f.id] = spot;
        taken.add(`${spot.slot}:${spot.court}`);
        [f.a, f.b].forEach(p => busy.set(p, [...(busy.get(p) || []), spot!.slot]));
    }
    return { placed, unplaced };
};

export const ParrillaLive = ({ blocked, onToggle, compact = false }: {
    blocked: Set<number>;
    onToggle: (slot: number) => void;
    compact?: boolean;
}) => {
    const { placed, unplaced } = useMemo(() => schedule(blocked), [blocked]);
    const previous = useRef<Record<string, Placement>>({});
    const moved = new Set(Object.keys(placed).filter(id => {
        const before = previous.current[id];
        return before && (before.slot !== placed[id].slot || before.court !== placed[id].court);
    }));
    // Remember this placement for the next change
    useEffect(() => { previous.current = placed; }, [placed]);

    const followedMatches = FIXTURES.filter(f => f.a === FOLLOWED || f.b === FOLLOWED);
    const summary = followedMatches.map(f => {
        const p = placed[f.id];
        const rival = f.a === FOLLOWED ? f.b : f.a;
        return p ? `contra ${rival}: ${SLOTS[p.slot]}, pista ${p.court}` : `contra ${rival}: no cabe el sábado`;
    });

    return (
        <div data-ui className="bg-white rounded-xl text-rg-ink w-full overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2.5">
                <p className="text-[15px] font-semibold">Parrilla · sábado 24 oct</p>
                <p className="text-[13px] text-rg-muted num">{Object.keys(placed).length} de {FIXTURES.length} partidos con hora</p>
            </div>

            <div className={`grid grid-cols-[52px_repeat(3,minmax(0,1fr))] gap-1.5 px-3 pb-3 num ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
                <span />
                {COURTS.map(c => <span key={c} className="text-[12px] text-rg-muted font-medium pb-0.5">Pista {c}</span>)}
                {SLOTS.map((time, s) => (
                    <React.Fragment key={time}>
                        <span className={`text-[13px] font-semibold pt-2 ${blocked.has(s) ? 'text-rg-negative' : ''}`}>{time}</span>
                        {COURTS.map(c => {
                            const f = FIXTURES.find(x => placed[x.id]?.slot === s && placed[x.id]?.court === c);
                            if (!f) return <span key={c} className={`rounded-lg bg-rg-paper ${compact ? 'min-h-[54px]' : 'min-h-[64px]'}`} />;
                            const mine = f.a === FOLLOWED || f.b === FOLLOWED;
                            return (
                                <span
                                    key={`${c}-${f.id}`}
                                    className={`rounded-lg px-2 py-1.5 leading-tight ${compact ? 'min-h-[54px]' : 'min-h-[64px]'} ${mine ? 'bg-court-soft ring-1 ring-court text-court-ink' : 'bg-rg-raised'} ${moved.has(f.id) ? 'landed' : ''}`}
                                >
                                    <span className="block truncate font-medium">{compact ? firstNames(f.a) : f.a}</span>
                                    <span className="block truncate">{compact ? firstNames(f.b) : f.b}</span>
                                    {!compact && <span className="block text-[12px] text-rg-muted mt-0.5">{f.cat}</span>}
                                </span>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            <div className="bg-rg-paper px-4 py-3 space-y-2.5">
                <p className="text-[14px] font-medium">Laura y Marta no pueden jugar a las…</p>
                <div className="flex flex-wrap gap-2">
                    {SLOTS.map((time, s) => (
                        <button
                            key={time}
                            type="button"
                            aria-pressed={blocked.has(s)}
                            onClick={() => onToggle(s)}
                            className={`h-10 px-3.5 rounded-full text-[14px] font-medium border transition-colors num active:scale-[0.97] ${blocked.has(s)
                                ? 'bg-[#ffedea] border-[#f5c2bd] text-[#831c1e]'
                                : 'bg-white border-rg-control text-rg-ink hover:border-court'}`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
                <ul className="text-[14px] text-rg-ink" aria-live="polite">
                    {summary.map(line => <li key={line}>Laura y Marta {line}</li>)}
                </ul>
                {unplaced.length > 0 && (
                    <p className="text-[13px] text-[#831c1e]">
                        Con esas horas no cabe todo: Racket Grid lo marca como conflicto y tú decides.
                    </p>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Small proofs beside each feature
// ---------------------------------------------------------------------------

const FORMATS = ['Liga individual', 'Liga por parejas', 'Americano', 'Mexicano', 'Eliminatoria', 'Liga + playoff', 'Pozo'];

export const FormatsFragment = () => (
    <div data-ui className="bg-white rounded-lg p-3.5 w-[340px] text-rg-ink">
        <p className="text-[13px] text-rg-muted mb-2">Formato del torneo</p>
        <div className="flex flex-wrap gap-1.5">
            {FORMATS.map(f => (
                <span key={f} className={`h-8 px-3 inline-flex items-center rounded-full text-[13px] font-medium ${f === 'Liga + playoff' ? 'bg-rg-ink text-white' : 'bg-rg-raised'}`}>{f}</span>
            ))}
        </div>
    </div>
);

export const ConflictFragment = () => (
    <div data-ui className="bg-white rounded-lg p-3.5 w-[340px] text-rg-ink space-y-2">
        <p className="text-[13px] text-rg-muted">Aviso de disponibilidad</p>
        <p className="text-[14px] font-semibold">Rosa D. / Paula L.</p>
        <p className="text-[13px]">No pueden el sábado de 16:00 a 22:00.</p>
        <p className="text-[13px] text-court-ink bg-court-soft rounded-md px-2.5 py-1.5 num">Movido al domingo 10:30, pista 2</p>
    </div>
);

export const RegistrationFragment = () => (
    <div data-ui className="bg-white rounded-lg p-3.5 w-[300px] text-rg-ink">
        <div className="flex gap-1 mb-1">{[0, 1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i < 2 ? 'bg-court' : 'bg-court-track'}`} />)}</div>
        <p className="text-[12px] text-rg-muted mb-2.5 num">Paso 2 de 4</p>
        <p className="text-[13px] font-medium mb-1.5">Categoría</p>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
            <span className="h-9 rounded-md border-2 border-court bg-court-soft text-court-ink text-[13px] font-medium flex items-center px-2.5">Primera</span>
            <span className="h-9 rounded-md border border-rg-control text-[13px] flex items-center px-2.5">Segunda</span>
        </div>
        <span className="h-10 rounded-md bg-court text-white text-[13px] font-semibold flex items-center justify-center">Continuar con tu pareja</span>
    </div>
);

export const FollowFragment = () => (
    <div data-ui className="bg-court-soft rounded-lg p-3.5 w-[320px] text-rg-ink">
        <div className="flex justify-between text-[13px] font-medium text-court-ink"><span>Sigues a Laura M. / Marta S.</span><span className="text-court">Cambiar</span></div>
        <div className="mt-2 flex items-end justify-between gap-3">
            <div>
                <p className="text-[15px] font-semibold">vs Irene G. / Julia L.</p>
                <p className="text-[13px] text-court-ink num">Sáb 24 oct · 10:30 · Pista 1</p>
            </div>
            <div className="text-right num">
                <span className="block text-[22px] leading-none font-semibold text-court">3.º</span>
                <span className="text-[12px] text-court-ink">7 pts</span>
            </div>
        </div>
    </div>
);

export const TVFragment = () => (
    <div data-ui className="bg-rg-night rounded-lg p-4 w-[340px] text-white">
        <div className="flex justify-between text-[13px] text-rg-on-night-muted mb-3"><span>Final · Pista central</span><span className="num">En juego</span></div>
        {[
            { pair: 'Elena P. / Fátima G.', sets: [6, 4], lead: true },
            { pair: 'Laura M. / Marta S.', sets: [3, 2], lead: false },
        ].map(r => (
            <div key={r.pair} className="flex items-center justify-between py-1.5">
                <span className={`text-[15px] ${r.lead ? 'font-semibold' : 'text-rg-on-night-muted'}`}>{r.pair}</span>
                <span className="flex gap-3 num text-[18px] font-semibold">{r.sets.map((s, i) => <span key={i} className="w-4 text-center">{s}</span>)}</span>
            </div>
        ))}
    </div>
);

export const BrandFragment = () => (
    <div data-ui className="bg-white rounded-lg w-[340px] text-rg-ink overflow-hidden">
        <div className="h-12 flex items-center gap-2.5 px-3.5 ui-rule-b">
            <span className="w-7 h-7 rounded-md bg-[#0E7C4A] text-white text-[12px] font-bold grid place-items-center">TC</span>
            <span className="text-[14px] font-semibold">Tu Club de Pádel</span>
        </div>
        <div className="px-3.5 py-3">
            <p className="text-[16px] font-bold">Liga de Otoño</p>
            <p className="text-[13px] text-rg-muted num">racketgrid.com/tu-club/liga-otono</p>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// How it works: one fragment per stage
// ---------------------------------------------------------------------------

export const InscriptionsFragment = () => (
    <div data-ui className="bg-white rounded-xl w-[440px] max-w-full text-rg-ink">
        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
            <p className="text-[15px] font-semibold">Inscripciones · Open de Otoño</p>
            <p className="text-[13px] text-rg-muted num">12 de 16 plazas</p>
        </div>
        {[
            { pair: 'Laura Martín y Marta Sánchez', cat: 'Primera', note: 'No pueden sáb 09:00', state: 'Pendiente' },
            { pair: 'Irene García y Julia López', cat: 'Primera', note: 'Sin bloqueos', state: 'Aprobada' },
            { pair: 'Rosa Díaz y Paula López', cat: 'Segunda', note: 'No pueden sáb tarde', state: 'Aprobada' },
        ].map(r => (
            <div key={r.pair} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 ui-rule-t items-center">
                <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate">{r.pair}</p>
                    <p className="text-[13px] text-rg-muted">{r.cat} · {r.note}</p>
                </div>
                <span className={`h-6 px-2.5 rounded-full text-[12px] font-medium inline-flex items-center ${r.state === 'Aprobada' ? 'bg-[#dcfce7] text-[#14532d]' : 'bg-court-soft text-court-ink'}`}>{r.state}</span>
            </div>
        ))}
    </div>
);

export const ScheduleListFragment = () => (
    <div data-ui className="bg-white rounded-xl w-[440px] max-w-full text-rg-ink">
        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
            <p className="text-[15px] font-semibold">Sábado 24 oct</p>
            <p className="text-[13px] text-rg-muted num">3 pistas · 90 min</p>
        </div>
        {[
            ['09:00', 'Pista 1', 'Elena P. / Fátima G.', 'Ana G. / Bea L.'],
            ['09:00', 'Pista 2', 'Gema R. / Helena D.', 'Carla M. / Diana S.'],
            ['10:30', 'Pista 1', 'Laura M. / Marta S.', 'Irene G. / Julia L.'],
        ].map(([t, c, a, b]) => (
            <div key={t + c} className="grid grid-cols-[56px_1fr] gap-x-3 px-4 py-2.5 ui-rule-t">
                <span className="text-[13px] font-semibold num leading-tight">{t}<span className="block font-normal text-[12px] text-rg-muted">{c}</span></span>
                <span className="text-[14px] leading-snug"><span className="block">{a}</span><span className="block">{b}</span></span>
            </div>
        ))}
    </div>
);

export const ResultFragment = () => (
    <div data-ui className="bg-white rounded-xl w-[440px] max-w-full text-rg-ink p-4 space-y-3">
        <p className="text-[15px] font-semibold">Resultado · 10:30, pista 1</p>
        {[
            { pair: 'Laura M. / Marta S.', sets: [6, 6] },
            { pair: 'Irene G. / Julia L.', sets: [4, 3] },
        ].map(r => (
            <div key={r.pair} className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium">{r.pair}</span>
                <span className="flex gap-2">{r.sets.map((s, i) => <span key={i} className="w-11 h-10 rounded-md border border-rg-control grid place-items-center text-[16px] font-semibold num">{s}</span>)}</span>
            </div>
        ))}
        <span className="h-10 rounded-md bg-court text-white text-[14px] font-semibold flex items-center justify-center">Guardar resultado</span>
    </div>
);

export const StandingsFragment = () => (
    <div data-ui className="bg-white rounded-xl w-[360px] max-w-full text-rg-ink">
        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
            <p className="text-[15px] font-semibold">Primera</p>
            <p className="text-[13px] text-rg-muted num">11 de 15 jugados</p>
        </div>
        {[
            [1, 'Elena P. / Fátima G.', '4 PJ · 3 G · sets +4', 10],
            [2, 'Gema R. / Helena D.', '4 PJ · 2 G · sets 0', 8],
            [3, 'Laura M. / Marta S.', '4 PJ · 3 G · sets +4', 10],
            [4, 'Irene G. / Julia L.', '4 PJ · 2 G · sets 0', 8],
        ].sort((x, y) => Number(y[3]) - Number(x[3]) || Number(x[0]) - Number(y[0])).map(([_, name, meta, pts], i) => (
            <div key={String(name)} className={`grid grid-cols-[20px_1fr_auto] gap-x-2.5 items-center px-4 py-2 ui-rule-t ${name === FOLLOWED ? 'bg-court-soft' : ''}`}>
                <span className={`text-[14px] font-semibold text-right num ${name === FOLLOWED ? 'text-court' : 'text-rg-muted'}`}>{i + 1}</span>
                <span className="min-w-0"><span className="block text-[14px] font-semibold truncate">{name}</span><span className="block text-[12px] text-rg-muted num">{meta}</span></span>
                <span className={`text-[17px] font-semibold num ${name === FOLLOWED ? 'text-court' : ''}`}>{pts}</span>
            </div>
        ))}
    </div>
);
