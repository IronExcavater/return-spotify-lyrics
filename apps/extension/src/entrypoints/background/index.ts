import { defineBackground } from 'wxt/utils/define-background';

import { AppError } from '@/errors/AppError';
import {
    getAuthSession,
    loginWithCustomToken,
    logout,
} from '@/integrations/firebase/auth';
import { getLyrics, searchLyrics } from '@/integrations/lrclib/client';
import { getProfile, searchTracks } from '@/integrations/spotify/media';
import {
    getPlayback,
    nextTrack,
    pausePlayback,
    previousTrack,
    resumePlayback,
} from '@/integrations/spotify/player';
import { onMessage } from '@/platform/messaging';
import {
    getSpotifyAccessToken,
    spotifyAccessTokenStorage,
} from '@/platform/storage';

async function requireSpotifyAccessToken() {
    const token = await getSpotifyAccessToken();
    if (!token) {
        throw new AppError(
            'auth.required',
            'Connect Spotify before using Spotify features.'
        );
    }
    return token;
}

export default defineBackground(() => {
    onMessage('authSession', () => {
        try {
            return getAuthSession();
        } catch (error) {
            if (
                error instanceof AppError &&
                error.code === 'auth.not_configured'
            )
                return null;
            throw error;
        }
    });

    onMessage('authLogin', async ({ data }) => {
        const session = await loginWithCustomToken(data.customToken);

        if (data.spotifyAccessToken) {
            await spotifyAccessTokenStorage.setValue({
                value: data.spotifyAccessToken,
                expiresAt:
                    data.spotifyAccessTokenExpiresAt ??
                    Date.now() + 55 * 60 * 1000,
            });
        }

        return session;
    });

    onMessage('authLogout', async () => {
        await Promise.all([logout(), spotifyAccessTokenStorage.removeValue()]);
    });

    onMessage('spotifyProfile', async () =>
        getProfile(await requireSpotifyAccessToken())
    );
    onMessage('spotifySearch', async ({ data }) =>
        searchTracks(await requireSpotifyAccessToken(), data.query, data.limit)
    );
    onMessage('spotifyPlayback', async () =>
        getPlayback(await requireSpotifyAccessToken())
    );
    onMessage('spotifyPlay', async () =>
        resumePlayback(await requireSpotifyAccessToken())
    );
    onMessage('spotifyPause', async () =>
        pausePlayback(await requireSpotifyAccessToken())
    );
    onMessage('spotifyNext', async () =>
        nextTrack(await requireSpotifyAccessToken())
    );
    onMessage('spotifyPrevious', async () =>
        previousTrack(await requireSpotifyAccessToken())
    );

    onMessage('lyricsGet', async ({ data }) => {
        try {
            return await getLyrics(data);
        } catch (error) {
            if (error instanceof AppError && error.code === 'lyrics.not_found')
                return null;
            throw error;
        }
    });

    onMessage('lyricsSearch', ({ data }) => searchLyrics(data));
});
