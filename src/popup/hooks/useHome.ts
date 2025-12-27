import { useCallback, useEffect, useState } from 'react';
import type {
    FeaturedPlaylists,
    PlayHistory,
    SimplifiedPlaylist,
} from '@spotify/web-api-ts-sdk';
import { sendSpotifyMessage } from '../../shared/messaging';
import { useAuth } from './useAuth';

type HomeState = {
    recents: PlayHistory[];
    playlists: SimplifiedPlaylist[];
    madeForYou: SimplifiedPlaylist[];
    madeForYouMessage: string | null;
    recentsFailed: boolean;
    playlistsFailed: boolean;
    madeForYouFailed: boolean;
    loading: boolean;
    error: string | null;
};

export function useHome() {
    const { authed } = useAuth();
    const [state, setState] = useState<HomeState>({
        recents: [],
        playlists: [],
        madeForYou: [],
        madeForYouMessage: null,
        recentsFailed: false,
        playlistsFailed: false,
        madeForYouFailed: false,
        loading: true,
        error: null,
    });

    const refresh = useCallback(async () => {
        if (!authed) return;
        setState((prev) => ({
            ...prev,
            loading: true,
            error: null,
            recentsFailed: false,
            playlistsFailed: false,
            madeForYouFailed: false,
        }));

        const [recentsResult, playlistsResult, madeForYouResult] =
            await Promise.allSettled([
                sendSpotifyMessage('getRecentlyPlayed', 8),
                sendSpotifyMessage('getUserPlaylists', 10),
                sendSpotifyMessage('getMadeForYou', 10),
            ]);

        const next: HomeState = {
            recents:
                recentsResult.status === 'fulfilled'
                    ? (recentsResult.value?.items ?? [])
                    : [],
            playlists:
                playlistsResult.status === 'fulfilled'
                    ? (playlistsResult.value?.items ?? [])
                    : [],
            madeForYou:
                madeForYouResult.status === 'fulfilled'
                    ? ((madeForYouResult.value as FeaturedPlaylists)?.playlists
                          ?.items ?? [])
                    : [],
            madeForYouMessage:
                madeForYouResult.status === 'fulfilled'
                    ? ((madeForYouResult.value as FeaturedPlaylists)?.message ??
                      null)
                    : null,
            recentsFailed: recentsResult.status === 'rejected',
            playlistsFailed: playlistsResult.status === 'rejected',
            madeForYouFailed: madeForYouResult.status === 'rejected',
            loading: false,
            error:
                recentsResult.status === 'rejected' ||
                playlistsResult.status === 'rejected' ||
                madeForYouResult.status === 'rejected'
                    ? 'Some Spotify shelves failed to load.'
                    : null,
        };

        setState(next);
    }, [authed]);

    useEffect(() => {
        if (authed) void refresh();
        if (authed === false) {
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, [authed, refresh]);

    return {
        ...state,
        refresh,
    };
}
