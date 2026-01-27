import {
    forwardRef,
    useState,
    type CSSProperties,
    type ReactNode,
    type Ref,
    type MouseEvent,
} from 'react';
import { Text, type TextProps } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props extends Omit<TextProps, 'asChild'> {
    children: ReactNode;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    href?: string;
    interactive?: boolean;
    accentColor?: string;
    disabled?: boolean;
    className?: string;
    style?: CSSProperties;
    buttonClassName?: string;
}

export const TextButton = forwardRef<
    HTMLButtonElement | HTMLAnchorElement | HTMLSpanElement,
    Props
>(function TextButton(
    {
        children,
        onClick,
        href,
        interactive,
        accentColor = 'text-accent-11',
        disabled = false,
        className,
        style,
        buttonClassName,
        ...textProps
    },
    ref
) {
    const hasAction = Boolean(onClick || href);
    const isInteractive = (interactive ?? hasAction) && !disabled;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Text
            {...textProps}
            as="span"
            {...(isInteractive && isHovered
                ? { 'data-accent-color': accentColor }
                : {})}
            className={clsx(
                className,
                isInteractive &&
                    'hover:text-accent-11 focus-visible:text-accent-11 cursor-pointer'
            )}
            style={style}
        >
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(event) => {
                        if (!href || disabled) return;
                        onClick?.(event);
                        if (event.defaultPrevented) return;
                        event.preventDefault();
                        window.open(href, '_blank', 'noreferrer,noopener');
                    }}
                    className={clsx(
                        'no-underline transition-colors',
                        isInteractive &&
                            'hover:text-accent-11 focus-visible:text-accent-11 cursor-pointer focus-visible:underline focus-visible:underline-offset-2 focus-visible:outline-none',
                        buttonClassName
                    )}
                    aria-disabled={disabled || undefined}
                    ref={ref as Ref<HTMLAnchorElement>}
                >
                    {children}
                </a>
            ) : onClick ? (
                <button
                    type="button"
                    onClick={
                        disabled
                            ? undefined
                            : (event) => {
                                  onClick?.(event);
                              }
                    }
                    disabled={disabled}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={clsx(
                        'no-underline transition-colors',
                        isInteractive &&
                            'hover:text-accent-11 focus-visible:text-accent-11 cursor-pointer hover:bg-transparent focus-visible:underline focus-visible:underline-offset-2 focus-visible:outline-none',
                        buttonClassName,
                        'border-0 bg-transparent p-0'
                    )}
                    ref={ref as Ref<HTMLButtonElement>}
                >
                    {children}
                </button>
            ) : (
                <span
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={clsx(
                        'no-underline transition-colors',
                        isInteractive &&
                            'hover:text-accent-11 focus-visible:text-accent-11 cursor-pointer focus-visible:underline focus-visible:underline-offset-2 focus-visible:outline-none',
                        buttonClassName
                    )}
                    aria-disabled={disabled || undefined}
                    ref={ref as Ref<HTMLSpanElement>}
                >
                    {children}
                </span>
            )}
        </Text>
    );
});
