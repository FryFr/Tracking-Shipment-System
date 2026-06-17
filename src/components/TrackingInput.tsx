import { Search, Package } from 'lucide-react';
import { useState } from 'react';
import { isOrderReference } from '../hooks/useOrderTrackings';

interface Props {
    onSearch: (trackingNumber: string, courier?: string) => void;
    onSearchByOrder?: (orderRef: string) => void;
    loading: boolean;
}

// value = slug que reconoce el carrierOf de n8n (usa .includes)
const COURIERS: { label: string; value: string }[] = [
    { label: 'Auto-detectar courier', value: '' },
    { label: 'Purolator', value: 'purolator' },
    { label: 'Canada Post', value: 'canada post' },
    { label: 'FedEx', value: 'fedex' },
    { label: 'UPS', value: 'ups' },
    { label: 'DHL', value: 'dhl' },
    { label: 'Estes', value: 'estes' },
    { label: 'TForce / UPS Freight', value: 'tforce' },
    { label: 'Day & Ross', value: 'day ross' },
    { label: 'DSV', value: 'dsv' },
    { label: 'Dicom / GLS', value: 'dicom' },
    { label: 'Old Dominion', value: 'old dominion' },
    { label: 'SAIA', value: 'saia' },
    { label: 'XPO', value: 'xpo' },
    { label: 'Purolator Freight', value: 'purolator freight' },
];

export const TrackingInput = ({ onSearch, onSearchByOrder, loading }: Props) => {
    const [value, setValue] = useState('');
    const [courier, setCourier] = useState('');

    const isOrder = value.trim() ? isOrderReference(value.trim()) : false;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        if (isOrder && onSearchByOrder) {
            onSearchByOrder(trimmed);
        } else {
            onSearch(trimmed, courier || undefined);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 px-4 z-10 relative">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight shadow-black drop-shadow-lg">
                    Track your shipment
                </h1>
                <p className="text-lg text-white/80">
                    Enter a tracking number or order reference (SO, PO, OC)
                </p>
            </div>

            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    {isOrder ? (
                        <Package className="h-6 w-6 text-amber-400 transition-colors" />
                    ) : (
                        <Search className="h-6 w-6 text-gray-400 group-focus-within:text-primary transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="e.g. 335768407058 or SO17558"
                    className="block w-full pl-14 pr-36 py-5 bg-white/95 backdrop-blur-md border border-white/20 focus:border-primary/50 rounded-2xl text-lg shadow-2xl focus:shadow-primary/20 focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-gray-900"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="absolute right-2.5 top-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-8 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30 active:scale-95 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isOrder ? 'Searching...' : 'Tracking...'}</span>
                        </>
                    ) : (
                        isOrder ? 'Search Order' : 'Track'
                    )}
                </button>
            </form>

            {/* Selector de courier (solo al buscar por número; ayuda cuando 17track no auto-detecta) */}
            {!isOrder && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                    <span className="text-white/50">Courier:</span>
                    <select
                        value={courier}
                        onChange={(e) => setCourier(e.target.value)}
                        disabled={loading}
                        className="bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                        {COURIERS.map((c) => (
                            <option key={c.value} value={c.value} className="text-gray-900">{c.label}</option>
                        ))}
                    </select>
                    <span className="text-white/35 text-xs hidden sm:inline">elegilo si no aparece solo</span>
                </div>
            )}
            {isOrder && (
                <div className="mt-3 text-center px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-medium inline-block">
                    Searching by order reference — will find all linked trackings
                </div>
            )}
        </div>
    );
};
