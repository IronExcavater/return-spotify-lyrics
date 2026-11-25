import type { ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

export type TooltipProviderProps = {
    /** How long a pointer rests on a trigger before the first tooltip opens, in milliseconds. */
    delay?: number;
    /** How soon after one tooltip closes the next one opens at once, in milliseconds. */
    timeout?: number;
    children: ReactNode;
};

/** Groups the tooltips inside it, so after one opens, the next one opens at once, like along a row of icon buttons. */
export default function TooltipProvider({
    delay = 500,
    timeout = 400,
    children,
}: TooltipProviderProps) {
    return (
        <BaseTooltip.Provider delay={delay} timeout={timeout}>
            {children}
        </BaseTooltip.Provider>
    );
}
