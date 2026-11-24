import { createContext, useContext, useMemo, type ReactNode } from 'react';

type LinkRouter = {
    navigate: (to: string) => void;
    resolveHref: (to: string) => string;
};

const LinkContext = createContext<LinkRouter | null>(null);

export type LinkProviderProps = {
    /** Goes to a route in the app, like React Router's `navigate`. */
    navigate: (to: string) => void;
    /** Turns a route into the `href` that a new tab opens, like `#/album/1` for a hash router. */
    resolveHref?: ((to: string) => string) | undefined;
    children: ReactNode;
};

function keepHref(to: string) {
    return to;
}

/** Lets each Link go to routes through the app's router, so `packages/ui` doesn't depend on one. */
export default function LinkProvider({
    navigate,
    resolveHref = keepHref,
    children,
}: LinkProviderProps) {
    const router = useMemo(
        () => ({ navigate, resolveHref }),
        [navigate, resolveHref]
    );
    return (
        <LinkContext.Provider value={router}>{children}</LinkContext.Provider>
    );
}

/** The app's router for links, or `null` when no LinkProvider is above. */
export function useLinkRouter(): LinkRouter | null {
    return useContext(LinkContext);
}
