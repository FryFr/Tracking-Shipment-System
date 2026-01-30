import { format, isValid } from 'date-fns';
import { MapPin, Truck, Package, CheckCircle2, Clock } from 'lucide-react';
import type { Checkpoint } from '../types/tracking';
import { clsx } from 'clsx';

interface Props {
    checkpoints: Checkpoint[];
}

export const Timeline = ({ checkpoints }: Props) => {
    // Sort checkpoints by time (newest first)
    const sortedCheckpoints = [...checkpoints].sort((a, b) =>
        new Date(b.checkpoint_time).getTime() - new Date(a.checkpoint_time).getTime()
    );

    const getIcon = (tag: string) => {
        switch (tag.toLowerCase()) {
            case 'delivered': return CheckCircle2;
            case 'intransit': return Truck;
            case 'pickedup': return Package;
            case 'exception': return Clock;
            default: return MapPin;
        }
    };

    return (
        <div className="relative pl-4 sm:pl-6 space-y-8">
            {/* Vertical line */}
            <div className="absolute left-6 sm:left-8 top-2 bottom-2 w-0.5 bg-gray-200" />

            {sortedCheckpoints.map((checkpoint, index) => {
                const Icon = getIcon(checkpoint.tag || 'InTransit');
                const isFirst = index === 0;

                return (
                    <div key={index} className="relative flex gap-6 group">
                        <div className={clsx(
                            "absolute left-0 p-1.5 rounded-full border-4 z-10 transition-colors duration-300",
                            isFirst
                                ? "bg-blue-600 border-blue-100 shadow-lg shadow-blue-200"
                                : "bg-gray-100 border-white text-gray-400"
                        )}>
                            <Icon className={clsx("w-5 h-5", isFirst ? "text-white" : "text-gray-400")} />
                        </div>

                        <div className="flex-1 ml-8 sm:ml-10 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                                <span className={clsx("font-semibold text-lg", isFirst ? "text-blue-600" : "text-gray-900")}>
                                    {checkpoint.message}
                                </span>
                                <time className="text-sm text-gray-500 font-medium">
                                    {isValid(new Date(checkpoint.checkpoint_time))
                                        ? format(new Date(checkpoint.checkpoint_time), 'MMM d, yyyy - HH:mm')
                                        : checkpoint.checkpoint_time}
                                </time>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <MapPin className="w-4 h-4" />
                                <span>
                                    {checkpoint.location || checkpoint.city || 'Location not available'}
                                    {checkpoint.country_region_name ? `, ${checkpoint.country_region_name}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
