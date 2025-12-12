import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface Props {
    when: boolean;
    redirectTo: string;
    children: ReactNode;
}

export const ProtectedLayout: FC<Props> = ({ when, redirectTo, children }) => {
    const location = useLocation();

    if (when)
        return <Navigate to={redirectTo} replace state={{ from: location }} />;

    return <>{children}</>;
};
