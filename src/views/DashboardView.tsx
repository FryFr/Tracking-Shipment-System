import { useEffect, useMemo, useState } from 'react';
import { Ship } from 'lucide-react';
import { useAllTrackings } from '../hooks/useAllTrackings';
import { useIncomingStock } from '../hooks/useIncomingStock';
import { useAuth } from '../hooks/useAuth';
import { fetchETA } from '../hooks/useLogisticsETA';
import { canEditLogistics } from '../types/tracking';
import type { TrackingData, LogisticsETA } from '../types/tracking';
import {
    trackingToRow, incomingToRow, applyUnifiedFilters, groupUnified,
    type UnifiedFilters, type UnifiedRow,
} from '../utils/unified';
import { MovementsTable } from '../components/MovementsTable';
import { ShipmentDrawer } from '../components/ShipmentDrawer';
import { ManualShipmentForm } from '../components/ManualShipmentForm';
import { saveManualShipment } from '../hooks/useTrackingStore';

const EMPTY: UnifiedFilters = { text: '', stage: '', region: '', showCompleted: false };
const REGIONS = ['CA', 'MX', 'DR', 'PA'];

export const DashboardView = () => {
    const { items, loading } = useAllTrackings();
    const { items: incoming, loading: loadingIn } = useIncomingStock();
    const { role, user } = useAuth();
    const [filters, setFilters] = useState(EMPTY);
    const [etas, setEtas] = useState<Record<string, LogisticsETA | undefined>>({});
    const [selected, setSelected] = useState<TrackingData | null>(null);
    const [showManual, setShowManual] = useState(false);

    // Enriquecer salientes con logistics_eta
    useEffect(() => {
        let cancelled = false;
        (async () => {
            for (const t of items) {
                if (t.tracking_number in etas) continue;
                const eta = await fetchETA(t.tracking_number).catch(() => null);
                if (!cancelled) setEtas((prev) => ({ ...prev, [t.tracking_number]: eta || undefined }));
            }
        })();
        return () => { cancelled = true; };
    }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fusionar las dos etapas en filas unificadas
    const rows = useMemo(() => {
        const out = items.map((t, i) => trackingToRow(etas[t.tracking_number] ? { ...t, logistics_eta: etas[t.tracking_number] } : t, i));
        const inc = incoming.map((l, i) => incomingToRow(l, i));
        return [...out, ...inc];
    }, [items, incoming, etas]);

    const groups = useMemo(() => groupUnified(applyUnifiedFilters(rows, filters)), [rows, filters]);
    const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.rows.length, 0), [groups]);

    const set = (patch: Partial<UnifiedFilters>) => setFilters((f) => ({ ...f, ...patch }));

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white">Movimientos</h1>
                    <p className="text-white/50 text-sm">
                        {loading || loadingIn ? 'Cargando…' : `${groups.length} órdenes · ${visibleCount} movimientos (entrante + saliente)`}
                    </p>
                </div>
                {role && canEditLogistics(role) && (
                    <button
                        onClick={() => setShowManual(true)}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                    >
                        <Ship className="w-4 h-4" /> + Marítimo
                    </button>
                )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <input
                        value={filters.text}
                        onChange={(e) => set({ text: e.target.value })}
                        placeholder="Orden, tracking, PO, courier, SKU…"
                        className="flex-1 min-w-[180px] bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <select value={filters.stage} onChange={(e) => set({ stage: e.target.value as UnifiedFilters['stage'] })} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none">
                        <option value="" className="text-gray-900">Todas las etapas</option>
                        <option value="outbound" className="text-gray-900">🚚 Salientes (cliente)</option>
                        <option value="incoming" className="text-gray-900">🏭 Entrantes (stock)</option>
                    </select>
                    <select value={filters.region} onChange={(e) => set({ region: e.target.value })} className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none">
                        <option value="" className="text-gray-900">Todas las regiones</option>
                        {REGIONS.map((r) => <option key={r} value={r} className="text-gray-900">{r}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-white/70 px-2 cursor-pointer select-none">
                        <input type="checkbox" checked={filters.showCompleted} onChange={(e) => set({ showCompleted: e.target.checked })} className="accent-cyan-500" />
                        Mostrar entregados/recibidos
                    </label>
                </div>

                {loading || loadingIn
                    ? <p className="text-white/40 text-sm py-10 text-center">Cargando…</p>
                    : <MovementsTable groups={groups} onRowClick={(r: UnifiedRow) => r.tracking && setSelected(r.tracking)} />}
            </div>

            {selected && <ShipmentDrawer tracking={selected} role={role} onClose={() => setSelected(null)} />}
            {showManual && user?.email && (
                <ManualShipmentForm
                    onClose={() => setShowManual(false)}
                    onSave={async (input) => { await saveManualShipment(input, user.email!); setShowManual(false); }}
                />
            )}
        </div>
    );
};
