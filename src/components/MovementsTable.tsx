import { format, isValid } from 'date-fns';
import { Truck, Warehouse, AlertTriangle } from 'lucide-react';
import type { UnifiedGroup, UnifiedRow } from '../utils/unified';

interface Props {
    groups: UnifiedGroup[];
    onRowClick: (t: UnifiedRow) => void;
}

const fdate = (s: string | null) => {
    if (!s) return '—';
    const d = new Date(s);
    return isValid(d) ? format(d, 'MMM d') : s;
};

const StageBadge = ({ stage }: { stage: UnifiedRow['stage'] }) =>
    stage === 'incoming' ? (
        <span className="inline-flex items-center gap-1 text-purple-300/90 text-xs font-medium">
            <Warehouse className="w-3.5 h-3.5" /> Entrante
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-cyan-300/90 text-xs font-medium">
            <Truck className="w-3.5 h-3.5" /> Saliente
        </span>
    );

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <span className={`flex-1 ${className}`}>
        <span className="md:hidden text-white/40 text-[10px] uppercase tracking-wide mr-1">{label}:</span>
        {children}
    </span>
);

export const MovementsTable = ({ groups, onRowClick }: Props) => {
    if (groups.length === 0) {
        return <p className="text-white/40 text-sm py-10 text-center">No hay movimientos que coincidan.</p>;
    }
    return (
        <div className="text-sm">
            <div className="hidden md:flex text-white/50 text-xs font-semibold px-4 pb-2 gap-3 border-b border-white/10">
                <span className="flex-[1.6]">Item</span><span className="flex-[0.9]">Etapa</span>
                <span className="flex-[1.3]">Carrier / Origen</span><span className="flex-[1.1]">Estado</span>
                <span className="flex-[0.8]">ETA</span><span className="flex-[1.1]">Ubicación</span>
                <span className="flex-[0.9]">Actualizado</span>
            </div>
            {groups.map((g) => (
                <div key={g.key} className="mt-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/5 rounded-lg text-xs flex-wrap">
                        <span className="font-bold text-cyan-300 font-mono">{g.key}</span>
                        {g.hasIncoming && g.hasOutbound && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">ciclo completo</span>
                        )}
                        {g.delayed && (
                            <span className="inline-flex items-center gap-1 text-red-400 font-semibold"><AlertTriangle className="w-3 h-3" />atrasado</span>
                        )}
                        <span className="ml-auto text-white/40">{g.rows.length} mov.</span>
                    </div>
                    {g.rows.map((r) => {
                        const clickable = r.stage === 'outbound';
                        const Inner = (
                            <>
                                <Field label="Item" className="md:flex-[1.6] font-mono text-white">
                                    <span className="block truncate">{r.itemLabel}</span>
                                    {r.subLabel && <span className="block text-white/40 text-[11px] font-sans truncate">{r.subLabel}</span>}
                                </Field>
                                <span className="md:flex-[0.9] py-0.5"><StageBadge stage={r.stage} /></span>
                                <Field label="Carrier" className="md:flex-[1.3] text-white/70 capitalize truncate">{r.carrier}</Field>
                                <span className="md:flex-[1.1] py-0.5">
                                    <span className="md:hidden text-white/40 text-[10px] uppercase tracking-wide mr-1">Estado:</span>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${r.chipClasses}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                                        {r.statusLabel}{r.delayed && <AlertTriangle className="w-3 h-3 text-red-400" />}
                                    </span>
                                </span>
                                <Field label="ETA" className="md:flex-[0.8] text-white/60">{fdate(r.eta)}</Field>
                                <Field label="Ubicación" className="md:flex-[1.1] text-white/50 truncate">{r.location || '—'}</Field>
                                <Field label="Actualizado" className="md:flex-[0.9] text-white/40">{fdate(r.updated)}</Field>
                            </>
                        );
                        return clickable ? (
                            <button
                                key={r.id}
                                onClick={() => onRowClick(r)}
                                className="w-full flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3 text-left px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                                {Inner}
                            </button>
                        ) : (
                            <div
                                key={r.id}
                                className="w-full flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3 text-left px-4 py-3.5 border-b border-white/5"
                            >
                                {Inner}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
