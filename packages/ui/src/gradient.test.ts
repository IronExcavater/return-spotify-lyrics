import { describe, expect, it } from 'vitest';
import { easeGradient, easeStops, reverseEasing } from './gradient';

const stopsOf = (gradient: string) =>
    gradient.slice(gradient.indexOf('(') + 1, -1).split(/, (?![^(]*\))/);

describe('easeGradient', () => {
    it('leaves gradients without an easing unchanged', () => {
        const gradient = 'linear-gradient(to right, red, blue 40%)';
        expect(easeGradient(gradient)).toBe(gradient);
    });

    it('expands an easing into stops between 0% and 100%', () => {
        const stops = stopsOf(
            easeGradient(
                'linear-gradient(to bottom, black, ease-in-out, transparent)'
            )
        );

        expect(stops[0]).toBe('to bottom');
        expect(stops[1]).toBe('black 0%');
        expect(stops.at(-1)).toBe('transparent 100%');
        // ease-in-out is symmetric, so the halfway stop mixes the two colours equally.
        expect(stops).toContain(
            'color-mix(in oklab, transparent 50%, black) 50%'
        );

        const positions = stops
            .slice(1)
            .map((stop) => parseFloat(stop.split(' ').at(-1)!));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('draws steps as hard stops', () => {
        const stops = stopsOf(
            easeGradient('linear-gradient(red, steps(2), blue)')
        );

        expect(stops).toEqual([
            'red 0%',
            'red 50%',
            'color-mix(in oklab, blue 50%, red) 50%',
            'color-mix(in oklab, blue 50%, red) 100%',
            'blue 100%',
        ]);
    });

    it('keeps the radial shape and spreads unpositioned stops evenly', () => {
        const stops = stopsOf(
            easeGradient(
                'radial-gradient(circle at 0% 0%, red, green, linear, blue)'
            )
        );

        expect(stops).toEqual([
            'circle at 0% 0%',
            'red 0%',
            'green 50%',
            'blue 100%',
        ]);
    });
});

describe('easeStops', () => {
    it('expands a stop list and uses calc() when units differ', () => {
        const stops = easeStops(
            'transparent, ease-in-out, black var(--fade-size)'
        );

        expect(stops).toMatch(/^transparent 0%, /);
        expect(stops).toContain('calc(var(--fade-size) * 0.5)');
        expect(stops).toMatch(/, black var\(--fade-size\)$/);
    });
});

describe('reverseEasing', () => {
    it('swaps ease-in and ease-out and keeps symmetric curves', () => {
        expect(reverseEasing('ease-in')).toBe('ease-out');
        expect(reverseEasing('ease-out')).toBe('ease-in');
        expect(reverseEasing('ease-in-out')).toBe('ease-in-out');
    });

    it('mirrors cubic-bezier control points and step positions', () => {
        expect(reverseEasing('cubic-bezier(0.42, 0, 1, 1)')).toBe(
            'cubic-bezier(0, 0, 0.58, 1)'
        );
        expect(reverseEasing('steps(4)')).toBe('steps(4, jump-start)');
    });
});
