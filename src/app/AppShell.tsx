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
            size={layout.viewport.size}
            range={layout.viewport.range}
            resize={layout.viewport.resize}
            target="document"
            persistence={{
                storage: popupSizeStorage,
                dimensions: layout.viewport.persist,
            }}
        >
            {content}
        </Resizable>
    );
}
