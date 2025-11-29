import { Flex, IconButton, Slider } from '@radix-ui/themes';
import {
    PauseIcon,
    PlayIcon,
    TrackNextIcon,
    TrackPreviousIcon,
    SpeakerOffIcon,
    SpeakerLoudIcon,
    ShuffleIcon,
    LoopIcon,
} from '@radix-ui/react-icons';
import { usePlayer } from '../hooks/usePlayer';

export function AdvancedBar() {
    const { isPlaying, volumePercent, muted, isShuffle, repeatMode, controls } =
        usePlayer();

    return (
        <Flex direction="column" gap="3" px="2" py="2" className="w-[200px]">
            <Flex align="center" justify="center" gap="2">
                <IconButton
                    variant="ghost"
                    size="1"
                    radius="full"
                    onClick={controls.previous}
                >
                    <TrackPreviousIcon />
                </IconButton>

                <IconButton
                    size="2"
                    radius="full"
                    onClick={isPlaying ? controls.pause : controls.play}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </IconButton>

                <IconButton
                    variant="ghost"
                    size="1"
                    radius="full"
                    onClick={controls.next}
                >
                    <TrackNextIcon />
                </IconButton>
            </Flex>

            <Flex align="center" gap="3">
                <IconButton onClick={controls.toggleMute}>
                    {muted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
                </IconButton>

                <Slider
                    value={[muted ? 0 : volumePercent]}
                    onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                />
            </Flex>

            <Flex align="center" justify="center" gap="3">
                <IconButton onClick={controls.toggleShuffle}>
                    <ShuffleIcon style={{ opacity: isShuffle ? 1 : 0.5 }} />
                </IconButton>

                <IconButton onClick={controls.toggleRepeat}>
                    <LoopIcon
                        style={{ opacity: repeatMode !== 'off' ? 1 : 0.5 }}
                    />
                </IconButton>
            </Flex>
        </Flex>
    );
}
