import { Link2Icon } from '@radix-ui/react-icons';
import { RiSpotifyFill } from 'react-icons/ri';

import type { MediaAction, MediaItem } from '../../shared/types';
import { showToast } from '../data/toastStore';

export function buildSharingActions(item: MediaItem): MediaAction[] {
    const url = item.externalUrl;
    if (!url) return [];

    return [
        {
            id: 'copy-link',
            label: 'Copy link',
            tooltip: 'Copy link',
            shortcut: 'L',
            icon: Link2Icon,
            presentation: 'icon',
            onSelect: () => copyLink(url),
        },
        {
            id: 'open-spotify',
            label: 'Open in Spotify',
            tooltip: 'Spotify',
            shortcut: 'O',
            icon: RiSpotifyFill,
            presentation: 'icon',
            onSelect: () => openExternal(url),
        },
    ];
}

function openExternal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
}

function copyLink(url: string) {
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
}
