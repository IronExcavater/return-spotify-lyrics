import { sendSpotifyMessage } from '../../../../shared/messaging';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../../../shared/types';
import { updateCachedAssumedNowPlaying } from '../../../hooks/mediaCacheEntries';
import { buildMediaActions } from '../../../mediaActions';
import { duplicateAsPlaylistAndNotify } from '../../playlists/management';
import type { AlbumViewData, ArtistViewData, ShowViewData } from '../data';
import {
    buildMediaPlaybackRequest,
    playMediaHero,
    type MediaPlaybackRequest,
} from './playbackRequest';

type MediaViewActionInput = {
    albumData: AlbumViewData | null;
    artistData: ArtistViewData | null;
    artistUris: string[];
    heroItem?: MediaItem | null;
    premiumRequired: boolean;
    profileId?: string;
    resolvedSelectedId?: string;
    selectedId?: string;
    showData: ShowViewData | null;
};

export type MediaHeroActions = {
    canTogglePlayback: boolean;
    mergedHeroActions: MediaActionGroup | null;
    playbackRequest: MediaPlaybackRequest | null;
    playNowAction?: MediaAction;
};

export { playMediaHero };

export function buildMediaHeroActions({
    albumData,
    artistData,
    artistUris,
    heroItem,
    premiumRequired,
    profileId,
    resolvedSelectedId,
    selectedId,
    showData,
}: MediaViewActionInput): MediaHeroActions {
    const playbackRequest = buildMediaPlaybackRequest({
        albumData,
        artistData,
        artistUris,
        heroItem,
        resolvedSelectedId,
        selectedId,
        showData,
    });
    const heroActions = heroItem
        ? buildMediaActions(heroItem, {
              premiumPlaybackBlocked: premiumRequired,
          })
        : null;

    return {
        canTogglePlayback: artistData
            ? artistUris.length > 0 && !premiumRequired
            : Boolean(heroItem?.uri) && !premiumRequired,
        mergedHeroActions: mergeHeroActions(heroActions, {
            playPopularAction: buildPlayPopularAction({
                artistData,
                artistUris,
                premiumRequired,
            }),
            duplicateAlbumAction: buildDuplicateAlbumAction({
                albumData,
                profileId,
            }),
            playContextAction: buildPlayContextAction({
                heroItem,
                playbackRequest,
                premiumRequired,
            }),
        }),
        playbackRequest,
        playNowAction: heroActions?.primary.find(
            (action) => action.id === 'play-now'
        ),
    };
}

type ExtraHeroActions = {
    playPopularAction: MediaAction | null;
    duplicateAlbumAction: MediaAction | null;
    playContextAction: MediaAction | null;
};

function mergeHeroActions(
    baseActions: MediaActionGroup | null,
    {
        duplicateAlbumAction,
        playContextAction,
        playPopularAction,
    }: ExtraHeroActions
): MediaActionGroup | null {
    if (!baseActions) return null;

    return {
        primary: mergePrimaryActions(baseActions.primary, {
            playContextAction,
            playPopularAction,
        }),
        secondary: [
            ...baseActions.secondary,
            ...(duplicateAlbumAction ? [duplicateAlbumAction] : []),
        ],
    };
}

function mergePrimaryActions(
    actions: MediaAction[],
    {
        playContextAction,
        playPopularAction,
    }: Pick<ExtraHeroActions, 'playContextAction' | 'playPopularAction'>
) {
    const primary = [...actions];

    if (playContextAction) {
        const playNowIndex = primary.findIndex(
            (action) => action.id === 'play-now'
        );

        if (playNowIndex >= 0) {
            primary.splice(playNowIndex + 1, 0, playContextAction);
        } else {
            primary.unshift(playContextAction);
        }
    }

    if (playPopularAction) primary.unshift(playPopularAction);

    return primary;
}

function buildPlayContextAction({
    heroItem,
    playbackRequest,
    premiumRequired,
}: {
    heroItem?: MediaItem | null;
    playbackRequest: MediaPlaybackRequest | null;
    premiumRequired: boolean;
}): MediaAction | null {
    if (
        !heroItem ||
        (heroItem.kind !== 'track' && heroItem.kind !== 'episode') ||
        !playbackRequest ||
        !('contextUri' in playbackRequest) ||
        !playbackRequest.contextUri
    ) {
        return null;
    }

    return {
        id: 'play-context',
        label: `Play from ${getContextKindLabel(heroItem.parentKind)}`,
        disabled: premiumRequired,
        onSelect: () => {
            updateCachedAssumedNowPlaying(heroItem);
            void sendSpotifyMessage('startPlayback', playbackRequest);
        },
    };
}

function getContextKindLabel(kind: MediaItem['parentKind']) {
    switch (kind) {
        case 'album':
            return 'album';
        case 'playlist':
            return 'playlist';
        case 'show':
            return 'show';
        case 'audiobook':
            return 'audiobook';
        default:
            return 'context';
    }
}

function buildPlayPopularAction({
    artistData,
    artistUris,
    premiumRequired,
}: {
    artistData: ArtistViewData | null;
    artistUris: string[];
    premiumRequired: boolean;
}): MediaAction | null {
    if (!artistData || artistUris.length === 0) return null;

    return {
        id: 'play-popular',
        label: 'Play popular',
        shortcut: '↵',
        disabled: premiumRequired,
        onSelect: () => {
            void sendSpotifyMessage('startPlayback', { uris: artistUris });
        },
    };
}

function buildDuplicateAlbumAction({
    albumData,
    profileId,
}: {
    albumData: AlbumViewData | null;
    profileId?: string;
}): MediaAction | null {
    if (!albumData || !profileId) return null;

    return {
        id: 'duplicate-album-playlist',
        label: 'Duplicate as playlist',
        onSelect: () => {
            void duplicateAsPlaylistAndNotify({
                userId: profileId,
                source: {
                    kind: 'album',
                    id: albumData.album.id,
                    title: albumData.album.name,
                },
                toast: {
                    successTitle: 'Album duplicated as playlist',
                    errorTitle: 'Could not duplicate album',
                },
            });
        },
    };
}
