import {
    getRuntimeSidebarApis,
    resolveSidebarCapability,
    type SidebarApis,
} from './sidebar';

export type BrowserCapabilities = {
    sidebar: boolean;
    programmaticSidebarOpen: boolean;
    documentPictureInPicture: boolean;
};

type CapabilityInputs = {
    sidebarApis: SidebarApis;
    documentPictureInPicture: boolean;
};

export function resolveBrowserCapabilities({
    sidebarApis,
    documentPictureInPicture,
}: CapabilityInputs): BrowserCapabilities {
    const sidebar = resolveSidebarCapability(sidebarApis);

    return {
        sidebar: sidebar.available,
        programmaticSidebarOpen: sidebar.programmaticOpen,
        documentPictureInPicture,
    };
}

export function getBrowserCapabilities(): BrowserCapabilities {
    return resolveBrowserCapabilities({
        sidebarApis: getRuntimeSidebarApis(),
        documentPictureInPicture: 'documentPictureInPicture' in globalThis,
    });
}
