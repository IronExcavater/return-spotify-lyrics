import { Client, Query } from 'lrclib-api';
import { normalizeLyricsResponse, type LyricsResponse } from './lrcLyrics.ts';

export const lrcClient = new Client();

export const lrcRpc = {
    getLyrics: async (query: Query): Promise<LyricsResponse | null> => {
        const metadata = await lrcClient.findLyrics(query);
        return normalizeLyricsResponse(metadata);
    },
} as const;

export type LrcRpc = typeof lrcRpc;
export type LrcRpcName = keyof LrcRpc;
export type LrcRpcArgs<N extends LrcRpcName> = Parameters<LrcRpc[N]>[0];
export type LrcRpcReturn<N extends LrcRpcName> = Awaited<ReturnType<LrcRpc[N]>>;
