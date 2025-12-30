import { HomeIcon, PlayIcon } from '@radix-ui/react-icons';
import {
    SegmentedControl,
    type SegmentedControlItem,
} from './SegmentedControl';

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
    const items: SegmentedControlItem<'home' | 'playback'>[] = [
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
            <SegmentedControl
                items={items}
                active={active}
                onSelect={handleSelect}
            />
        </nav>
    );
}
