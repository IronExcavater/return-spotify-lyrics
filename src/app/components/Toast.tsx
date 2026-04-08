import { useEffect, useState } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { dismissToast, type ToastRecord } from '../data/toastStore';

type Props = {
    toast: ToastRecord;
};

export function Toast({ toast }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (toast.state === 'closing') {
            setIsOpen(false);
            return;
        }

        const frame = requestAnimationFrame(() => setIsOpen(true));
        return () => cancelAnimationFrame(frame);
    }, [toast.state]);

    return (
        <Flex
            role="status"
            align="center"
            gap="2"
            className={clsx(
                'pointer-events-auto rounded-xl border border-grayA-6 bg-panel-solid/60 px-3 py-2 backdrop-blur transition ease-[cubic-bezier(0.16,1,0.3,1)]',
                isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            )}
        >
            <Flex direction="column" gap="1" flexGrow="1">
                <Text size="1" weight="medium">
                    {toast.title}
                </Text>
                {toast.description && (
                    <Text size="1" color="gray">
                        {toast.description}
                    </Text>
                )}
            </Flex>

            <IconButton
                size="0"
                variant="ghost"
                color="gray"
                radius="full"
                aria-label={toast.dismissLabel}
                onClick={() => dismissToast(toast.id)}
            >
                <Cross2Icon />
            </IconButton>
        </Flex>
    );
}
