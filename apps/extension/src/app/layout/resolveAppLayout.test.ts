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
            width: 520,
            height: 320,
            minWidth: 350,
            maxWidth: 520,
            minHeight: 320,
            maxHeight: 700,
            resize: 'both',
            remember: 'both',
        });
    });

    it('allows a fixed route to be smaller than the normal popup minimum', () => {
        const layout = resolveAppLayout({
            surface: 'popup',
            rememberedPopupSize: { width: 400, height: 520 },
            routeLayout: {
                popup: {
                    width: 320,
                    height: 'auto',
                    resize: false,
                },
            },
        });

        expect(layout.viewport.kind).toBe('popup');
        if (layout.viewport.kind !== 'popup') return;

        expect(layout.viewport.width).toBe(320);
        expect(layout.viewport.height).toBe('auto');
        expect(layout.viewport.resize).toBe(false);
        expect(layout.viewport.remember).toBe(false);
    });

    it('uses route-specific bounds without remembering them as the normal size', () => {
        const layout = resolveAppLayout({
            surface: 'popup',
            rememberedPopupSize: { width: 500, height: 650 },
            routeLayout: {
                popup: {
                    minWidth: 380,
                    maxWidth: 440,
                },
            },
        });

        expect(layout.viewport.kind).toBe('popup');
        if (layout.viewport.kind !== 'popup') return;

        expect(layout.viewport.width).toBe(440);
        expect(layout.viewport.remember).toBe('vertical');
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
