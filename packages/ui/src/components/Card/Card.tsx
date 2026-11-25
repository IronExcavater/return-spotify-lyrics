import type { ComponentProps, ReactElement } from 'react';
import { useRender } from '@base-ui/react/use-render';
import clsx from 'clsx';

export type CardProps = ComponentProps<'div'> & {
    /** Another element to render, like `<a href="…" />` or `<button type="button" />`, so the whole card is one link or button. Then it can't hold another link or button. */
    render?: ReactElement | undefined;
};

/**
 * A surface for a cover, a title and other content, like an album in a shelf. A card that is a link or a button lights
 * up on hover. Its content chooses how it responds to the card, with the `group-hover/card:`, `group-active/card:` and
 * `group-focus-visible/card:` variants.
 */
export default function Card({ render, className, ...props }: CardProps) {
    return useRender({
        render,
        defaultTagName: 'div',
        // The card is a named group, so its content can respond to it even inside another group.
        props: { ...props, className: clsx('card group/card', className) },
    });
}
