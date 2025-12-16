import { HomeIcon, PlayIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { IconButton } from '@radix-ui/themes';

interface Props {
    active: 'home' | 'playback';
    canShowPlayback: boolean;
    onShowHome: () => void;
    onShowPlayback: () => void;
}

export function NavBar({
    active,
    canShowPlayback,
    onShowHome,
    onShowPlayback,
}: Props) {
    const items: Array<{
        key: 'home' | 'playback';
        label: string;
        icon: ReactNode;
        disabled: boolean;
    }> = [
        {
            key: 'playback',
            label: 'Player',
            icon: <PlayIcon />,
            disabled: !canShowPlayback,
        },
        {
            key: 'home',
            label: 'Home',
            icon: <HomeIcon />,
            disabled: false,
        },
    ];

    const current = items.some((item) => item.key === active)
        ? active
        : (items[0]?.key ?? 'home');
    const activeIndex = Math.max(
        items.findIndex((item) => item.key === current),
        0
    );

    const INDICATOR_SIZE = 24;
    const GAP = 4;
    const indicatorOffset = activeIndex * (INDICATOR_SIZE + GAP);

    const handleSelect = (key: 'home' | 'playback') => {
        if (key === 'playback') onShowPlayback();
        else onShowHome();
    };

    return (
        <nav
            role="tablist"
            aria-orientation="vertical"
            className="relative flex flex-col items-center gap-1 rounded-full border border-[var(--gray-a5)] bg-[var(--gray-a2)]/80 p-[2px]"
        >
            {items.length > 0 && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-full bg-[var(--accent-a4)] shadow-[0_4px_8px_var(--gray-a6)] transition-transform duration-200 ease-out"
                    style={{
                        transform: `translate(0, ${indicatorOffset}px)`,
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
                    onClick={() => handleSelect(item.key)}
                >
                    {item.icon}
                </IconButton>
            ))}
        </nav>
    );
}
