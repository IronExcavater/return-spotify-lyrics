import type { ReactNode, RefObject } from 'react';
import { Text } from '@radix-ui/themes';
import clsx from 'clsx';

import type { ControlGroupId } from '../../../hooks/useMediaSectionEditor';
import { TextButton } from '../../TextButton';

export function ControlGroup({
    activeGroup,
    children,
    controlsRef,
    disabled,
    disableTransition,
    groupWidth,
    id,
    label,
    labelRef,
    onToggle,
}: {
    activeGroup: ControlGroupId | null;
    children: ReactNode;
    controlsRef: RefObject<HTMLDivElement | null>;
    disabled: boolean;
    disableTransition: boolean;
    groupWidth: number;
    id: ControlGroupId;
    label: string;
    labelRef: RefObject<HTMLButtonElement | null>;
    onToggle: () => void;
}) {
    const isActive = activeGroup === id;
    const transitionClass = disableTransition
        ? 'transition-none'
        : 'transition-all';

    return (
        <div
            className={clsx(
                'relative flex min-w-0 items-center',
                disableTransition ? 'transition-none' : 'transition-[width]'
            )}
            style={{ width: groupWidth || undefined }}
        >
            <div
                ref={controlsRef}
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none absolute -translate-y-1 opacity-0'
                )}
            >
                {children}
            </div>
            <div
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'pointer-events-none absolute translate-y-1 opacity-0'
                        : 'translate-y-0 opacity-100'
                )}
            >
                <TextButton
                    ref={labelRef}
                    size="2"
                    weight="medium"
                    onClick={onToggle}
                    buttonClassName="px-0.5 py-0.5"
                    disabled={disabled}
                >
                    {label}
                </TextButton>
            </div>
        </div>
    );
}

export function ControlSeparator() {
    return (
        <Text size="1" color="gray" mx="1">
            |
        </Text>
    );
}
