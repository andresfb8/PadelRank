import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { User, Ranking, Player, Match } from '../types';
import { subscribeToRegistrations } from '../services/db';
import { matchDay, matchTime, pairText } from './public/playerMobile';

interface AdminDashboardProps {
    activeRankings: Ranking[];
    allRankings: Ranking[]; // Needed for pending matches calculation
    players: Record<string, Player>;
    currentUser?: User;
    onNavigate: (view: any) => void;
    onCreateTournament: () => void;
    onCreatePlayer: () => void;
    /** Opens a tournament's detail */
    onOpenRanking?: (ranking: Ranking) => void;
}

const FORMAT_LABEL: Record<string, string> = {
    classic: 'Liga clásica', individual: 'Liga individual', pairs: 'Liga por parejas', americano: 'Americano',
    mexicano: 'Mexicano', elimination: 'Eliminatoria', hybrid: 'Liga + playoff', pozo: 'Pozo',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type Scheduled = { match: Match; ranking: Ranking; division: string; start: Date };

/** "Elena / Fátima" for the tight cells of the week grid */
const firstNames = (pair: Match['pair1'], players: Record<string, Player>) => {
    if (!pair.p1Id) return pair.placeholder || 'Por decidir';
    const n = (id?: string) => (id && players[id]?.nombre) || '?';
    return pair.p2Id ? `${n(pair.p1Id)} / ${n(pair.p2Id)}` : n(pair.p1Id);
};

export const AdminDashboard = ({
    activeRankings,
    players,
    currentUser,
    onNavigate,
    onCreateTournament,
    onCreatePlayer,
    onOpenRanking,
}: AdminDashboardProps) => {
    const open = (r: Ranking) => (onOpenRanking ? onOpenRanking(r) : onNavigate('ranking_list'));

    // ---- Figures, all computed from the tournaments themselves ----
    const totalPlayers = Object.keys(players).length;
    const playable = (m: Match) => m.status !== 'descanso' && m.status !== 'no_disputado';
    const pendingMatches = activeRankings.reduce((acc, r) => acc + r.divisions.reduce((d, div) => d + div.matches.filter(m => m.status === 'pendiente').length, 0), 0);

    // Registrations waiting for review, only for tournaments with registration open
    const [pendingRegs, setPendingRegs] = useState<Record<string, number>>({});
    const openRegistration = activeRankings.filter(r => r.registrationConfig?.isOpen);
    const openIds = openRegistration.map(r => r.id).join('|');
    useEffect(() => {
        const unsubs = openRegistration.map(r => subscribeToRegistrations(r.id, list => {
            setPendingRegs(prev => ({ ...prev, [r.id]: list.filter(x => x.status === 'pending').length }));
        }));
        return () => unsubs.forEach(u => u());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openIds]);
    const pendingRegTotal = openRegistration.reduce((acc, r) => acc + (pendingRegs[r.id] || 0), 0);

    // Pending matches with a time in the next seven days
    const now = new Date();
    const upcoming: Scheduled[] = useMemo(() => {
        const until = now.getTime() + 7 * DAY_MS;
        const list: Scheduled[] = [];
        activeRankings.forEach(r => r.divisions.forEach(div => div.matches.forEach(m => {
            if (m.status !== 'pendiente' || !m.startTime) return;
            const start = new Date(m.startTime);
            if (isNaN(start.getTime()) || start.getTime() < now.getTime() - 3 * 60 * 60 * 1000 || start.getTime() > until) return;
            list.push({ match: m, ranking: r, division: div.category || div.name || `División ${div.numero}`, start });
        })));
        return list.sort((a, b) => a.start.getTime() - b.start.getTime());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRankings]);

    const days = useMemo(() => {
        const map = new Map<string, Scheduled[]>();
        upcoming.forEach(u => {
            const key = u.start.toDateString();
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(u);
        });
        return Array.from(map.entries()).map(([key, items]) => ({ key, label: matchDay(items[0].match) || key, items }));
    }, [upcoming]);
    const [dayKey, setDayKey] = useState<string | null>(null);
    const day = days.find(d => d.key === dayKey) || days[0];

    // What needs the organiser
    const conflicts = activeRankings.flatMap(r => r.divisions.flatMap(div => div.matches
        .filter(m => m.status === 'pendiente' && (m.scheduleConflict?.length ?? 0) > 0)
        .map(m => ({ r, m }))));
    const unscheduled = activeRankings
        .filter(r => r.format !== 'americano' && r.format !== 'mexicano' && r.format !== 'pozo')
        .map(r => ({ r, n: r.divisions.reduce((acc, div) => acc + div.matches.filter(m => m.status === 'pendiente' && !m.startTime && m.pair1?.p1Id && m.pair2?.p1Id).length, 0) }))
        .filter(x => x.n > 0);
    const attention = [
        ...conflicts.slice(0, 3).map(({ r, m }) => ({
            key: `c-${m.id}`, title: 'Conflicto de horario',
            text: `${m.scheduleConflict![0].reason} · ${pairText(m.pair1, players)} contra ${pairText(m.pair2, players)}`,
            action: 'Mover', onClick: () => open(r),
        })),
        ...openRegistration.filter(r => (pendingRegs[r.id] || 0) > 0).map(r => ({
            key: `i-${r.id}`, title: `${pendingRegs[r.id]} ${pendingRegs[r.id] === 1 ? 'inscripción' : 'inscripciones'} por revisar`,
            text: r.nombre, action: 'Revisar', onClick: () => open(r),
        })),
        ...unscheduled.map(({ r, n }) => ({
            key: `u-${r.id}`, title: `${n} ${n === 1 ? 'partido' : 'partidos'} sin hora`,
            text: r.nombre, action: 'Programar', onClick: () => open(r),
        })),
    ];

    // Most recent results across the active tournaments
    const recent = activeRankings.flatMap(r => r.divisions.flatMap(div => div.matches
        .filter(m => m.status === 'finalizado' && m.pair1?.p1Id && m.pair2?.p1Id)
        .map(m => ({ r, m, div }))))
        .sort((a, b) => (b.m.startTime ? Date.parse(b.m.startTime) : 0) - (a.m.startTime ? Date.parse(a.m.startTime) : 0) || b.m.jornada - a.m.jornada)
        .slice(0, 4);

    const dateLabel = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const findingParts = [
        upcoming.length > 0 ? `${upcoming.length} ${upcoming.length === 1 ? 'partido' : 'partidos'} en los próximos 7 días` : 'Ningún partido con hora esta semana',
        pendingRegTotal > 0 ? `${pendingRegTotal} ${pendingRegTotal === 1 ? 'inscripción' : 'inscripciones'} por revisar` : null,
        conflicts.length > 0 ? `${conflicts.length} ${conflicts.length === 1 ? 'conflicto' : 'conflictos'} de horario` : null,
    ].filter(Boolean);

    return (
        <div className="rg space-y-6">
            {/* Title row */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold tracking-[-0.015em]">Panel</h1>
                    <p className="text-[15px] text-rg-muted mt-0.5">
                        <span className="capitalize">{dateLabel}</span> · <span className="text-rg-ink font-medium">{findingParts.join(', ')}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={onCreatePlayer} className="h-9 px-3.5 rounded-md border border-rg-control bg-white text-[14px] font-semibold hover:bg-rg-raised transition-colors">
                        Nuevo jugador
                    </button>
                    <button type="button" onClick={onCreateTournament} className="h-9 px-3.5 rounded-md bg-court text-white text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#174CB0] transition-colors">
                        <Plus size={16} /> Nuevo torneo
                    </button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
                <div className="space-y-4 min-w-0">
                    {/* KPI strip: one container split by dividers */}
                    <div className="bg-white border border-rg-line rounded-lg grid grid-cols-2 md:grid-cols-4 num">
                        {[
                            { label: 'Torneos en curso', value: activeRankings.length, note: 'Ver todos', onClick: () => onNavigate('ranking_list') },
                            { label: 'Partidos por jugar', value: pendingMatches, note: 'en los torneos en curso' },
                            { label: 'Jugadores', value: totalPlayers, note: 'Ver la base del club', onClick: () => onNavigate('players') },
                            { label: 'Inscripciones', value: pendingRegTotal, suffix: 'por revisar', note: openRegistration.length ? `${openRegistration.length} con inscripción abierta` : 'ninguna abierta' },
                        ].map((k, i) => {
                            const Tag = k.onClick ? 'button' : 'div';
                            return (
                                <Tag
                                    key={k.label}
                                    {...(k.onClick ? { type: 'button', onClick: k.onClick } : {})}
                                    className={`text-left px-4 py-3.5 ${i % 2 === 1 ? 'border-l border-rg-rule' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-rg-rule' : ''} ${i === 2 ? 'md:border-l' : ''} ${k.onClick ? 'hover:bg-rg-ground transition-colors' : ''}`}
                                >
                                    <span className="block text-[14px] text-rg-muted">{k.label}</span>
                                    <span className="block text-[24px] font-semibold mt-0.5">
                                        {k.value}{k.suffix && <span className="text-[14px] font-normal text-rg-muted"> {k.suffix}</span>}
                                    </span>
                                    <span className={`block text-[12px] ${k.onClick ? 'text-court' : 'text-rg-muted'}`}>{k.note}</span>
                                </Tag>
                            );
                        })}
                    </div>

                    {/* The coming days, by court: the screen's main block */}
                    <section className="bg-white border border-rg-line rounded-lg" aria-labelledby="semana-titulo">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-3">
                            <h2 id="semana-titulo" className="text-[16px] font-semibold">Próximos partidos, por pistas</h2>
                            {days.length > 0 && (
                                <div className="inline-flex bg-rg-raised rounded-lg p-[3px]" role="tablist" aria-label="Día">
                                    {days.map(d => (
                                        <button
                                            key={d.key}
                                            type="button"
                                            role="tab"
                                            aria-selected={d.key === day?.key}
                                            onClick={() => setDayKey(d.key)}
                                            className={`h-[30px] px-3 rounded-md text-[13px] transition-colors num ${d.key === day?.key ? 'bg-white font-semibold' : 'text-rg-muted hover:text-rg-ink'}`}
                                        >
                                            {d.label} · {d.items.length}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {day ? <DayByCourt items={day.items} players={players} onOpen={open} /> : (
                            <div className="px-4 pb-4">
                                <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">
                                    No hay partidos con hora en los próximos 7 días. Prográmalos desde la parrilla de cada torneo.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Tournaments in progress */}
                    <section className="bg-white border border-rg-line rounded-lg overflow-hidden" aria-labelledby="torneos-titulo">
                        <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2">
                            <h2 id="torneos-titulo" className="text-[16px] font-semibold">Torneos en curso</h2>
                            <button type="button" onClick={() => onNavigate('ranking_list')} className="text-[13px] font-medium text-court hover:text-court-ink">
                                Ver {activeRankings.length === 1 ? 'el torneo' : `los ${activeRankings.length}`}
                            </button>
                        </div>
                        {activeRankings.length === 0 ? (
                            <div className="px-4 pb-4">
                                <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">
                                    No hay torneos en curso. <button type="button" onClick={onCreateTournament} className="text-court font-medium">Crear el primero</button>
                                </p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse num">
                                <thead>
                                    <tr className="text-[12.5px] text-rg-muted">
                                        <th className="text-left font-normal px-4 pb-2">Torneo</th>
                                        <th className="text-left font-normal px-3 pb-2 hidden md:table-cell">Progreso</th>
                                        <th className="text-right font-normal px-3 pb-2">Jugados</th>
                                        <th className="text-left font-normal px-3 pb-2 hidden lg:table-cell">Siguiente paso</th>
                                        <th className="pb-2 pr-4"><span className="sr-only">Abrir</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeRankings.map(r => {
                                        const all = r.divisions.flatMap(d => d.matches).filter(playable);
                                        const done = all.filter(m => m.status === 'finalizado').length;
                                        const pct = all.length ? Math.round((done / all.length) * 100) : 0;
                                        const next = all.filter(m => m.status === 'pendiente' && m.startTime).sort((a, b) => Date.parse(a.startTime!) - Date.parse(b.startTime!))[0];
                                        const nextStep = r.registrationConfig?.isOpen && all.length === 0
                                            ? `Inscripción abierta${pendingRegs[r.id] ? `, ${pendingRegs[r.id]} por revisar` : ''}`
                                            : next ? `${next.roundName || `Jornada ${next.jornada}`}, ${(matchDay(next) || '').toLowerCase()}`
                                                : all.length > 0 && done === all.length ? 'Todo jugado' : 'Partidos sin programar';
                                        return (
                                            <tr key={r.id} className="border-t border-rg-rule hover:bg-rg-ground transition-colors">
                                                <td className="px-4 py-3">
                                                    <button type="button" onClick={() => open(r)} className="text-left">
                                                        <span className="block text-[14px] font-semibold hover:text-court">{r.nombre}</span>
                                                        <span className="block text-[13px] text-rg-muted">{FORMAT_LABEL[r.format || 'classic'] || r.format} · {r.divisions.length} {r.divisions.length === 1 ? 'división' : 'divisiones'}</span>
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 hidden md:table-cell">
                                                    <span className="block w-36 h-1.5 rounded-full bg-rg-raised overflow-hidden" title={`${pct} %`}>
                                                        <span className="block h-full bg-court rounded-full" style={{ width: `${pct}%` }} />
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right text-[14px] whitespace-nowrap">{done} <span className="text-rg-muted">/ {all.length || '—'}</span></td>
                                                <td className="px-3 py-3 text-[14px] hidden lg:table-cell">{nextStep}</td>
                                                <td className="pr-4 py-3 text-right">
                                                    <button type="button" onClick={() => open(r)} className="text-[14px] font-medium text-court hover:text-court-ink">Abrir</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </section>
                </div>

                {/* Rail: what needs the organiser, then the latest results */}
                <aside className="space-y-5 min-w-0">
                    <section aria-labelledby="atencion-titulo">
                        <h2 id="atencion-titulo" className="text-[16px] font-semibold mb-2">Necesita tu atención</h2>
                        <div className="bg-white border border-rg-line rounded-lg">
                            {attention.length === 0 ? (
                                <p className="px-4 py-3.5 text-[14px] text-rg-muted">Nada pendiente: sin conflictos, inscripciones ni partidos sin hora.</p>
                            ) : (
                                <ul>
                                    {attention.map((a, i) => (
                                        <li key={a.key} className={`grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 ${i ? 'border-t border-rg-rule' : ''}`}>
                                            <span className="min-w-0">
                                                <span className="block text-[14px] font-semibold">{a.title}</span>
                                                <span className="block text-[13px] text-rg-muted">{a.text}</span>
                                            </span>
                                            <button type="button" onClick={a.onClick} className="self-center text-[13px] font-medium text-court hover:text-court-ink">{a.action}</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    <section aria-labelledby="resultados-titulo">
                        <h2 id="resultados-titulo" className="text-[16px] font-semibold mb-2">Últimos resultados</h2>
                        <div className="bg-white border border-rg-line rounded-lg">
                            {recent.length === 0 ? (
                                <p className="px-4 py-3.5 text-[14px] text-rg-muted">Todavía no hay resultados en los torneos en curso.</p>
                            ) : (
                                <ul className="num">
                                    {recent.map(({ r, m, div }, i) => {
                                        const p1Won = (m.points?.p1 ?? 0) >= (m.points?.p2 ?? 0);
                                        const sets = [m.score?.set1, m.score?.set2, m.score?.set3].filter(Boolean) as { p1: number; p2: number }[];
                                        const score = sets.length
                                            ? sets.map(st => p1Won ? `${st.p1}–${st.p2}` : `${st.p2}–${st.p1}`).join(' ')
                                            : `${Math.max(m.points?.p1 ?? 0, m.points?.p2 ?? 0)}–${Math.min(m.points?.p1 ?? 0, m.points?.p2 ?? 0)}`;
                                        return (
                                            <li key={m.id} className={`px-4 py-3 ${i ? 'border-t border-rg-rule' : ''}`}>
                                                <button type="button" onClick={() => open(r)} className="text-left w-full">
                                                    <span className="block text-[14px] font-semibold truncate">{pairText(p1Won ? m.pair1 : m.pair2, players)}</span>
                                                    <span className="block text-[13px] text-rg-muted truncate">
                                                        {score} a {pairText(p1Won ? m.pair2 : m.pair1, players)} · {r.nombre}, {div.category || div.name || `div. ${div.numero}`}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
};

/** One day as a grid of times down and courts across */
const DayByCourt = ({ items, players, onOpen }: { items: Scheduled[]; players: Record<string, Player>; onOpen: (r: Ranking) => void }) => {
    const courts = Array.from(new Set(items.map(i => i.match.court || 0))).sort((a, b) => a - b);
    const times = Array.from(new Set(items.map(i => matchTime(i.match) || ''))).sort();
    const tournaments = Array.from(new Set(items.map(i => i.ranking.id)));
    const tone = (id: string) => (tournaments.indexOf(id) % 2 === 0 ? 'bg-court-soft text-court-ink' : 'bg-rg-raised text-rg-ink');

    return (
        <>
        {/* Phone: one line per match, nothing scrolls sideways */}
        <ul className="md:hidden pb-1 num">
            {items.map(it => {
                const conflict = (it.match.scheduleConflict?.length ?? 0) > 0;
                return (
                    <li key={it.match.id} className="border-t border-rg-rule">
                        <button type="button" onClick={() => onOpen(it.ranking)} className="w-full text-left grid grid-cols-[52px_1fr] gap-x-3 px-4 py-2.5">
                            <span className="text-[13px] font-semibold leading-tight">{matchTime(it.match)}<span className="block font-normal text-[12px] text-rg-muted">{it.match.court ? `Pista ${it.match.court}` : 'Sin pista'}</span></span>
                            <span className="min-w-0 text-[14px] leading-snug">
                                <span className="block truncate">{pairText(it.match.pair1, players)}</span>
                                <span className="block truncate">{pairText(it.match.pair2, players)}</span>
                                <span className={`block text-[12px] truncate ${conflict ? 'text-rg-negative' : 'text-rg-muted'}`}>{conflict ? it.match.scheduleConflict![0].reason : `${it.ranking.nombre} · ${it.division}`}</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
        <div className="hidden md:block px-4 pb-4 overflow-x-auto">
            <div className="grid gap-1.5 min-w-[520px] num" style={{ gridTemplateColumns: `56px repeat(${courts.length}, minmax(0, 1fr))` }}>
                <span />
                {courts.map(c => <span key={c} className="text-[12px] text-rg-muted pb-0.5">{c ? `Pista ${c}` : 'Sin pista'}</span>)}
                {times.map(t => (
                    <React.Fragment key={t}>
                        <span className="text-[13px] font-semibold pt-2">{t}</span>
                        {courts.map(c => {
                            // Two divisions can share a court and time by mistake: show both, never hide one
                            const here = items.filter(i => (matchTime(i.match) || '') === t && (i.match.court || 0) === c);
                            if (here.length === 0) return <span key={c} className="rounded-md bg-rg-ground min-h-[56px]" />;
                            return (
                                <span key={c} className="grid gap-1">
                                    {here.map(it => {
                                        const conflict = here.length > 1 || (it.match.scheduleConflict?.length ?? 0) > 0;
                                        const reason = here.length > 1 ? 'Pista ocupada dos veces' : it.match.scheduleConflict?.[0]?.reason;
                                        return (
                                            <button
                                                key={it.match.id}
                                                type="button"
                                                onClick={() => onOpen(it.ranking)}
                                                title={`${it.ranking.nombre} · ${it.division}${reason ? ` · ${reason}` : ''}`}
                                                className={`text-left rounded-md px-2 py-1.5 min-h-[56px] leading-tight transition-[filter] hover:brightness-[0.97] ${conflict ? 'bg-[#ffedea] text-[#831c1e]' : tone(it.ranking.id)}`}
                                            >
                                                <span className="block text-[12.5px] font-medium truncate">{firstNames(it.match.pair1, players)}</span>
                                                <span className="block text-[12.5px] truncate">{firstNames(it.match.pair2, players)}</span>
                                                <span className="block text-[12px] opacity-80 truncate">{conflict ? reason : `${it.ranking.nombre} · ${it.division}`}</span>
                                            </button>
                                        );
                                    })}
                                </span>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
        </>
    );
};
