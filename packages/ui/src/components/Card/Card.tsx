import type { ComponentProps, ReactElement } from 'react';
import { useRender } from '@base-ui/react/use-render';
import clsx from 'clsx';

export type CardProps = ComponentProps<'div'> & {
    /** Another element to render, like `<a href="…" />` or `<button type="button" />`, so the whole card is one link or button. Then it can't hold another link or button. */
    render?: ReactElement | undefined;
};

/** A surface for a cover, a title and other content, like an album in a shelf. A card that is a link or a button lights up on hover. */
export default function Card({ render, className, ...props }: CardProps) {
    return useRender({
        render,
        defaultTagName: 'div',
        props: { ...props, className: clsx('card', className) },
    });
}
