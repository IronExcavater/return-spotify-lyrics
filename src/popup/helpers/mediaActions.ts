import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';

export type MediaAction = {
    id: string;
    label: string;
    shortcut?: string;
    onSelect: () => void;
};

export type MediaActionGroup = {
    primary: MediaAction[];
    secondary: MediaAction[];
};

const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
};

export const buildMediaActions = (item: MediaItem): MediaActionGroup => {
    const primary: MediaAction[] = [];
    const secondary: MediaAction[] = [];

    const canQueue =
        item.kind === 'track' || item.kind === 'episode' || !item.kind;

    if (item.uri && canQueue) {
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
