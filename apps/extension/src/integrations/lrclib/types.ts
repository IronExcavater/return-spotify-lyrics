export type LyricsTrack = {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string | null;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
};

export type LyricsLookup = {
    trackName: string;
    artistName: string;
    albumName?: string;
    duration?: number;
};

export type LyricsSearch = {
    query?: string;
    trackName?: string;
    artistName?: string;
    albumName?: string;
};
