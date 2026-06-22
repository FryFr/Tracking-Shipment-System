// Modelo unificado: fusiona ENVÍOS salientes (couriers, de Firestore) y STOCK
// entrante (POs del Sheet) en una sola fila normalizada, agrupada por orden
// (SO/PO). Cada fila lleva su "etapa" para distinguir las dos mitades del viaje.
import type { TrackingData } from '../types/tracking';
import type { IncomingLine } from '../types/incomingStock';
import { statusBucket, statusBucketLabel, statusChipClasses } from './status';
import { bucketMeta } from '../types/incomingStock';
import { realEta } from './dashboard';

export type Stage = 'outbound' | 'incoming';

export interface UnifiedRow {
    id: string;
    stage: Stage;
    orderKey: string;       // SO/PO/OC para agrupar (mayúsculas) o '—'
    itemLabel: string;      // tracking# (saliente) o PO (entrante)
    subLabel: string;       // '' (saliente) o SKU (entrante)
    carrier: string;        // courier (saliente) o "MODO · proveedor" (entrante)
    statusLabel: string;
    chipClasses: string;
    delayed: boolean;
    eta: string | null;     // ISO/fecha
    location: string;
    updated: string;        // última actualización (ISO) — solo salientes; entrantes = snapshot
    region: string;
    completed: boolean;     // entregado (saliente) o recibido/cancelado (entrante)
    tracking?: TrackingData; // solo salientes → abre el drawer
}

const up = (s?: string | null) => (s || '').toUpperCase();

export const trackingToRow = (t: TrackingData, i: number): UnifiedRow => {
    const r = t.order_references;
    return {
        id: `out:${t.tracking_number}:${i}`,
        stage: 'outbound',
        orderKey: up(r?.sales_order || r?.purchase_order || r?.order_confirmation) || '—',
        itemLabel: t.tracking_number,
        subLabel: '',
        carrier: t.carrier_info?.name || t.courier_slug || '—',
        statusLabel: statusBucketLabel(t.status),
        chipClasses: statusChipClasses(t.status),
        delayed: false,
        eta: realEta(t) || t.eta || null,
        location: t.last_location || '',
        updated: t.last_update || '',
        region: '',
        completed: statusBucket(t.status) === 'delivered',
        tracking: t,
    };
};

export const incomingToRow = (l: IncomingLine, i: number): UnifiedRow => {
    const m = bucketMeta(l.bucket);
    return {
        id: `in:${l.po}:${l.sku}:${i}`,
        stage: 'incoming',
        orderKey: up(l.so || l.po) || '—',
        itemLabel: l.po,
        subLabel: l.sku,
        carrier: [l.transit, l.supplier].filter(Boolean).join(' · ') || '—',
        statusLabel: m.label,
        chipClasses: m.classes,
        delayed: l.delayed,
        eta: l.due_factory || null,
        location: [l.origin, l.ship_to].filter(Boolean).join(' → '),
        updated: '',
        region: l.region,
        completed: l.bucket === 'received' || l.bucket === 'cancelled',
    };
};

export interface UnifiedFilters {
    text: string;
    stage: '' | Stage;
    region: string;
    showCompleted: boolean;
}

export const applyUnifiedFilters = (rows: UnifiedRow[], f: UnifiedFilters): UnifiedRow[] => {
    const q = f.text.trim().toLowerCase();
    return rows.filter((row) => {
        if (!f.showCompleted && row.completed) return false;
        if (f.stage && row.stage !== f.stage) return false;
        // región solo acota entrantes; los salientes (sin región) no se ocultan
        if (f.region && row.region && row.region !== f.region) return false;
        if (q && !`${row.orderKey} ${row.itemLabel} ${row.subLabel} ${row.carrier} ${row.location}`.toLowerCase().includes(q)) return false;
        return true;
    });
};

export interface UnifiedGroup {
    key: string;
    rows: UnifiedRow[];
    hasIncoming: boolean;
    hasOutbound: boolean;
    delayed: boolean;
}

/** Agrupa por orden; dentro de cada grupo: entrante (upstream) antes que saliente. */
export const groupUnified = (rows: UnifiedRow[]): UnifiedGroup[] => {
    const map = new Map<string, UnifiedRow[]>();
    for (const r of rows) {
        const arr = map.get(r.orderKey);
        if (arr) arr.push(r);
        else map.set(r.orderKey, [r]);
    }
    return [...map.entries()]
        .map(([key, rs]) => {
            rs.sort((a, b) => (a.stage === b.stage ? 0 : a.stage === 'incoming' ? -1 : 1));
            return {
                key,
                rows: rs,
                hasIncoming: rs.some((r) => r.stage === 'incoming'),
                hasOutbound: rs.some((r) => r.stage === 'outbound'),
                delayed: rs.some((r) => r.delayed),
            };
        })
        .sort((a, b) => {
            // grupos con AMBAS etapas (ciclo completo) primero, luego atrasados, luego alfabético; '—' al final
            const full = (g: UnifiedGroup) => (g.hasIncoming && g.hasOutbound ? 0 : 1);
            if (a.key === '—') return 1;
            if (b.key === '—') return -1;
            if (full(a) !== full(b)) return full(a) - full(b);
            if (a.delayed !== b.delayed) return a.delayed ? -1 : 1;
            return a.key.localeCompare(b.key);
        });
};
