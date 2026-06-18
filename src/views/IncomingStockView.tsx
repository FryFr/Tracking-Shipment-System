import { useMemo, useState } from 'react';
import { format, isValid } from 'date-fns';
import { AlertTriangle, Warehouse } from 'lucide-react';
import { useIncomingStock } from '../hooks/useIncomingStock';
import { bucketMeta, groupByPO, type IncomingLine } from '../types/incomingStock';

// Snapshot del Sheet GLOBAL PO's (carga única). Fecha de la importación.
const SNAPSHOT = '18 jun 2026';
const REGIONS = ['CA', 'MX', 'DR', 'PA'] as const;
const ACTIVE_BUCKETS = ['production', 'in_transit', 'ready_to_ship'];
const STATE_OPTIONS = [
    { value: 'active', label: 'Activos (prod. + tránsito + listo)' },
    { value: 'all', label: 'Todos' },
    { value: 'production', label: 'En producción' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'ready_to_ship', label: 'Listo p/ enviar' },
    { value: 'received', label: 'Recibido' },
];

const fdate = (s: string) => {
    if (!s) return '—';
    const d = new Date(s);
    return isValid(d) ? format(d, 'MMM d, yyyy') : s;
};

const Chip = ({ bucket, delayed }: { bucket: string; delayed: boolean }) => {
    const m = bucketMeta(bucket);
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.classes}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {m.label}{delayed && <AlertTriangle className="w-3 h-3 text-red-400" />}
        </span>
    );
};

export const IncomingStockView = () => {
    const { items, loading, error } = useIncomingStock();
    const [region, setRegion] = useState('');
    const [state, setState] = useState('active');
    const [text, setText] = useState('');
    const [onlyDelayed, setOnlyDelayed] = useState(false);

    const filtered = useMemo(() => {
        const q = text.trim().toLowerCase();
        return items.filter((l: IncomingLine) => {
            if (region && l.region !== region) return false;
            if (state === 'active' ? !ACTIVE_BUCKETS.includes(l.bucket) : state !== 'all' && l.bucket !== state) return false;
            if (onlyDelayed && !l.delayed) return false;
            if (q && !`${l.po} ${l.sku} ${l.product} ${l.supplier} ${l.so}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [items, region, state, text, onlyDelayed]);

    const groups = useMemo(() => {
        const g = groupByPO(filtered);
        // atrasados primero, luego por due date de fábrica más próxima
        return g.sort((a, b) => {
            if (a.delayed !== b.delayed) return a.delayed ? -1 : 1;
            return (a.dueFactory || '9999').localeCompare(b.dueFactory || '9999');
        });
    }, [filtered]);

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Warehouse className="w-6 h-6 text-cyan-400" /> Stock entrante
                </h1>
                <p className="text-white/50 text-sm">
                    {loading ? 'Cargando…' : `${groups.length} POs · ${filtered.length} líneas`} ·
                    <span className="text-white/30"> snapshot del Sheet GLOBAL PO's — {SNAPSHOT}</span>
                </p>
            </div>

            {/* Filtros */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="PO, SKU, producto, proveedor o SO…"
                        className="flex-1 min-w-[180px] bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none">
                        <option value="" className="text-gray-900">Todas las regiones</option>
                        {REGIONS.map((r) => <option key={r} value={r} className="text-gray-900">{r}</option>)}
                    </select>
                    <select value={state} onChange={(e) => setState(e.target.value)} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none">
                        {STATE_OPTIONS.map((o) => <option key={o.value} value={o.value} className="text-gray-900">{o.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-white/70 px-2 cursor-pointer select-none">
                        <input type="checkbox" checked={onlyDelayed} onChange={(e) => setOnlyDelayed(e.target.checked)} className="accent-red-500" />
                        Solo atrasados
                    </label>
                </div>

                {error ? (
                    <p className="text-red-400/80 text-sm py-10 text-center">No se pudo cargar el stock entrante.</p>
                ) : loading ? (
                    <p className="text-white/40 text-sm py-10 text-center">Cargando…</p>
                ) : groups.length === 0 ? (
                    <p className="text-white/40 text-sm py-10 text-center">No hay POs que coincidan.</p>
                ) : (
                    <div className="text-sm">
                        {/* header desktop */}
                        <div className="hidden md:flex text-white/50 text-xs font-semibold px-4 pb-2 gap-3 border-b border-white/10">
                            <span className="flex-[1.4]">SKU</span><span className="flex-[2]">Producto</span>
                            <span className="flex-[0.5]">Cant</span><span className="flex-[1.2]">Estado</span>
                            <span className="flex-[1.3]">Ruta</span><span className="flex-[0.7]">Modo</span>
                            <span className="flex-1">ETA fábrica</span>
                        </div>
                        {groups.map((g) => (
                            <div key={`${g.region}:${g.po}`} className="mt-3">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/5 rounded-lg text-xs flex-wrap">
                                    <span className="font-bold text-cyan-300 font-mono">{g.po}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[10px] font-semibold">{g.region}</span>
                                    <span className="text-white/50 truncate max-w-[200px]">{g.supplier}</span>
                                    {g.so && <span className="text-amber-300/80 font-mono">→ {g.so}</span>}
                                    {g.delayed && <span className="inline-flex items-center gap-1 text-red-400 font-semibold"><AlertTriangle className="w-3 h-3" />atrasado</span>}
                                    <span className="ml-auto text-white/40">{g.lines.length} línea{g.lines.length !== 1 ? 's' : ''}</span>
                                </div>
                                {g.lines.map((l, i) => (
                                    <div key={l.sku + i} className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3 px-4 py-3 border-b border-white/5">
                                        <span className="md:flex-[1.4] font-mono text-white/90 text-xs">{l.sku || '—'}</span>
                                        <span className="md:flex-[2] text-white/70 truncate" title={l.product}>{l.product || '—'}</span>
                                        <span className="md:flex-[0.5] text-white/60">{l.qty || '—'}</span>
                                        <span className="md:flex-[1.2]"><Chip bucket={l.bucket} delayed={l.delayed} /></span>
                                        <span className="md:flex-[1.3] text-white/50 text-xs truncate" title={`${l.origin} → ${l.ship_to}`}>{l.origin || '?'} → {l.ship_to || '?'}</span>
                                        <span className="md:flex-[0.7] text-white/50 text-xs">{l.transit || '—'}</span>
                                        <span className="md:flex-1 text-white/60 text-xs">{fdate(l.due_factory)}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
