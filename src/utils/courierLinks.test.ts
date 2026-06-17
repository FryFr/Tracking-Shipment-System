import { describe, it, expect } from 'vitest';
import { guessCourier } from './courierLinks';

describe('guessCourier', () => {
    it('detecta couriers de Dynapro por formato', () => {
        expect(guessCourier('1Z6577986868461909')).toBe('ups');
        expect(guessCourier('N70316470')).toBe('gls canada');
        expect(guessCourier('335768407058')).toBe('purolator');
        expect(guessCourier('335771363876')).toBe('purolator');
    });
    it('devuelve vacío cuando no hay pista clara', () => {
        expect(guessCourier('')).toBe('');
        expect(guessCourier('SO19443')).toBe('');
    });
});
