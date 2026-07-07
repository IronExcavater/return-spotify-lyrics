export const SPOTIFY_TOKEN_KEY = 'spotifyToken';
export const SPOTIFY_AUTH_STATUS_KEY = 'spotifyAuthStatus';

const SPOTIFY_AUTH_REQUIRED_REASONS = ['refresh-token-invalid'] as const;

export type SpotifyAuthRequiredReason =
    (typeof SPOTIFY_AUTH_REQUIRED_REASONS)[number];

export type SpotifyAuthStatus = {
    reasons: SpotifyAuthRequiredReason[];
    updatedAt: number;
};

const reasonSet = new Set<string>(SPOTIFY_AUTH_REQUIRED_REASONS);

export function isInvalidGrantResponse(response: { error?: unknown }) {
    return response.error === 'invalid_grant';
}

export function createSpotifyAuthStatus(
    reasons: SpotifyAuthRequiredReason[],
    updatedAt = Date.now()
): SpotifyAuthStatus {
    const uniqueReasons = Array.from(new Set(reasons));
    if (uniqueReasons.length === 0) {
        throw new Error('Spotify auth status requires at least one reason');
    }
    return { reasons: uniqueReasons, updatedAt };
}

function isSpotifyAuthRequiredReason(
    value: unknown
): value is SpotifyAuthRequiredReason {
    return typeof value === 'string' && reasonSet.has(value);
}

export function isSpotifyAuthStatus(
    value: unknown
): value is SpotifyAuthStatus {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<SpotifyAuthStatus>;
    return (
        Array.isArray(candidate.reasons) &&
        candidate.reasons.length > 0 &&
        candidate.reasons.every(isSpotifyAuthRequiredReason) &&
        typeof candidate.updatedAt === 'number'
    );
}
