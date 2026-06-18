// Stock entrante (POs de compra proveedor → bodega Dynapro). Snapshot del Sheet
// "GLOBAL PO's TRACKING 2026" que mantiene el equipo de logística (carga única).
// Es la etapa UPSTREAM, distinta de los envíos a cliente del dashboard de couriers.

export interface IncomingLine {
    region: string;       // CA | MX | DR | PA
    po: string;           // PO08231
    status: string;       // estado curado a mano (texto original del Sheet)
    bucket: string;       // production | in_transit | ready_to_ship | received | cancelled | other
    delayed: boolean;     // el status traía "DELAYED"
    reference: string;    // REFERENCE crudo (SOxxxxx o "Stock"/"DR Warehouse"...)
    so: string;           // SOxxxxx si la referencia es una SO de cliente, si no ''
    sku: string;
    product: string;
    qty: string;
    supplier: string;
    origin: string;       // China / US / ...
    ship_to: string;      // CA WAREHOUSE / ...
    issue_date: string;   // YYYY-MM-DD
    due_factory: string;  // YYYY-MM-DD (due date de fábrica)
    ship_date: string;
    transit: string;      // SEA / AIR / LAND
    created_by: string;
}

export interface POGroup {
    po: string;
    region: string;
    supplier: string;
    so: string;
    lines: IncomingLine[];
    buckets: Record<string, number>;
    delayed: boolean;
    dueFactory: string; // due date de fábrica más próxima del grupo
}

/** Metadatos de presentación por bucket (etiqueta + clases del chip). */
export const BUCKET_META: Record<string, { label: string; classes: string }> = {
    production: { label: 'En producción', classes: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
    in_transit: { label: 'En tránsito', classes: 'text-blue-300 border-blue-400/30 bg-blue-400/10' },
    ready_to_ship: { label: 'Listo p/ enviar', classes: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10' },
    received: { label: 'Recibido', classes: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' },
    cancelled: { label: 'Cancelado', classes: 'text-white/40 border-white/15 bg-white/5' },
    other: { label: 'Otro', classes: 'text-white/50 border-white/15 bg-white/5' },
};

export const bucketMeta = (b: string) => BUCKET_META[b] ?? BUCKET_META.other;

/** Agrupa las líneas por PO (dentro de cada región). */
export const groupByPO = (lines: IncomingLine[]): POGroup[] => {
    const map = new Map<string, IncomingLine[]>();
    for (const l of lines) {
        const k = `${l.region}:${l.po}`;
        const arr = map.get(k);
        if (arr) arr.push(l);
        else map.set(k, [l]);
    }
    return [...map.values()].map((ls) => {
        const buckets: Record<string, number> = {};
        for (const l of ls) buckets[l.bucket] = (buckets[l.bucket] ?? 0) + 1;
        const dues = ls.map((l) => l.due_factory).filter(Boolean).sort();
        return {
            po: ls[0].po,
            region: ls[0].region,
            supplier: ls[0].supplier,
            so: ls.find((l) => l.so)?.so ?? '',
            lines: ls,
            buckets,
            delayed: ls.some((l) => l.delayed),
            dueFactory: dues[0] ?? '',
        };
    });
};
