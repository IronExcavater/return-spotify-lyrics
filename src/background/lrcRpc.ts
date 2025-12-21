import {
    FindLyricsResponse,
    LyricLine,
    Query,
    parseLocalLyrics,
    parseTime,
} from 'lrclib-api';
import { getFromStorage, setInStorage } from '../shared/storage.ts';
import { getLrcClient, requestPublishToken } from './lrcAuth.ts';

const LYRICS_CACHE_KEY = 'lrclibLyricsCache';
const LYRICS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const TIMESTAMP_PATTERN = /\[([0-9:.]+)\]/g;

type LyricsCacheEntry = {
    cachedAt: number;
    value: LyricsResponse | null;
};

type LyricsCacheStore = Record<string, LyricsCacheEntry>;

let cacheStore: LyricsCacheStore | null = null;

async function loadCache(): Promise<LyricsCacheStore> {
    if (cacheStore) return cacheStore;
    cacheStore =
        (await getFromStorage<LyricsCacheStore>(LYRICS_CACHE_KEY)) ?? {};
    return cacheStore;
}

async function saveCache(store: LyricsCacheStore) {
    await setInStorage(LYRICS_CACHE_KEY, store);
}

function normaliseSegment(value: string | undefined) {
    return value?.trim().toLowerCase() ?? '';
}

function buildCacheKey(query: Query) {
    if ('id' in query && query.id != null) return `id:${query.id}`;

    const track = normaliseSegment(query.track_name);
    const artist = normaliseSegment(query.artist_name);
    const album = normaliseSegment(query.album_name);
    const duration = query.duration ?? 0;

    return `track:${track}|artist:${artist}|album:${album}|duration:${duration}`;
}

function parseSyncedLyrics(lyrics: string): LyricLine[] {
    const lines = lyrics.replace(/\r/g, '').split('\n');
    const synced: LyricLine[] = [];

    for (const line of lines) {
        const matches = Array.from(line.matchAll(TIMESTAMP_PATTERN));
        if (!matches.length) continue;

        const text = line.replace(TIMESTAMP_PATTERN, '').trim();
        if (!text) continue;

        for (const match of matches) {
            const seconds = parseTime(match[1]);
            synced.push({ text, startTime: Math.round(seconds * 1000) });
        }
    }

    return synced.sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));
}

function parseUnsyncedLyrics(lyrics: string) {
    return parseLocalLyrics(lyrics).unsynced;
}

function extractLyrics(metadata: FindLyricsResponse): LyricLine[] | null {
    if (metadata.instrumental) return [];

    if (metadata.syncedLyrics) {
        const synced = parseSyncedLyrics(metadata.syncedLyrics);
        if (synced.length) return synced;

        const fallbackUnsynced = parseUnsyncedLyrics(metadata.syncedLyrics);
        if (fallbackUnsynced.length) return fallbackUnsynced;
    }

    if (metadata.plainLyrics) {
        const unsynced = parseUnsyncedLyrics(metadata.plainLyrics);
        if (unsynced.length) return unsynced;
    }

    return null;
}

async function readCache(key: string) {
    const store = await loadCache();
    const entry = store[key];
    if (!entry) return undefined;

    if (Date.now() - entry.cachedAt > LYRICS_CACHE_TTL_MS) {
        delete store[key];
        await saveCache(store);
        return undefined;
    }

    return entry.value;
}

async function writeCache(key: string, value: LyricsResponse | null) {
    const store = await loadCache();
    store[key] = { cachedAt: Date.now(), value };
    await saveCache(store);
}

export type LyricsResponse = FindLyricsResponse & {
    lyrics: LyricLine[] | null;
};

export const lrcRpc = {
    getLyrics: async (query: Query): Promise<LyricsResponse | null> => {
        const cacheKey = buildCacheKey(query);
        const cached = await readCache(cacheKey);
        if (cached !== undefined) return cached;

        try {
            const client = await getLrcClient();
            const metadata = await client.findLyrics(query);
            const lyrics = extractLyrics(metadata);
            const payload = { ...metadata, lyrics };
            await writeCache(cacheKey, payload);
            return payload;
        } catch (error) {
            console.warn('[lrcRpc] Failed to fetch lyrics', error);
            return null;
        }
    },
    requestPublishToken: async () => {
        return await requestPublishToken();
    },
} as const;

export type LrcRpc = typeof lrcRpc;
export type LrcRpcName = keyof LrcRpc;
export type LrcRpcArgs<N extends LrcRpcName> = Parameters<LrcRpc[N]>[0];
export type LrcRpcReturn<N extends LrcRpcName> = Awaited<ReturnType<LrcRpc[N]>>;
