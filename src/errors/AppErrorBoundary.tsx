import type { ReactNode } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorPage } from './ErrorPage';

type AppErrorBoundaryProps = {
    children: ReactNode;
};

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
    const { reset } = useQueryErrorResetBoundary();

    return (
        <ErrorBoundary
            onReset={reset}
            fallbackRender={({ error, resetErrorBoundary }) => (
                <ErrorPage
                    error={error}
                    onRetry={resetErrorBoundary}
                    showHome
                    showReload
                />
            )}
        >
            {children}
        </ErrorBoundary>
    );
}
