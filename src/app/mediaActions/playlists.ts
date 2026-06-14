import { canManageTrackPlaylists } from '../../shared/media';
import type { MediaAction, MediaItem } from '../../shared/types';

export const TRACK_PLAYLISTS_ACTION_ID = 'choose-playlists';

export function buildPlaylistMembershipActions(item: MediaItem): MediaAction[] {
    if (!canManageTrackPlaylists(item)) return [];

    return [
        {
            id: TRACK_PLAYLISTS_ACTION_ID,
            label: 'Choose playlists',
            shortcut: 'P',
            onSelect: () => {},
        },
    ];
}
