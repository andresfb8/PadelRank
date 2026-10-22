import React, { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Lock, Minus, Plus } from 'lucide-react';
import { Match, Ranking, RankingConfig, ScoringMode, TVConfig } from '../types';
import { Button } from './ui/Components';
import { SponsorsEditor, LogoPicker } from './ranking-settings/PresentationFields';
import { calculateMatchPoints } from '../services/logic';
import { TieBreakConfig } from './ranking-wizard/TieBreakConfig';
import { getFormatSettings, goldenPointApplies, TVSlideKind } from '../config/formatSettings';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    ranking: Ranking;
    onUpdateRanking?: (ranking: Ranking) => void;
    isAdmin?: boolean;
    userPlan?: string; // 'pro', 'star', 'weekend', etc.
}

/*
 * The tournament's settings come in four tabs, always in this order, and each format
 * fills them with its own settings (a tab with nothing to say for a format is left out):
 *   Puntuación    points per result and tie-breaks
 *   (per format)  promotions, playoff qualifiers, brackets or court rotation
 *   Estructura    divisions, groups, categories or courts
 *   Presentación  public columns, TV mode, sponsors and logo
 * What changes the structure of the tournament is locked once a match has been played.
 */

type Section = 'win' | 'advance' | 'setup' | 'look';

const DEFAULT_TV: TVConfig = { enabled: true, slideDuration: 15, showStandings: true, showMatches: true, showQR: true, showSponsors: true, sponsors: [] };
const ALL_COLUMNS = ['pts', 'pj', 'pg', 'pp', 'setsWon', 'setsLost', 'setsDiff', 'gamesWon', 'gamesLost', 'gamesDiff', 'winRate'];

// ---------- small controls in the app's style ----------

