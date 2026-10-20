import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Copy, ArrowLeft, Search, Link as LinkIcon, RotateCcw, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Ranking, User, RankingFormat } from '../types';

interface Props {
  rankings: Ranking[];
  deletedRankings?: Ranking[];
  users?: User[]; // Optional, mostly for Superadmin to map names
  onSelect: (ranking: Ranking) => void;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}

const FORMAT_LABEL: Record<string, string> = {
  classic: 'Liga', americano: 'Americano', mexicano: 'Mexicano', individual: 'Liga individual',
  pairs: 'Liga por parejas', elimination: 'Eliminatoria', hybrid: 'Liga + playoff', pozo: 'Pozo',
};
const formatLabel = (format?: RankingFormat) => FORMAT_LABEL[format || 'classic'] || 'Liga';

const STATUS = {
  activo: { label: 'En juego', dot: 'bg-rg-positive' },
  pausado: { label: 'En pausa', dot: 'bg-[#d97706]' },
  finalizado: { label: 'Finalizado', dot: 'bg-rg-muted' },
} as const;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
};

const progressOf = (ranking: Ranking) => {
  const matches = ranking.divisions.flatMap(d => d.matches).filter(m => m.status !== 'descanso');
  const done = matches.filter(m => m.status === 'finalizado').length;
  const pending = matches.filter(m => m.status === 'pendiente').length;
  return { done, total: matches.length, pending, pct: matches.length ? Math.round((done / matches.length) * 100) : 0 };
};

const participants = (ranking: Ranking) => {
  const ids = new Set<string>();
  ranking.divisions.forEach(d => d.players.forEach(id => ids.add(id)));
  return ids.size;
};

