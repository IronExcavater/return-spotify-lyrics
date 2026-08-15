import { Outlet } from 'react-router';

import { Resizable } from '@return-spotify-lyrics/ui/Resizable';

import { AppBar } from './AppBar';
import { savePopupSize } from './layout/popupSizeStorage';
import { useAppLayout } from './layout/useAppLayout';

export function AppShell() {
    const layout = useAppLayout();

    const content = (
        <div className="flex h-full min-h-0 flex-col bg-app text-text">
            <AppBar policy={layout.bar} />
            <main className="min-h-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );

    const viewport = layout.viewport;
    if (viewport.kind !== 'popup') return content;

    return (
        <Resizable
            width={viewport.width}
            height={viewport.height}
            minWidth={viewport.minWidth}
            maxWidth={viewport.maxWidth}
            minHeight={viewport.minHeight}
            maxHeight={viewport.maxHeight}
            resize={viewport.resize}
            target="document"
            onChangeEnd={({ width, height }) => {
                void savePopupSize(width, height, viewport.remember);
            }}
        >
            {content}
        </Resizable>
    );
}
