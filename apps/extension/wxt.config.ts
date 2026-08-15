import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const icons = {
    16: 'icon/icon16.png',
    32: 'icon/icon32.png',
    48: 'icon/icon48.png',
    128: 'icon/icon128.png',
};

export default defineConfig({
    srcDir: 'src',
    imports: false,
    manifestVersion: 3,
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'Return Spotify Lyrics',
        description:
            'A Spotify companion extension for playback and synchronized lyrics.',
        permissions: ['identity', 'storage', 'sidePanel'],
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
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
