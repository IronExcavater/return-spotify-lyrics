import type { ComponentProps, MouseEvent } from 'react';
import clsx from 'clsx';
import { ExternalLink } from '@return-spotify-lyrics/icons';
import { findLinkKind } from './href';
import { useLinkRouter } from './LinkProvider';

export type LinkProps = ComponentProps<'a'> & {
    /** A route in the app, like `/album/1`, or a web address. */
    href: string;
    /** When the underline shows. A link in a sentence needs `always`, so it doesn't stand out by colour alone. */
    underline?: 'hover' | 'always';
    /** What a screen reader adds to an external link. */
    externalLabel?: string;
};

/**
 * One link for routes in the app and for sites on the web. A route goes through the LinkProvider's router, and a
 * web address opens in a new tab with an icon.
 */
export default function Link({
    href,
    underline = 'hover',
    externalLabel = 'opens in a new tab',
    className,
    children,
    onClick,
    ...props
}: LinkProps) {
    const router = useLinkRouter();
    const kind = findLinkKind(href, location.origin);
    const shared = {
        ...props,
        className: clsx('link', className),
        'data-underline': underline,
    };

    if (kind === 'external') {
        return (
            <a
                {...shared}
                href={href}
                target="_blank"
                rel="noreferrer"
                data-external=""
                onClick={onClick}
            >
                {children}
                <ExternalLink aria-hidden data-part="icon" />
                <span data-part="external-label"> ({externalLabel})</span>
            </a>
        );
    }

    // Without a provider, a route is a plain anchor that the browser follows.
    const appRouter = kind === 'internal' ? router : null;
    const route = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!appRouter || event.defaultPrevented || opensElsewhere(event))
            return;
        event.preventDefault();
        appRouter.navigate(href);
    };

    return (
        <a
            {...shared}
            href={appRouter ? appRouter.resolveHref(href) : href}
            onClick={route}
        >
            {children}
        </a>
    );
}

// A middle-click or a click with a modifier key opens a new tab or window, which the browser does itself.
function opensElsewhere(event: MouseEvent) {
    return (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    );
}
