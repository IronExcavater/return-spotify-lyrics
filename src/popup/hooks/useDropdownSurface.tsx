import { useCallback, useEffect, useMemo, useRef } from 'react';

type CloseAutoFocusEvent = {
    preventDefault: () => void;
};

type PropagationEvent = {
    stopPropagation: () => void;
};

type DismissReason = 'outside-pointer' | 'outside-focus' | 'escape' | null;

type UseDropdownSurfaceOptions = {
    onRequestClose?: () => void;
    onClosed?: () => void;
    resetKey?: string;
};

export function useDropdownSurface({
    onRequestClose,
    onClosed,
    resetKey,
}: UseDropdownSurfaceOptions = {}) {
    const dismissReasonRef = useRef<DismissReason>(null);

    const stopPortalEvent = useCallback((event: PropagationEvent) => {
        event.stopPropagation();
    }, []);

    useEffect(() => {
        dismissReasonRef.current = null;
    }, [resetKey]);

    const requestClose = useCallback(
        (reason: Exclude<DismissReason, null>) => {
            dismissReasonRef.current = reason;
            onRequestClose?.();
        },
        [onRequestClose]
    );

    const finalizeClose = useCallback(
        (event?: CloseAutoFocusEvent) => {
            const reason = dismissReasonRef.current;
            dismissReasonRef.current = null;

            if (reason === 'outside-pointer' || reason === 'outside-focus') {
                event?.preventDefault();
            }

            onClosed?.();
        },
        [onClosed]
    );

    const contentProps = useMemo(
        () => ({
            onClick: stopPortalEvent,
            onCloseAutoFocus: (event: CloseAutoFocusEvent) => {
                finalizeClose(event);
            },
            onEscapeKeyDown: () => {
                requestClose('escape');
            },
            onPointerDownOutside: () => {
                requestClose('outside-pointer');
            },
            onPointerMove: stopPortalEvent,
            onPointerOver: stopPortalEvent,
            onFocusOutside: () => {
                requestClose('outside-focus');
            },
        }),
        [finalizeClose, requestClose, stopPortalEvent]
    );

    return {
        contentProps,
    };
}