/** One row action menu: open with the kebab, close on outside click or Escape */
const RowMenu = ({ items }: { items: { label: string; icon: React.ComponentType<{ size?: number }>; onClick: () => void; danger?: boolean; disabled?: boolean }[] }) => {
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
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="w-8 h-8 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised transition-colors"
        aria-label="Más acciones"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-rg-line shadow-[0_8px_24px_rgba(15,23,41,0.12)] py-1 z-40" role="menu">
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              className={`w-full h-9 px-3 flex items-center gap-2.5 text-[14px] text-left transition-colors disabled:opacity-50 ${it.danger ? 'text-rg-negative hover:bg-[#ffedea]' : 'hover:bg-rg-raised'}`}
            >
              <it.icon size={15} /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const RankingList = ({ rankings, deletedRankings = [], users, onSelect, onCreateClick, onDelete, onDuplicate, onRestore, onPermanentDelete }: Props) => {
  const [tab, setTab] = useState<'activos' | 'historial' | 'papelera'>('activos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<RankingFormat | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // The saved public link, or the /ranking/<id> route the app always understands
  const handleCopyLink = (ranking: Ranking) => {
    navigator.clipboard.writeText(ranking.publicUrl || `${window.location.origin}/ranking/${ranking.id}`);
    setCopiedId(ranking.id);
    window.setTimeout(() => setCopiedId(c => (c === ranking.id ? null : c)), 2000);
  };

  // --- DERIVED STATE ---
  const isSuperAdmin = !!users && users.length > 0;
  const showClientDirectory = isSuperAdmin && selectedClientId === 'all' && !searchQuery;

  const inScope = (r: Ranking) => !isSuperAdmin || selectedClientId === 'all' || r.ownerId === selectedClientId;
  const counts = {
    activos: rankings.filter(r => inScope(r) && (r.status === 'activo' || r.status === 'pausado')).length,
    historial: rankings.filter(r => inScope(r) && r.status === 'finalizado').length,
    papelera: deletedRankings.length,
  };

  const filteredRankings = rankings.filter(r => {
    const matchesTab = tab === 'activos' ? (r.status === 'activo' || r.status === 'pausado') : tab === 'historial' ? r.status === 'finalizado' : false;
    if (!matchesTab || !inScope(r)) return false;
    if (selectedFormat !== 'all' && (r.format || 'classic') !== selectedFormat) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      let matchesOwner = false;
      if (isSuperAdmin && r.ownerId) {
        const owner = users!.find(u => u.id === r.ownerId);
        matchesOwner = owner?.name?.toLowerCase().includes(query) || owner?.email?.toLowerCase().includes(query) || false;
      }
      return r.nombre.toLowerCase().includes(query) || r.categoria.toLowerCase().includes(query) || matchesOwner;
    }
    return true;
  });

  // Group by owner only when a superadmin searches across all clients
  const groups: Record<string, Ranking[]> = (() => {
    if (!isSuperAdmin || selectedClientId !== 'all') return { '': filteredRankings };
    const ownerMap = new Map(users!.map(u => [u.id, u.name || u.email || 'Usuario desconocido']));
    const out: Record<string, Ranking[]> = {};
    filteredRankings.forEach(r => {
      const key = r.ownerId ? (ownerMap.get(r.ownerId) || 'Desconocido') : 'Públicos / sin asignar';
      (out[key] = out[key] || []).push(r);
    });
    return out;
  })();

  const activeClient = users?.find(u => u.id === selectedClientId);

  // ---------------- Superadmin: client directory ----------------
  if (showClientDirectory && users) {
    const stats = (userId: string) => {
      const own = rankings.filter(r => r.ownerId === userId);
      return { total: own.length, active: own.filter(r => r.status === 'activo').length };
    };
    const sortedUsers = [...users].sort((a, b) => stats(b.id).active - stats(a.id).active);
    return (
      <div className="rg space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.015em]">Control central</h1>
            <p className="text-[15px] text-rg-muted mt-0.5 num">{users.length} clientes · elige uno para gestionar sus torneos</p>
          </div>
          <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Buscar un torneo en todos los clientes" />
        </div>
        <div className="bg-white border border-rg-line rounded-lg overflow-hidden">
          <table className="w-full border-collapse num">
            <thead>
              <tr className="text-[12.5px] text-rg-muted">
                <th className="text-left font-normal px-4 pt-3 pb-2">Cliente</th>
                <th className="text-left font-normal px-3 pt-3 pb-2 hidden md:table-cell">Club</th>
                <th className="text-left font-normal px-3 pt-3 pb-2 hidden md:table-cell">Plan</th>
                <th className="text-right font-normal px-3 pt-3 pb-2">En curso</th>
                <th className="text-right font-normal px-4 pt-3 pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => {
                const st = stats(user.id);
                return (
                  <tr key={user.id} onClick={() => setSelectedClientId(user.id)} className="border-t border-rg-rule cursor-pointer hover:bg-rg-ground transition-colors">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left min-w-0" onClick={() => setSelectedClientId(user.id)}>
                        <span className="block text-[14px] font-semibold truncate">{user.name || 'Sin nombre'}</span>
                        <span className="block text-[13px] text-rg-muted truncate">{user.email}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-[14px] hidden md:table-cell">{user.clubName || <span className="text-rg-muted">—</span>}</td>
                    <td className="px-3 py-3 text-[14px] hidden md:table-cell capitalize">{user.plan || 'basic'}</td>
                    <td className="px-3 py-3 text-right text-[14px]">{st.active}</td>
                    <td className="px-4 py-3 text-right text-[14px]">{st.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------- Tournament list ----------------
  const title = isSuperAdmin && selectedClientId !== 'all' ? (activeClient?.name || activeClient?.email || 'Cliente') : 'Torneos';
  const shown = tab === 'papelera' ? deletedRankings.length : filteredRankings.length;

  return (
    <div className="rg space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-2">
          {isSuperAdmin && selectedClientId !== 'all' && (
            <button type="button" onClick={() => { setSelectedClientId('all'); setSearchQuery(''); }} className="w-9 h-9 -ml-1 mt-0.5 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised" aria-label="Volver a los clientes">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.015em]">{title}</h1>
            <p className="text-[15px] text-rg-muted mt-0.5 num">
              {counts.activos} en curso · {counts.historial} {counts.historial === 1 ? 'finalizado' : 'finalizados'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onCreateClick} className="h-9 px-3.5 rounded-md bg-court text-white text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#174CB0] transition-colors">
          <Plus size={16} /> Nuevo torneo
        </button>
      </div>

      {/* Tabs on a full-width rule */}
      <div className="flex gap-6 border-b border-rg-line overflow-x-auto scrollbar-hide" role="tablist">
        {([['activos', 'En curso'], ['historial', 'Finalizados'], ['papelera', 'Papelera']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-2.5 -mb-px border-b-2 text-[14px] whitespace-nowrap transition-colors num ${tab === id ? 'border-court text-rg-ink font-semibold' : 'border-transparent text-rg-muted hover:text-rg-ink'}`}
          >
            {label} <span className={tab === id ? 'text-rg-muted font-normal' : ''}>{counts[id]}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      {tab !== 'papelera' && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchField value={searchQuery} onChange={setSearchQuery} placeholder={selectedClientId !== 'all' ? 'Buscar en sus torneos' : 'Buscar por nombre o categoría'} />
          <div className="relative">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as RankingFormat | 'all')}
              className="h-9 pl-3 pr-8 rounded-md border border-rg-control bg-white text-[14px] appearance-none cursor-pointer focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track"
              aria-label="Formato"
            >
              <option value="all">Todos los formatos</option>
              {Object.entries(FORMAT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-rg-muted" />
          </div>
          <span className="ml-auto text-[13px] text-rg-muted num">{shown} {shown === 1 ? 'torneo' : 'torneos'}</span>
        </div>
      )}

      {/* Trash */}
      {tab === 'papelera' && (
        deletedRankings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">
            La papelera está vacía. Los torneos que elimines se quedan aquí 30 días antes de borrarse.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg bg-[#fffbeb] border border-[#fde68a] px-4 py-2.5 text-[14px] text-[#92400e]">
              Los torneos de la papelera se borran para siempre a los 30 días. Hasta entonces puedes restaurarlos.
            </p>
            <div className="bg-white border border-rg-line rounded-lg overflow-hidden">
              <ul>
                {deletedRankings.map((ranking, i) => {
                  const deletedDate = ranking.deletedAt ? new Date(ranking.deletedAt) : new Date();
                  const daysLeft = Math.ceil((deletedDate.getTime() + 30 * 86400000 - Date.now()) / 86400000);
                  return (
                    <li key={ranking.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${i ? 'border-t border-rg-rule' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold truncate">{ranking.nombre}</p>
                        <p className="text-[13px] text-rg-muted num">
                          {formatLabel(ranking.format)} · empezó el {formatDate(ranking.fechaInicio)} · <span className={daysLeft <= 5 ? 'text-rg-negative font-medium' : ''}>se borra en {daysLeft} {daysLeft === 1 ? 'día' : 'días'}</span>
                        </p>
                      </div>
                      <div className="flex gap-4">
                        {onRestore && <button type="button" onClick={() => onRestore(ranking.id)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-court hover:text-court-ink"><RotateCcw size={14} /> Restaurar</button>}
                        {onPermanentDelete && <button type="button" onClick={() => onPermanentDelete(ranking.id)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-rg-negative"><Trash2 size={14} /> Borrar ya</button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )
      )}

      {/* Empty list */}
      {tab !== 'papelera' && filteredRankings.length === 0 && (
        <p className="rounded-lg border border-dashed border-rg-control px-4 py-3 text-[14px] text-rg-muted">
          {searchQuery || selectedFormat !== 'all'
            ? 'Ningún torneo coincide con la búsqueda.'
            : tab === 'activos'
              ? <>No hay torneos en curso. <button type="button" onClick={onCreateClick} className="text-court font-medium">Crear uno</button></>
              : 'Los torneos finalizados aparecerán aquí.'}
        </p>
      )}

      {/* The list */}
      {tab !== 'papelera' && filteredRankings.length > 0 && Object.entries(groups).map(([groupName, groupRankings]) => (
        <section key={groupName || 'mine'} className="space-y-2">
          {groupName && Object.keys(groups).length > 1 && (
            <h2 className="text-[15px] font-semibold pt-2 num">{groupName} <span className="text-rg-muted font-normal">· {groupRankings.length}</span></h2>
          )}
          <div className="bg-white border border-rg-line rounded-lg">
            <table className="w-full border-collapse num">
              <thead className="hidden md:table-header-group">
                <tr className="text-[12.5px] text-rg-muted">
                  <th className="text-left font-normal px-4 pt-3 pb-2">Torneo</th>
                  <th className="text-left font-normal px-3 pt-3 pb-2">Estado</th>
                  <th className="text-left font-normal px-3 pt-3 pb-2 hidden lg:table-cell">Progreso</th>
                  <th className="text-right font-normal px-3 pt-3 pb-2">Jugados</th>
                  <th className="text-right font-normal px-3 pt-3 pb-2 hidden lg:table-cell">Pendientes</th>
                  <th className="text-right font-normal px-3 pt-3 pb-2 hidden lg:table-cell">Inicio</th>
                  <th className="w-12 pt-3 pb-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {groupRankings.map((ranking, i) => {
                  const p = progressOf(ranking);
                  const status = STATUS[ranking.status] || STATUS.activo;
                  const n = participants(ranking);
                  const menu = (
                    <RowMenu items={[
                      { label: copiedId === ranking.id ? 'Enlace copiado' : 'Copiar enlace público', icon: LinkIcon, onClick: () => handleCopyLink(ranking) },
                      { label: 'Duplicar', icon: Copy, onClick: () => onDuplicate(ranking.id) },
                      { label: 'Mover a la papelera', icon: Trash2, onClick: () => onDelete(ranking.id), danger: true },
                    ]} />
                  );
                  return (
                    <tr key={ranking.id} onClick={() => onSelect(ranking)} className={`cursor-pointer hover:bg-rg-ground transition-colors ${i ? 'border-t border-rg-rule' : 'md:border-t md:border-rg-rule'}`}>
                      <td className="px-4 py-3 w-full max-w-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(ranking); }} className="text-left min-w-0 block w-full">
                          <span className="block text-[14px] font-semibold truncate hover:text-court">{ranking.nombre}</span>
                          <span className="block text-[13px] text-rg-muted truncate">
                            {formatLabel(ranking.format)} · {ranking.categoria} · {n} {n === 1 ? 'jugador' : 'jugadores'}
                            <span className="md:hidden"> · {status.label}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[14px] whitespace-nowrap"><span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="block w-32 h-1.5 rounded-full bg-rg-raised overflow-hidden" title={`${p.pct} %`}>
                          <span className="block h-full bg-court rounded-full" style={{ width: `${p.pct}%` }} />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-[14px] whitespace-nowrap">{p.done} <span className="text-rg-muted">/ {p.total || '—'}</span></td>
                      <td className="px-3 py-3 text-right text-[14px] hidden lg:table-cell">{ranking.status === 'finalizado' ? <span className="text-rg-muted">—</span> : p.pending}</td>
                      <td className="px-3 py-3 text-right text-[14px] whitespace-nowrap hidden lg:table-cell">{formatDate(ranking.fechaInicio)}</td>
                      <td className="pr-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>{menu}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
};

const SearchField = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <label className="relative w-full sm:w-72">
    <span className="sr-only">Buscar</span>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-rg-muted pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 pl-9 pr-3 rounded-md border border-rg-control bg-white text-[14px] placeholder:text-rg-muted focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track"
    />
  </label>
);
