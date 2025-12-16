import { addOnMessage, Msg } from '../shared/messaging';
import { removeInStorage } from '../shared/storage';
import {
    spotifyRpc,
    SpotifyRpcArgs,
    SpotifyRpcName,
    SpotifyRpcReturn,
} from './spotifyRpc';
import { buildAuthUrl, launchWebAuth, requestAccessToken } from './webAuth';

addOnMessage(Msg.LOGIN_SPOTIFY, async () => {
    const authUrl = await buildAuthUrl();
    const code = await launchWebAuth(authUrl);
    return await requestAccessToken(code);
});

addOnMessage(Msg.LOGOUT_SPOTIFY, async () => {
    await removeInStorage('spotifyToken');
});

addOnMessage(
    Msg.API_SPOTIFY,
    async <N extends SpotifyRpcName>(msg: {
        type: Msg.API_SPOTIFY;
        op: N;
        args: SpotifyRpcArgs<N>;
    }) => {
        const fn = spotifyRpc[msg.op];

        type Args = SpotifyRpcArgs<N>;

        if (fn.length === 0) {
            return (fn as () => SpotifyRpcReturn<N>)();
        }

        return (fn as (a: Args) => SpotifyRpcReturn<N>)(msg.args);
    }
);
