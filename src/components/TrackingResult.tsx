import { format, isValid } from 'date-fns';
import { ArrowLeft, Box, Calendar, MapPin, Truck } from 'lucide-react';
import type { TrackingData } from '../types/tracking';
import { Timeline } from './Timeline';

interface Props {
    data: TrackingData;
    onBack?: () => void;
    showBackButton?: boolean;
}

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

export const TrackingResult = ({ data, onBack, showBackButton = true }: Props) => {
    const statusColor = getStatusColor(data.status_detail);
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Tracking Number</p>
                            <h2 className="text-3xl font-bold tracking-tight font-mono">{data.tracking_number}</h2>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 ${statusColor}`}>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                            </span>
                            {data.status_detail}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-700">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Carrier</p>
                                <p className="font-medium text-lg capitalize">{data.courier_slug}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-700/50 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Estimated Delivery</p>
                                <p className="font-medium text-lg">
                                    {(() => {
                                        if (!data.eta) return 'Pending';
                                        const date = new Date(data.eta);
                                        return isValid(date) ? format(date, 'MMM d, yyyy') : data.eta;
                                    })()}
                                </p>
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
