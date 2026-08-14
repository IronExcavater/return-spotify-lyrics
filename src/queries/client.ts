import { QueryClient } from '@tanstack/react-query';

export const appQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
        },
        mutations: {
            retry: 0,
        },
    },
});
