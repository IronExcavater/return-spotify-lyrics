import type { ReactNode } from 'react';
import { Dialog } from '@radix-ui/themes';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    titleSize?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
    children: ReactNode;
};

export function FullPageDialog({
    open,
    onOpenChange,
    title,
    description,
    titleSize = '3',
    children,
}: Props) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content
                size="1"
                className="box-border flex max-h-[calc(100vh-90px)] max-w-[100vw] flex-col overflow-hidden"
            >
                <Dialog.Title mt="1" size={titleSize}>
                    {title}
                </Dialog.Title>
                {description ? (
                    <Dialog.Description size="2" color="gray" mb="3">
                        {description}
                    </Dialog.Description>
                ) : null}
                {children}
            </Dialog.Content>
        </Dialog.Root>
    );
}
