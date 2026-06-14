import { useMemo } from 'react';

import type { MediaItem } from '../../shared/types';
import { usePremiumPlaybackBlocked } from '../data/playbackAccess';
import { buildMediaActions } from '../mediaActions';

export function useMediaActions(item?: MediaItem | null) {
    const premiumPlaybackBlocked = usePremiumPlaybackBlocked();

    return useMemo(
        () =>
            item
                ? buildMediaActions(item, { premiumPlaybackBlocked })
                : { primary: [], secondary: [] },
        [item, premiumPlaybackBlocked]
    );
}
