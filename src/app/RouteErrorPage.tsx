import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

export function RouteErrorPage() {
    const error = useRouteError();
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
          ? error.message
          : 'Unexpected routing error';

    return (
        <main className="flex min-h-full flex-col items-start gap-3 p-5">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-text-muted">{message}</p>
            <Link className="text-sm font-medium text-accent hover:underline" to="/home">
                Return home
            </Link>
        </main>
    );
}
