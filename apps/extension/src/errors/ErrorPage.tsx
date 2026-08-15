import { ArrowLeft, Home, RefreshCw, RotateCcw } from 'lucide-react';

import { Button } from '@return-spotify-lyrics/ui/Button';

import { asAppError } from './AppError';

type ErrorPageProps = {
    error: unknown;
    title?: string;
    onRetry?: () => void;
    showBack?: boolean;
    showHome?: boolean;
    showReload?: boolean;
};

export function ErrorPage({ error, title = 'Something went wrong', onRetry, showBack = false, showHome = false, showReload = false }: ErrorPageProps) {
    const appError = asAppError(error);

    return (
        <main className="flex min-h-full flex-col items-start justify-center gap-4 p-5">
            <div className="space-y-1">
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="max-w-md text-sm text-text-muted">{appError.message}</p>
                {import.meta.env.DEV && <code className="block text-xs text-text-muted/70">{appError.code}</code>}
            </div>

            <div className="flex flex-wrap gap-2">
                {onRetry && <Button variant="solid" onClick={onRetry}><RotateCcw size={16} />Try again</Button>}
                {showBack && <Button variant="ghost" onClick={() => window.history.back()}><ArrowLeft size={16} />Back</Button>}
                {showHome && <Button variant="ghost" onClick={() => { window.location.hash = '#/home'; }}><Home size={16} />Home</Button>}
                {showReload && <Button variant="ghost" onClick={() => window.location.reload()}><RefreshCw size={16} />Reload</Button>}
            </div>
        </main>
    );
}
