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
            color={isPressed ? undefined : 'gray'}
            className={clsx(
                'transition-colors',
                isPressed ? 'hover:text-accent-12' : 'hover:text-gray-11',
                className
            )}
        >
            {children}
        </IconButton>
    );
}
