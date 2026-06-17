import { Search } from 'lucide-react';
import type { DashboardFilters } from '../utils/dashboard';

interface Props {
    filters: DashboardFilters;
    couriers: string[];
    onChange: (f: DashboardFilters) => void;
}

const ctrl = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40';

export const FiltersBar = ({ filters, couriers, onChange }: Props) => (
    <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
                value={filters.text}
                onChange={(e) => onChange({ ...filters, text: e.target.value })}
                placeholder="Buscar tracking, SO, PO, ubicación..."
                className={`${ctrl} w-full pl-9`}
            />
        </div>
        <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })} className={ctrl}>
            <option value="">Todos los estados</option>
            <option value="transit">In transit</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="attention">Attention</option>
        </select>
        <select value={filters.courier} onChange={(e) => onChange({ ...filters, courier: e.target.value })} className={ctrl}>
            <option value="">Todos los couriers</option>
            {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
                type="checkbox"
                checked={filters.showDelivered}
                onChange={(e) => onChange({ ...filters, showDelivered: e.target.checked })}
            />
            Ver entregados
        </label>
    </div>
);
