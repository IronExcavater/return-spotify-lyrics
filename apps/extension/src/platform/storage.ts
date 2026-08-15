import { storage } from 'wxt/utils/storage';

export type Preferences = {
    compactMedia: boolean;
    showExplicitBadge: boolean;
};

export const preferencesStorage = storage.defineItem<Preferences>(
    'local:preferences',
    {
        fallback: {
            compactMedia: false,
            showExplicitBadge: true,
        },
        version: 1,
    }
);

type SpotifyAccessToken = {
    value: string;
    expiresAt: number;
};

export const spotifyAccessTokenStorage =
    storage.defineItem<SpotifyAccessToken | null>(
        'session:spotify-access-token',
        { fallback: null }
    );

export async function getSpotifyAccessToken() {
    const token = await spotifyAccessTokenStorage.getValue();
    if (!token) return null;

    if (token.expiresAt <= Date.now() + 10_000) {
        await spotifyAccessTokenStorage.removeValue();
        return null;
    }

    return token.value;
}
