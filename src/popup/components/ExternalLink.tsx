import React from 'react';
import { Link, LinkProps } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props extends Omit<LinkProps, 'href'> {
    href: string | undefined;
    pointer?: boolean;
    noAccent?: boolean;
}

export function ExternalLink({
    href,
    children,
    className,
    noAccent = false,
    pointer = true,
    ...rest
}: Props) {
    return (
        <Link asChild {...rest}>
            <a
                onClick={() => {
                    if (href) window.open(href, '_blank', 'noopener');
                }}
                className={clsx(
                    pointer && href && '!cursor-pointer',
                    noAccent && '!text-gray-12',
                    className
                )}
            >
                {children}
            </a>
        </Link>
    );
}
