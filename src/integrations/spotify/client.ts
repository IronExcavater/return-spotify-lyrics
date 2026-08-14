import { AppError } from '../../errors/AppError';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export function spotifyErrorFromResponse(response: Response) {
    const retryAfter = Number(response.headers.get('Retry-After'));

    switch (response.status) {
        case 401:
            return new AppError(
                'auth.reauthorization_required',
                'Spotify needs to be reconnected.'
            );
        case 403:
            return new AppError(
                'spotify.premium_required',
                'This Spotify action is not available for this account.'
            );
        case 404:
            return new AppError(
                'spotify.not_found',
                'Spotify could not find that resource.'
            );
        case 429:
            return new AppError(
                'spotify.rate_limited',
                'Spotify is receiving too many requests.',
                {
                    retryAfter: Number.isFinite(retryAfter)
                        ? retryAfter
                        : undefined,
                }
            );
        default:
            return new AppError(
                'spotify.request_failed',
                `Spotify request failed (${response.status}).`
            );
    }
}

type SpotifyFetchOptions = Omit<RequestInit, 'headers'> & {
    accessToken: string;
    headers?: HeadersInit;
};

export async function spotifyFetch<T>(
    path: string,
    { accessToken, headers, ...init }: SpotifyFetchOptions
): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${SPOTIFY_API}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                ...headers,
            },
        });
    } catch (error) {
        throw new AppError('network.offline', 'Spotify could not be reached.', {
            cause: error,
        });
    }

    if (!response.ok) throw spotifyErrorFromResponse(response);
    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
}
