import { IconButton, IconButtonProps } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props extends IconButtonProps {
    isPressed?: boolean;
}

export function IconToggle({
    isPressed = false,
    className,
    children,
    ...rest
}: Props) {
    return (
        <IconButton
            {...rest}
            className={clsx(
                'text-gray-11 hover:text-gray-12 transition-colors',
                isPressed &&
                    'text-[var(--accent-11)] hover:text-[var(--accent-12)]',
                className
            )}
        >
            {children}
        </IconButton>
    );
}
