import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { ExternalLink } from '@return-spotify-lyrics/icons';
import { findLinkKind } from './href';
import { useTextSettings } from '../Text/TextProvider';

export type LinkProps = ComponentProps<'a'> & {
    /** A route in the app, like `/album/1`, or a web address. */
    href: string;
    /** When the underline shows. A link in a sentence needs `always`, so it doesn't stand out by colour alone. */
    underline?: 'hover' | 'always';
    /** An icon before the text, like a noun's. It only decorates, so the link's name stays its text. */
    icon?: ReactNode;
    /** What a screen reader adds to an external link. */
    externalLabel?: string;
};

/**
 * One link for routes in the app and for sites on the web. A route goes through the TextProvider's router, and a
 * web address opens in a new tab with an icon.
 */
export default function Link({
    href,
    underline = 'hover',
    icon,
    externalLabel = 'opens in a new tab',
    className,
    children,
    onClick,
    ...props
}: LinkProps) {
    const router = useTextSettings();
    const kind = findLinkKind(href, location.origin);
    const shared = {
        ...props,
        className: clsx('link', className),
        'data-underline': underline,
    };
    const iconPart = icon && (
        <span data-part="icon" aria-hidden>
            {icon}
        </span>
    );

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
                {iconPart}
                {children}
                <ExternalLink aria-hidden data-part="external-icon" />
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
            {iconPart}
            {children}
        </a>
    );
}

// A modifier key, a middle-click, another target or a download is for the browser, not the router.
function opensElsewhere(event: MouseEvent<HTMLAnchorElement>) {
    const anchor = event.currentTarget;
    // Firefox gives the page's base target for an anchor with no target, so read the attribute.
    const hasOtherTarget =
        (anchor.getAttribute('target') || '_self') !== '_self';
    return (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        hasOtherTarget ||
        anchor.hasAttribute('download')
    );
}
