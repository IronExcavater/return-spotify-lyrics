import { useCallback, useMemo } from 'react';
import { sendSpotifyMessage } from '../../shared/messaging';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../shared/types';

const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};

const addUrisToQueue = async (uris: string[]) => {
    for (const uri of uris) {
        if (!uri) continue;
        await sendSpotifyMessage('addToQueue', uri);
    }
};

const addAlbumToQueue = async (albumId: string) => {
    let offset = 0;
    const limit = 50;
    while (true) {
        const page = await sendSpotifyMessage('getAlbumTracks', {
            id: albumId,
            limit,
            offset,
        });
        const uris = page.items.map((track) => track.uri).filter(Boolean);
        await addUrisToQueue(uris);
        if (!page.next || page.items.length === 0) break;
        offset += page.items.length;
    }
};

const addPlaylistToQueue = async (playlistId: string) => {
    let offset = 0;
    const limit = 50;
    while (true) {
        const page = await sendSpotifyMessage('getPlaylistItems', {
            id: playlistId,
            limit,
            offset,
        });
        const uris = page.items
            .map((entry) => entry.track?.uri)
            .filter(Boolean) as string[];
        await addUrisToQueue(uris);
        if (!page.next || page.items.length === 0) break;
        offset += page.items.length;
    }
};

export const buildMediaActions = (item: MediaItem): MediaActionGroup => {
    const primary: MediaAction[] = [];
    const secondary: MediaAction[] = [];

    const isPlayableItem =
        item.kind === 'track' || item.kind === 'episode' || !item.kind;
    const isContextItem =
        item.kind === 'album' ||
        item.kind === 'show' ||
        item.kind === 'playlist';

    if (item.uri) {
        if (isPlayableItem) {
            primary.push({
                id: 'play-now',
                label: 'Play now',
                shortcut: '↵',
                onSelect: () => {
                    void sendSpotifyMessage('startPlayback', {
                        uris: [item.uri!],
                    });
                },
            });
            primary.push({
                id: 'add-queue',
                label: 'Add to queue',
                shortcut: 'Q',
                onSelect: () => {
                    void sendSpotifyMessage('addToQueue', item.uri!);
                },
            });
        } else if (isContextItem) {
            primary.push({
                id: 'play-now',
                label: 'Play now',
                shortcut: '↵',
                onSelect: () => {
                    void sendSpotifyMessage('startPlayback', {
                        contextUri: item.uri!,
                    });
                },
            });
            if (item.kind === 'album' && item.id) {
                primary.push({
                    id: 'add-queue',
                    label: 'Add to queue',
                    shortcut: 'Q',
                    onSelect: () => {
                        void addAlbumToQueue(item.id!);
                    },
                });
            }
            if (item.kind === 'playlist' && item.id) {
                primary.push({
                    id: 'add-queue',
                    label: 'Add to queue',
                    shortcut: 'Q',
                    onSelect: () => {
                        void addPlaylistToQueue(item.id!);
                    },
                });
            }
        }
    }

    if (item.externalUrl) {
        secondary.push({
            id: 'open-spotify',
            label: 'Open in Spotify',
            shortcut: 'O',
            onSelect: () => openExternal(item.externalUrl!),
        });
    }

    if (item.artistUrl && item.artistUrl !== item.externalUrl) {
        secondary.push({
            id: 'open-artist',
            label: 'Go to artist',
            shortcut: 'A',
            onSelect: () => openExternal(item.artistUrl!),
        });
    }

    return { primary, secondary };
};

export const flattenMediaActions = (
    actions?: MediaActionGroup | null
): MediaAction[] => (actions ? [...actions.primary, ...actions.secondary] : []);

export const useMediaActions = (item?: MediaItem | null) =>
    useMemo(
        () => (item ? buildMediaActions(item) : { primary: [], secondary: [] }),
        [item]
    );

const shortcutMatches = (shortcut: string, event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (shortcut === '↵') return event.key === 'Enter';
    return event.key.toLowerCase() === shortcut.toLowerCase();
};

export const createMediaActionShortcutHandler =
    (actions: MediaAction[]) => (event: KeyboardEvent) => {
        const action = actions.find(
            (item) => item.shortcut && shortcutMatches(item.shortcut, event)
        );
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        action.onSelect();
    };

export const useMediaActionShortcuts = (actions: MediaAction[]) =>
    useCallback(createMediaActionShortcutHandler(actions), [actions]);
