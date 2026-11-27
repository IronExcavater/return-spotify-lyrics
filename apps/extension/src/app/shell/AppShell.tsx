import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import clsx from 'clsx';

import ResizeBox from '@return-spotify-lyrics/ui/ResizeBox';
import TextProvider from '@return-spotify-lyrics/ui/TextProvider';
import TooltipProvider from '@return-spotify-lyrics/ui/TooltipProvider';
import type { Size } from '@return-spotify-lyrics/ui/geometry';

import { useSurface } from '../surface/SurfaceProvider';
import useResize from '../resize/useResize';
import AppBar from './AppBar';
import { popupSizeItem } from '@/storage/popup';
import useStorageState from '@/storage/useStorageState';

const MAX_POPUP_SIZE = { width: 800, height: 600 };
const MIN_POPUP_SIZE = { width: 320, height: 200 };

// The app uses a hash router, so a link that opens in a new tab needs the route after a hash.
function toHashHref(to: string) {
    return `#${to}`;
}

function syncPopupSize(width: number, height: number) {
    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;
}

export default function AppShell() {
    const surface = useSurface();
    const resize = useResize();
    const navigate = useNavigate();
    const [savedSize, setSavedSize] = useStorageState(
        popupSizeItem,
        resize.popup
    );
    // Storage saves the size once when a resize ends, not on each pointer move.
    const [dragSize, setDragSize] = useState<Size | null>(null);
    const size = dragSize ?? savedSize;

    // The popup window takes the document size. The browser sets the side panel size.
    useEffect(() => {
        if (surface !== 'popup') return;
        syncPopupSize(size.width, size.height);
    }, [surface, size.width, size.height]);

    const content = (
        <TextProvider navigate={navigate} resolveHref={toHashHref}>
            {/* One provider groups every tooltip, so the next one along a row opens at once. */}
            <TooltipProvider>
                <div
                    className={clsx(
                        'flex h-full min-h-0 flex-col',
                        surface === 'popup' && 'overflow-hidden'
                    )}
                >
                    <AppBar policy={resize.bar} />
                    {/* Safari can't scroll a region with the keyboard unless the region can take focus. */}
                    <main
                        tabIndex={0}
                        className="min-h-0 flex-1 overflow-y-auto"
                    >
                        <Outlet />
                    </main>
                </div>
            </TooltipProvider>
        </TextProvider>
    );

    if (surface !== 'popup') return content;

    return (
        <ResizeBox
            // The popup window takes its size from this box, and its page scrolls, so neither body nor page stops it.
            className="max-w-none contain-size"
            value={size}
            minSize={MIN_POPUP_SIZE}
            maxSize={MAX_POPUP_SIZE}
            edges={['left', 'bottom']}
            onValueChange={setDragSize}
            onValueCommitted={(next) => {
                setSavedSize(next);
                setDragSize(null);
            }}
        >
            {content}
        </ResizeBox>
    );
}