const Switch = ({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) => (
    <label className={`flex items-start gap-4 py-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-medium">{label}</span>
            {description && <span className="block text-[13px] text-rg-muted mt-0.5">{description}</span>}
        </span>
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <span aria-hidden="true" className={`mt-0.5 w-10 h-6 rounded-full flex-none relative transition-colors ${checked ? 'bg-court' : 'bg-rg-control'} peer-focus-visible:ring-2 peer-focus-visible:ring-court-track`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </span>
    </label>
);

const Stepper = ({ label, value, onChange, min = 0, max = 99, description, disabled }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; description?: string; disabled?: boolean }) => (
    <div className={`bg-rg-raised rounded-lg p-4 ${disabled ? 'opacity-70' : ''}`}>
        <p className="text-[14px] font-medium">{label}</p>
        {description && <p className="text-[13px] text-rg-muted mt-0.5">{description}</p>}
        <div className="flex items-center gap-3 mt-3">
            <button type="button" disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-10 rounded-md bg-white border border-rg-control grid place-items-center disabled:opacity-40" aria-label={`Restar uno a ${label}`}><Minus size={16} /></button>
            <span className="w-10 text-center text-[24px] font-semibold num" aria-live="polite">{value}</span>
            <button type="button" disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="w-10 h-10 rounded-md bg-white border border-rg-control grid place-items-center disabled:opacity-40" aria-label={`Sumar uno a ${label}`}><Plus size={16} /></button>
        </div>
    </div>
);

const Fact = ({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) => (
    <div className="py-2.5 flex items-start justify-between gap-4 border-t border-rg-rule first:border-t-0">
        <span className="text-[14px] text-rg-muted">{label}</span>
        <span className="text-right">
            <span className="block text-[14px] font-medium num">{value}</span>
            {note && <span className="block text-[12px] text-rg-muted">{note}</span>}
        </span>
    </div>
);

const Block = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <section className="space-y-3">
        <div>
            <h3 className="text-[15px] font-semibold">{title}</h3>
            {description && <p className="text-[13px] text-rg-muted mt-0.5">{description}</p>}
        </div>
        {children}
    </section>
);

const LockedNote = ({ children }: { children: React.ReactNode }) => (
    <p className="flex items-start gap-2 text-[13px] text-rg-muted"><Lock size={14} className="flex-none mt-0.5" />{children}</p>
);

// ---------- the modal ----------

export const RankingSettingsModal = ({ isOpen, onClose, ranking, onUpdateRanking, isAdmin, userPlan }: Props) => {
    const [config, setConfig] = useState<RankingConfig>(ranking.config || {});
    const [tv, setTv] = useState<TVConfig>({ ...DEFAULT_TV, ...(ranking.tvConfig || {}) });
    const [names, setNames] = useState<Record<string, string>>({});
    const [removed, setRemoved] = useState<Set<string>>(new Set());

    const format = ranking.format || 'classic';
    const fs = getFormatSettings(format);
    const isPointBased = fs.scoring === 'points';
    const isHybrid = format === 'hybrid';
    const isPozo = format === 'pozo';
    const showGoldenPoint = goldenPointApplies(format, config);
    const showPromotion = fs.advance === 'promotion' && ranking.divisions.length >= (fs.promotionMinDivisions ?? 1);

    const sections = useMemo(() => ([
        { id: 'win' as Section, label: 'Puntuación', show: fs.scoring !== 'none' || showGoldenPoint },
        { id: 'advance' as Section, label: { promotion: 'Ascensos y descensos', playoff: 'Playoff', brackets: 'Cuadros', rotation: 'Rotación de pistas' }[fs.advance as string] || '', show: fs.advance !== null && (fs.advance !== 'promotion' || showPromotion) },
        { id: 'setup' as Section, label: 'Estructura', show: true },
        { id: 'look' as Section, label: 'Presentación', show: true },
    ].filter(s => s.show)), [fs, showGoldenPoint, showPromotion]);
    const [section, setSection] = useState<Section>(sections[0].id);

    useEffect(() => {
        if (!isOpen) return;
        setConfig(ranking.config || {});
        setTv({ ...DEFAULT_TV, ...(ranking.tvConfig || {}) });
        setNames({});
        setRemoved(new Set());
        setSection(sections[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, ranking.id]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isReadOnly = !isAdmin || !onUpdateRanking;
    const allMatches = ranking.divisions.flatMap(d => d.matches);
    const played = allMatches.filter(m => m.status === 'finalizado').length;
    const total = allMatches.filter(m => m.status !== 'descanso').length;
    const started = played > 0;
    const playoffStarted = isHybrid && ranking.phase === 'playoff';
    const hasBrandingAccess = ['pro', 'star', 'weekend', 'trial'].includes(userPlan || '');
    const [unit, units, feminine] = fs.unit;

    const set = (patch: Partial<RankingConfig>) => setConfig(prev => ({ ...prev, ...patch }));
    const points = {
        pointsPerWin2_0: config.pointsPerWin2_0 ?? 4,
        pointsPerWin2_1: config.pointsPerWin2_1 ?? 3,
        pointsDraw: config.pointsDraw ?? 2,
        pointsPerLoss2_1: config.pointsPerLoss2_1 ?? 1,
        pointsPerLoss2_0: config.pointsPerLoss2_0 ?? 0,
    };
    const setPoints = (key: keyof typeof points, value: number) => {
        const v = Number.isFinite(value) ? value : 0;
        setConfig(prev => ({ ...prev, [key]: v }));
    };
    const pointsChanged = JSON.stringify(points) !== JSON.stringify(
        { pointsPerWin2_0: ranking.config?.pointsPerWin2_0 ?? 4, pointsPerWin2_1: ranking.config?.pointsPerWin2_1 ?? 3, pointsDraw: ranking.config?.pointsDraw ?? 2, pointsPerLoss2_1: ranking.config?.pointsPerLoss2_1 ?? 1, pointsPerLoss2_0: ranking.config?.pointsPerLoss2_0 ?? 0 },
    );
    const scoringModeChanged = config.scoringMode !== ranking.config?.scoringMode || config.customPoints !== ranking.config?.customPoints;
    const dirty = JSON.stringify(config) !== JSON.stringify(ranking.config || {})
        || JSON.stringify(tv) !== JSON.stringify({ ...DEFAULT_TV, ...(ranking.tvConfig || {}) })
        || Object.keys(names).length > 0 || removed.size > 0;

    const handleSave = () => {
        if (!onUpdateRanking) return;
        // Each match keeps the points it was given when it was closed, so new points mean redoing the played ones
        const rescore = pointsChanged && fs.scoring === 'sets';
        const rescored = (m: Match): Match => {
            if (!rescore || m.status !== 'finalizado' || !m.score?.set1) return m;
            if (m.score.finalizationType === 'empate_manual') return { ...m, points: { p1: points.pointsDraw, p2: points.pointsDraw } };
            const r = calculateMatchPoints(m.score.set1, m.score.set2, m.score.set3, !!m.score.isIncomplete, points, false, format === 'individual');
            return { ...m, points: r.points, score: { ...m.score, finalizationType: r.finalizationType, description: r.description } };
        };
        const divisions = ranking.divisions
            .filter(d => !removed.has(d.id))
            .map(d => (names[d.id] !== undefined && names[d.id].trim() ? { ...d, name: names[d.id].trim() } : d))
            .map(d => (rescore && d.stage !== 'playoff' ? { ...d, matches: d.matches.map(rescored) } : d));
        onUpdateRanking({ ...ranking, config, tvConfig: tv, divisions });
        onClose();
    };

    const numberField = 'w-full h-11 px-3 rounded-md border border-rg-control bg-white text-[18px] font-semibold text-center num focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track disabled:bg-rg-raised';

    // ---------------- sections ----------------

    const renderWin = () => (
        <div className="space-y-7">
            {fs.scoring !== 'none' && (<>
                {isPointBased ? (
                    <Block title="Puntos por partido" description="Cada partido se juega a un total de puntos que las dos parejas se reparten.">
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Puntos por partido">
                            {(['16', '21', '24', '32', 'custom'] as ScoringMode[]).map(mode => {
                                const active = (config.scoringMode || '32') === mode;
                                return (
                                    <button key={mode} type="button" role="radio" aria-checked={active} disabled={isReadOnly} onClick={() => set({ scoringMode: mode })}
                                        className={`h-10 px-4 rounded-md text-[14px] font-semibold num transition-colors ${active ? 'bg-court text-white' : 'bg-white border border-rg-control hover:bg-rg-raised'}`}>
                                        {mode === 'custom' ? 'Otro' : `${mode} puntos`}
                                    </button>
                                );
                            })}
                        </div>
                        {config.scoringMode === 'custom' && (
                            <div className="max-w-[200px]">
                                <label htmlFor="custom-points" className="block text-[13px] font-medium mb-1.5">Total de puntos</label>
                                <input id="custom-points" type="number" min={1} value={config.customPoints ?? ''} placeholder="50" onChange={(e) => set({ customPoints: parseInt(e.target.value) })} className={numberField} />
                            </div>
                        )}
                    </Block>
                ) : (
                    <Block title="Puntos por resultado" description={isHybrid ? 'Se aplican en la fase de grupos.' : 'Lo que suma cada pareja o jugador según cómo acaba el partido.'}>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {([
                                ['pointsPerWin2_0', 'Victoria 2-0'], ['pointsPerWin2_1', 'Victoria 2-1'], ['pointsDraw', 'Empate'],
                                ['pointsPerLoss2_1', 'Derrota 1-2'], ['pointsPerLoss2_0', 'Derrota 0-2'],
                            ] as [keyof typeof points, string][]).map(([key, label]) => (
                                <div key={key}>
                                    <label htmlFor={`pts-${key}`} className="block text-[13px] font-medium mb-1.5">{label}</label>
                                    <input id={`pts-${key}`} type="number" min={0} value={points[key]} disabled={isReadOnly} onChange={(e) => setPoints(key, parseInt(e.target.value))} className={numberField} />
                                </div>
                            ))}
                        </div>
                    </Block>
                )}
                {!isPointBased && pointsChanged && started && (
                    <p className="rounded-md bg-[#fffbeb] border border-[#fde68a] px-3 py-2 text-[14px] text-[#92400e] num">
                        Al guardar se recalculan los puntos de los {played} partidos jugados y cambia la clasificación.
                    </p>
                )}
                {isPointBased && scoringModeChanged && started && (
                    <p className="rounded-md bg-[#fffbeb] border border-[#fde68a] px-3 py-2 text-[14px] text-[#92400e] num">
                        Se aplica a los partidos que faltan. Los {played} ya jugados conservan su resultado.
                    </p>
                )}
                <TieBreakConfig config={config} setConfig={setConfig as any} pointBased={isPointBased} />
            </>)}
            {showGoldenPoint && (
                <div className="bg-white border border-rg-line rounded-lg px-4">
                    <Switch label="Se juega con punto de oro" description="Solo informativo: sale en la vista pública y en la TV."
                        checked={!!(config.goldenPoint ?? config.pozoConfig?.goldenPoint)} onChange={(v) => set({ goldenPoint: v })} disabled={isReadOnly} />
                </div>
            )}
        </div>
    );

    const renderAdvance = () => (
        <div className="space-y-6">
            {fs.advance === 'promotion' && (
                <Block title="Ascensos y descensos" description="Se aplican al finalizar la fase, al pasar a la siguiente.">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Stepper label="Suben de división" value={config.promotionCount ?? 2} onChange={(v) => set({ promotionCount: v })} disabled={isReadOnly} />
                        <Stepper label="Bajan de división" value={config.relegationCount ?? 2} onChange={(v) => set({ relegationCount: v })} disabled={isReadOnly} />
                    </div>
                </Block>
            )}
            {isHybrid && (
                <Block title="Paso al playoff" description="Se usan al empezar el playoff, para formar los cuadros con los mejores de cada grupo.">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Stepper label="Al cuadro principal" description="Por cada grupo" value={config.hybridConfig?.qualifiersPerGroup ?? 2} min={1}
                            onChange={(v) => setConfig(prev => ({ ...prev, hybridConfig: { ...(prev.hybridConfig as any), qualifiersPerGroup: v } }))} disabled={isReadOnly || playoffStarted} />
                        <Stepper label="Al cuadro de consolación" description="Por cada grupo, los siguientes" value={config.hybridConfig?.consolationQualifiersPerGroup ?? 0}
                            onChange={(v) => setConfig(prev => ({ ...prev, hybridConfig: { ...(prev.hybridConfig as any), consolationQualifiersPerGroup: v } }))} disabled={isReadOnly || playoffStarted} />
                    </div>
                    {playoffStarted && <LockedNote>El playoff ya ha empezado: los cuadros están formados.</LockedNote>}
                </Block>
            )}
            {fs.advance === 'brackets' && (
                <Block title="Cuadros" description="Se deciden al crear el torneo, porque con ellos se genera el cuadro.">
                    <div className="bg-white border border-rg-line rounded-lg px-4">
                        <Fact label="Cuadro de consolación" value={config.eliminationConfig?.consolation ? 'Sí' : 'No'} note="Para quienes pierden su primer partido" />
                        <Fact label="Partido por el 3.er puesto" value={config.eliminationConfig?.thirdPlaceMatch ? 'Sí' : 'No'} />
                    </div>
                </Block>
            )}
            {fs.advance === 'rotation' && (
                <Block title="Subir y bajar de pista">
                    <p className="text-[14px] leading-relaxed">En cada ronda, quienes ganan suben una pista y quienes pierden bajan una. La pista 1 es la más alta. No hay nada que ajustar aquí.</p>
                </Block>
            )}
        </div>
    );

    const renderSetup = () => (
        <div className="space-y-7">
            <Block title="El torneo">
                <div className="bg-white border border-rg-line rounded-lg px-4">
                    <Fact label="Formato" value={fs.label} />
                    <Fact label="Categoría" value={ranking.categoria} />
                    <Fact label="Empieza el" value={ranking.fechaInicio ? new Date(`${ranking.fechaInicio}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
                    <Fact label="Cuenta para las estadísticas" value={ranking.isOfficial === false || config.isOfficial === false ? 'No, es amistoso' : 'Sí'} />
                    {(format === 'pairs' || isHybrid) && (
                        <Fact label="Ida y vuelta" value={(format === 'pairs' ? config.pairsConfig?.doubleRoundRobin : config.hybridConfig?.doubleRoundRobin) ? 'Sí' : 'No'} note="Se decide al generar los partidos" />
                    )}
                    {isHybrid && <Fact label="Parejas por grupo" value={config.hybridConfig?.pairsPerGroup ?? '—'} />}
                    {(isPointBased || isPozo) && (
                        <Fact label="Modalidad" value={(isPozo ? config.pozoConfig?.variant : (format === 'americano' ? config.americanoConfig?.variant : config.mexicanoConfig?.variant)) === 'individual' ? 'Individual, parejas que cambian' : 'Parejas fijas'} />
                    )}
                    {isPozo && <Fact label="Puntuación" value={(config.pozoConfig?.scoringMode ?? config.scoringMode ?? 'per-game') === 'per-game' ? 'Por juegos, 1 set' : `A ${config.pozoConfig?.scoringMode ?? config.scoringMode} puntos`} note="Se decide al crear el torneo" />}
                    <Fact label="Partidos jugados" value={total ? `${played} de ${total}` : '—'} />
                </div>
            </Block>

            {isPozo && (
                <Block title="Pistas en juego" description="El cambio se aplica al generar la siguiente ronda.">
                    <div className="max-w-xs">
                        <Stepper label="Pistas" value={config.pozoConfig?.numCourts ?? ranking.divisions.length} min={1} max={20}
                            onChange={(v) => setConfig(prev => ({ ...prev, pozoConfig: { ...(prev.pozoConfig as any), numCourts: v } }))} disabled={isReadOnly} />
                    </div>
                </Block>
            )}

            {!isPozo && (
                <Block title={units} description={started ? `Puedes cambiar los nombres. Para quitar ${units.toLowerCase()} el torneo no debe haber empezado.` : `Cambia los nombres o quita ${feminine ? 'las' : 'los'} que no vayas a usar.`}>
                    {ranking.divisions.filter(d => !removed.has(d.id)).length === 0 ? (
                        <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">No hay {units.toLowerCase()}.</p>
                    ) : (
                        <ul className="bg-white border border-rg-line rounded-lg">
                            {ranking.divisions.filter(d => !removed.has(d.id)).map((div, i) => {
                                const isPairs = div.players.length > 0 && (format === 'pairs' || isHybrid || format === 'elimination');
                                const people = isPairs ? Math.round(div.players.length / 2) : div.players.length;
                                return (
                                    <li key={div.id} className={`flex items-center gap-3 px-3 py-2.5 ${i ? 'border-t border-rg-rule' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <label htmlFor={`div-${div.id}`} className="sr-only">Nombre de {unit.toLowerCase()} {div.numero}</label>
                                            <input id={`div-${div.id}`} type="text" disabled={isReadOnly}
                                                value={names[div.id] ?? (div.category || div.name || `${unit} ${div.numero}`)}
                                                onChange={(e) => setNames(prev => ({ ...prev, [div.id]: e.target.value }))}
                                                className="w-full h-9 px-2.5 rounded-md border border-transparent hover:border-rg-control focus:border-court focus:ring-2 focus:ring-court-track focus:outline-none text-[14px] font-medium bg-transparent" />
                                            <p className="text-[12px] text-rg-muted px-2.5 num">{people} {isPairs ? (people === 1 ? 'pareja' : 'parejas') : (people === 1 ? 'jugador' : 'jugadores')} · {div.matches.length} {div.matches.length === 1 ? 'partido' : 'partidos'}</p>
                                        </div>
                                        {!isReadOnly && !started && (
                                            <button type="button"
                                                onClick={() => { if (confirm(`¿Quitar «${names[div.id] ?? div.name ?? `${unit} ${div.numero}`}»? Se aplica al guardar y no se puede deshacer.`)) setRemoved(prev => new Set(prev).add(div.id)); }}
                                                className="w-9 h-9 grid place-items-center rounded-md text-rg-muted hover:text-rg-negative hover:bg-[#ffedea]" aria-label={`Quitar ${unit.toLowerCase()} ${div.numero}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {removed.size > 0 && <p className="text-[13px] text-rg-negative num">Se quitarán {removed.size} al guardar.</p>}
                </Block>
            )}
        </div>
    );

    const renderLook = () => {
        const visible = config.visibleColumns ?? ALL_COLUMNS;
        const toggleColumn = (key: string, on: boolean) => set({ visibleColumns: on ? Array.from(new Set([...visible, key])) : visible.filter(k => k !== key) });
        const columnOptions = fs.columns === 'lostOnly'
            ? [{ key: 'pp', label: 'Partidos perdidos' }]
            : [
                { key: 'pp', label: 'Partidos perdidos' }, { key: 'setsWon', label: 'Sets ganados' }, { key: 'setsLost', label: 'Sets perdidos' },
                { key: 'setsDiff', label: 'Diferencia de sets' }, { key: 'gamesWon', label: 'Juegos ganados' }, { key: 'gamesLost', label: 'Juegos perdidos' },
                { key: 'gamesDiff', label: 'Diferencia de juegos' },
            ];
        return (
            <div className="space-y-7">
                {fs.columns !== 'none' && (
                    <Block title="Columnas de la clasificación" description="Puntos, partidos jugados, ganados y % de victorias se ven siempre.">
                        <div className="bg-white border border-rg-line rounded-lg px-4 divide-y divide-rg-rule">
                            {columnOptions.map(col => (
                                <Switch key={col.key} label={col.label} checked={visible.includes(col.key)} onChange={(on) => toggleColumn(col.key, on)} disabled={isReadOnly} />
                            ))}
                        </div>
                    </Block>
                )}

                <Block title="Modo TV" description="La pantalla del club pasa de una diapositiva a otra sola.">
                    <div className="bg-white border border-rg-line rounded-lg px-4 divide-y divide-rg-rule">
                        <div className="py-3 flex items-center justify-between gap-4">
                            <label htmlFor="tv-duration" className="text-[14px] font-medium">Segundos por diapositiva</label>
                            <input id="tv-duration" type="number" min={5} value={tv.slideDuration} disabled={isReadOnly}
                                onChange={(e) => setTv(prev => ({ ...prev, slideDuration: Math.max(5, parseInt(e.target.value) || 15) }))}
                                className="w-20 h-9 px-2 rounded-md border border-rg-control text-center text-[15px] num focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track" />
                        </div>
                        {fs.tvSlides.map((kind: TVSlideKind) => {
                            const key = ({ standings: 'showStandings', matches: 'showMatches', brackets: 'showBrackets', schedule: 'showSchedule' } as const)[kind];
                            const label = { standings: 'Clasificación', matches: 'Partidos', brackets: 'Cuadros', schedule: 'Horarios' }[kind];
                            const note = isHybrid ? (kind === 'brackets' ? 'En el playoff' : 'En la fase de grupos') : undefined;
                            return <Switch key={kind} label={label} description={note} checked={tv[key] ?? true} onChange={(v) => setTv(prev => ({ ...prev, [key]: v }))} disabled={isReadOnly} />;
                        })}
                        <Switch label="Código QR para seguirlo en el móvil" checked={tv.showQR} onChange={(v) => setTv(prev => ({ ...prev, showQR: v }))} disabled={isReadOnly} />
                        <Switch label="Patrocinadores" checked={tv.showSponsors} onChange={(v) => setTv(prev => ({ ...prev, showSponsors: v }))} disabled={isReadOnly} />
                    </div>
                </Block>

                <Block title="Patrocinadores del torneo" description="Salen en el modo TV. Mejor en PNG con fondo transparente.">
                    <SponsorsEditor sponsors={tv.sponsors || []} onChange={(sponsors) => setTv(prev => ({ ...prev, sponsors }))} disabled={isReadOnly} />
                </Block>

                <Block title="Logo del torneo" description="Sale en la vista pública y en el modo TV. Si no subes uno, se usa el del club.">
                    <LogoPicker logoUrl={config.branding?.logoUrl} allowed={hasBrandingAccess} disabled={isReadOnly}
                        onChange={(logoUrl) => setConfig(prev => ({ ...prev, branding: { ...prev.branding, logoUrl } }))} />
                </Block>
            </div>
        );
    };

    return (
        <div className="rg fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0F1729]/40 sm:p-4 animate-fade-in">
            <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="bg-white w-full sm:max-w-3xl rounded-t-xl sm:rounded-xl shadow-[0_12px_40px_rgba(15,23,41,0.2)] max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-4 pb-0 border-b border-rg-line">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h2 id="settings-title" className="text-[18px] font-semibold truncate">Ajustes de {ranking.nombre}</h2>
                            <p className="text-[13px] text-rg-muted num">{fs.label} · {total ? `${played} de ${total} partidos jugados` : 'sin partidos todavía'}</p>
                        </div>
                        <button type="button" onClick={onClose} className="w-9 h-9 -mr-2 rounded-md grid place-items-center text-rg-muted hover:text-rg-ink hover:bg-rg-raised" aria-label="Cerrar"><X size={18} /></button>
                    </div>
                    <div className="flex gap-6 mt-3 overflow-x-auto scrollbar-hide" role="tablist">
                        {sections.map(s => (
                            <button key={s.id} type="button" role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)}
                                className={`py-2.5 -mb-px border-b-2 text-[14px] whitespace-nowrap transition-colors ${section === s.id ? 'border-court text-rg-ink font-semibold' : 'border-transparent text-rg-muted hover:text-rg-ink'}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5" role="tabpanel">
                    {section === 'win' && renderWin()}
                    {section === 'advance' && renderAdvance()}
                    {section === 'setup' && renderSetup()}
                    {section === 'look' && renderLook()}
                </div>

                {/* Footer: one save for everything */}
                <div className="px-5 py-3 border-t border-rg-line flex items-center justify-between gap-3">
                    <span className="text-[13px] text-rg-muted">{dirty ? 'Hay cambios sin guardar' : ''}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>{isReadOnly ? 'Cerrar' : 'Cancelar'}</Button>
                        {!isReadOnly && <Button onClick={handleSave} disabled={!dirty}>Guardar cambios</Button>}
                    </div>
                </div>
            </div>
        </div>
    );
};
