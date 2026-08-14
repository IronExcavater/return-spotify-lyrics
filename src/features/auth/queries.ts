import { queryOptions } from '@tanstack/react-query';

import { sendMessage } from '../../platform/messaging';

export const authKeys = {
    all: ['auth'] as const,
    session: () => ['auth', 'session'] as const,
};

export const sessionQueryOptions = queryOptions({
    queryKey: authKeys.session(),
    queryFn: () => sendMessage('authSession'),
    staleTime: 30_000,
    retry: false,
});
