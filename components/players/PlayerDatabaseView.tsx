import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Edit, MoreHorizontal, Plus, Search, Trash2, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Player, User, Ranking } from '../../types';
import { canAddPlayer, SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans';
import { Drawer } from '../ui/Drawer';
import { PlayerDetailView } from '../PlayerDetailView';

interface PlayerDatabaseViewProps {
    players: Record<string, Player>;
    rankings: Ranking[];
    currentUser?: User;
    onAddPlayer: () => void;
    onEditPlayer: (player: Player) => void;
    onDeletePlayer: (id: string) => void;
    onDeletePlayers: (ids: string[]) => void;
    onImportPlayers: (players: any[]) => void;
}

type Segment = 'all' | 'top' | 'new' | 'inactive';
type SortField = 'nombre' | 'pj' | 'pg' | 'pp' | 'winrate';

const SEGMENTS: { id: Segment; label: string; test: (p: Player) => boolean }[] = [
    { id: 'all', label: 'Todos', test: () => true },
    { id: 'top', label: 'En forma', test: p => (p.stats?.winrate ?? 0) >= 60 && (p.stats?.pj ?? 0) >= 5 },
    { id: 'new', label: 'Nuevos', test: p => (p.stats?.pj ?? 0) > 0 && (p.stats?.pj ?? 0) < 3 },
    { id: 'inactive', label: 'Sin partidos', test: p => (p.stats?.pj ?? 0) === 0 },
];

const RowMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} className="w-8 h-8 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised" aria-label="Más acciones" aria-expanded={open}>
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-rg-line shadow-[0_8px_24px_rgba(15,23,41,0.12)] py-1 z-40" role="menu">
                    <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }} className="w-full h-9 px-3 flex items-center gap-2.5 text-[14px] hover:bg-rg-raised"><Edit size={15} /> Editar datos</button>
                    <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} className="w-full h-9 px-3 flex items-center gap-2.5 text-[14px] text-rg-negative hover:bg-[#ffedea]"><Trash2 size={15} /> Eliminar</button>
                </div>
            )}
        </div>
    );
};

