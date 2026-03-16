import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { PlaybackState, Track } from '@spotify/web-api-ts-sdk';
import type {
    SpotifyRpcArgs,
    SpotifyRpcName,
} from '../../background/spotifyRpc';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import {
    sendSpotifyMessage,
    SPOTIFY_RPC_DISPATCH_EVENT,
    type SpotifyRpcDispatchEventDetail,
} from '../../shared/messaging';
import { updateCachedNowPlaying } from './mediaCacheEntries';

type PlayerSnapshot = {
    playback: PlaybackState | null | undefined;
    progressMs: number;
    durationMs: number;
};

let snapshot: PlayerSnapshot = {
    playback: undefined,
    progressMs: 0,
    durationMs: 0,
};

type OptimisticState = {
    isPlaying?: boolean;
    shuffle?: boolean;
    repeatMode?: 'off' | 'track' | 'context';
    assumeCanControl?: boolean;
    assumeHasPlayback?: boolean;
    assumeItemChange?: boolean;
    expiresAt: number;
};
type OptimisticPatch = Omit<OptimisticState, 'expiresAt'>;

let optimisticState: OptimisticState | null = null;
const OPTIMISTIC_PENDING_MS = 2500;
const PROGRESS_FRAME_EPSILON_MS = 16;
const END_SYNC_THRESHOLD_MS = 400;
const NATURAL_END_DETECTION_MS = 1200;
const NATURAL_END_COOLDOWN_MS = 12000;
const VOLUME_COMMIT_TIMEOUT_MS = 2500;
const SEEK_PREDICTION_HOLD_MS = 2000;
const SEEK_SETTLE_EPSILON_MS = 900;

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let rafId: number | null = null;
let subscriberCount = 0;
let pollIntervalMs = 4000;
let syncInFlight: Promise<void> | null = null;
let syncQueued = false;

const baseProgress = { current: 0 };
const lastSyncRef = { current: null as number | null };
const pendingEndSync = { current: false };
const optimisticPlaybackPendingUntilRef = { current: 0 };
const pendingPlaybackStateRef = {
    expected: null as boolean | null,
    expiresAt: 0,
};
const pendingSeekStateRef = {
    targetMs: null as number | null,
    trackUri: null as string | null,
    expiresAt: 0,
};
const noNextFallbackStateRef = {
    inFlight: false,
};
const naturalEndAdvanceStateRef = {
    cooldownUntil: 0,
    lastTrackUri: null as string | null,
};
const previousPlaybackRef = {
    current: null as {
        isPlaying: boolean;
        uri: string | null;
        progressMs: number;
        durationMs: number;
    } | null,
};
const volumePreviewState = {
    value: null as number | null,
    dragging: false,
    pendingCommit: false,
    commitStartedAt: 0,
};
const lastNonZeroVolumeRef = {
    current: 50,
};

const trackPlayback = createAnalyticsTracker('playback');
let lastPlayState: boolean | null = null;
let lastItemId: string | null = null;

const emit = () => {
    listeners.forEach((listener) => listener());
};

const setSnapshot = (next: Partial<PlayerSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
};

const applyOptimistic = (patch: OptimisticPatch) => {
    optimisticState = {
        ...(optimisticState ?? {}),
        ...patch,
        expiresAt: Date.now() + pollIntervalMs,
    };
    emit();
};

const applyControlOptimistic = (patch: Partial<OptimisticPatch> = {}) => {
    applyOptimistic({
        assumeCanControl: true,
        assumeHasPlayback: true,
        ...patch,
    });
};

const setOptimisticProgress = (
    progressMs: number,
    options?: { assumeControl?: boolean; holdUntilServer?: boolean }
) => {
    if (options?.assumeControl) applyControlOptimistic();
    baseProgress.current = progressMs;
    lastSyncRef.current = Date.now();
    setSnapshot({ progressMs });
    if (options?.holdUntilServer) {
        pendingSeekStateRef.targetMs = progressMs;
        pendingSeekStateRef.trackUri = snapshot.playback?.item?.uri ?? null;
        pendingSeekStateRef.expiresAt = Date.now() + SEEK_PREDICTION_HOLD_MS;
    }
};

