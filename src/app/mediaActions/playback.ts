import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaAction, MediaItem } from '../../shared/types';
import {
    addAlbumToQueue,
    addPlaylistToQueue,
} from '../features/playlists/management';
import { updateCachedAssumedNowPlaying } from '../hooks/mediaCacheEntries';

type PlaybackActionOptions = {
    premiumPlaybackBlocked: boolean;
};

export function playHeroAction({
    fallback,
    playNowAction,
    premiumRequired,
}: {
    fallback: () => void;
    playNowAction?: MediaAction;
    premiumRequired: boolean;
}) {
    if (premiumRequired) return;

    if (playNowAction) {
        playNowAction.onSelect();
        return;
    }

    fallback();
}

export function buildPlaybackActions(
    item: MediaItem,
    { premiumPlaybackBlocked }: PlaybackActionOptions
): MediaAction[] {
    const uri = item.uri;
    if (!uri) return [];

    if (item.kind === 'track' || item.kind === 'episode' || !item.kind) {
        function playItem() {
            updateCachedAssumedNowPlaying(item);
            void sendSpotifyMessage('startPlayback', { uris: [uri!] });
        }

        function addItemToQueue() {
            void sendSpotifyMessage('addToQueue', uri);
        }

        return [
            buildPlayNowAction(premiumPlaybackBlocked, playItem),
            buildAddToQueueAction(premiumPlaybackBlocked, addItemToQueue),
        ];
    }

    if (item.kind === 'album') {
        const albumId = item.id;
        return buildContextPlaybackActions({
            uri,
            premiumPlaybackBlocked,
            addToQueue: albumId ? () => void addAlbumToQueue(albumId) : null,
        });
    }

    if (item.kind === 'playlist') {
        const playlistId = item.id;
        return buildContextPlaybackActions({
            uri,
            premiumPlaybackBlocked,
            addToQueue: playlistId
                ? () => void addPlaylistToQueue(playlistId)
                : null,
        });
    }

    if (item.kind === 'show') {
        return buildContextPlaybackActions({
            uri,
            premiumPlaybackBlocked,
            addToQueue: null,
        });
    }

    return [];
}

function buildContextPlaybackActions({
    addToQueue,
    premiumPlaybackBlocked,
    uri,
}: {
    addToQueue: (() => void) | null;
    premiumPlaybackBlocked: boolean;
    uri: string;
}): MediaAction[] {
    function playContext() {
        void sendSpotifyMessage('startPlayback', { contextUri: uri });
    }

    const actions: MediaAction[] = [
        buildPlayNowAction(premiumPlaybackBlocked, playContext),
    ];

    if (addToQueue) {
        actions.push(buildAddToQueueAction(premiumPlaybackBlocked, addToQueue));
    }

    return actions;
}

function buildPlayNowAction(
    premiumPlaybackBlocked: boolean,
    onSelect: () => void
): MediaAction {
    return {
        id: 'play-now',
        label: 'Play now',
        shortcut: 'Enter',
        disabled: premiumPlaybackBlocked,
        onSelect,
    };
}

function buildAddToQueueAction(
    premiumPlaybackBlocked: boolean,
    onSelect: () => void
): MediaAction {
    return {
        id: 'add-queue',
        label: 'Add to queue',
        shortcut: 'Q',
        disabled: premiumPlaybackBlocked,
        onSelect,
    };
}
