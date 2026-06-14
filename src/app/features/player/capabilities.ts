import type { PlaybackState } from '@spotify/web-api-ts-sdk';

export type PlaybackCapabilityOptimisticState = {
    isPlaying?: boolean;
    assumeCanControl?: boolean;
    assumeHasPlayback?: boolean;
};

export type PlaybackCapabilities = {
    isPlaying: boolean;
    canControl: boolean;
    hasPlayback: boolean;
    canSeek: boolean;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
    canShuffle: boolean;
    canRepeat: boolean;
    canTogglePlay: boolean;
    canSetVolume: boolean;
};

export type PlayerShortcutSnapshot = {
    hasPlayback: boolean;
    playbackKnown: boolean;
    isPlaying: boolean;
    canTogglePlay: boolean;
    canSetVolume: boolean;
};

export function getPlaybackCapabilities({
    optimisticState,
    playback,
    premiumPlaybackBlocked,
}: {
    optimisticState: PlaybackCapabilityOptimisticState | null;
    playback: PlaybackState | null | undefined;
    premiumPlaybackBlocked: boolean;
}): PlaybackCapabilities {
    const isPlaying =
        optimisticState?.isPlaying ?? playback?.is_playing ?? false;
    const device = playback?.device;
    const disallows = (
        playback?.actions as { disallows?: Record<string, boolean> } | undefined
    )?.disallows;
    const canControl =
        !premiumPlaybackBlocked &&
        (device?.is_restricted !== true ||
            optimisticState?.assumeCanControl === true);
    const hasPlayback =
        playback != null || optimisticState?.assumeHasPlayback === true;
    const canSeek = canControl && disallows?.seeking !== true;
    const canSkipNext = canControl && hasPlayback;
    const canSkipPrevious = canControl && hasPlayback;
    const canShuffle = canControl && disallows?.toggling_shuffle !== true;
    const canRepeat =
        canControl &&
        disallows?.toggling_repeat_context !== true &&
        disallows?.toggling_repeat_track !== true;
    const canResume = canControl && disallows?.resuming !== true;
    const canPause = canControl && disallows?.pausing !== true;
    const supportsVolume =
        device && 'supports_volume' in device
            ? (device as { supports_volume?: boolean }).supports_volume !==
              false
            : true;

    return {
        isPlaying,
        canControl,
        hasPlayback,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canTogglePlay: isPlaying ? canPause : canResume,
        canSetVolume:
            canControl && supportsVolume && disallows?.setting_volume !== true,
    };
}

export function buildShortcutSnapshot({
    optimisticState,
    playback,
    premiumPlaybackBlocked,
}: {
    optimisticState: PlaybackCapabilityOptimisticState | null;
    playback: PlaybackState | null | undefined;
    premiumPlaybackBlocked: boolean;
}): PlayerShortcutSnapshot {
    const capabilities = getPlaybackCapabilities({
        optimisticState,
        playback,
        premiumPlaybackBlocked,
    });

    return {
        hasPlayback: capabilities.hasPlayback,
        playbackKnown: playback !== undefined,
        isPlaying: capabilities.isPlaying,
        canTogglePlay: capabilities.canTogglePlay,
        canSetVolume: capabilities.canSetVolume,
    };
}
