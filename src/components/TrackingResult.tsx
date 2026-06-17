import { format, isValid, addWeeks } from 'date-fns';
import { useState } from 'react';
import { ArrowLeft, Box, Calendar, MapPin, Truck, Shield, ShieldCheck, Pencil, Link2, ExternalLink, RefreshCw } from 'lucide-react';
import type { TrackingData, UserRole } from '../types/tracking';
import { canEditLogistics, canSeeAdjustedEta } from '../types/tracking';
import { getCourierLink } from '../utils/courierLinks';
import { Timeline } from './Timeline';

interface Props {
    data: TrackingData;
    role: UserRole | null;
    onBack?: () => void;
    showBackButton?: boolean;
    onEditETA?: () => void;
    onLinkOrder?: () => void;
    onRefresh?: () => Promise<void> | void;
}

const formatEta = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Pending';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, 'MMM d, yyyy') : dateStr;
};

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered') return 'bg-green-500 shadow-green-900/20';
    if (['exception', 'returned', 'failure'].some(bad => s.includes(bad))) return 'bg-red-500 shadow-red-900/20';
    return 'bg-blue-600 shadow-blue-900/20';
};

const getCardGlowStyles = (status: string) => {
    const s = status.toLowerCase();
    // Using arbitrary values for a stronger, custom glow effect
    if (s === 'delivered') return 'shadow-[0_0_50px_-12px_rgba(34,197,94,0.7)] ring-2 ring-green-500/50';
    if (['exception', 'returned', 'failure'].some(bad => s.includes(bad))) return 'shadow-[0_0_50px_-12px_rgba(239,68,68,0.7)] ring-2 ring-red-500/50';
    return 'shadow-[0_0_50px_-12px_rgba(37,99,235,0.7)] ring-2 ring-blue-500/50';
};

export const TrackingResult = ({ data, role, onBack, showBackButton = true, onEditETA, onLinkOrder, onRefresh }: Props) => {
    const [refreshing, setRefreshing] = useState(false);
    const doRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try { await onRefresh(); } finally { setRefreshing(false); }
    };
    const statusColor = getStatusColor(data.status_detail);
    const carrierName = data.carrier_info?.name ?? data.courier_slug;
    const { order_references: refs, shipment_grouping: grouping, logistics_eta: eta } = data;
    const courierLink = data.data_source === 'manual'
        ? null
        : getCourierLink(data.carrier_info?.slug ?? data.courier_slug, data.tracking_number);

    const canEdit = role ? canEditLogistics(role) : false;
    const showAdjustedEta = role ? canSeeAdjustedEta(role, eta?.reviewed) : false;
    const isLogisticsView = role === 'logistics' || role === 'admin';

    // Compute estimated arrival including customs if logistics ETA exists
    const estimatedArrivalWithCustoms = (() => {
        if (!eta?.total_additional_weeks || !data.eta) return eta?.estimated_arrival;
        if (eta.estimated_arrival) return eta.estimated_arrival;
        const base = new Date(data.eta);
        if (!isValid(base)) return undefined;
        return addWeeks(base, eta.total_additional_weeks).toISOString();
    })();

    return (
        <div className="w-full px-4 pb-12">
            {showBackButton && onBack && (
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
                >
                    <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Track another shipment</span>
                </button>
            )}

            <div className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ${getCardGlowStyles(data.status_detail)}`}>
                {/* Header Section */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 sm:p-8 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Tracking Number</p>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-bold tracking-tight font-mono">{data.tracking_number}</h2>
                                {grouping && grouping.shipment_index != null && grouping.shipment_total != null && (
                                    <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-semibold border border-white/10">
                                        Shipment {grouping.shipment_index} of {grouping.shipment_total}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {onRefresh && data.data_source !== 'manual' && (
                                <button
                                    onClick={doRefresh}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors disabled:opacity-60"
                                    title="Traer el último estado del courier ahora"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                    {refreshing ? 'Updating…' : 'Update now'}
                                </button>
                            )}
                            {eta != null && isLogisticsView && (
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    eta.reviewed
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                    {eta.reviewed ? (
                                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Reviewed</span>
                                    ) : (
                                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Pending Review</span>
                                    )}
                                </span>
                            )}
                            {eta != null && !isLogisticsView && eta.reviewed && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Logistics Reviewed</span>
                                </span>
                            )}
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 ${statusColor}`}>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                </span>
                                {data.status_detail}
                            </div>
                        </div>
                    </div>

                    {/* Order References Row */}
                    {refs && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {refs.sales_order && (
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-mono border border-white/10">
                                    SO: {refs.sales_order}
                                </span>
                            )}
                            {refs.purchase_order && (
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-mono border border-white/10">
                                    PO: {refs.purchase_order}
                                </span>
                            )}
                            {refs.order_confirmation && (
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-mono border border-white/10">
                                    OC: {refs.order_confirmation}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Carrier</p>
                                <p className="font-medium text-lg capitalize">{carrierName}</p>
                                {data.data_source === 'email' && (
                                    <p className="text-amber-400 text-xs mt-1">Data from shipping notification</p>
                                )}
                                {data.data_source === 'manual' && (
                                    <p className="text-cyan-400 text-xs mt-1">Maritime — manual / forwarder</p>
                                )}
                                {data.carrier_info?.phone && (
                                    <p className="text-gray-400 text-xs">{data.carrier_info.phone}</p>
                                )}
                                {courierLink && (
                                    <a
                                        href={courierLink.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition-colors"
                                        title={courierLink.official ? `Track on ${carrierName}` : 'Track via ParcelsApp (auto-detect)'}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        {courierLink.official ? `Track on ${carrierName}` : 'Track live'}
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Carrier ETA</p>
                                <p className="font-medium text-lg">{formatEta(data.eta)}</p>
                                {estimatedArrivalWithCustoms && showAdjustedEta && (
                                    <div className="mt-1">
                                        <p className="text-amber-400 text-xs uppercase tracking-wider font-semibold">
                                            {isLogisticsView ? 'Est. w/ Customs' : 'Logistics-Adjusted ETA'}
                                        </p>
                                        <p className="font-medium text-amber-400">{formatEta(estimatedArrivalWithCustoms)}</p>
                                    </div>
                                )}
                                {estimatedArrivalWithCustoms && !showAdjustedEta && !isLogisticsView && (
                                    <p className="text-amber-400/60 text-xs mt-1 italic">Pending logistics review</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                <MapPin className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Last Location</p>
                                <p className="font-medium text-lg truncate max-w-[150px] text-blue-600" title={data.last_location}>
                                    {data.last_location}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons — only for logistics/admin */}
                    {canEdit && (onEditETA || onLinkOrder) && (
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-2">
                            {onLinkOrder && (
                                <button
                                    onClick={onLinkOrder}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    <Link2 className="w-4 h-4" />
                                    Link Order
                                </button>
                            )}
                            {onEditETA && (
                                <button
                                    onClick={onEditETA}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit Logistics ETA
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Timeline Section */}
                <div className="p-6 sm:p-8 bg-white">
                    <h3 className="text-lg font-bold from-gray-900 mb-6 flex items-center gap-2">
                        <Box className="w-5 h-5 text-blue-600" />
                        Shipment Progress
                    </h3>
                    <Timeline checkpoints={data.raw_checkpoints} />
                </div>
            </div>
        </div>
    );
};
