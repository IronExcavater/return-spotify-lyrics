import { describe, expect, it, vi } from 'vitest';
import { composeRefs } from './ref';

type Element = { name: string };

describe('composeRefs', () => {
    const button: Element = { name: 'Shuffle play' };

    it('gives the element to every ref', () => {
        const own = { current: null as Element | null };
        const caller = vi.fn();
        composeRefs(own, caller)(button);
        expect(own.current).toBe(button);
        expect(caller).toHaveBeenCalledWith(button);
    });

    it('runs the cleanup that a callback ref returns when the element goes', () => {
        const cleanup = vi.fn();
        const caller = vi.fn(() => cleanup);
        composeRefs(caller)(button)();
        expect(cleanup).toHaveBeenCalledOnce();
        expect(caller).not.toHaveBeenCalledWith(null);
    });

    it('calls a callback ref with null when it returns no cleanup', () => {
        const caller = vi.fn();
        composeRefs(caller)(button)();
        expect(caller).toHaveBeenLastCalledWith(null);
    });

    it('clears an object ref when the element goes', () => {
        const own = { current: null as Element | null };
        composeRefs(own)(button)();
        expect(own.current).toBeNull();
    });

    it('skips a ref that is missing', () => {
        expect(() => composeRefs<Element>(undefined)(button)()).not.toThrow();
    });
});
