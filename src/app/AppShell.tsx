import { Outlet } from 'react-router';

import { AppBar } from './AppBar';
import { SurfaceViewport } from './layout/SurfaceViewport';
import { useAppLayout } from './layout/useAppLayout';

export function AppShell() {
    const layout = useAppLayout();

    return (
        <SurfaceViewport layout={layout}>
            <div className="flex h-full min-h-0 flex-col bg-app text-text">
                <AppBar policy={layout.bar} />
                <main className="min-h-0 flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </SurfaceViewport>
    );
}
