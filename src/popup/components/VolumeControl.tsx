import { Flex, IconButton, Slider } from '@radix-ui/themes';
import {
    SpeakerOffIcon,
    SpeakerQuietIcon,
    SpeakerModerateIcon,
    SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { usePlayer } from '../hooks/usePlayer';
import clsx from 'clsx';

interface Props {
    className?: string;
}

function getVolumeIcon(volumePercent: number, muted: boolean) {
    if (muted || volumePercent === 0) return <SpeakerOffIcon />;
    if (volumePercent < 33) return <SpeakerQuietIcon />;
    if (volumePercent < 66) return <SpeakerModerateIcon />;
    return <SpeakerLoudIcon />;
}

export function VolumeControl({ className }: Props) {
    const { volumePercent, muted, controls } = usePlayer();

    const currentVolume = muted ? 0 : volumePercent;

    return (
        <Flex
            align="center"
            gap="1"
            className={clsx(
                'group grow-0 transition-all duration-150 ease-out hover:grow',
                className
            )}
        >
            <IconButton
                variant="ghost"
                radius="full"
                size="1"
                onClick={controls.toggleMute}
            >
                {getVolumeIcon(volumePercent, muted)}
            </IconButton>

            <Slider
                aria-label="Volume"
                size="1"
                className="opacity-0 group-hover:opacity-100"
                value={[currentVolume]}
                onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
                min={0}
                max={100}
                step={1}
            />
        </Flex>
    );
}
