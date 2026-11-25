import type { ReactNode } from 'react';

import Text from '@return-spotify-lyrics/ui/Text';

export const TRACKS = [
    { title: 'Glass Harbour', artist: 'Lumen Fields' },
    { title: 'Paper Satellites', artist: 'The Quiet Hours' },
    { title: 'Northern Static', artist: 'Ada Vale' },
    { title: 'Slow Orbit', artist: 'Marlow Coast' },
];

type PlaceholderProps = {
    children: ReactNode;
};

/** A panel that stands in for real content inside a layout component. */
export function Placeholder({ children }: PlaceholderProps) {
    return (
        <div className="grid size-full place-items-center bg-raised p-4">
            <Text className="text-center">{children}</Text>
        </div>
    );
}

type SurfaceProps = {
    bar: ReactNode;
    children: ReactNode;
};

/** A popup-sized frame with an app bar, for stories that need the app around a component. */
export function Surface({ bar, children }: SurfaceProps) {
    return (
        <div className="flex h-80 w-80 flex-col overflow-hidden rounded-medium border bg-default text-medium">
            <header className="flex h-14 shrink-0 items-center gap-1 border-b border-faint px-3">
                {bar}
            </header>
            {/* Safari can't scroll a region with the keyboard unless the region can take focus. */}
            <main tabIndex={0} className="min-h-0 flex-1 overflow-y-auto p-3">
                {children}
            </main>
        </div>
    );
}
