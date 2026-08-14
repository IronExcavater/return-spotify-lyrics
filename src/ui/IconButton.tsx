import type { ReactNode } from 'react';
import clsx from 'clsx';

import { Button, type ButtonProps } from './Button';

type IconButtonProps = Omit<ButtonProps, 'children'> & {
    label: string;
    children: ReactNode;
};

export function IconButton({
    label,
    children,
    className,
    ...props
}: IconButtonProps) {
    return (
        <Button
            {...props}
            aria-label={label}
            className={clsx('aspect-square px-0', className)}
        >
            {children}
        </Button>
    );
}
