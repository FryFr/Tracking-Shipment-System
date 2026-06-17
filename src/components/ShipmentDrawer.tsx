import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { TrackingData, UserRole } from '../types/tracking';
import { fetchETA, saveETA } from '../hooks/useLogisticsETA';
import { fetchOrderRefs } from '../hooks/useOrderTrackings';
import { TrackingResult } from './TrackingResult';
import { LogisticsETAForm } from './LogisticsETAForm';
import { useAuth } from '../hooks/useAuth';

interface Props {
    tracking: TrackingData;
    role: UserRole | null;
    onClose: () => void;
}

export const ShipmentDrawer = ({ tracking, role, onClose }: Props) => {
    const { user } = useAuth();
    const [data, setData] = useState<TrackingData>(tracking);
    const [editingEta, setEditingEta] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [eta, refs] = await Promise.all([
                fetchETA(tracking.tracking_number).catch(() => null),
                fetchOrderRefs(tracking.tracking_number).catch(() => null),
            ]);
            if (cancelled) return;
            setData((d) => ({
                ...d,
                logistics_eta: eta || d.logistics_eta,
                order_references: { ...d.order_references, ...refs },
            }));
        })();
        return () => { cancelled = true; };
    }, [tracking.tracking_number]);

    const canEdit = role === 'logistics' || role === 'admin';

    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl h-full overflow-y-auto bg-gray-950/95 border-l border-white/10 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg">
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="pt-12">
                    <TrackingResult
                        data={data}
                        role={role}
                        showBackButton={false}
                        onEditETA={canEdit ? () => setEditingEta(true) : undefined}
                    />
                </div>
            </div>
            {editingEta && user?.email && (
                <LogisticsETAForm
                    trackingNumber={data.tracking_number}
                    carrierEta={data.eta}
                    initial={data.logistics_eta}
                    onClose={() => setEditingEta(false)}
                    onSave={async (etaData) => {
                        await saveETA(data.tracking_number, etaData, user.email!);
                        const fresh = await fetchETA(data.tracking_number);
                        if (fresh) setData((d) => ({ ...d, logistics_eta: fresh }));
                    }}
                />
            )}
        </div>
    );
};
