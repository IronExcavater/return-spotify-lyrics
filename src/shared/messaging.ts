export enum Msg {
    LOGIN_SPOTIFY = 'LOGIN_SPOTIFY',
    LOGOUT_SPOTIFY = 'LOGOUT_SPOTIFY',
    GET_PROFILE = 'GET_PROFILE',
    GET_PLAYER = 'GET_PLAYER',
    PLAYER_PLAY = 'PLAYER_PLAY',
    PLAYER_PAUSE = 'PLAYER_PAUSE',
    PLAYER_NEXT = 'PLAYER_NEXT',
    PLAYER_PREVIOUS = 'PLAYER_PREVIOUS',
}

type Handler = (msg: any) => any | Promise<any>;

const registry = new Map<Msg, Handler>();

export function addOnMessage(type: Msg, handler: Handler) {
    registry.set(type, handler);
    return () => removeOnMessage(type);
}

export function removeOnMessage(type: Msg) {
    registry.delete(type);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const handler = registry.get(msg.type as Msg);
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
});
