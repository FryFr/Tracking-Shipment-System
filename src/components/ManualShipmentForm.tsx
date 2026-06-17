import { useState } from 'react';
import { X, Save, Loader2, Ship } from 'lucide-react';
import type { ManualShipmentInput } from '../hooks/useTrackingStore';

interface Props {
    onSave: (data: ManualShipmentInput) => Promise<void>;
    onClose: () => void;
}

// Etiqueta legible → bucket de estado de la webapp
const STATUS_OPTIONS: { value: string; label: string; detail: string }[] = [
    { value: 'pending', label: 'Booked / Reservado', detail: 'Booked with forwarder' },
    { value: 'transit', label: 'In transit (vessel) / En tránsito marítimo', detail: 'In transit (ocean)' },
    { value: 'transit', label: 'At port / En puerto', detail: 'Arrived at port' },
    { value: 'transit', label: 'Customs / En aduana', detail: 'In customs clearance' },
    { value: 'delivered', label: 'Delivered / Entregado', detail: 'Delivered' },
];

export const ManualShipmentForm = ({ onSave, onClose }: Props) => {
    const [container, setContainer] = useState('');
    const [carrier, setCarrier] = useState('');
    const [salesOrder, setSalesOrder] = useState('');
    const [purchaseOrder, setPurchaseOrder] = useState('');
    const [eta, setEta] = useState('');
    const [statusIdx, setStatusIdx] = useState(1); // default: In transit
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!container.trim()) {
            setError('El número de contenedor / BL es obligatorio');
            return;
        }
        setError('');
        setSaving(true);
        const opt = STATUS_OPTIONS[statusIdx];
        try {
            await onSave({
                tracking_number: container.trim(),
                carrier_name: carrier.trim(),
                sales_order: salesOrder,
                purchase_order: purchaseOrder,
                eta: eta ? new Date(eta).toISOString() : '',
                status: opt.value,
                status_detail: opt.detail,
                notes: notes.trim() || undefined,
            });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'No se pudo guardar');
            setSaving(false);
        }
    };

    const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50';
    const labelClass = 'block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
                            <Ship className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-bold">Maritime shipment / Envío marítimo</h3>
                            <p className="text-gray-400 text-xs">Manual — fed by forwarder, not by courier</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Container / BL number *</label>
                        <input value={container} onChange={(e) => setContainer(e.target.value)}
                               className={inputClass} placeholder="e.g. MSKU1234567 / BL number" autoFocus />
                    </div>

                    <div>
                        <label className={labelClass}>Carrier / Forwarder</label>
                        <input value={carrier} onChange={(e) => setCarrier(e.target.value)}
                               className={inputClass} placeholder="e.g. Maersk, MSC, DSV Ocean..." />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Sales Order (SO)</label>
                            <input value={salesOrder} onChange={(e) => setSalesOrder(e.target.value)}
                                   className={inputClass} placeholder="SO19443" />
                        </div>
                        <div>
                            <label className={labelClass}>Purchase Order (PO)</label>
                            <input value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)}
                                   className={inputClass} placeholder="PO09003" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Forwarder ETA</label>
                            <input type="date" value={eta} onChange={(e) => setEta(e.target.value)}
                                   className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select value={statusIdx} onChange={(e) => setStatusIdx(Number(e.target.value))}
                                    className={inputClass}>
                                {STATUS_OPTIONS.map((o, i) => (
                                    <option key={i} value={i}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                  rows={2} className={inputClass} placeholder="Vessel, voyage, port of entry..." />
                    </div>

                    <p className="text-gray-500 text-xs">
                        Tip: después de crear, buscá el contenedor y agregá las semanas de aduana con "Edit Logistics ETA" para el ETA real.
                    </p>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-600/50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save maritime shipment'}
                    </button>
                </form>
            </div>
        </div>
    );
};
