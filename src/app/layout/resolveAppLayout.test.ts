import { describe, expect, it } from 'vitest';

import { resolveAppLayout } from './resolveAppLayout';

describe('resolveAppLayout', () => {
    it('uses and clamps the remembered popup size for normal routes', () => {
        const layout = resolveAppLayout({
            surface: 'popup',
            rememberedPopupSize: { width: 999, height: 100 },
        });

        expect(layout.viewport).toEqual({
            kind: 'popup',
            size: { width: 520, height: 320 },
            range: {
                width: { min: 350, max: 520 },
                height: { min: 320, max: 700 },
            },
            resize: { width: true, height: true },
            persist: { width: true, height: true },
        });
    });

    it('allows a fixed route to be smaller than the normal popup minimum', () => {
        const layout = resolveAppLayout({
            surface: 'popup',
            rememberedPopupSize: { width: 400, height: 520 },
            routeLayout: {
                popup: {
                    size: { width: 320, height: 'auto' },
                    resize: { width: false, height: false },
                },
            },
        });

        expect(layout.viewport.kind).toBe('popup');
        if (layout.viewport.kind !== 'popup') return;

        expect(layout.viewport.size).toEqual({ width: 320, height: 'auto' });
        expect(layout.viewport.persist).toEqual({ width: false, height: false });
    });

    it('uses route-specific ranges without persisting them as the normal size', () => {
        const layout = resolveAppLayout({
            surface: 'popup',
            rememberedPopupSize: { width: 500, height: 650 },
            routeLayout: {
                popup: {
                    range: {
                        width: { min: 380, max: 440 },
                    },
                },
            },
        });

        expect(layout.viewport.kind).toBe('popup');
        if (layout.viewport.kind !== 'popup') return;

        expect(layout.viewport.size.width).toBe(440);
        expect(layout.viewport.persist.width).toBe(false);
        expect(layout.viewport.persist.height).toBe(true);
    });

    it('lets the browser own sidepanel dimensions', () => {
        const layout = resolveAppLayout({
            surface: 'sidepanel',
            rememberedPopupSize: { width: 400, height: 520 },
            routeLayout: { bar: 'playback' },
        });

        expect(layout).toEqual({
            surface: 'sidepanel',
            bar: 'playback',
            viewport: { kind: 'browser' },
        });
    });
});