const performSync = async () => {
    const state = await sendSpotifyMessage('getPlaybackState');
    const now = Date.now();
    const pendingPlaybackExpected = pendingPlaybackStateRef.expected;
    const pendingPlaybackValid =
        pendingPlaybackExpected != null &&
        now < pendingPlaybackStateRef.expiresAt;
    const playbackMismatchWhilePending =
        pendingPlaybackValid &&
        state != null &&
        state.is_playing !== pendingPlaybackExpected;

    if (pendingPlaybackExpected != null) {
        const settled =
            !state ||
            now >= pendingPlaybackStateRef.expiresAt ||
            state.is_playing === pendingPlaybackExpected;
        if (settled) {
            pendingPlaybackStateRef.expected = null;
            pendingPlaybackStateRef.expiresAt = 0;
        }
    }

    const keepOptimisticPlayback =
        ((!state &&
            optimisticState?.assumeHasPlayback === true &&
            optimisticPlaybackPendingUntilRef.current > now) ||
            playbackMismatchWhilePending) &&
        optimisticState != null;
    if (!keepOptimisticPlayback) {
        optimisticState = null;
    }
    setSnapshot({ playback: state ?? null });
    const latestProgress = state?.progress_ms ?? 0;
    const pendingSeekTarget = pendingSeekStateRef.targetMs;
    const pendingSeekTrackMatches =
        pendingSeekTarget == null ||
        pendingSeekStateRef.trackUri == null ||
        state?.item?.uri == null ||
        pendingSeekStateRef.trackUri === state.item.uri;
    const pendingSeekExpired =
        pendingSeekTarget != null && now >= pendingSeekStateRef.expiresAt;
    const pendingSeekSettled =
        pendingSeekTarget != null &&
        state != null &&
        Math.abs(latestProgress - pendingSeekTarget) <= SEEK_SETTLE_EPSILON_MS;
    const shouldHoldLocalSeekProgress =
        pendingSeekTarget != null &&
        state != null &&
        !pendingSeekExpired &&
        !pendingSeekSettled &&
        pendingSeekTrackMatches;

    if (
        pendingSeekTarget != null &&
        (!shouldHoldLocalSeekProgress || !pendingSeekTrackMatches)
    ) {
        pendingSeekStateRef.targetMs = null;
        pendingSeekStateRef.trackUri = null;
        pendingSeekStateRef.expiresAt = 0;
    }

    if (shouldHoldLocalSeekProgress) {
        setSnapshot({
            durationMs: state?.item?.duration_ms ?? 0,
        });
    } else {
        baseProgress.current = latestProgress;
        lastSyncRef.current = Date.now();
        setSnapshot({
            progressMs: latestProgress,
            durationMs: state?.item?.duration_ms ?? 0,
        });
    }
    if (state) optimisticPlaybackPendingUntilRef.current = 0;

    const serverVolume = state?.device?.volume_percent;
    if (serverVolume != null && volumePreviewState.value != null) {
        const matchesPreview =
            Math.abs(serverVolume - volumePreviewState.value) <= 1;
        const timedOut =
            !volumePreviewState.dragging &&
            Date.now() - volumePreviewState.commitStartedAt >
                VOLUME_COMMIT_TIMEOUT_MS;
        if (matchesPreview || timedOut) {
            clearVolumePreview();
        }
    }

    void maybeHandleNaturalEnd(state ?? null, pendingPlaybackExpected);

    const isPlaying = state?.is_playing ?? false;
    if (lastPlayState !== isPlaying) {
        lastPlayState = isPlaying;
        void trackPlayback(ANALYTICS_EVENTS.playbackState, {
            reason: 'playback state synced',
            data: { playing: isPlaying },
        });
    }

    const item = state?.item;
    if (item) {
        if (item.type === 'track' || item.type === 'episode') {
            updateCachedNowPlaying(item);
        }
        const itemId = item.id ?? item.uri ?? null;
        if (itemId && lastItemId !== itemId) {
            lastItemId = itemId;
            const artists = 'artists' in item ? item.artists : undefined;
            const show = 'show' in item ? item.show : undefined;
            const names = artists?.map((artist) => artist.name) ?? [];
            if (!names.length && show?.name) names.push(show.name);
            void trackPlayback(ANALYTICS_EVENTS.playbackItem, {
                reason: 'playback item changed',
                data: {
                    id: itemId,
                    name: item.name,
                    type: item.type,
                    artists: names,
                },
            });
        }
    }
};

