import { createContext, useContext, useMemo, type ReactNode } from 'react';

type TextSettings = {
    navigate: (to: string) => void;
    resolveHref: (to: string) => string;
};

const TextContext = createContext<TextSettings | null>(null);

export type TextProviderProps = {
    /** Goes to a route in the app, like React Router's `navigate`. */
    navigate: (to: string) => void;
    /** Turns a route into the `href` that a new tab opens, like `#/album/1` for a hash router. */
    resolveHref?: ((to: string) => string) | undefined;
    children: ReactNode;
};

function keepHref(to: string) {
    return to;
}

/** Connects every Text and Link to the app, so `packages/ui` doesn't depend on its router. */
export default function TextProvider({
    navigate,
    resolveHref = keepHref,
    children,
}: TextProviderProps) {
    const settings = useMemo(
        () => ({ navigate, resolveHref }),
        [navigate, resolveHref]
    );
    return (
        <TextContext.Provider value={settings}>{children}</TextContext.Provider>
    );
}

/** The app's settings for text, or `null` when no TextProvider is above. */
export function useTextSettings(): TextSettings | null {
    return useContext(TextContext);
}
