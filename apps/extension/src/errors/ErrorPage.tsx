type ErrorPageProps = {
    error: unknown;
    onRetry?: () => void;
};

export default function ErrorPage({ error, onRetry }: ErrorPageProps) {
    const message =
        error instanceof Error ? error.message : 'Something went wrong.';

    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm">
            <p>{message}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="rounded border px-3 py-1"
                >
                    Try again
                </button>
            )}
        </div>
    );
}