const sync = () => {
    if (syncInFlight) {
        syncQueued = true;
        return syncInFlight;
    }

    syncInFlight = performSync().finally(() => {
        syncInFlight = null;
        if (!syncQueued) return;
        syncQueued = false;
        void sync();
    });

    return syncInFlight;
};

const tick = () => {
    const playback = snapshot.playback;
    const durationMs = snapshot.durationMs;
    const isPlaying =
        optimisticState?.isPlaying ?? playback?.is_playing ?? false;

    if (durationMs > 0) {
        const elapsed =
            isPlaying && lastSyncRef.current
                ? Date.now() - lastSyncRef.current
                : 0;
        const next = Math.min(durationMs, baseProgress.current + elapsed);
        setSnapshot({
            progressMs:
                Math.abs(snapshot.progressMs - next) > PROGRESS_FRAME_EPSILON_MS
                    ? next
                    : snapshot.progressMs,
        });

        if (isPlaying && !pendingEndSync.current) {
            const remaining = durationMs - next;
            if (remaining <= END_SYNC_THRESHOLD_MS) {
                pendingEndSync.current = true;
                void sync().finally(() => {
                    pendingEndSync.current = false;
                });
            }
        }
    }

    if (optimisticState && optimisticState.expiresAt <= Date.now()) {
        optimisticState = null;
        emit();
    }

    rafId = requestAnimationFrame(tick);
};

const startPolling = () => {
    if (pollTimer) return;
    void sync();
    pollTimer = setInterval(() => {
        void sync();
    }, pollIntervalMs);
    rafId = requestAnimationFrame(tick);
};

const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (rafId) cancelAnimationFrame(rafId);
    pollTimer = null;
    rafId = null;
    syncQueued = false;
    pendingEndSync.current = false;
    lastSyncRef.current = null;
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    subscriberCount += 1;
    if (subscriberCount === 1) startPolling();
    return () => {
        listeners.delete(listener);
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount === 0) stopPolling();
    };
};

const getSnapshot = () => snapshot;
const getCurrentIsPlaying = () =>
    optimisticState?.isPlaying ?? snapshot.playback?.is_playing ?? false;

