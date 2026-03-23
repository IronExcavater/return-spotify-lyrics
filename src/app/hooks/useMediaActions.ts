import { useCallback, useMemo } from 'react';
import { Link2Icon } from '@radix-ui/react-icons';
import { RiSpotifyFill } from 'react-icons/ri';

import { sendSpotifyMessage } from '../../shared/messaging';
import type {
    MediaAction,
    MediaActionGroup,
    MediaItem,
} from '../../shared/types';
import { canManageTrackPlaylists } from '../data/playlistStore';
import { showToast } from '../data/toastStore';
import { updateCachedAssumedNowPlaying } from './mediaCacheEntries';

const ENTER_SHORTCUT = 'Enter';

const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};

const copyLink = (url: string) => {
    const request = navigator.clipboard?.writeText(url);
    if (!request) {
        showToast({
            title: 'Could not copy link',
            tone: 'danger',
        });
        return;
    }

    void request.then(
        () =>
            showToast({
                title: 'Link copied',
                tone: 'success',
            }),
        () =>
            showToast({
                title: 'Could not copy link',
                tone: 'danger',
            })
    );
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

export const TRACK_PLAYLISTS_ACTION_ID = 'choose-playlists';
const TRACK_PLAYLISTS_ACTION_LABEL = 'Choose playlists';
const openTrackPlaylists = () => undefined;

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target.closest('[contenteditable="true"]')) return true;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
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
                shortcut: ENTER_SHORTCUT,
                onSelect: () => {
                    updateCachedAssumedNowPlaying(item);
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
                shortcut: ENTER_SHORTCUT,
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

    if (canManageTrackPlaylists(item)) {
        primary.push({
            id: TRACK_PLAYLISTS_ACTION_ID,
            label: TRACK_PLAYLISTS_ACTION_LABEL,
            shortcut: 'P',
            onSelect: openTrackPlaylists,
        });
    }

    if (item.externalUrl) {
        secondary.push({
            id: 'copy-link',
            label: 'Copy link',
            tooltip: 'Copy link',
            shortcut: 'L',
            icon: Link2Icon,
            presentation: 'icon',
            onSelect: () => {
                copyLink(item.externalUrl!);
            },
        });
        secondary.push({
            id: 'open-spotify',
            label: 'Open in Spotify',
            tooltip: 'Spotify',
            shortcut: 'O',
            icon: RiSpotifyFill,
            presentation: 'icon',
            onSelect: () => openExternal(item.externalUrl!),
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
    if (shortcut === ENTER_SHORTCUT) return event.key === 'Enter';
    return event.key.toLowerCase() === shortcut.toLowerCase();
};

export const createMediaActionShortcutHandler =
    (actions: MediaAction[]) => (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return;
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
