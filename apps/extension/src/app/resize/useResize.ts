import { useMatches } from 'react-router';

import type { Size } from '@return-spotify-lyrics/ui/geometry';

import type { AppRouteHandle, BarPolicy } from './types';

const DEFAULT_POPUP_SIZE: Size = { width: 360, height: 480 };

export default function useResize(): { bar: BarPolicy; popup: Size } {
    const matches = useMatches();
    const handle = matches.at(-1)?.handle as AppRouteHandle | undefined;

    return {
        bar: handle?.layout.bar ?? 'preserve',
        popup: handle?.layout.popup ?? DEFAULT_POPUP_SIZE,
    };
}
