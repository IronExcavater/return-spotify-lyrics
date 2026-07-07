import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
    manifest_version: 3,
    name: '__MSG_appName__',
    version: pkg.version,
    description: '__MSG_appDescription__',
    default_locale: 'en',
    icons: {
        16: 'public/icon/icon16.png',
        32: 'public/icon/icon32.png',
        48: 'public/icon/icon48.png',
        128: 'public/icon/icon128.png',
    },
    action: {
        default_icon: {
            16: 'public/icon/icon16.png',
            32: 'public/icon/icon32.png',
            48: 'public/icon/icon48.png',
            128: 'public/icon/icon128.png',
        },
        default_title: '__MSG_appName__',
        default_popup: 'popup.html',
    },
    side_panel: {
        default_path: 'sidepanel.html',
    },
    background: {
        service_worker: 'src/background/background.ts',
        type: 'module',
    },
    permissions: ['identity', 'storage', 'sidePanel'],
});
