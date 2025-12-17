import {
    LrcRpcArgs,
    LrcRpcName,
    LrcRpcReturn,
} from '../background/lrclib/lrcRpc.ts';
import { SpotifyToken } from '../background/spotify/spotifyAuth.ts';
import {
    SpotifyRpcArgs,
    SpotifyRpcName,
    SpotifyRpcReturn,
} from '../background/spotify/spotifyRpc.ts';

export enum Msg {
    LOGIN_SPOTIFY = 'LOGIN_SPOTIFY',
    LOGOUT_SPOTIFY = 'LOGOUT_SPOTIFY',
    API_SPOTIFY = 'API_SPOTIFY',
    API_LRCLIB = 'API_LRCLIB',
}

export interface MessageMap {
    [Msg.LOGIN_SPOTIFY]: { type: Msg.LOGIN_SPOTIFY };
    [Msg.LOGOUT_SPOTIFY]: { type: Msg.LOGOUT_SPOTIFY };
    [Msg.API_SPOTIFY]: {
        type: Msg.API_SPOTIFY;
        op: SpotifyRpcName;
        args: SpotifyRpcArgs<SpotifyRpcName>;
    };
    [Msg.API_LRCLIB]: {
        type: Msg.API_LRCLIB;
        op: LrcRpcName;
        args: LrcRpcArgs<LrcRpcName>;
    };
}

export interface ResponseMap {
    [Msg.LOGIN_SPOTIFY]: SpotifyToken;
    [Msg.LOGOUT_SPOTIFY]: void;
    [Msg.API_SPOTIFY]: SpotifyRpcReturn<SpotifyRpcName>;
    [Msg.API_LRCLIB]: LrcRpcReturn<LrcRpcName>;
}

type Handler<K extends Msg> = (
    msg: MessageMap[K]
) => ResponseMap[K] | Promise<ResponseMap[K]>;
type AnyHandler = (
    msg: MessageMap[Msg]
) => ResponseMap[Msg] | Promise<ResponseMap[Msg]>;

const registry: Partial<Record<Msg, AnyHandler>> = {};

export function addOnMessage<K extends Msg>(type: K, handler: Handler<K>) {
    registry[type] = (msg) => handler(msg as MessageMap[K]);
    return () => removeOnMessage(type);
}

export function removeOnMessage(type: Msg) {
    delete registry[type];
}

chrome.runtime.onMessage.addListener(
    (msg: MessageMap[Msg], _sender, sendResponse) => {
        const handler = registry[msg.type];
        if (!handler) return false;

        (async () => {
            try {
                const result = await handler(msg);
                sendResponse(result);
            } catch (e) {
                sendResponse({ error: String(e) });
            }
        })();

        return true;
    }
);

export function sendMessage<K extends Msg>(
    message: MessageMap[K]
): Promise<ResponseMap[K]> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            const err = chrome.runtime.lastError;
            if (err) reject(err);
            else resolve(response as ResponseMap[K]);
        });
    });
}

export const sendSpotifyMessage = <N extends SpotifyRpcName>(
    op: N,
    args?: SpotifyRpcArgs<N>
) =>
    sendMessage<Msg.API_SPOTIFY>({
        type: Msg.API_SPOTIFY,
        op,
        args,
    }) as Promise<SpotifyRpcReturn<N>>;

export const sendLyricsMessage = <N extends LrcRpcName>(
    op: N,
    args: LrcRpcArgs<N>
) =>
    sendMessage<Msg.API_LRCLIB>({
        type: Msg.API_LRCLIB,
        op,
        args,
    }) as Promise<LrcRpcReturn<N>>;
