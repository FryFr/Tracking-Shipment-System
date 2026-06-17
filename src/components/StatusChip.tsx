import { statusChipClasses } from '../utils/status';

interface Props {
    status: string; // estado crudo (transit/delivered/...)
    label?: string; // texto a mostrar (default: el status)
    className?: string;
}

export const StatusChip = ({ status, label, className = '' }: Props) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusChipClasses(status)} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        {label ?? status}
    </span>
);
