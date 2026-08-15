import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { asAppError } from '@/errors/AppError';
import { logger } from '@/platform/logger';

function shouldRetry(failureCount: number, error: unknown) {
    const appError = asAppError(error);

    if (
        appError.code.startsWith('auth.') ||
        appError.code === 'spotify.rate_limited' ||
        appError.code === 'spotify.not_found' ||
        appError.code === 'lyrics.not_found'
    ) {
        return false;
    }

    return failureCount < 1;
}

export const appQueryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => logger.warn('Query failed', asAppError(error)),
    }),
    mutationCache: new MutationCache({
        onError: (error) => logger.warn('Mutation failed', asAppError(error)),
    }),
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: shouldRetry,
            refetchOnWindowFocus: true,
        },
        mutations: {
            retry: 0,
        },
    },
});
