import { format, isValid } from 'date-fns';
import { Ship } from 'lucide-react';
import type { TrackingData } from '../types/tracking';
import { groupByOrder, realEta } from '../utils/dashboard';
import { statusBucket } from '../utils/status';
import { StatusChip } from './StatusChip';

interface Props {
    items: TrackingData[];
    onRowClick: (t: TrackingData) => void;
}

const fdate = (s?: string | null) => {
    if (!s) return '—';
    const d = new Date(s);
    return isValid(d) ? format(d, 'MMM d') : s;
};

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <span className={`flex-1 ${className}`}>
        <span className="md:hidden text-white/40 text-[10px] uppercase tracking-wide mr-1">{label}:</span>
        {children}
    </span>
);

export const ShipmentsTable = ({ items, onRowClick }: Props) => {
    const groups = groupByOrder(items);
    if (items.length === 0) {
        return <p className="text-white/40 text-sm py-10 text-center">No hay envíos que coincidan.</p>;
    }
    return (
        <div className="text-sm">
            {/* header (solo desktop) */}
            <div className="hidden md:flex text-white/50 text-xs font-semibold px-3 pb-2 border-b border-white/10">
                <span className="flex-[1.6]">Tracking</span><span className="flex-1">Courier</span>
                <span className="flex-[1.2]">Estado</span><span className="flex-1">ETA courier</span>
                <span className="flex-[1.1]">ETA real ⚖️</span><span className="flex-[1.3]">Ubicación</span>
            </div>
            {groups.map((g) => {
                const counts = g.items.reduce<Record<string, number>>((a, t) => {
                    const b = statusBucket(t.status); a[b] = (a[b] ?? 0) + 1; return a;
                }, {});
                return (
                    <div key={g.key} className="mt-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/5 rounded-lg text-xs flex-wrap">
                            <span className="font-bold text-cyan-300 font-mono">{g.key}</span>
                            <span className="text-white/50">{g.items.length} envío{g.items.length !== 1 ? 's' : ''}</span>
                            <span className="ml-auto flex gap-2 text-white/50">
                                {Object.entries(counts).map(([b, n]) => <span key={b}>{n} {b}</span>)}
                            </span>
                        </div>
                        {g.items.map((t, i) => {
                            const re = realEta(t);
                            return (
                                <button
                                    key={t.tracking_number + i}
                                    onClick={() => onRowClick(t)}
                                    className="w-full flex flex-col gap-1 md:flex-row md:items-center md:gap-0 text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <Field label="Tracking" className="md:flex-[1.6] font-mono text-white">
                                        <span className="inline-flex items-center gap-1">
                                            {t.data_source === 'manual' && <Ship className="w-3.5 h-3.5 text-cyan-400" />}{t.tracking_number}
                                        </span>
                                    </Field>
                                    <Field label="Courier" className="text-white/70 capitalize">{t.carrier_info?.name || t.courier_slug || '—'}</Field>
                                    <span className="md:flex-[1.2] py-0.5">
                                        <span className="md:hidden text-white/40 text-[10px] uppercase tracking-wide mr-1">Estado:</span>
                                        <StatusChip status={t.status} label={t.status_detail || statusBucket(t.status)} />
                                    </span>
                                    <Field label="ETA courier" className="text-white/60">{fdate(t.eta)}</Field>
                                    <Field label="ETA real" className="md:flex-[1.1] text-amber-400">{re ? fdate(re) : '—'}</Field>
                                    <Field label="Ubicación" className="md:flex-[1.3] text-white/50 truncate">{t.last_location || '—'}</Field>
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
