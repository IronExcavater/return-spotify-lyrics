import { ReactNode } from 'react';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    interactive?: boolean;
}

export function FilterPill({
    children,
    onClick,
    className,
    interactive = false,
}: Props) {
    const clickable = interactive || Boolean(onClick);

    return (
        <Flex
            align="center"
            gap="2"
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(event) => {
                if (!clickable || !onClick) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
            className={clsx(
                'min-h-[26px] rounded-full border border-[var(--gray-a5)] bg-[var(--color-panel-solid)] px-2 py-1 backdrop-blur',
                clickable && 'cursor-pointer',
                className
            )}
        >
            {children}
        </Flex>
    );
}
