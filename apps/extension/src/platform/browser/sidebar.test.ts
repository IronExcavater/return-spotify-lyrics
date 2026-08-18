import { describe, expect, it, vi } from 'vitest';

import {
    openSidebar,
    resolveSidebarCapability,
    type SidebarApis,
} from './sidebar';

describe('resolveSidebarCapability', () => {
    it('prefers Chromium sidePanel when programmatic open is available', () => {
        const capability = resolveSidebarCapability({
            sidePanelOpen: vi.fn(async () => undefined),
            sidebarActionOpen: vi.fn(async () => undefined),
            operaSidebarPresent: true,
        });

        expect(capability).toEqual({
            implementation: 'chromium',
            available: true,
            programmaticOpen: true,
        });
    });

    it('detects Firefox sidebarAction programmatic open', () => {
        const capability = resolveSidebarCapability({
            sidebarActionOpen: vi.fn(async () => undefined),
        });

        expect(capability).toEqual({
            implementation: 'firefox',
            available: true,
            programmaticOpen: true,
        });
    });

    it('represents Opera sidebar support without inventing programmatic open', () => {
        const capability = resolveSidebarCapability({
            operaSidebarPresent: true,
        });

        expect(capability).toEqual({
            implementation: 'opera',
            available: true,
            programmaticOpen: false,
        });
    });

    it('represents browsers without a native sidebar', () => {
        expect(resolveSidebarCapability({})).toEqual({
            implementation: 'none',
            available: false,
            programmaticOpen: false,
        });
    });
});

describe('openSidebar', () => {
    it('opens the Chromium side panel through the injected API', async () => {
        const sidePanelOpen = vi.fn(async () => undefined);
        const apis: SidebarApis = { sidePanelOpen };

        await expect(openSidebar(apis)).resolves.toEqual({
            status: 'opened',
            implementation: 'chromium',
        });
        expect(sidePanelOpen).toHaveBeenCalledOnce();
    });

    it('opens the Firefox sidebar through the injected API', async () => {
        const sidebarActionOpen = vi.fn(async () => undefined);
        const apis: SidebarApis = { sidebarActionOpen };

        await expect(openSidebar(apis)).resolves.toEqual({
            status: 'opened',
            implementation: 'firefox',
        });
        expect(sidebarActionOpen).toHaveBeenCalledOnce();
    });

    it('returns a manual result for Opera', async () => {
        await expect(
            openSidebar({ operaSidebarPresent: true })
        ).resolves.toEqual({
            status: 'manual',
            implementation: 'opera',
        });
    });

    it('returns unsupported when no sidebar API exists', async () => {
        await expect(openSidebar({})).resolves.toEqual({
            status: 'unsupported',
            implementation: 'none',
        });
    });
});
