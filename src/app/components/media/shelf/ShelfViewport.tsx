import {
    type FocusEvent,
    type KeyboardEvent,
    type MutableRefObject,
    type ReactNode,
} from 'react';
import type { DroppableProvided } from '@hello-pangea/dnd';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';

import { ShelfFades } from './ShelfFades';
import type { MediaShelfOrientation } from './types';

type FadeState = {
    end: boolean;
    start: boolean;
};

type Props = {
    children: ReactNode;
    className?: string;
    dropProvided?: DroppableProvided;
    fade: FadeState;
    fixedHeight?: number;
    interactive: boolean;
    onFocusCapture: (event: FocusEvent<HTMLElement>) => void;
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
    orientation: MediaShelfOrientation;
    scrollRef: MutableRefObject<HTMLDivElement | null>;
};

export function ShelfViewport({
    children,
    className,
    dropProvided,
    fade,
    fixedHeight,
    interactive,
    onFocusCapture,
    onKeyDownCapture,
    orientation,
    scrollRef,
}: Props) {
    return (
        <Flex className="relative -mx-1">
            <Flex
                direction={orientation === 'horizontal' ? 'row' : 'column'}
                gap="1"
                wrap="nowrap"
                {...(dropProvided?.droppableProps ?? {})}
                onFocusCapture={onFocusCapture}
                onKeyDownCapture={onKeyDownCapture}
                className={clsx(
                    'no-overflow-anchor relative w-full p-1 transition-[opacity,filter]',
                    !interactive && 'pointer-events-none opacity-70',
                    orientation !== 'horizontal' && 'scrollbar-gutter-stable',
                    orientation === 'horizontal'
                        ? fixedHeight
                            ? 'overflow-x-auto overflow-y-hidden'
                            : 'overflow-x-auto overflow-y-visible'
                        : fixedHeight
                          ? 'overflow-y-auto'
                          : 'overflow-visible',
                    className
                )}
                style={
                    fixedHeight
                        ? { maxHeight: fixedHeight, overflowAnchor: 'none' }
                        : { overflowAnchor: 'none' }
                }
                ref={(node) => {
                    dropProvided?.innerRef(node);
                    scrollRef.current = node;
                }}
            >
                {children}
            </Flex>
            <ShelfFades fade={fade} orientation={orientation} />
        </Flex>
    );
}
