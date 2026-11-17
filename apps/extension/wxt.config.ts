import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type UserManifest } from 'wxt';

const name = 'Return Spotify Lyrics';
const description =
    'Synced Spotify lyrics and controls, one click from any tab.';

const icons = {
    16: 'icon/16.png',
    32: 'icon/32.png',
    48: 'icon/48.png',
    96: 'icon/96.png',
    128: 'icon/128.png',
};

const panel = 'panel.html';

const sidePanel: UserManifest = {
    permissions: ['storage', 'identity', 'sidePanel'],
    side_panel: { default_path: panel },
};

const sidebar: UserManifest = {
    permissions: ['storage', 'identity'],
    sidebar_action: {
        default_panel: panel,
        default_title: name,
        default_icon: icons,
    },
};

const firefox: UserManifest = {
    ...sidebar,
    browser_specific_settings: {
        gecko: {
            id: 'return-spotify-lyrics@extension',
            strict_min_version: '142.0',
            data_collection_permissions: { required: ['none'] },
        },
    },
};

// Safari has no side panel, no sidebar and no identity API.
const safari: UserManifest = {
    permissions: ['storage'],
};

const browserManifests: Record<string, UserManifest> = {
    chrome: sidePanel,
    edge: sidePanel,
    firefox,
    opera: sidebar,
    safari,
};

export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    srcDir: 'src',
    imports: false,
    manifestVersion: 3,
    zip: { name: 'return-spotify-lyrics' },
    manifest: ({ browser }) => ({
        name,
        description,
        icons,
        action: { default_icon: icons },
        ...browserManifests[browser],
    }),
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
