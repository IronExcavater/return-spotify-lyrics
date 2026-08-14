import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sendMessage, type AuthLoginInput } from '@/platform/messaging';

import { authKeys, sessionQueryOptions } from './queries';

export function useAuth() {
    const queryClient = useQueryClient();
    const sessionQuery = useQuery(sessionQueryOptions);

    const loginMutation = useMutation({
        mutationFn: (input: AuthLoginInput) => sendMessage('authLogin', input),
        onSuccess: (session) => {
            queryClient.setQueryData(authKeys.session(), session);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => sendMessage('authLogout'),
        onSuccess: () => {
            queryClient.setQueryData(authKeys.session(), null);
            void queryClient.invalidateQueries({ queryKey: ['spotify'] });
        },
    });

    return {
        session: sessionQuery.data ?? null,
        sessionQuery,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        loginMutation,
        logoutMutation,
    };
}
