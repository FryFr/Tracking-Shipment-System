import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { addWeeks, format, isValid } from 'date-fns';
import type { LogisticsETA } from '../types/tracking';
import { PORT_OPTIONS, PORT_ETA_DEFAULTS } from '../utils/portDefaults';

interface Props {
    trackingNumber: string;
    carrierEta?: string;
    initial?: LogisticsETA | null;
    onSave: (data: Partial<LogisticsETA>) => Promise<void>;
    onClose: () => void;
}

export const LogisticsETAForm = ({ trackingNumber, carrierEta, initial, onSave, onClose }: Props) => {
    const [customsWeeks, setCustomsWeeks] = useState(initial?.customs_weeks ?? 0);
    const [deconWeeks, setDeconWeeks] = useState(initial?.deconsolidation_weeks ?? 0);
    const [importWeeks, setImportWeeks] = useState(initial?.import_weeks ?? 0);
    const [port, setPort] = useState(initial?.port_of_entry ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [reviewed, setReviewed] = useState(initial?.reviewed ?? false);
    const [saving, setSaving] = useState(false);

    const totalWeeks = customsWeeks + deconWeeks + importWeeks;

    const estimatedArrival = (() => {
        if (!carrierEta) return null;
        const base = new Date(carrierEta);
        if (!isValid(base)) return null;
        return addWeeks(base, totalWeeks);
    })();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onSave({
            customs_weeks: customsWeeks,
            deconsolidation_weeks: deconWeeks,
            import_weeks: importWeeks,
            port_of_entry: port || undefined,
            notes: notes || undefined,
            reviewed,
            estimated_arrival: estimatedArrival?.toISOString(),
        });
        setSaving(false);
        onClose();
    };

    const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';
    const labelClass = 'block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white text-lg font-bold">Logistics ETA</h3>
                        <p className="text-gray-400 text-xs font-mono">{trackingNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Customs (weeks)</label>
                            <input type="number" min={0} max={52} value={customsWeeks}
                                   onChange={(e) => setCustomsWeeks(Number(e.target.value))}
                                   className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Deconsolidation</label>
                            <input type="number" min={0} max={52} value={deconWeeks}
                                   onChange={(e) => setDeconWeeks(Number(e.target.value))}
                                   className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Import (weeks)</label>
                            <input type="number" min={0} max={52} value={importWeeks}
                                   onChange={(e) => setImportWeeks(Number(e.target.value))}
                                   className={inputClass} />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Total Additional</p>
                        <p className="text-white text-xl font-bold">{totalWeeks} weeks</p>
                        {estimatedArrival && (
                            <p className="text-amber-400 text-sm mt-1">
                                Est. Arrival: {format(estimatedArrival, 'MMM d, yyyy')}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Port of Entry</label>
                        <select
                            value={port}
                            onChange={(e) => {
                                const next = e.target.value;
                                setPort(next);
                                const preset = PORT_ETA_DEFAULTS[next];
                                if (typeof preset === 'number') setCustomsWeeks(preset);
                            }}
                            className={inputClass}
                        >
                            <option value="">Select port...</option>
                            {PORT_OPTIONS.map((p) => (
                                <option key={p} value={p}>{p} ({PORT_ETA_DEFAULTS[p]}w default)</option>
                            ))}
                        </select>
                        {port && (
                            <p className="text-gray-500 text-xs mt-1">Customs auto-filled from port default. Override manually if needed.</p>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                  rows={3} className={inputClass} placeholder="Additional logistics notes..." />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${reviewed ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${reviewed ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="sr-only" />
                        <span className="text-white text-sm font-medium">Mark as Reviewed by Logistics</span>
                    </label>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save ETA'}
                    </button>
                </form>
            </div>
        </div>
    );
};
