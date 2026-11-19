import type { ReactNode } from 'react';

export const TRACKS = [
    { title: 'Glass Harbour', artist: 'Lumen Fields' },
    { title: 'Paper Satellites', artist: 'The Quiet Hours' },
    { title: 'Northern Static', artist: 'Ada Vale' },
    { title: 'Slow Orbit', artist: 'Marlow Coast' },
];

export const ICON_BUTTON =
    'grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-fast hover:bg-tint active:bg-shade aria-[current=page]:text-accent aria-pressed:text-accent';

type PlaceholderProps = {
    children: ReactNode;
};

/** A panel that stands in for real content inside a layout component. */
export function Placeholder({ children }: PlaceholderProps) {
    return (
        <div className="grid size-full place-items-center bg-raised p-4 text-center text-medium">
            {children}
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
            <main className="min-h-0 flex-1 overflow-y-auto p-3">
                {children}
            </main>
        </div>
    );
}
