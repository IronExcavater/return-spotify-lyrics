import { IconButton, Slider } from '@radix-ui/themes';
import {
    SpeakerOffIcon,
    SpeakerQuietIcon,
    SpeakerModerateIcon,
    SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import clsx from 'clsx';

import { usePlayer } from '../hooks/usePlayer';

export type PlaybackVolumeDirection = 'left' | 'right' | 'up' | 'down';
export type PlaybackVolumeDisplayMode = 'popover' | 'inline';

interface Props {
    className?: string;
    direction?: PlaybackVolumeDirection;
    display?: PlaybackVolumeDisplayMode;
}

const POPOVER_POSITION: Record<PlaybackVolumeDirection, string> = {
    right: 'left-full top-1/2 -translate-y-1/2',
    left: 'right-full top-1/2 -translate-y-1/2',
    up: 'bottom-full left-1/2 -translate-x-1/2',
    down: 'top-full left-1/2 -translate-x-1/2',
};

function getVolumeIcon(volumePercent: number, muted: boolean) {
    if (muted || volumePercent === 0) return <SpeakerOffIcon />;
    if (volumePercent < 33) return <SpeakerQuietIcon />;
    if (volumePercent < 66) return <SpeakerModerateIcon />;
    return <SpeakerLoudIcon />;
}

export function PlaybackVolume({
    className,
    direction = 'right',
    display = 'popover',
}: Props) {
    const { volumePercent, muted, controls } = usePlayer();

    const currentVolume = muted ? 0 : volumePercent;
    const orientation =
        direction === 'up' || direction === 'down' ? 'vertical' : 'horizontal';

    const iconButton = (
        <IconButton
            variant="ghost"
            radius="full"
            size="1"
            onClick={controls.toggleMute}
            className="relative before:pointer-events-none before:absolute before:-inset-2 before:content-['']"
        >
            {getVolumeIcon(volumePercent, muted)}
        </IconButton>
    );

    const slider = (
        <Slider
            aria-label="Volume"
            size="1"
            orientation={orientation}
            className={clsx(
                orientation === 'horizontal' ? 'min-w-[7rem]' : 'min-h-[7rem]'
            )}
            value={[currentVolume]}
            onValueChange={(v) => controls.setVolume(v[0] ?? 0)}
            min={0}
            max={100}
            step={1}
        />
    );

    if (display === 'inline') {
        const inlineDirectionClass =
            orientation === 'horizontal'
                ? direction === 'right'
                    ? 'flex-row'
                    : 'flex-row-reverse'
                : direction === 'down'
                  ? 'flex-col'
                  : 'flex-col-reverse';

        return (
            <div
                className={clsx(
                    'inline-flex items-center gap-2',
                    inlineDirectionClass,
                    className
                )}
            >
                {iconButton}
                {slider}
            </div>
        );
    }

    return (
        <div
            className={clsx(
                'group relative inline-flex items-center',
                className
            )}
        >
            {iconButton}

            <div
                className={clsx(
                    'pointer-events-none absolute z-1 p-1',
                    POPOVER_POSITION[direction],
                    'group-focus-within:pointer-events-auto group-hover:pointer-events-auto'
                )}
            >
                <div
                    className={clsx(
                        'rounded-full bg-black/60 p-2 opacity-0 backdrop-blur-xs transition-opacity duration-150 ease-out',
                        'group-focus-within:opacity-100 group-hover:opacity-100'
                    )}
                >
                    {slider}
                </div>
            </div>
        </div>
    );
}
