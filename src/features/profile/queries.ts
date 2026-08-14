import { queryOptions } from '@tanstack/react-query';

import { sendMessage } from '@/platform/messaging';

export const profileKeys = {
    spotify: () => ['spotify', 'profile'] as const,
};

export const spotifyProfileQueryOptions = queryOptions({
    queryKey: profileKeys.spotify(),
    queryFn: () => sendMessage('spotifyProfile'),
    staleTime: 5 * 60_000,
    retry: false,
});