export const PlayerDatabaseView = ({
    players, rankings, currentUser, onAddPlayer, onEditPlayer, onDeletePlayer, onDeletePlayers, onImportPlayers,
}: PlayerDatabaseViewProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [segment, setSegment] = useState<Segment>('all');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>('nombre');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const all = useMemo(() => Object.values(players), [players]);
    const userPlan = currentUser?.plan || 'pro';
    const maxPlayers = SUBSCRIPTION_PLANS[userPlan].maxPlayers;
    const counts = Object.fromEntries(SEGMENTS.map(s => [s.id, all.filter(s.test).length])) as Record<Segment, number>;

    const rows = useMemo(() => {
        const seg = SEGMENTS.find(s => s.id === segment)!;
        let list = all.filter(seg.test);
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.apellidos.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.telefono || '').includes(q));
        }
        const value = (p: Player) => sortField === 'nombre' ? `${p.nombre} ${p.apellidos}`.toLowerCase() : (p.stats?.[sortField] ?? 0);
        return list.sort((a, b) => {
            const va = value(a), vb = value(b);
            return (va < vb ? -1 : va > vb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
        });
    }, [all, segment, searchTerm, sortField, sortDir]);

    const sortBy = (field: SortField) => {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir(field === 'nombre' ? 'asc' : 'desc'); }
    };

    const handleAdd = () => {
        const check = canAddPlayer(all.length, userPlan, currentUser?.role === 'superadmin');
        if (!check.allowed) { alert(check.message); return; }
        onAddPlayer();
    };

    // The template carries three example rows so the format is clear, then the club's players
    const handleExport = () => {
        const examples = [
            { Nombre: 'Juan', Apellidos: 'García López', Email: 'juan.garcia@ejemplo.com', Telefono: '+34 600 123 456', 'Fecha Nacimiento': '1990-05-15' },
            { Nombre: 'María', Apellidos: 'Rodríguez Martín', Email: 'maria.rodriguez@ejemplo.com', Telefono: '+34 611 234 567', 'Fecha Nacimiento': '1992-08-22' },
            { Nombre: 'Carlos', Apellidos: 'Fernández Ruiz', Email: 'carlos.fernandez@ejemplo.com', Telefono: '+34 622 345 678', 'Fecha Nacimiento': '1988-12-03' },
        ];
        const existing = all.map(p => ({ Nombre: p.nombre, Apellidos: p.apellidos, Email: p.email, Telefono: p.telefono, 'Fecha Nacimiento': p.fechaNacimiento || '' }));
        const ws = XLSX.utils.json_to_sheet([...examples, ...existing]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');
        XLSX.writeFile(wb, 'plantilla_jugadores_padel.xlsx');
    };

    const fileRef = useRef<HTMLInputElement>(null);
    const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const wb = XLSX.read(await file.arrayBuffer());
            const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
            const newPlayers = json.map((row: any) => ({
                nombre: row.Nombre || row.nombre || row.Name || row.name || '',
                apellidos: row.Apellidos || row.apellidos || row.Surname || row.surname || '',
                email: row.Email || row.email || '',
                telefono: row.Telefono || row.telefono || row.Phone || row.phone || '',
                fechaNacimiento: row['Fecha Nacimiento'] || row.fechaNacimiento || row.Birthdate || row.birthdate || '',
            })).filter(p => p.nombre);
            if (newPlayers.length > 0) {
                onImportPlayers(newPlayers);
                alert(`Se han encontrado ${newPlayers.length} jugadores para importar.`);
            } else {
                alert('El archivo no tiene datos válidos. Revisa que tenga columnas «Nombre», «Apellidos», «Email»…');
            }
        } catch (error) {
            console.error('Error importing file:', error);
            alert('No se pudo leer el archivo. Comprueba que es un Excel válido.');
        }
        event.target.value = '';
    };

    const allVisibleSelected = rows.length > 0 && rows.every(p => selectedIds.has(p.id));
    const toggleAll = () => setSelectedIds(allVisibleSelected ? new Set() : new Set(rows.map(p => p.id)));
    const toggleOne = (id: string) => setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const deleteSelected = () => {
        if (confirm(`¿Eliminar ${selectedIds.size} ${selectedIds.size === 1 ? 'jugador' : 'jugadores'}? No se puede deshacer.`)) {
            onDeletePlayers(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };
    const deleteOne = (p: Player) => {
        if (confirm(`¿Eliminar a ${p.nombre} ${p.apellidos}? No se puede deshacer.`)) onDeletePlayer(p.id);
    };

    const SortHeader = ({ field, label, right }: { field: SortField; label: string; right?: boolean }) => (
        <th className={`font-normal px-3 pt-3 pb-2 ${right ? 'text-right' : 'text-left'}`} aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
            <button type="button" onClick={() => sortBy(field)} className={`inline-flex items-center gap-1 hover:text-rg-ink ${right ? 'flex-row-reverse' : ''} ${sortField === field ? 'text-rg-ink' : ''}`}>
                {label}
                {sortField === field && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
        </th>
    );

    return (
        <div className="rg space-y-5">
            {/* Title row */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-bold tracking-[-0.015em]">Jugadores</h1>
                    <p className="text-[15px] text-rg-muted mt-0.5 num">
                        {all.length} en la base del club
                        {maxPlayers !== Infinity && <span className={all.length >= maxPlayers * 0.8 ? 'text-[#92400e] font-medium' : ''}> · tu plan admite {maxPlayers}</span>}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFile} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="h-9 px-3.5 rounded-md border border-rg-control bg-white text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-rg-raised" title="Importar jugadores desde Excel">
                        <Upload size={15} /> Importar
                    </button>
                    <button type="button" onClick={handleExport} className="h-9 px-3.5 rounded-md border border-rg-control bg-white text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-rg-raised" title="Descargar la plantilla con los jugadores del club">
                        <Download size={15} /> Exportar
                    </button>
                    <button type="button" onClick={handleAdd} className="h-9 px-3.5 rounded-md bg-court text-white text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#174CB0]">
                        <Plus size={16} /> Nuevo jugador
                    </button>
                </div>
            </div>

            {/* Segments as tabs */}
            <div className="flex gap-6 border-b border-rg-line overflow-x-auto scrollbar-hide" role="tablist">
                {SEGMENTS.map(s => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={segment === s.id}
                        onClick={() => { setSegment(s.id); setSelectedIds(new Set()); }}
                        className={`py-2.5 -mb-px border-b-2 text-[14px] whitespace-nowrap transition-colors num ${segment === s.id ? 'border-court text-rg-ink font-semibold' : 'border-transparent text-rg-muted hover:text-rg-ink'}`}
                        title={s.id === 'top' ? '60 % de victorias o más en al menos 5 partidos' : s.id === 'new' ? 'Menos de 3 partidos jugados' : undefined}
                    >
                        {s.label} <span className={segment === s.id ? 'text-rg-muted font-normal' : ''}>{counts[s.id]}</span>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <label className="relative w-full sm:w-72">
                    <span className="sr-only">Buscar</span>
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-rg-muted pointer-events-none" />
                    <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, email o teléfono" className="w-full h-9 pl-9 pr-3 rounded-md border border-rg-control bg-white text-[14px] placeholder:text-rg-muted focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track" />
                </label>
                {selectedIds.size > 0 && (
                    <button type="button" onClick={deleteSelected} className="h-9 px-3.5 rounded-md border border-rg-control bg-white text-[14px] font-semibold text-rg-negative inline-flex items-center gap-2 hover:bg-[#ffedea] num">
                        <Trash2 size={15} /> Eliminar {selectedIds.size}
                    </button>
                )}
                <span className="ml-auto text-[13px] text-rg-muted num">{rows.length} {rows.length === 1 ? 'jugador' : 'jugadores'}</span>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">
                    {searchTerm ? 'Ningún jugador coincide con la búsqueda.' : all.length === 0
                        ? <>Aún no hay jugadores. <button type="button" onClick={handleAdd} className="text-court font-medium">Añade el primero</button> o impórtalos desde Excel.</>
                        : 'No hay jugadores en este grupo.'}
                </p>
            ) : (
                <div className="bg-white border border-rg-line rounded-lg">
                    <table className="w-full border-collapse num">
                        <thead className="hidden md:table-header-group">
                            <tr className="text-[12.5px] text-rg-muted">
                                <th className="w-10 pl-4 pt-3 pb-2 text-left">
                                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="w-4 h-4 accent-[#1F5FD6] cursor-pointer" aria-label="Seleccionar todos" />
                                </th>
                                <SortHeader field="nombre" label="Jugador" />
                                <th className="text-left font-normal px-3 pt-3 pb-2 hidden lg:table-cell">Teléfono</th>
                                <SortHeader field="pj" label="PJ" right />
                                <SortHeader field="pg" label="G" right />
                                <SortHeader field="pp" label="P" right />
                                <SortHeader field="winrate" label="Victorias" right />
                                <th className="w-12 pt-3 pb-2"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p, i) => (
                                <tr key={p.id} onClick={() => setSelectedPlayer(p)} className={`cursor-pointer transition-colors ${selectedIds.has(p.id) ? 'bg-court-soft' : 'hover:bg-rg-ground'} ${i ? 'border-t border-rg-rule' : 'md:border-t md:border-rg-rule'}`}>
                                    <td className="pl-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} className="w-4 h-4 accent-[#1F5FD6] cursor-pointer" aria-label={`Seleccionar a ${p.nombre} ${p.apellidos}`} />
                                    </td>
                                    <td className="px-4 md:px-3 py-3 w-full max-w-0">
                                        <span className="block text-[14px] font-semibold truncate">{p.nombre} {p.apellidos}</span>
                                        <span className="block text-[13px] text-rg-muted truncate">
                                            <span className="md:hidden">{p.stats?.pj ?? 0} PJ · {p.stats?.pg ?? 0} G · {p.stats?.pp ?? 0} P</span>
                                            <span className="hidden md:inline">{p.email || '—'}</span>
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-[14px] whitespace-nowrap hidden lg:table-cell">{p.telefono || <span className="text-rg-muted">—</span>}</td>
                                    <td className="px-3 py-3 text-right text-[14px] hidden md:table-cell">{p.stats?.pj ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-[14px] hidden md:table-cell">{p.stats?.pg ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-[14px] hidden md:table-cell">{p.stats?.pp ?? 0}</td>
                                    <td className="px-3 py-3 text-right text-[14px] whitespace-nowrap">{(p.stats?.pj ?? 0) > 0 ? `${p.stats?.winrate ?? 0} %` : <span className="text-rg-muted">—</span>}</td>
                                    <td className="pr-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <RowMenu onEdit={() => onEditPlayer(p)} onDelete={() => deleteOne(p)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Drawer isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title="Ficha del jugador" size="lg">
                {selectedPlayer && (
                    <PlayerDetailView player={selectedPlayer} players={players} rankings={rankings} onBack={() => setSelectedPlayer(null)} embedded />
                )}
            </Drawer>
        </div>
    );
};
