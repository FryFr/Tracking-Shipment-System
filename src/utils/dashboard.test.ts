import { describe, it, expect } from 'vitest';
import { groupByOrder, applyFilters, realEta } from './dashboard';
import type { TrackingData } from '../types/tracking';

const mk = (o: Partial<TrackingData>): TrackingData => ({
    tracking_number: 't', courier_slug: 'ups', status: 'transit', status_detail: '',
    last_location: '', last_update: '', eta: '', raw_checkpoints: [], ...o,
});

describe('groupByOrder', () => {
    it('agrupa por sales_order (fallback PO/OC, luego sin orden)', () => {
        const items = [
            mk({ tracking_number: 'a', order_references: { sales_order: 'SO1' } }),
            mk({ tracking_number: 'b', order_references: { sales_order: 'SO1' } }),
            mk({ tracking_number: 'c', order_references: { purchase_order: 'PO9' } }),
            mk({ tracking_number: 'd' }),
        ];
        const groups = groupByOrder(items);
        expect(groups.find((g) => g.key === 'SO1')?.items).toHaveLength(2);
        expect(groups.find((g) => g.key === 'PO9')?.items).toHaveLength(1);
        expect(groups.find((g) => g.key === '—')?.items).toHaveLength(1);
        expect(groups[groups.length - 1].key).toBe('—');
    });
});

describe('applyFilters', () => {
    const items = [
        mk({ tracking_number: 'a', status: 'delivered', courier_slug: 'ups' }),
        mk({ tracking_number: 'b', status: 'transit', courier_slug: 'estes' }),
    ];
    it('activos por defecto excluye delivered', () => {
        expect(applyFilters(items, { text: '', status: '', courier: '', showDelivered: false })).toHaveLength(1);
    });
    it('texto matchea tracking', () => {
        expect(applyFilters(items, { text: 'a', status: '', courier: '', showDelivered: true })).toHaveLength(1);
    });
    it('filtra por courier', () => {
        expect(applyFilters(items, { text: '', status: '', courier: 'estes', showDelivered: true })).toHaveLength(1);
    });
});

describe('realEta', () => {
    it('usa estimated_arrival si existe', () => {
        expect(realEta(mk({ logistics_eta: { estimated_arrival: '2026-07-09T00:00:00Z' } }))).toBe('2026-07-09T00:00:00Z');
    });
    it('suma semanas al eta del courier', () => {
        const r = realEta(mk({ eta: '2026-06-25T00:00:00Z', logistics_eta: { total_additional_weeks: 2 } }));
        expect(r?.startsWith('2026-07-09')).toBe(true);
    });
    it('null si no hay datos de logística', () => {
        expect(realEta(mk({ eta: '2026-06-25T00:00:00Z' }))).toBeNull();
    });
});
