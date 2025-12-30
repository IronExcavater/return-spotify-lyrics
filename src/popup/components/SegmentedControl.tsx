import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconButton } from '@radix-ui/themes';

export interface SegmentedControlItem<Key extends string> {
    key: Key;
    label: string;
    icon: ReactNode;
    disabled?: boolean;
}

interface Props<Key extends string> {
    items: ReadonlyArray<SegmentedControlItem<Key>>;
    active: Key;
    onSelect: (key: Key) => void;
    indicatorSize?: number;
    orientation?: 'vertical' | 'horizontal';
}

export function SegmentedControl<Key extends string>({
    items,
    active,
    onSelect,
    indicatorSize = 24,
    orientation = 'vertical',
}: Props<Key>) {
    const current = useMemo(
        () =>
            items.some((item) => item.key === active) ? active : items[0]?.key,
        [items, active]
    );

    const itemRefs = useRef(new Map<Key, HTMLButtonElement | null>());
    const [indicatorPos, setIndicatorPos] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const node = current ? itemRefs.current.get(current) : null;
        if (!node) return;

        const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = node;
        setIndicatorPos({
            x: offsetLeft + offsetWidth / 2,
            y: offsetTop + offsetHeight / 2,
        });
    }, [current, items]);

    const setItemRef = (key: Key) => (node: HTMLButtonElement | null) => {
        if (node) itemRefs.current.set(key, node);
        else itemRefs.current.delete(key);
    };

    return (
        <>
            {items.length > 0 && (
                <span
                    aria-hidden="true"
                    data-orientation={orientation}
                    className="pointer-events-none absolute rounded-full bg-[var(--accent-a4)] transition-transform duration-200 ease-out"
                    style={{
                        top: 0,
                        left: 0,
                        height: indicatorSize,
                        width: indicatorSize,
                        transform: `translate(${indicatorPos.x - indicatorSize / 2}px, ${indicatorPos.y - indicatorSize / 2}px)`,
                    }}
                />
            )}

            {items.map((item) => (
                <IconButton
                    key={item.key}
                    size="1"
                    radius="full"
                    variant="ghost"
                    disabled={item.disabled}
                    aria-label={item.label}
                    aria-selected={item.key === current}
                    aria-disabled={item.disabled}
                    ref={setItemRef(item.key)}
                    onClick={() => {
                        if (item.disabled) return;
                        onSelect(item.key);
                    }}
                >
                    {item.icon}
                </IconButton>
            ))}
        </>
    );
}
