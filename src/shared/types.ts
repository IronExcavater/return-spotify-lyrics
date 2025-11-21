export interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export interface SpotifyToken extends SpotifyTokenResponse {
    expires_by: number;
}

export interface SpotifyProfileResponse {
    display_name: string | null;
    id: string;
    images?: { url: string }[];
    product?: string;
}

export interface SpotifyProfile extends SpotifyProfileResponse {}
