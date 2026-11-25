import {
    isValidElement,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import clsx from 'clsx';
import Spinner from '../Spinner/Spinner';
import Text from '../Text/Text';

type SharedProps = Omit<
    BaseButton.Props,
    'className' | 'style' | 'children' | 'render'
> & {
    /** The height and text size. */
    size?: 'small' | 'medium' | 'large';
    /** The colour intent: white and grey, the accent green, or red for a destructive action. */
    tone?: 'neutral' | 'accent' | 'negative';
    /** An icon before the label. */
    icon?: ReactNode;
    /** Shows a spinner in place of the content, keeps the width, and ignores clicks. */
    loading?: boolean;
    /** What a screen reader says while the button loads. */
    loadingLabel?: string;
    /** A small mark in the top-right corner, like a count. */
    badge?: ReactNode;
    /** Another element to render, like `<a href="…" />` for a link with button styles. A link can't be disabled. */
    render?: ReactElement | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

type LabelledProps = SharedProps & {
    /** The shape: a filled pill, an outlined pill, text, or a circle with an icon. */
    variant?: 'primary' | 'secondary' | 'tertiary';
    children: ReactNode;
};

// An icon-only button has no visible text, so its type requires a label.
type IconProps = SharedProps & {
    variant: 'icon';
    icon: ReactNode;
    'aria-label': string;
    children?: undefined;
};

export type ButtonProps = LabelledProps | IconProps;

/** A button for text, an icon or both, on Base UI's `Button`. */
export default function Button({
    variant = 'secondary',
    size = 'medium',
    tone = 'neutral',
    icon,
    loading = false,
    loadingLabel = 'Loading',
    badge,
    render,
    nativeButton,
    disabled = false,
    className,
    children,
    ...props
}: ButtonProps) {
    // Base UI's Button gives any element the button role, so a link renders on its own to stay a link.
    const isNative =
        nativeButton ?? (!isValidElement(render) || render.type === 'button');
    const shared = {
        className: clsx('button', className),
        'data-variant': variant,
        'data-size': size,
        'data-tone': tone,
        'data-loading': loading || undefined,
        'aria-busy': loading || undefined,
        children: (
            <>
                {icon && (
                    <span data-part="icon" aria-hidden>
                        {icon}
                    </span>
                )}
                {children !== undefined && (
                    <Text inline data-part="label">
                        {children}
                    </Text>
                )}
                {badge !== undefined && <span data-part="badge">{badge}</span>}
                {loading && (
                    <Spinner data-part="spinner" label={loadingLabel} />
                )}
            </>
        ),
    };
    const link = useRender({
        render,
        enabled: !isNative,
        props: { ...props, ...shared },
    });
    if (link) return link;

    return (
        <BaseButton
            {...props}
            {...shared}
            render={render}
            nativeButton
            disabled={disabled || loading}
            focusableWhenDisabled={loading}
        />
    );
}
