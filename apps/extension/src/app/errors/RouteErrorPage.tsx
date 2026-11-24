import { isRouteErrorResponse, useRouteError } from 'react-router';

import ErrorPage from './ErrorPage';

export default function RouteErrorPage() {
    const routeError = useRouteError();
    const error = isRouteErrorResponse(routeError)
        ? new Error(`${routeError.status} ${routeError.statusText}`)
        : routeError;

    return <ErrorPage error={error} />;
}
