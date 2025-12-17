import { Client, Query, FindLyricsResponse, LyricLine } from 'lrclib-api';

export const lrcClient = new Client();

export type LyricsResponse = Omit<
    FindLyricsResponse,
    'syncedLyrics' | 'unsyncedLyrics'
> & {
    lyrics: LyricLine[] | null;
};

export const lrcRpc = {
    getLyrics: async (query: Query): Promise<LyricsResponse | null> => {
        const metadata = await lrcClient.findLyrics(query);
        if (metadata.instrumental) {
            return {
                ...metadata,
                lyrics: [],
            };
        }

        const synced = await lrcClient.getSynced(query);
        if (synced?.length) {
            return {
                ...metadata,
                lyrics: synced,
            };
        }

        const unsynced = await lrcClient.getUnsynced(query);
        if (unsynced?.length) {
            return {
                ...metadata,
                lyrics: unsynced,
            };
        }

        return null;
    },
} as const;

export type LrcRpc = typeof lrcRpc;
export type LrcRpcName = keyof LrcRpc;
export type LrcRpcArgs<N extends LrcRpcName> = Parameters<LrcRpc[N]>[0];
export type LrcRpcReturn<N extends LrcRpcName> = Awaited<ReturnType<LrcRpc[N]>>;
