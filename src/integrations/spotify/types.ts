export type SpotifyImage = {
    url: string;
    width?: number | null;
    height?: number | null;
};

export type SpotifyProfile = {
    accountId: string | null;
    id: string;
    displayName: string | null;
    email: string | null;
    images: SpotifyImage[];
};

export type PlaybackTrack = {
    id: string;
    name: string;
    artists: Array<{ id?: string; name: string }>;
    album: {
        id: string;
        name: string;
        images: SpotifyImage[];
    };
    durationMs: number;
};

export type PlaybackDevice = {
    id: string | null;
    name: string;
    type: string;
    volumePercent: number | null;
};

export type PlaybackSnapshot = {
    isPlaying: boolean;
    progressMs: number;
    device: PlaybackDevice | null;
    track: PlaybackTrack | null;
};
