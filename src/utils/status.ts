export type StatusBucket = 'delivered' | 'transit' | 'pending' | 'attention';

const MAP: Record<string, StatusBucket> = {
    delivered: 'delivered',
    transit: 'transit',
    intransit: 'transit',
    pickup: 'transit',
    out_for_delivery: 'transit',
    availableforpickup: 'transit',
    outfordelivery: 'transit',
    exception: 'attention',
    expired: 'attention',
    undelivered: 'attention',
    deliveryfailure: 'attention',
};

/** Normaliza cualquier estado crudo (n8n/17track/manual) a un bucket. */
export const statusBucket = (status: string): StatusBucket => {
    const s = (status || '').toLowerCase().replace(/[\s-]/g, '');
    return MAP[s] ?? 'pending';
};

const CHIP: Record<StatusBucket, string> = {
    delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    transit: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    attention: 'bg-red-500/20 text-red-300 border-red-500/30',
};

/** Clases Tailwind del chip para un estado crudo. */
export const statusChipClasses = (status: string): string => CHIP[statusBucket(status)];

const LABEL: Record<StatusBucket, string> = {
    delivered: 'Delivered',
    transit: 'In transit',
    pending: 'Pending',
    attention: 'Attention',
};

export const statusBucketLabel = (status: string): string => LABEL[statusBucket(status)];
