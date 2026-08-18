import { describe, expect, it } from 'vitest';

import { resolveBrowserCapabilities } from './capabilities';

describe('resolveBrowserCapabilities', () => {
    it('reports a programmatically openable native sidebar', () => {
        expect(
            resolveBrowserCapabilities({
                sidebarApis: {
                    sidePanelOpen: async () => undefined,
                },
                documentPictureInPicture: false,
            })
        ).toEqual({
            sidebar: true,
            programmaticSidebarOpen: true,
            documentPictureInPicture: false,
        });
    });

    it('reports Opera sidebar availability without programmatic open', () => {
        expect(
            resolveBrowserCapabilities({
                sidebarApis: { operaSidebarPresent: true },
                documentPictureInPicture: true,
            })
        ).toEqual({
            sidebar: true,
            programmaticSidebarOpen: false,
            documentPictureInPicture: true,
        });
    });

    it('reports Safari or other no-sidebar environments cleanly', () => {
        expect(
            resolveBrowserCapabilities({
                sidebarApis: {},
                documentPictureInPicture: false,
            })
        ).toEqual({
            sidebar: false,
            programmaticSidebarOpen: false,
            documentPictureInPicture: false,
        });
    });
});
