import clsx from 'clsx';

import type { MediaShelfOrientation } from './types';

export function ShelfFades({
    fade,
    orientation,
}: {
    fade: { start: boolean; end: boolean };
    orientation: MediaShelfOrientation;
}) {
    if (orientation === 'horizontal') {
        return (
            <>
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute top-0 left-0 z-10 h-full w-2 bg-linear-to-r to-transparent transition-opacity',
                        fade.start ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute top-0 right-0 z-10 h-full w-2 bg-linear-to-l to-transparent transition-opacity',
                        fade.end ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
            </>
        );
    }

    return (
        <>
            <div
                className={clsx(
                    'from-background via-background/60 pointer-events-none absolute top-0 right-0 left-0 z-10 h-2 bg-linear-to-b to-transparent transition-opacity',
                    fade.start ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden
            />
            <div
                className={clsx(
                    'from-background via-background/60 pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-2 bg-linear-to-t to-transparent transition-opacity',
                    fade.end ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden
            />
        </>
    );
}
