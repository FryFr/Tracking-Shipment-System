import { useEffect, useMemo, useState } from 'react';
import { Ship } from 'lucide-react';
import { useAllTrackings } from '../hooks/useAllTrackings';
import { useAuth } from '../hooks/useAuth';
import { fetchETA } from '../hooks/useLogisticsETA';
import { applyFilters, courierOptions, type DashboardFilters } from '../utils/dashboard';
import { canEditLogistics } from '../types/tracking';
import type { TrackingData, LogisticsETA } from '../types/tracking';
import { FiltersBar } from '../components/FiltersBar';
import { ShipmentsTable } from '../components/ShipmentsTable';
import { ShipmentDrawer } from '../components/ShipmentDrawer';
import { ManualShipmentForm } from '../components/ManualShipmentForm';
import { saveManualShipment } from '../hooks/useTrackingStore';

const EMPTY: DashboardFilters = { text: '', status: '', courier: '', showDelivered: false };

export const DashboardView = () => {
    const { items, loading } = useAllTrackings();
    const { role, user } = useAuth();
    const [filters, setFilters] = useState(EMPTY);
    const [etas, setEtas] = useState<Record<string, LogisticsETA | undefined>>({});
    const [selected, setSelected] = useState<TrackingData | null>(null);
    const [showManual, setShowManual] = useState(false);

    // Enriquecer con logistics_eta por tracking visible
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

    const enriched = useMemo(
        () => items.map((t) => (etas[t.tracking_number] ? { ...t, logistics_eta: etas[t.tracking_number] } : t)),
        [items, etas],
    );
    const filtered = useMemo(() => applyFilters(enriched, filters), [enriched, filters]);
    const couriers = useMemo(() => courierOptions(items), [items]);

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white">Envíos activos</h1>
                    <p className="text-white/50 text-sm">{filtered.length} de {items.length} envíos</p>
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
                <FiltersBar filters={filters} couriers={couriers} onChange={setFilters} />
                <div className="mt-4">
                    {loading
                        ? <p className="text-white/40 text-sm py-10 text-center">Cargando…</p>
                        : <ShipmentsTable items={filtered} onRowClick={setSelected} />}
                </div>
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
