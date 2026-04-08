import { useState } from 'react';
import { X, Save, Loader2, Link2 } from 'lucide-react';
import type { OrderReferences } from '../types/tracking';

interface Props {
    trackingNumber: string;
    initial?: OrderReferences | null;
    onSave: (refs: OrderReferences) => Promise<void>;
    onClose: () => void;
}

export const OrderLinkForm = ({ trackingNumber, initial, onSave, onClose }: Props) => {
    const [salesOrder, setSalesOrder] = useState(initial?.sales_order ?? '');
    const [purchaseOrder, setPurchaseOrder] = useState(initial?.purchase_order ?? '');
    const [orderConfirmation, setOrderConfirmation] = useState(initial?.order_confirmation ?? '');
    const [saving, setSaving] = useState(false);

    const hasAnyValue = salesOrder.trim() || purchaseOrder.trim() || orderConfirmation.trim();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasAnyValue) return;
        setSaving(true);
        await onSave({
            sales_order: salesOrder.trim() || undefined,
            purchase_order: purchaseOrder.trim() || undefined,
            order_confirmation: orderConfirmation.trim() || undefined,
        });
        setSaving(false);
        onClose();
    };

    const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-500';
    const labelClass = 'block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white text-lg font-bold flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-blue-500" />
                            Link Order
                        </h3>
                        <p className="text-gray-400 text-xs font-mono">{trackingNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Sales Order (SO)</label>
                        <input
                            type="text"
                            value={salesOrder}
                            onChange={(e) => setSalesOrder(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. SO17558"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Purchase Order (PO)</label>
                        <input
                            type="text"
                            value={purchaseOrder}
                            onChange={(e) => setPurchaseOrder(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. PO12345"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Order Confirmation (OC)</label>
                        <input
                            type="text"
                            value={orderConfirmation}
                            onChange={(e) => setOrderConfirmation(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. OC98765"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving || !hasAnyValue}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Link'}
                    </button>
                </form>
            </div>
        </div>
    );
};
