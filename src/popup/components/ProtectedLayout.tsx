import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type RedirectTo = string | (() => string);

interface Props {
    when: boolean;
    redirectTo: RedirectTo;
    children: ReactNode;
}

export const ProtectedLayout: FC<Props> = ({ when, redirectTo, children }) => {
    const location = useLocation();

    if (when) {
        const to = typeof redirectTo === 'function' ? redirectTo() : redirectTo;
        if (to === location.pathname) return <>{children}</>;
        return <Navigate to={to} replace />;
    }

    return <>{children}</>;
};
