import { normalizeError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import { showToast } from '../../data/toastStore';
import { markTrackPlaylistCatalogStale } from './store';

const splitSpotifyUriBatches = (uris: string[], batchSize = 100) => {
    const filtered = uris.filter(Boolean);
    const batches: string[][] = [];

    for (let index = 0; index < filtered.length; index += batchSize) {
        batches.push(filtered.slice(index, index + batchSize));
    }

    return batches;
};

const collectPaginatedItems = async <T>(
    loadPage: (offset: number) => Promise<{
        items: T[];
        next?: unknown;
    }>
) => {
    const items: T[] = [];

    while (true) {
        const page = await loadPage(items.length);
        items.push(...page.items);
        if (!page.next || page.items.length === 0) return items;
    }
};

const collectAlbumTrackUris = async (albumId: string) => {
    const tracks = await collectPaginatedItems((offset) =>
        sendSpotifyMessage('getAlbumTracks', {
            id: albumId,
            limit: 50,
            offset,
        })
    );

    return tracks.map((track) => track.uri).filter(Boolean);
};

const collectPlaylistTrackUris = async (playlistId: string) => {
    const entries = await collectPaginatedItems((offset) =>
        sendSpotifyMessage('getPlaylistItems', {
            id: playlistId,
            limit: 50,
            offset,
        })
    );

    return entries
        .map((entry) => entry.track?.uri)
        .filter((uri): uri is string => Boolean(uri));
};

const addUrisToQueue = async (uris: string[]) => {
    for (const uri of uris) {
        await sendSpotifyMessage('addToQueue', uri);
    }
};

export const addAlbumToQueue = async (albumId: string) => {
    await addUrisToQueue(await collectAlbumTrackUris(albumId));
};

export const addPlaylistToQueue = async (playlistId: string) => {
    await addUrisToQueue(await collectPlaylistTrackUris(playlistId));
};

type DuplicatePlaylistSource =
    | { kind: 'album'; id: string; title: string }
    | { kind: 'playlist'; id: string; title: string };

export async function duplicateAsPlaylist({
    userId,
    source,
}: {
    userId: string;
    source: DuplicatePlaylistSource;
}) {
    const uris =
        source.kind === 'album'
            ? await collectAlbumTrackUris(source.id)
            : await collectPlaylistTrackUris(source.id);
    const playlist = await sendSpotifyMessage('createPlaylist', {
        userId,
        name: `Copy of ${source.title}`,
        public: false,
    });

    for (const batch of splitSpotifyUriBatches(uris)) {
        await sendSpotifyMessage('addTracksToPlaylist', {
            playlistId: playlist.id,
            uris: batch,
        });
    }

    return playlist;
}

export async function duplicateAsPlaylistAndNotify({
    userId,
    source,
    toast,
}: {
    userId: string;
    source: DuplicatePlaylistSource;
    toast: { successTitle: string; errorTitle: string };
}) {
    try {
        await duplicateAsPlaylist({ userId, source });
        await markTrackPlaylistCatalogStale();
        showToast({ title: toast.successTitle, tone: 'success' });
    } catch (error) {
        showToast({
            title: toast.errorTitle,
            description: normalizeError(error).message,
            tone: 'danger',
        });
    }
}
