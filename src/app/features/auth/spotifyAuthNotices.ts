import type {
    SpotifyAuthRequiredReason,
    SpotifyAuthStatus,
} from '../../../shared/spotifyAuthState';

export type SpotifyAuthNoticeReason =
    | SpotifyAuthRequiredReason
    | 'missing-scopes';

export type SpotifyAuthNotice = {
    reason: SpotifyAuthNoticeReason;
    title: string;
    description: string;
    scopes?: string[];
};

export type SpotifyAuthNoticeInput = {
    authStatus?: SpotifyAuthStatus;
    missingScopes?: string[];
};

export const SPOTIFY_SCOPE_DESCRIPTIONS: Record<string, string> = {
    'playlist-read-private': 'Read your private playlists',
    'playlist-read-collaborative': 'Read collaborative playlists you follow',
    'playlist-modify-public': 'Edit your public playlists',
    'playlist-modify-private': 'Edit your private playlists',
    'user-read-playback-state': 'Read your current playback state',
    'user-read-currently-playing': 'Read the currently playing track',
    'user-read-recently-played': 'Read your recently played tracks',
    'user-top-read': 'Read your top artists and tracks',
    'user-library-read': 'Read your saved tracks and albums',
};

const NOTICE_ORDER: SpotifyAuthNoticeReason[] = [
    'refresh-token-invalid',
    'missing-scopes',
];

const createNotice = (
    reason: SpotifyAuthNoticeReason,
    missingScopes: string[]
): SpotifyAuthNotice => {
    switch (reason) {
        case 'refresh-token-invalid':
            return {
                reason,
                title: 'Spotify session expired',
                description:
                    'Spotify refresh tokens expire after six months. Sign in again to reconnect your account.',
            };
        case 'missing-scopes':
            return {
                reason,
                title: 'Spotify permissions changed',
                description:
                    'Reconnect Spotify to grant the permissions needed for the current features.',
                scopes: missingScopes,
            };
    }
};

export function getSpotifyAuthNotices({
    authStatus,
    missingScopes = [],
}: SpotifyAuthNoticeInput): SpotifyAuthNotice[] {
    const reasons = new Set<SpotifyAuthNoticeReason>(authStatus?.reasons ?? []);

    if (missingScopes.length > 0) {
        reasons.add('missing-scopes');
    }

    return NOTICE_ORDER.filter((reason) => reasons.has(reason)).map((reason) =>
        createNotice(reason, missingScopes)
    );
}
