import { Package, CheckCircle2, Truck, Clock, AlertTriangle } from 'lucide-react';
import type { TrackingData } from '../types/tracking';

interface OrderSummaryCardProps {
    orderRef: string;
    shipments: TrackingData[];
    activeIndex: number;
    onSelect: (index: number) => void;
}

type Bucket = 'delivered' | 'transit' | 'pending' | 'attention';

/** Map a raw n8n status string to a coarse bucket for the order summary */
const bucketOf = (status: string): Bucket => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return 'delivered';
    if (s === 'transit' || s === 'pickup' || s === 'out_for_delivery') return 'transit';
    if (s === 'exception' || s === 'expired' || s === 'undelivered') return 'attention';
    return 'pending'; // pending, inforeceived, notfound, no_tracking, ''
};

const BUCKET_META: Record<Bucket, { label: string; icon: typeof Package; className: string }> = {
    delivered: { label: 'Delivered', icon: CheckCircle2, className: 'text-emerald-400' },
    transit: { label: 'In transit', icon: Truck, className: 'text-blue-400' },
    pending: { label: 'Pending', icon: Clock, className: 'text-gray-400' },
    attention: { label: 'Attention', icon: AlertTriangle, className: 'text-amber-400' },
};

const ORDER: Bucket[] = ['delivered', 'transit', 'pending', 'attention'];

/**
 * Order-level summary shown when searching by SO/PO/OC.
 * Aggregates the status of every linked shipment ("SO19167 — 3 shipments:
 * 1 delivered, 2 in transit") and lets the user jump to each one.
 */
export const OrderSummaryCard = ({ orderRef, shipments, activeIndex, onSelect }: OrderSummaryCardProps) => {
    const counts = shipments.reduce<Record<Bucket, number>>(
        (acc, s) => {
            acc[bucketOf(s.status)] += 1;
            return acc;
        },
        { delivered: 0, transit: 0, pending: 0, attention: 0 },
    );

    const total = shipments.length;
    const deliveredPct = total > 0 ? Math.round((counts.delivered / total) * 100) : 0;

    return (
        <div className="w-full max-w-3xl rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-5 md:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                        <Package className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-white font-semibold text-lg leading-tight">{orderRef}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">
                            {total} shipment{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Status breakdown */}
                <div className="flex items-center gap-4 flex-wrap">
                    {ORDER.filter((b) => counts[b] > 0).map((b) => {
                        const { label, icon: Icon, className } = BUCKET_META[b];
                        return (
                            <div key={b} className="flex items-center gap-1.5" title={label}>
                                <Icon className={`w-4 h-4 ${className}`} />
                                <span className={`text-sm font-semibold ${className}`}>{counts[b]}</span>
                                <span className="text-white/40 text-xs hidden sm:inline">{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Delivery progress */}
            <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                        className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                        style={{ width: `${deliveredPct}%` }}
                    />
                </div>
            </div>

            {/* Per-shipment chips */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
                {shipments.map((s, idx) => {
                    const { className } = BUCKET_META[bucketOf(s.status)];
                    const isActive = idx === activeIndex;
                    return (
                        <button
                            key={s.tracking_number + idx}
                            onClick={() => onSelect(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                                isActive
                                    ? 'bg-white/15 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            }`}
                            title={s.status_detail || s.status}
                        >
                            <span className={`mr-1 ${className}`}>●</span>
                            {s.tracking_number}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
