import { useCallback, useMemo } from 'react';

type StopPropagationEvent = {
    stopPropagation: () => void;
};

type UseOverlaySurfaceOptions = {
    onClose?: () => void;
};

export function useOverlaySurface(options: UseOverlaySurfaceOptions = {}) {
    const { onClose } = options;

    const stopInsidePropagation = useCallback((event: StopPropagationEvent) => {
        event.stopPropagation();
    }, []);

    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    const boundaryProps = useMemo(
        () => ({
            onPointerDown: stopInsidePropagation,
            onClick: stopInsidePropagation,
        }),
        [stopInsidePropagation]
    );

    const dismissProps = useMemo(
        () => ({
            onCloseAutoFocus: handleClose,
            onEscapeKeyDown: handleClose,
            onPointerDownOutside: handleClose,
            onFocusOutside: handleClose,
        }),
        [handleClose]
    );

    return {
        boundaryProps,
        dismissProps,
    };
}
