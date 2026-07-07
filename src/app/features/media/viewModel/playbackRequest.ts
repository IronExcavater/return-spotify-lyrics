import type { SpotifyRpcArgs } from '../../../../background/spotifyRpc';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import type { MediaAction, MediaItem } from '../../../../shared/types';
import { updateCachedAssumedNowPlaying } from '../../../hooks/mediaCacheEntries';
import { playHeroAction } from '../../../mediaActions';
import type { AlbumViewData, ArtistViewData, ShowViewData } from '../data';

export type MediaPlaybackRequest = SpotifyRpcArgs<'startPlayback'>;

export function buildMediaPlaybackRequest({
    albumData,
    artistData,
    artistUris,
    heroItem,
    resolvedSelectedId,
    selectedId,
    showData,
}: {
    albumData: AlbumViewData | null;
    artistData: ArtistViewData | null;
    artistUris: string[];
    heroItem?: MediaItem | null;
    resolvedSelectedId?: string;
    selectedId?: string;
    showData: ShowViewData | null;
}): MediaPlaybackRequest | null {
    if (!heroItem) return null;

    if (artistData) {
        return artistUris.length > 0 ? { uris: artistUris } : null;
    }

    if (albumData) {
        return buildContextPlaybackRequest({
            contextUri: albumData.album.uri ?? heroItem.uri,
            items: albumData.tracks,
            resolvedSelectedId,
            selectedId,
        });
    }

    if (showData) {
        return buildContextPlaybackRequest({
            contextUri: showData.show.uri ?? heroItem.uri,
            items: showData.episodes,
            resolvedSelectedId,
            selectedId,
        });
    }

    return heroItem.uri ? { uris: [heroItem.uri] } : null;
}

export function playMediaHero({
    heroItem,
    playbackRequest,
    playNowAction,
    premiumRequired,
}: {
    heroItem?: MediaItem | null;
    playbackRequest: MediaPlaybackRequest | null;
    playNowAction?: MediaAction;
    premiumRequired: boolean;
}) {
    playHeroAction({
        playNowAction,
        premiumRequired,
        fallback: () => {
            if (!heroItem || !playbackRequest) return;
            updateCachedAssumedNowPlaying(heroItem);
            void sendSpotifyMessage('startPlayback', playbackRequest);
        },
    });
}

function buildContextPlaybackRequest({
    contextUri,
    items,
    resolvedSelectedId,
    selectedId,
}: {
    contextUri?: string;
    items: Array<{ id?: string | null; uri?: string | null }>;
    resolvedSelectedId?: string;
    selectedId?: string;
}): MediaPlaybackRequest | null {
    if (!contextUri) return null;

    const currentSelectedId = resolvedSelectedId ?? selectedId;
    const selectedIndex =
        currentSelectedId != null
            ? items.findIndex(
                  (item) => (item.id ?? item.uri) === currentSelectedId
              )
            : -1;

    return {
        contextUri,
        offset: selectedIndex >= 0 ? { position: selectedIndex } : undefined,
    };
}
