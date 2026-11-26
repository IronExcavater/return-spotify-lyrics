import {
    isValidElement,
    useMemo,
    useRef,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import clsx from 'clsx';
import { composeRefs } from '../../helpers/ref';
import useLabelFallback from '../../hooks/useLabelFallback';
import Badge from '../Badge/Badge';
import Spinner from '../Spinner/Spinner';
import Text from '../Text/Text';
import Tooltip from '../Tooltip/Tooltip';

type SharedProps = Omit<
    BaseButton.Props,
    'className' | 'style' | 'children' | 'render'
> & {
    /** The shape: a filled pill, an outlined pill, or text. With an icon and no label, every variant is a circle. */
    variant?: 'primary' | 'secondary' | 'tertiary';
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
    /** A mark in the top-right corner, like a Badge. A number shows as a small count Badge. Put a count in the name too. */
    badge?: ReactNode;
    /** A Tooltip with this text. `true` shows the button's `aria-label`, so an icon button shows its name on hover and focus. */
    tooltip?: ReactNode;
    /** Another element to render, like `<a href="…" />` for a link with button styles. A link can't be disabled. */
    render?: ReactElement | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

type LabelledProps = SharedProps & {
    children: ReactNode;
};

// An icon-only button has no visible text, so its type requires a label.
type IconOnlyProps = SharedProps & {
    icon: ReactNode;
    'aria-label': string;
    children?: undefined;
};

export type ButtonProps = LabelledProps | IconOnlyProps;

/** A button for text, an icon or both, on Base UI's `Button`. */
export default function Button({
    variant = 'secondary',
    size = 'medium',
    tone = 'neutral',
    icon,
    loading = false,
    loadingLabel = 'Loading',
    badge,
    tooltip = false,
    render,
    nativeButton,
    disabled = false,
    className,
    children,
    ref,
    ...props
}: ButtonProps) {
    const rootRef = useRef<HTMLButtonElement | null>(null);
    // The button needs its own element to measure the label, and the caller's ref still gets it.
    const setRefs = useMemo(() => composeRefs(rootRef, ref), [ref]);
    // A label with a rendered icon can give way to the icon, and a label alone cuts off.
    useLabelFallback(
        rootRef,
        Boolean(icon) && children !== undefined,
        children
    );
    const badgeNode =
        typeof badge === 'number' ? (
            <Badge count={badge} size="small" />
        ) : (
            badge
        );
    // Base UI's Button gives any element the button role, so a link renders on its own to stay a link.
    const isNative =
        nativeButton ?? (!isValidElement(render) || render.type === 'button');
    const shared = {
        className: clsx('button', className),
        'data-variant': variant,
        'data-size': size,
        'data-tone': tone,
        'data-icon-only': children === undefined || undefined,
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
                {badge !== undefined && (
                    <span data-part="badge">{badgeNode}</span>
                )}
                {loading && (
                    <Spinner data-part="spinner" label={loadingLabel} />
                )}
            </>
        ),
    };
    const link = useRender({
        render,
        enabled: !isNative,
        ref: setRefs,
        props: { ...props, ...shared },
    });
    const button = link ?? (
        <BaseButton
            {...props}
            {...shared}
            ref={setRefs}
            render={render}
            nativeButton
            disabled={disabled || loading}
            focusableWhenDisabled={loading}
        />
    );
    const tooltipLabel = tooltip === true ? props['aria-label'] : tooltip;
    if (!tooltipLabel) return button;

    return <Tooltip label={tooltipLabel}>{button}</Tooltip>;
}
