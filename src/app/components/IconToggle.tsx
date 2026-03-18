import { forwardRef } from 'react';
import { IconButton, IconButtonProps } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props extends IconButtonProps {
    isPressed?: boolean;
}

export const IconToggle = forwardRef<HTMLButtonElement, Props>(
    ({ isPressed = false, className, children, ...rest }, ref) => {
        return (
            <IconButton
                {...rest}
                ref={ref}
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
);

IconToggle.displayName = 'IconToggle';