type PlaybackCapabilities = {
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

const derivePlaybackCapabilities = (
    playback: PlaybackState | null | undefined
): PlaybackCapabilities => {
    const isPlaying =
        optimisticState?.isPlaying ?? playback?.is_playing ?? false;
    const device = playback?.device;
    const disallows = (
        playback?.actions as { disallows?: Record<string, boolean> } | undefined
    )?.disallows;
    const canControl =
        device?.is_restricted !== true ||
        optimisticState?.assumeCanControl === true;
    const hasPlayback =
        playback != null || optimisticState?.assumeHasPlayback === true;
    const canSeek = canControl && disallows?.seeking !== true;
    // Spotify can report conservative skip disallows near context boundaries;
    // still allow user intent and resolve with runtime fallback behavior.
    const canSkipNext = canControl && hasPlayback;
    const canSkipPrevious = canControl && hasPlayback;
    const canShuffle = canControl && disallows?.toggling_shuffle !== true;
    const canRepeat =
        canControl &&
        disallows?.toggling_repeat_context !== true &&
        disallows?.toggling_repeat_track !== true;
    const canResume = canControl && disallows?.resuming !== true;
    const canPause = canControl && disallows?.pausing !== true;
    const canTogglePlay = isPlaying ? canPause : canResume;
    const supportsVolume =
        device && 'supports_volume' in device
            ? (device as { supports_volume?: boolean }).supports_volume !==
              false
            : true;
    const canSetVolume =
        canControl && supportsVolume && disallows?.setting_volume !== true;

    return {
        isPlaying,
        canControl,
        hasPlayback,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canTogglePlay,
        canSetVolume,
    };
};

type PlayerShortcutSnapshot = {
    hasPlayback: boolean;
    playbackKnown: boolean;
    isPlaying: boolean;
    canTogglePlay: boolean;
    canSetVolume: boolean;
};

let shortcutSnapshot: PlayerShortcutSnapshot = {
    hasPlayback: false,
    playbackKnown: false,
    isPlaying: false,
    canTogglePlay: false,
    canSetVolume: false,
};

const buildShortcutSnapshot = (): PlayerShortcutSnapshot => {
    const playback = snapshot.playback;
    const capabilities = derivePlaybackCapabilities(playback);

    return {
        hasPlayback: capabilities.hasPlayback,
        playbackKnown: playback !== undefined,
        isPlaying: capabilities.isPlaying,
        canTogglePlay: capabilities.canTogglePlay,
        canSetVolume: capabilities.canSetVolume,
    };
};

const getShortcutSnapshot = () => {
    const next = buildShortcutSnapshot();
    const previous = shortcutSnapshot;
    if (
        previous.hasPlayback === next.hasPlayback &&
        previous.playbackKnown === next.playbackKnown &&
        previous.isPlaying === next.isPlaying &&
        previous.canTogglePlay === next.canTogglePlay &&
        previous.canSetVolume === next.canSetVolume
    ) {
        return previous;
    }
    shortcutSnapshot = next;
    return shortcutSnapshot;
};

const playFromShortcut = async () => {
    const shortcut = getShortcutSnapshot();
    if (!shortcut.canTogglePlay || shortcut.isPlaying) return;
    await resumePlayback(false);
};

const pauseFromShortcut = async () => {
    const shortcut = getShortcutSnapshot();
    if (!shortcut.canTogglePlay || !shortcut.isPlaying) return;
    await pausePlayback(snapshot.progressMs);
};

const toggleMuteFromShortcut = () => {
    const shortcut = getShortcutSnapshot();
    if (!shortcut.canSetVolume) return;

    const currentVolume =
        volumePreviewState.value ??
        snapshot.playback?.device?.volume_percent ??
        100;
    const muted = currentVolume === 0;
    if (!muted) {
        lastNonZeroVolumeRef.current = currentVolume;
    }

    const nextVolume = muted ? lastNonZeroVolumeRef.current || 50 : 0;
    void commitVolumeChange(nextVolume);
};

const resumePlayback = async (assumeItemChange = false) => {
    setOptimisticPlayback(true, { assumeItemChange });
    await sendSpotifyMessage('startResumePlayback');
    void sync();
};

const pausePlayback = async (progressMs: number) => {
    setOptimisticPlayback(false);
    setOptimisticProgress(progressMs);
    await sendAndSync('pausePlayback');
};

const setPendingPlaybackState = (isPlaying: boolean) => {
    pendingPlaybackStateRef.expected = isPlaying;
    pendingPlaybackStateRef.expiresAt = Date.now() + OPTIMISTIC_PENDING_MS;
};

const setOptimisticPlayback = (
    isPlaying: boolean,
    options?: { assumeItemChange?: boolean }
) => {
    optimisticPlaybackPendingUntilRef.current = isPlaying
        ? Date.now() + OPTIMISTIC_PENDING_MS
        : 0;
    setPendingPlaybackState(isPlaying);
    applyControlOptimistic({
        isPlaying,
        assumeItemChange: options?.assumeItemChange,
    });
    baseProgress.current = snapshot.progressMs;
    lastSyncRef.current = Date.now();
};

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

const isNoNextTrackError = (error: unknown) => {
    const message = getErrorMessage(error);
    return (
        message.includes('NO_NEXT_TRACK') ||
        message.includes('No next track') ||
        message.includes('Restriction violated')
    );
};

const isNoPreviousTrackError = (error: unknown) => {
    const message = getErrorMessage(error);
    return (
        message.includes('NO_PREVIOUS_TRACK') ||
        message.includes('No previous track') ||
        message.includes('Restriction violated')
    );
};

const pickMostPlayedNonRecentTrack = async (
    excludeUris: string[]
): Promise<Track | null> => {
    const [topTracks, recentTracks] = await Promise.all([
        sendSpotifyMessage('getTopTracks', {
            limit: 50,
            timeRange: 'long_term',
        }),
        sendSpotifyMessage('getRecentlyPlayedTracks', {
            limit: 50,
        }),
    ]);

    const excluded = new Set(excludeUris.filter(Boolean));
    const recentIds = new Set(
        (recentTracks?.items ?? [])
            .map((entry) => entry?.track?.id ?? '')
            .filter(Boolean)
    );
    const tracks = topTracks?.items ?? [];

    const preferred = tracks.find(
        (track) =>
            Boolean(track.uri) &&
            !excluded.has(track.uri) &&
            !recentIds.has(track.id ?? '')
    );
    if (preferred) return preferred as Track;

    const fallback = tracks.find(
        (track) => Boolean(track.uri) && !excluded.has(track.uri)
    );
    return (fallback as Track | undefined) ?? null;
};

const playNoNextFallbackTrack = async (
    currentUri: string | null
): Promise<boolean> => {
    if (noNextFallbackStateRef.inFlight) return false;
    noNextFallbackStateRef.inFlight = true;
    try {
        const nextTrack = await pickMostPlayedNonRecentTrack(
            currentUri ? [currentUri] : []
        );
        if (!nextTrack?.uri) return false;
        updateCachedNowPlaying(nextTrack);
        setOptimisticPlayback(true, { assumeItemChange: true });
        await sendSpotifyMessage('startPlayback', {
            uris: [nextTrack.uri],
        });
        void sync();
        return true;
    } finally {
        noNextFallbackStateRef.inFlight = false;
    }
};

const maybeHandleNaturalEnd = async (
    state: PlaybackState | null,
    pendingPlaybackExpected: boolean | null
) => {
    const now = Date.now();
    const current = {
        isPlaying: state?.is_playing ?? false,
        uri: state?.item?.uri ?? null,
        progressMs: state?.progress_ms ?? 0,
        durationMs: state?.item?.duration_ms ?? 0,
    };
    const previous = previousPlaybackRef.current;
    previousPlaybackRef.current = current;

    if (!previous) return;
    if (pendingPlaybackExpected === false) return;
    if (current.isPlaying) return;
    if (!previous.isPlaying) return;
    if (!previous.uri || current.uri !== previous.uri) return;
    if (previous.durationMs <= 0) return;
    if (previous.durationMs - previous.progressMs > NATURAL_END_DETECTION_MS) {
        return;
    }

    const naturalEndState = naturalEndAdvanceStateRef;
    if (
        naturalEndState.lastTrackUri === previous.uri &&
        now < naturalEndState.cooldownUntil
    ) {
        return;
    }
    naturalEndState.lastTrackUri = previous.uri;
    naturalEndState.cooldownUntil = now + NATURAL_END_COOLDOWN_MS;

    try {
        await sendSpotifyMessage('skipToNext');
        setOptimisticPlayback(true, { assumeItemChange: true });
        void sync();
        return;
    } catch (error) {
        if (!isNoNextTrackError(error)) return;
    }

    await playNoNextFallbackTrack(previous.uri);
};

const setVolumePreview = (
    value: number,
    options?: { dragging?: boolean; pendingCommit?: boolean }
) => {
    const nextDragging = options?.dragging ?? volumePreviewState.dragging;
    const nextPending =
        options?.pendingCommit ?? volumePreviewState.pendingCommit;
    const changed =
        volumePreviewState.value !== value ||
        volumePreviewState.dragging !== nextDragging ||
        volumePreviewState.pendingCommit !== nextPending;
    if (!changed) return;
    volumePreviewState.value = value;
    volumePreviewState.dragging = nextDragging;
    volumePreviewState.pendingCommit = nextPending;
    if (nextPending) {
        volumePreviewState.commitStartedAt = Date.now();
    }
    emit();
};

const clearVolumePreview = () => {
    if (
        volumePreviewState.value == null &&
        !volumePreviewState.dragging &&
        !volumePreviewState.pendingCommit
    ) {
        return;
    }
    volumePreviewState.value = null;
    volumePreviewState.dragging = false;
    volumePreviewState.pendingCommit = false;
    volumePreviewState.commitStartedAt = 0;
    emit();
};

const commitVolumeChange = async (nextVolume: number) => {
    setVolumePreview(nextVolume, { dragging: false, pendingCommit: true });
    try {
        await sendSpotifyMessage('setPlaybackVolume', nextVolume);
    } catch {
        clearVolumePreview();
    } finally {
        volumePreviewState.dragging = false;
        volumePreviewState.pendingCommit = false;
        void sync();
    }
};

const sendAndSync = async <N extends SpotifyRpcName>(
    action: N,
    payload?: SpotifyRpcArgs<N>
) => {
    await sendSpotifyMessage(action, payload);
    void sync();
};

export function usePlayer(pollMs = 4000) {
    useEffect(() => {
        if (pollMs && pollMs !== pollIntervalMs) {
            pollIntervalMs = pollMs;
            if (pollTimer) {
                stopPolling();
                if (subscriberCount > 0) startPolling();
            }
        }
    }, [pollMs]);

    useEffect(() => {
        const handleFocus = () => {
            if (document.visibilityState === 'visible') void sync();
        };
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, []);

    useEffect(() => {
        const handleDispatch = (event: Event) => {
            const detail = (event as CustomEvent<SpotifyRpcDispatchEventDetail>)
                .detail;
            if (!detail) return;

            switch (detail.op) {
                case 'startResumePlayback':
                    setOptimisticPlayback(true);
                    break;
                case 'startPlayback':
                    setOptimisticPlayback(true, { assumeItemChange: true });
                    break;
                case 'pausePlayback':
                    setOptimisticPlayback(false);
                    break;
                case 'seekToPosition': {
                    const ms =
                        typeof detail.args === 'number' ? detail.args : null;
                    if (ms == null || !Number.isFinite(ms)) return;
                    setOptimisticProgress(ms, {
                        assumeControl: true,
                        holdUntilServer: true,
                    });
                    break;
                }
                case 'skipToNext':
                case 'skipToPrevious':
                case 'toggleShuffle':
                case 'setRepeatMode':
                case 'addToQueue':
                case 'syncQueue':
                    applyControlOptimistic();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener(
            SPOTIFY_RPC_DISPATCH_EVENT,
            handleDispatch as EventListener
        );
        return () => {
            window.removeEventListener(
                SPOTIFY_RPC_DISPATCH_EVENT,
                handleDispatch as EventListener
            );
        };
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const playback = state.playback;
    const progressMs = state.progressMs;
    const durationMs = state.durationMs;

    const {
        isPlaying,
        canControl,
        hasPlayback,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canTogglePlay,
        canSetVolume,
    } = derivePlaybackCapabilities(playback);

    const serverVolumePercent = playback?.device?.volume_percent ?? 100;
    const volumePercent = volumePreviewState.value ?? serverVolumePercent;
    const muted = volumePercent === 0;
    if (!muted) lastNonZeroVolumeRef.current = volumePercent;

    const previewVolume = (v: number) => {
        if (!canSetVolume) return;
        setVolumePreview(v, { dragging: true, pendingCommit: false });
    };

    const setVolume = (v: number) => {
        void trackPlayback(ANALYTICS_EVENTS.playbackVolume, {
            reason: 'volume adjusted',
            data: { volume: v },
        });
        if (!canSetVolume) return;
        void commitVolumeChange(v);
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        void trackPlayback(ANALYTICS_EVENTS.playbackMute, {
            reason: nextMuted ? 'muted playback' : 'unmuted playback',
            data: { muted: nextMuted },
        });
        if (!canSetVolume) return;
        const nextVolume = muted ? lastNonZeroVolumeRef.current || 50 : 0;
        void commitVolumeChange(nextVolume);
    };

    const isShuffle =
        optimisticState?.shuffle ?? playback?.shuffle_state ?? false;
    const shuffleActive = canShuffle ? isShuffle : false;

    const toggleShuffle = () => {
        void trackPlayback(ANALYTICS_EVENTS.playbackShuffle, {
            reason: 'shuffle toggled',
            data: { enabled: !isShuffle },
        });
        if (!canShuffle) return;
        applyOptimistic({ shuffle: !isShuffle });
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode =
        optimisticState?.repeatMode ?? playback?.repeat_state ?? 'off';
    const repeatActiveMode = canRepeat ? repeatMode : 'off';
    const pendingItemChange =
        optimisticState?.assumeItemChange === true &&
        pendingPlaybackStateRef.expected === true &&
        Date.now() < pendingPlaybackStateRef.expiresAt;

    const toggleRepeat = () => {
        const next = repeatMode === 'off' ? 'context' : 'off';
        void trackPlayback(ANALYTICS_EVENTS.playbackRepeat, {
            reason: 'repeat toggled',
            data: { mode: next },
        });
        if (!canRepeat) return;
        applyOptimistic({ repeatMode: next });
        void sendSpotifyMessage('setRepeatMode', next);
    };

    const controls = {
        play: async () => {
            if (!canTogglePlay) return;
            if (getCurrentIsPlaying()) return;
            void trackPlayback(ANALYTICS_EVENTS.playbackPlay, {
                reason: 'playback resumed',
            });
            // Resume current playback to preserve queue position + progress.
            await resumePlayback(false);
        },
        pause: () => {
            if (!canTogglePlay) return;
            if (!getCurrentIsPlaying()) return;
            void trackPlayback(ANALYTICS_EVENTS.playbackPause, {
                reason: 'playback paused',
            });
            return pausePlayback(progressMs);
        },
        next: () => {
            if (!canSkipNext) return;
            void trackPlayback(ANALYTICS_EVENTS.playbackNext, {
                reason: 'skipped to next',
            });
            return sendAndSync('skipToNext').catch((error) => {
                if (!isNoNextTrackError(error)) throw error;
                return playNoNextFallbackTrack(playback?.item?.uri ?? null);
            });
        },
        previous: () => {
            if (!canSkipPrevious) return;
            void trackPlayback(ANALYTICS_EVENTS.playbackPrevious, {
                reason: 'skipped to previous',
            });
            if (progressMs > 3000) {
                setOptimisticProgress(0);
                return sendAndSync('seekToPosition', 0);
            }
            return sendAndSync('skipToPrevious').catch((error) => {
                if (!isNoPreviousTrackError(error)) throw error;
                setOptimisticProgress(0);
                return sendAndSync('seekToPosition', 0);
            });
        },
        seek: (ms: number) => {
            if (!canSeek) return;
            void trackPlayback(ANALYTICS_EVENTS.playbackSeek, {
                reason: 'scrubbed playback',
                data: { positionMs: ms },
            });
            setOptimisticProgress(ms, { holdUntilServer: true });
            return sendAndSync('seekToPosition', ms);
        },
        previewVolume,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
    };

    return {
        playback,
        progressMs,
        durationMs,
        isPlaying,
        volumePercent,
        muted,
        isShuffle: shuffleActive,
        repeatMode: repeatActiveMode,
        hasPlayback,
        canControl,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canSetVolume,
        canTogglePlay,
        pendingItemChange,
        controls,
    };
}

export function usePlayerShortcutState() {
    return useSyncExternalStore(
        subscribe,
        getShortcutSnapshot,
        getShortcutSnapshot
    );
}

export function usePlayerShortcutControls() {
    return useMemo(
        () => ({
            play: playFromShortcut,
            pause: pauseFromShortcut,
            toggleMute: toggleMuteFromShortcut,
        }),
        []
    );
}
