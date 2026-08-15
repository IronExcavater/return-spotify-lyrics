import { Button } from '@return-spotify-lyrics/ui/Button';
import { Slider } from '@return-spotify-lyrics/ui/Slider';

import { useSurface } from '@/app/surface/SurfaceProvider';
import { setActiveBar } from '@/state/app.store';

export function HomePage() {
    const surface = useSurface();

    return (
        <section className="mx-auto flex max-w-2xl flex-col gap-6 p-5">
            <div>
                <h1 className="text-2xl font-semibold">Home</h1>
                <p className="mt-1 text-sm text-text-muted">Shared app running in the {surface} surface.</p>
            </div>
            <div className="rounded-panel border border-border bg-surface p-4">
                <h2 className="font-medium">Foundation</h2>
                <p className="mt-1 text-sm text-text-muted">Routing, surface layout, persistence, TanStack state and Base UI are ready for feature work.</p>
            </div>
            <Button className="self-start" onClick={() => setActiveBar('playback')}>Show player bar</Button>
            <label className="flex max-w-xs flex-col gap-2 text-sm text-text-muted">Example slider<Slider label="Example volume" defaultValue={65} /></label>
        </section>
    );
}
