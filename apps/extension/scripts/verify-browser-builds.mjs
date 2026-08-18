import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const targets = ['chrome', 'edge', 'firefox', 'opera', 'safari'];
const root = process.cwd();

function outputDir(browser) {
    return path.join(root, '.output', `${browser}-mv3`);
}

async function assertFile(filePath, label) {
    try {
        await access(filePath);
    } catch {
        throw new Error(`${label}: missing ${path.relative(root, filePath)}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function readManifest(browser) {
    const manifestPath = path.join(outputDir(browser), 'manifest.json');
    await assertFile(manifestPath, browser);
    return JSON.parse(await readFile(manifestPath, 'utf8'));
}

for (const browser of targets) {
    const dir = outputDir(browser);
    const manifest = await readManifest(browser);

    assert(
        manifest.manifest_version === 3,
        `${browser}: expected manifest_version 3`
    );
    await assertFile(path.join(dir, 'popup.html'), browser);

    if (browser === 'safari') {
        assert(!manifest.side_panel, 'safari: side_panel must not be declared');
        assert(
            !manifest.sidebar_action,
            'safari: sidebar_action must not be declared'
        );
        continue;
    }

    await assertFile(path.join(dir, 'sidepanel.html'), browser);

    if (browser === 'firefox' || browser === 'opera') {
        assert(
            manifest.sidebar_action?.default_panel === 'sidepanel.html',
            `${browser}: expected sidebar_action.default_panel to be sidepanel.html`
        );
    } else {
        assert(
            manifest.side_panel?.default_path === 'sidepanel.html',
            `${browser}: expected side_panel.default_path to be sidepanel.html`
        );
    }

    if (browser === 'opera') {
        assert(!manifest.side_panel, 'opera: side_panel must not be declared');
    }
}

console.log('Verified Chrome, Edge, Firefox, Opera, and Safari MV3 builds.');
