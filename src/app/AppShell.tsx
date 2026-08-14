import { Outlet } from 'react-router';

import { Resizable } from '@/ui/Resizable';

import { AppBar } from './AppBar';
import { popupSizeStorage } from './layout/popupSizeStorage';
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

    if (layout.viewport.kind !== 'popup') return content;

    return (
        <Resizable
            width={layout.viewport.width}
            height={layout.viewport.height}
            minWidth={layout.viewport.minWidth}
            maxWidth={layout.viewport.maxWidth}
            minHeight={layout.viewport.minHeight}
            maxHeight={layout.viewport.maxHeight}
            resize={layout.viewport.resize}
            target="document"
            storage={popupSizeStorage}
            remember={layout.viewport.remember}
        >
            {content}
        </Resizable>
    );
}
