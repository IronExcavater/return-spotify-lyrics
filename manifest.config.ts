import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
    manifest_version: 3,
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
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
        default_popup: 'src/popup/popup.html',
    },
    background: {
        service_worker: 'src/background/background.ts',
        type: 'module',
    },
    permissions: ['identity', 'storage'],
});
