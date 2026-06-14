export {
    canManageTrackPlaylists,
    resolveTrackPlaylistTarget,
} from '../../../../shared/media';

export function formatTrackPlaylistError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (
        lower.includes('scope') ||
        lower.includes('insufficient') ||
        lower.includes('permission')
    ) {
        return 'Reconnect Spotify to load playlists.';
    }
    if (lower.includes('rate') || lower.includes('429')) {
        return 'Spotify is rate limiting playlist requests. Try again shortly.';
    }
    return message || fallback;
}
