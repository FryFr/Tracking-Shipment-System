import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrackingData } from '../types/tracking';
import { fetchTrackingsByOrder as fetchLegacyOrderLinks } from './useOrderTrackings';

// ============================================================================
// Email-first tracking store.
// La colección `trackings/{tracking_number}` la alimenta n8n (service account)
// con lo que extrae de los correos de logística. La webapp la LEE; no consulta
// ninguna API de tracking paga. El estado en vivo se ve con el deep-link al courier.
//
// Contrato del documento `trackings/{tracking_number}`:
//   tracking_number, courier_slug, status, status_detail, last_location,
//   last_update, eta, sales_order, purchase_order, order_confirmation
//   (las 3 refs en MAYÚSCULA, para query de igualdad), raw_checkpoints?: [],
//   source: 'email', updated_at
// ============================================================================

const COLLECTION = 'trackings';
const ORDER_FIELDS = ['sales_order', 'purchase_order', 'order_confirmation'] as const;

/** Docs cuyo SO/PO/OC matchea `ref`. Query por string Y por número, porque el nodo
 * Firestore de n8n puede haber guardado un PO numérico como integer. */
const queryDocsByOrder = async (ref: string) => {
    const key = ref.trim().toUpperCase();
    if (!key) return [] as any[];
    const keyNum = Number(key);
    const alsoNum = key !== '' && Number.isFinite(keyNum);
    const queries = [] as Promise<any>[];
    for (const f of ORDER_FIELDS) {
        queries.push(getDocs(query(collection(db, COLLECTION), where(f, '==', key))));
        if (alsoNum) queries.push(getDocs(query(collection(db, COLLECTION), where(f, '==', keyNum))));
    }
    const snaps = await Promise.all(queries);
    const byTn = new Map<string, any>();
    snaps.forEach((snap: any) => snap.docs.forEach((s: any) => {
        const d = s.data();
        // El nodo Firestore usa tracking_number como ID del doc (y a veces no lo guarda
        // como campo, o lo guarda numérico) → ID del doc como fallback, forzado a string.
        const tn = (d.tracking_number !== undefined && d.tracking_number !== null && d.tracking_number !== '')
            ? String(d.tracking_number) : s.id;
        if (tn) byTn.set(tn, { ...d, tracking_number: tn });
    }));
    return [...byTn.values()];
};

/** Coacciona a string: Firestore autoconvierte fechas ISO a Timestamp (tiene .toDate()). */
const toStr = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return String(v);
};

/** Checkpoints: vienen como JSON string (raw_checkpoints_json) o como array. */
const parseCheckpoints = (d: any): any[] => {
    if (Array.isArray(d.raw_checkpoints)) return d.raw_checkpoints;
    if (typeof d.raw_checkpoints_json === 'string' && d.raw_checkpoints_json) {
        try { return JSON.parse(d.raw_checkpoints_json); } catch { return []; }
    }
    return [];
};

/** Fuerza string. El nodo Firestore de n8n auto-tipa números (tracking_number, PO)
 * como integer → sin esto, cualquier .trim()/.toLowerCase() sobre ellos explota. */
const str = (v: any): string => (v === null || v === undefined ? '' : String(v));

/** Firestore doc → TrackingData del front. `id` = doc id (fallback del tracking_number). */
export const mapTrackingDoc = (d: any, id?: string): TrackingData => ({
    tracking_number: str(d.tracking_number) || str(id),
    courier_slug: str(d.courier_slug),
    status: str(d.status) || 'pending',
    status_detail: str(d.status_detail) || str(d.status) || 'Unknown',
    last_location: str(d.last_location),
    last_update: toStr(d.last_update) || toStr(d.updated_at),
    eta: toStr(d.eta),
    // 17track guarda los checkpoints como JSON string (el nodo Firestore no maneja
    // bien arrays anidados de objetos). Parseamos; si ya viene array, lo usamos.
    raw_checkpoints: parseCheckpoints(d),
    order_references: {
        sales_order: str(d.sales_order) || undefined,
        purchase_order: str(d.purchase_order) || undefined,
        order_confirmation: str(d.order_confirmation) || undefined,
    },
    carrier_info: { slug: str(d.courier_slug), name: str(d.carrier_name) || undefined },
    data_source: d.source === 'email' ? 'email' : d.source === 'manual' ? 'manual' : 'api',
});

/** Tarjeta mínima cuando no hay data guardada: igual muestra el deep-link al courier. */
export const placeholderTracking = (tn: string): TrackingData => ({
    tracking_number: tn,
    courier_slug: '',
    status: 'pending',
    status_detail: 'No tracking data yet',
    last_location: '',
    last_update: '',
    eta: '',
    raw_checkpoints: [],
    data_source: undefined,
});

// Webhook n8n para pull on-demand de 17track (actualiza Firestore; la webapp re-lee).
const REFRESH_WEBHOOK = import.meta.env.VITE_N8N_REFRESH_URL
    || 'https://juansesn8n.duckdns.org/webhook/17track-refresh';

