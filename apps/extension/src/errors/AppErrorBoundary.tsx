import { Component, type ReactNode } from 'react';

import ErrorPage from './ErrorPage';

type AppErrorBoundaryProps = {
    children: ReactNode;
};

type AppErrorBoundaryState = {
    error: Error | null;
};

export default class AppErrorBoundary extends Component<
    AppErrorBoundaryProps,
    AppErrorBoundaryState
> {
    override state: AppErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
        return { error };
    }

    override componentDidCatch(
        error: Error,
        info: { componentStack: string | null }
    ) {
        console.error(error, info.componentStack);
    }

    reset = () => this.setState({ error: null });

    override render() {
        if (this.state.error) {
            return <ErrorPage error={this.state.error} onRetry={this.reset} />;
        }
        return this.props.children;
    }
}
