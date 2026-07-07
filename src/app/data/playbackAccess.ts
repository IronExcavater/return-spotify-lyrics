import { useSyncExternalStore } from 'react';

import type { SpotifyRpcName } from '../../background/spotifyRpc';
import {
    SPOTIFY_RPC_RESULT_EVENT,
    type SpotifyRpcResultEventDetail,
} from '../../shared/messaging';

const PREMIUM_PLAYBACK_OPERATIONS = new Set<SpotifyRpcName>([
    'getPlaybackState',
    'pausePlayback',
    'startResumePlayback',
    'seekToPosition',
    'skipToNext',
    'skipToPrevious',
    'toggleShuffle',
    'setRepeatMode',
    'setPlaybackVolume',
    'transferPlayback',
    'getQueue',
    'addToQueue',
    'startPlayback',
    'syncQueue',
]);

const listeners = new Set<() => void>();
let premiumPlaybackBlocked = false;
let listening = false;

const isPremiumPlaybackOperation = (op: SpotifyRpcName) =>
    PREMIUM_PLAYBACK_OPERATIONS.has(op);

const isPremiumRequiredError = (error?: string) =>
    Boolean(error && /(^|[^0-9])403([^0-9]|$)/.test(error));

const setPremiumPlaybackBlocked = (next: boolean) => {
    if (next === premiumPlaybackBlocked) return;
    premiumPlaybackBlocked = next;
    listeners.forEach((listener) => listener());
};

const listenForPlaybackResults = () => {
    if (listening) return;
    listening = true;

    window.addEventListener(SPOTIFY_RPC_RESULT_EVENT, (event) => {
        const detail = (event as CustomEvent<SpotifyRpcResultEventDetail>)
            .detail;
        if (!detail || !isPremiumPlaybackOperation(detail.op)) return;

        setPremiumPlaybackBlocked(
            detail.ok ? false : isPremiumRequiredError(detail.error)
        );
    });
};

export const readPremiumPlaybackBlocked = () => premiumPlaybackBlocked;

export function resetPremiumPlaybackBlocked() {
    setPremiumPlaybackBlocked(false);
}

export function syncPremiumPlaybackFromProfile(
    profile?: { product?: unknown } | null
) {
    const product =
        typeof profile?.product === 'string'
            ? profile.product.toLowerCase()
            : undefined;

    if (product === 'premium') {
        setPremiumPlaybackBlocked(false);
        return;
    }

    if (product === 'free' || product === 'open') {
        setPremiumPlaybackBlocked(true);
    }
}

export function usePremiumPlaybackBlocked() {
    return useSyncExternalStore(
        (listener) => {
            listenForPlaybackResults();
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        readPremiumPlaybackBlocked,
        readPremiumPlaybackBlocked
    );
}
