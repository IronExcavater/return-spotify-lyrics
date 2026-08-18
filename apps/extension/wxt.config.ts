import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const icons = {
    16: 'icon/icon16.png',
    32: 'icon/icon32.png',
    48: 'icon/icon48.png',
    128: 'icon/icon128.png',
};

const extensionName = 'Return Spotify Lyrics';

export default defineConfig({
    srcDir: 'src',
    imports: false,
    manifestVersion: 3,
    modules: ['@wxt-dev/module-react'],
    manifest: ({ browser }) => ({
        name: extensionName,
        description:
            'A Spotify companion extension for playback and synchronized lyrics.',
        permissions: [
            'storage',
            ...(browser === 'safari' ? [] : ['identity']),
            ...(browser === 'chrome' || browser === 'edge'
                ? ['sidePanel']
                : []),
        ],
        host_permissions: [
            'https://api.spotify.com/*',
            'https://lrclib.net/*',
            'https://identitytoolkit.googleapis.com/*',
            'https://securetoken.googleapis.com/*',
        ],
        icons,
        action: {
            default_icon: icons,
        },
    }),
    hooks: {
        'build:manifestGenerated': (wxt, manifest) => {
            const crossBrowserManifest = manifest as typeof manifest & {
                side_panel?: { default_path?: string };
                sidebar_action?: {
                    default_icon?: typeof icons;
                    default_title?: string;
                    default_panel: string;
                };
            };

            if (wxt.config.browser === 'opera') {
                delete crossBrowserManifest.side_panel;
                crossBrowserManifest.sidebar_action = {
                    default_icon: icons,
                    default_title: extensionName,
                    default_panel: 'sidepanel.html',
                };
            }

            if (wxt.config.browser === 'safari') {
                delete crossBrowserManifest.side_panel;
                delete crossBrowserManifest.sidebar_action;
            }
        },
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
