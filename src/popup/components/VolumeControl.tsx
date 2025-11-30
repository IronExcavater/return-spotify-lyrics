import { Flex, IconButton, Slider } from '@radix-ui/themes';
import {
    SpeakerOffIcon,
    SpeakerQuietIcon,
    SpeakerModerateIcon,
    SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { usePlayer } from '../hooks/usePlayer';

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
            gap="2"
            className={['group relative', className].filter(Boolean).join(' ')}
        >
            <IconButton
                variant="ghost"
                radius="full"
                size="1"
                onClick={controls.toggleMute}
            >
                {getVolumeIcon(volumePercent, muted)}
            </IconButton>

            {/* Hover / focus–reveal slider */}
            <Slider
                aria-label="Volume"
                className="no-thumb volume-slider pointer-events-none w-0 opacity-0 transition-all duration-150 ease-out group-focus-within:pointer-events-auto group-focus-within:w-24 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:w-24 group-hover:opacity-100"
                value={[currentVolume]}
                onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
                min={0}
                max={100}
                step={1}
            />
        </Flex>
    );
}
