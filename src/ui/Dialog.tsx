import type { ComponentProps, ReactNode } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import clsx from 'clsx';

type ContentProps = Omit<ComponentProps<typeof BaseDialog.Popup>, 'children' | 'title'> & {
    children: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    showClose?: boolean;
};

function Content({
    children,
    title,
    description,
    showClose = true,
    className,
    ...props
}: ContentProps) {
    return (
        <BaseDialog.Portal>
            <BaseDialog.Backdrop className="fixed inset-0 z-100 bg-black/60 backdrop-blur-[1px] transition-opacity" />
            <BaseDialog.Viewport className="fixed inset-0 z-101 flex items-center justify-center overflow-y-auto p-4">
                <BaseDialog.Popup
                    {...props}
                    className={clsx(
                        'relative w-full max-w-md rounded-panel border border-border bg-surface-raised p-5 text-text shadow-2xl outline-none',
                        className
                    )}
                >
                    {(title || description) && (
                        <header className="mb-4 pr-8">
                            {title && (
                                <BaseDialog.Title className="text-lg font-semibold">
                                    {title}
                                </BaseDialog.Title>
                            )}
                            {description && (
                                <BaseDialog.Description className="mt-1 text-sm text-text-muted">
                                    {description}
                                </BaseDialog.Description>
                            )}
                        </header>
                    )}

                    {children}

                    {showClose && (
                        <BaseDialog.Close
                            aria-label="Close"
                            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full text-text-muted outline-none transition hover:bg-surface-hover hover:text-text focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            <X aria-hidden="true" size={16} />
                        </BaseDialog.Close>
                    )}
                </BaseDialog.Popup>
            </BaseDialog.Viewport>
        </BaseDialog.Portal>
    );
}

export const Dialog = {
    Root: BaseDialog.Root,
    Trigger: BaseDialog.Trigger,
    Content,
    Close: BaseDialog.Close,
    Title: BaseDialog.Title,
    Description: BaseDialog.Description,
};