/** Dispara "traer lo último ahora" de 17track para un envío. n8n escribe a Firestore. */
export const requestRefresh = async (trackingNumber: string, courierSlug: string): Promise<void> => {
    try {
        await fetch(REFRESH_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: trackingNumber, courier_slug: courierSlug || '' }),
        });
    } catch { /* el re-read de Firestore corre igual */ }
};

/**
 * Escribe un stub mínimo (con courier) cuando un número buscado se registró en 17track
 * pero la data aún no llegó (async). Así el Sync horario lo levanta y lo completa solo.
 * Requiere rol logística/admin (Firestore rules); si falla, no rompe la búsqueda.
 */
export const saveStubTracking = async (trackingNumber: string, courierSlug: string): Promise<void> => {
    const id = trackingNumber.trim();
    if (!id || !courierSlug) return;
    const now = new Date().toISOString();
    try {
        await setDoc(doc(db, COLLECTION, id), {
            tracking_number: id,
            courier_slug: courierSlug,
            status: 'pending',
            status_detail: 'Registrado — actualizando con el courier',
            source: 'pending',
            registered: false,
            updated_at: now,
            last_update: now,
        }, { merge: true });
    } catch { /* best-effort */ }
};

/** Lee un tracking por número. null si no existe en el store. */
export const fetchTrackingDoc = async (tn: string): Promise<TrackingData | null> => {
    const snap = await getDoc(doc(db, COLLECTION, tn));
    return snap.exists() ? mapTrackingDoc(snap.data(), snap.id) : null;
};

export interface ManualShipmentInput {
    tracking_number: string; // contenedor / BL (clave de búsqueda + ID del doc)
    carrier_name: string;    // naviera / forwarder (solo display)
    sales_order?: string;
    purchase_order?: string;
    eta?: string;            // ETA del forwarder (ISO)
    status: string;          // bucket: pending | transit | delivered
    status_detail?: string;  // etiqueta legible
    notes?: string;
}

/**
 * Crea/actualiza un envío MARÍTIMO manual en `trackings`. courier_slug queda vacío
 * a propósito: así el Sync de 17track lo ignora (un contenedor no es un courier
 * rastreable por 17track). El ETA del forwarder + las semanas de aduana (logistics_eta)
 * dan el ETA real.
 */
export const saveManualShipment = async (input: ManualShipmentInput, userEmail: string): Promise<string> => {
    const id = input.tracking_number.trim();
    if (!id) throw new Error('Container / BL number is required');
    const now = new Date().toISOString();
    await setDoc(doc(db, COLLECTION, id), {
        tracking_number: id,
        courier_slug: '',
        carrier_name: input.carrier_name?.trim() || 'Ocean / Forwarder',
        status: input.status || 'transit',
        status_detail: input.status_detail || 'Maritime shipment',
        eta: input.eta || '',
        last_location: '',
        sales_order: (input.sales_order || '').trim().toUpperCase(),
        purchase_order: (input.purchase_order || '').trim().toUpperCase(),
        order_confirmation: '',
        notes: input.notes || '',
        source: 'manual',
        is_ocean: true,
        registered: true,
        updated_by: userEmail,
        updated_at: now,
        last_update: now,
    }, { merge: true });
    return id;
};

/** Números de tracking que comparten una orden (para el grouping multi-delivery). */
export const fetchSiblingTrackingNumbers = async (orderRef: string): Promise<string[]> => {
    const docs = await queryDocsByOrder(orderRef);
    return docs.map((d) => d.tracking_number).filter(Boolean);
};

/**
 * Todos los envíos de una orden (SO/PO/OC). Une dos fuentes:
 *  1) trackings cuyo SO/PO/OC matchea (data de correos)
 *  2) links manuales viejos en order_trackings (botón "Link Order")
 * Para los manuales sin doc en `trackings`, devuelve un placeholder (deep-link).
 */
export const queryTrackingsByOrder = async (orderRef: string): Promise<TrackingData[]> => {
    const key = orderRef.trim().toUpperCase();
    if (!key) return [];

    const [emailDocs, legacyTns] = await Promise.all([
        queryDocsByOrder(key),
        fetchLegacyOrderLinks(key).catch(() => [] as string[]),
    ]);

    const byTn = new Map<string, TrackingData>();
    emailDocs.forEach((d) => {
        const t = mapTrackingDoc(d);
        byTn.set(t.tracking_number, t);
    });

    // Completar con links manuales que no tengan doc de tracking todavía
    await Promise.all(
        legacyTns
            .filter((tn) => !byTn.has(tn))
            .map(async (tn) => {
                const t = (await fetchTrackingDoc(tn).catch(() => null)) ?? placeholderTracking(tn);
                byTn.set(tn, t);
            }),
    );

    return [...byTn.values()];
};
