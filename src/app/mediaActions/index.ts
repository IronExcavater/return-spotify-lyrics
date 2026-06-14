import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
    MediaPrimaryAction,
} from '../../shared/types';
import { buildPlaybackActions, playHeroAction } from './playback';
import {
    buildPlaylistMembershipActions,
    TRACK_PLAYLISTS_ACTION_ID,
} from './playlists';
import { buildSharingActions } from './sharing';

export { TRACK_PLAYLISTS_ACTION_ID, playHeroAction };

type BuildMediaActionsOptions = {
    premiumPlaybackBlocked: boolean;
};

export function buildMediaActions(
    item: MediaItem,
    { premiumPlaybackBlocked }: BuildMediaActionsOptions
): MediaActionGroup {
    return {
        primary: [
            ...buildPlaybackActions(item, { premiumPlaybackBlocked }),
            ...buildPlaylistMembershipActions(item),
        ],
        secondary: buildSharingActions(item),
    };
}

export function flattenMediaActions(
    actions?: MediaActionGroup | null
): MediaAction[] {
    return actions ? [...actions.primary, ...actions.secondary] : [];
}

export function resolvePrimaryPlayAction(
    actions?: MediaActionGroup | null
): MediaPrimaryAction | undefined {
    const playNowAction = actions?.primary.find(
        (action) => action.id === 'play-now'
    );

    if (!playNowAction) return undefined;

    return {
        kind: 'play',
        label: playNowAction.label,
        onSelect: playNowAction.onSelect,
        disabled: playNowAction.disabled,
    };
}
