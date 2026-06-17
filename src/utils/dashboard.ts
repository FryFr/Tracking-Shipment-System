import { addWeeks, isValid } from 'date-fns';
import type { TrackingData } from '../types/tracking';
import { statusBucket } from './status';

export interface OrderGroup {
    key: string; // SO/PO/OC o '—'
    items: TrackingData[];
}

const orderKeyOf = (t: TrackingData): string => {
    const r = t.order_references;
    return (r?.sales_order || r?.purchase_order || r?.order_confirmation || '—').toUpperCase();
};

/** Agrupa envíos por su orden principal. Grupos ordenados; '—' (sin orden) al final. */
export const groupByOrder = (items: TrackingData[]): OrderGroup[] => {
    const map = new Map<string, TrackingData[]>();
    for (const t of items) {
        const k = orderKeyOf(t);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(t);
    }
    return [...map.entries()]
        .map(([key, items]) => ({ key, items }))
        .sort((a, b) => (a.key === '—' ? 1 : b.key === '—' ? -1 : a.key.localeCompare(b.key)));
};

export interface DashboardFilters {
    text: string;
    status: string; // '' = todos, o un bucket
    courier: string; // '' = todos, o slug
    showDelivered: boolean;
}

export const applyFilters = (items: TrackingData[], f: DashboardFilters): TrackingData[] => {
    const text = f.text.trim().toLowerCase();
    return items.filter((t) => {
        if (!f.showDelivered && statusBucket(t.status) === 'delivered') return false;
        if (f.status && statusBucket(t.status) !== f.status) return false;
        if (f.courier && (t.courier_slug || '').toLowerCase() !== f.courier.toLowerCase()) return false;
        if (text) {
            const hay = [
                t.tracking_number, t.courier_slug, t.last_location,
                t.order_references?.sales_order, t.order_references?.purchase_order,
                t.order_references?.order_confirmation,
            ].filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(text)) return false;
        }
        return true;
    });
};

/** ETA real = estimated_arrival, o eta del courier + semanas de logística. null si no hay datos de logística. */
export const realEta = (t: TrackingData): string | null => {
    const le = t.logistics_eta;
    if (!le) return null;
    if (le.estimated_arrival) return le.estimated_arrival;
    if (le.total_additional_weeks && t.eta) {
        const base = new Date(t.eta);
        if (isValid(base)) return addWeeks(base, le.total_additional_weeks).toISOString();
    }
    return null;
};

/** Lista única de couriers presentes (para el dropdown de filtro). */
export const courierOptions = (items: TrackingData[]): string[] =>
    [...new Set(items.map((t) => t.courier_slug).filter(Boolean))].sort();
