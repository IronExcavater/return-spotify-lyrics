import type { PlaybackState } from '@spotify/web-api-ts-sdk';

import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../../shared/analytics';

type PlaybackItem = NonNullable<PlaybackState['item']>;

const trackPlayback = createAnalyticsTracker('playback');
let lastPlayState: boolean | null = null;
let lastItemId: string | null = null;

export const playbackAnalytics = {
    stateSynced(isPlaying: boolean) {
        if (lastPlayState === isPlaying) return;
        lastPlayState = isPlaying;
        void trackPlayback(ANALYTICS_EVENTS.playbackState, {
            reason: 'playback state synced',
            data: { playing: isPlaying },
        });
    },

    itemChanged(item: PlaybackItem) {
        const itemId = item.id ?? item.uri ?? null;
        if (!itemId || lastItemId === itemId) return;

        lastItemId = itemId;
        const artists = 'artists' in item ? item.artists : undefined;
        const show = 'show' in item ? item.show : undefined;
        const names = artists?.map((artist) => artist.name) ?? [];
        if (!names.length && show?.name) names.push(show.name);

        void trackPlayback(ANALYTICS_EVENTS.playbackItem, {
            reason: 'playback item changed',
            data: {
                id: itemId,
                name: item.name,
                type: item.type,
                artists: names,
            },
        });
    },

    volumeAdjusted(volume: number) {
        void trackPlayback(ANALYTICS_EVENTS.playbackVolume, {
            reason: 'volume adjusted',
            data: { volume },
        });
    },

    muteChanged(muted: boolean) {
        void trackPlayback(ANALYTICS_EVENTS.playbackMute, {
            reason: muted ? 'muted playback' : 'unmuted playback',
            data: { muted },
        });
    },

    shuffleChanged(enabled: boolean) {
        void trackPlayback(ANALYTICS_EVENTS.playbackShuffle, {
            reason: 'shuffle toggled',
            data: { enabled },
        });
    },

    repeatChanged(mode: string) {
        void trackPlayback(ANALYTICS_EVENTS.playbackRepeat, {
            reason: 'repeat toggled',
            data: { mode },
        });
    },

    playRequested() {
        void trackPlayback(ANALYTICS_EVENTS.playbackPlay, {
            reason: 'playback resumed',
        });
    },

    pauseRequested() {
        void trackPlayback(ANALYTICS_EVENTS.playbackPause, {
            reason: 'playback paused',
        });
    },

    nextRequested() {
        void trackPlayback(ANALYTICS_EVENTS.playbackNext, {
            reason: 'skipped to next',
        });
    },

    previousRequested() {
        void trackPlayback(ANALYTICS_EVENTS.playbackPrevious, {
            reason: 'skipped to previous',
        });
    },

    seekRequested(positionMs: number) {
        void trackPlayback(ANALYTICS_EVENTS.playbackSeek, {
            reason: 'scrubbed playback',
            data: { positionMs },
        });
    },
};
