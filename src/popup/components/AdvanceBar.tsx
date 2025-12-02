import { Flex } from '@radix-ui/themes';
import { ShuffleIcon, LoopIcon } from '@radix-ui/react-icons';
import { usePlayer } from '../hooks/usePlayer';
import { IconToggle } from './IconToggle';

export function AdvancedBar() {
    const { isShuffle, repeatMode, controls } = usePlayer();

    const repeatActive = repeatMode !== 'off';

    return (
        <Flex
            align="center"
            justify="end"
            gap="1"
            pt="1"
            className="border-t border-[var(--gray-a6)]"
        >
            <IconToggle
                variant="ghost"
                radius="full"
                size="1"
                isPressed={isShuffle}
                onClick={controls.toggleShuffle}
            >
                <ShuffleIcon />
            </IconToggle>

            <IconToggle
                variant="ghost"
                radius="full"
                size="1"
                isPressed={repeatActive}
                onClick={controls.toggleRepeat}
            >
                <LoopIcon />
            </IconToggle>
        </Flex>
    );
}
