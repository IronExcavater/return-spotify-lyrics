import { isRouteErrorResponse, useRouteError } from 'react-router';

import { AppError } from '@/errors/AppError';
import { ErrorPage } from '@/errors/ErrorPage';

export function RouteErrorPage() {
    const routeError = useRouteError();
    const error = isRouteErrorResponse(routeError)
        ? new AppError(
              `route.${routeError.status}`,
              routeError.statusText || 'The requested page could not be loaded.'
          )
        : routeError;

    return <ErrorPage error={error} showBack showHome showReload />;
}
