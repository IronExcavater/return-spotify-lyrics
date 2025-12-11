import { IconButton, Slider } from '@radix-ui/themes';
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

export function SoundDial({ className }: Props) {
    const { volumePercent, muted, controls } = usePlayer();

    const currentVolume = muted ? 0 : volumePercent;

    return (
        <div
            className={clsx(
                'group relative inline-flex items-center',
                className
            )}
        >
            <IconButton
                variant="ghost"
                radius="full"
                size="1"
                onClick={controls.toggleMute}
                className="relative before:pointer-events-none before:absolute before:-inset-2 before:content-['']"
            >
                {getVolumeIcon(volumePercent, muted)}
            </IconButton>

            <div
                className={clsx(
                    'pointer-events-none absolute top-1/2 left-full z-1 -translate-y-1/2 items-center p-1',
                    'group-focus-within:pointer-events-auto group-hover:pointer-events-auto'
                )}
            >
                <div
                    className={clsx(
                        'rounded-full bg-black/60 p-2 opacity-0 backdrop-blur-xs transition-all duration-150 ease-out',
                        'group-focus-within:opacity-100 group-hover:opacity-100'
                    )}
                >
                    <Slider
                        aria-label="Volume"
                        size="1"
                        className="min-w-[7rem]"
                        value={[currentVolume]}
                        onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
                        min={0}
                        max={100}
                        step={1}
                    />
                </div>
            </div>
        </div>
    );
}
