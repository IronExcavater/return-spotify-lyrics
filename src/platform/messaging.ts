import { defineExtensionMessaging } from '@webext-core/messaging';

import type { AuthSession } from '@/integrations/firebase/auth';
import type { LyricsLookup, LyricsSearch, LyricsTrack } from '@/integrations/lrclib/types';
import type { PlaybackSnapshot } from '@/integrations/spotify/types';

export type AuthLoginInput = {
    customToken: string;
    spotifyAccessToken?: string;
    spotifyAccessTokenExpiresAt?: number;
};

export interface AppProtocol {
    authSession(): AuthSession | null;
    authLogin(data: AuthLoginInput): AuthSession;
    authLogout(): void;

    spotifyPlayback(): PlaybackSnapshot | null;
    spotifyPlay(): void;
    spotifyPause(): void;
    spotifyNext(): void;
    spotifyPrevious(): void;

    lyricsGet(data: LyricsLookup): LyricsTrack | null;
    lyricsSearch(data: LyricsSearch): LyricsTrack[];
}

export const { sendMessage, onMessage, removeAllListeners } =
    defineExtensionMessaging<AppProtocol>();
