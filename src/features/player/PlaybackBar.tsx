import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

import { sendMessage } from '@/platform/messaging';
import { Button } from '@/ui/Button';
import { Marquee } from '@/ui/Marquee';

import { playbackQueryOptions, playerKeys } from './queries';

export function PlaybackBar() {
    const queryClient = useQueryClient();
    const playback = useQuery(playbackQueryOptions);

    const control = useMutation({
        mutationFn: (action: 'play' | 'pause' | 'next' | 'previous') => {
            switch (action) {
                case 'play':
                    return sendMessage('spotifyPlay');
                case 'pause':
                    return sendMessage('spotifyPause');
                case 'next':
                    return sendMessage('spotifyNext');
                case 'previous':
                    return sendMessage('spotifyPrevious');
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: playerKeys.playback(),
            });
        },
    });

    const track = playback.data?.track;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0 flex-1">
                <Marquee className="text-sm font-medium" animateOnHover>
                    {track?.name ?? 'Nothing playing'}
                </Marquee>
                <div className="truncate text-xs text-text-muted">
                    {track?.artists.map((artist) => artist.name).join(', ') ??
                        (playback.isError ? 'Connect Spotify' : 'Spotify')}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <Button
                    iconOnly
                    variant="ghost"
                    size="sm"
                    tooltip="Previous"
                    disabled={!track || control.isPending}
                    onClick={() => control.mutate('previous')}
                >
                    <SkipBack size={16} fill="currentColor" />
                </Button>
                <Button
                    iconOnly
                    variant="ghost"
                    size="sm"
                    tooltip={playback.data?.isPlaying ? 'Pause' : 'Play'}
                    disabled={!track || control.isPending}
                    onClick={() =>
                        control.mutate(
                            playback.data?.isPlaying ? 'pause' : 'play'
                        )
                    }
                >
                    {playback.data?.isPlaying ? (
                        <Pause size={17} fill="currentColor" />
                    ) : (
                        <Play size={17} fill="currentColor" />
                    )}
                </Button>
                <Button
                    iconOnly
                    variant="ghost"
                    size="sm"
                    tooltip="Next"
                    disabled={!track || control.isPending}
                    onClick={() => control.mutate('next')}
                >
                    <SkipForward size={16} fill="currentColor" />
                </Button>
            </div>
        </div>
    );
}
