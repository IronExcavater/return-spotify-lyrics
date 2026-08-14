import { queryOptions } from '@tanstack/react-query';

import { sendMessage } from '@/platform/messaging';

export const playerKeys = {
    all: ['spotify'] as const,
    playback: () => ['spotify', 'playback'] as const,
};

export const playbackQueryOptions = queryOptions({
    queryKey: playerKeys.playback(),
    queryFn: () => sendMessage('spotifyPlayback'),
    staleTime: 2_000,
    refetchInterval: 5_000,
    retry: false,
});
