import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { IconButton, type IconButtonProps } from '@radix-ui/themes';
import clsx from 'clsx';

type Props = Omit<IconButtonProps, 'children'>;

export function BackButton({ className, ...props }: Props) {
    return (
        <IconButton
            size="1"
            variant="ghost"
            radius="full"
            aria-label="Go back"
            className={clsx('h-6 w-6 shrink-0 p-0!', className)}
            {...props}
        >
            <ChevronLeftIcon />
        </IconButton>
    );
}
