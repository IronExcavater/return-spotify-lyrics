import { useCallback, useEffect, useState } from 'react';
import type {
    FeaturedPlaylists,
    PlayHistory,
    SimplifiedPlaylist,
} from '@spotify/web-api-ts-sdk';
import { sendSpotifyMessage } from '../../shared/messaging';
import { useSpotifyAuth } from './useSpotifyAuth';

type HomeState = {
    recents: PlayHistory[];
    playlists: SimplifiedPlaylist[];
    madeForYou: SimplifiedPlaylist[];
    madeForYouMessage: string | null;
    loading: boolean;
    error: string | null;
};

export function useSpotifyHome() {
    const { authed } = useSpotifyAuth();
    const [state, setState] = useState<HomeState>({
        recents: [],
        playlists: [],
        madeForYou: [],
        madeForYouMessage: null,
        loading: true,
        error: null,
    });

    const refresh = useCallback(async () => {
        if (!authed) return;
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const [recentsResult, playlistsResult, madeForYouResult] =
            await Promise.allSettled([
                sendSpotifyMessage('getRecentlyPlayed'),
                sendSpotifyMessage('getUserPlaylists'),
                sendSpotifyMessage('getMadeForYou'),
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
            loading: false,
            error:
                recentsResult.status === 'rejected' ||
                playlistsResult.status === 'rejected' ||
                madeForYouResult.status === 'rejected'
                    ? 'Failed to load Spotify home data.'
                    : null,
        };

        setState(next);
    }, [authed]);

    useEffect(() => {
        if (authed) void refresh();
    }, [authed, refresh]);

    return {
        ...state,
        refresh,
    };
}
