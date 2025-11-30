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
                // Base ghost button text/icon color
                'text-gray-11 hover:text-gray-12',

                // Active state uses Radix accent tokens
                isPressed &&
                    'text-[var(--accent-11)] hover:text-[var(--accent-12)]',

                // Increase click precision
                'transition-colors duration-150',

                className
            )}
        >
            {children}
        </IconButton>
    );
}
