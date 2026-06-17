import { describe, it, expect } from 'vitest';
import { statusBucket, statusChipClasses } from './status';

describe('statusBucket', () => {
    it('mapea estados crudos a buckets', () => {
        expect(statusBucket('delivered')).toBe('delivered');
        expect(statusBucket('transit')).toBe('transit');
        expect(statusBucket('InTransit')).toBe('transit');
        expect(statusBucket('pending')).toBe('pending');
        expect(statusBucket('exception')).toBe('attention');
        expect(statusBucket('')).toBe('pending');
    });
});

describe('statusChipClasses', () => {
    it('devuelve clases para cada bucket', () => {
        expect(statusChipClasses('delivered')).toContain('emerald');
        expect(statusChipClasses('transit')).toContain('blue');
    });
});
