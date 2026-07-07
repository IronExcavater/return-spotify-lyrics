import { sendSpotifyMessage } from '../../../shared/messaging';

const VOLUME_COMMIT_TIMEOUT_MS = 2500;

type VolumePreviewOptions = {
    dragging?: boolean;
    pendingCommit?: boolean;
};

export function createVolumePreviewController({
    emit,
    sync,
}: {
    emit: () => void;
    sync: () => void;
}) {
    const state = {
        value: null as number | null,
        dragging: false,
        pendingCommit: false,
        commitStartedAt: 0,
    };
    let lastNonZeroVolume = 50;

    const setPreview = (value: number, options?: VolumePreviewOptions) => {
        const dragging = options?.dragging ?? state.dragging;
        const pendingCommit = options?.pendingCommit ?? state.pendingCommit;
        const changed =
            state.value !== value ||
            state.dragging !== dragging ||
            state.pendingCommit !== pendingCommit;
        if (!changed) return;

        state.value = value;
        state.dragging = dragging;
        state.pendingCommit = pendingCommit;
        if (pendingCommit) {
            state.commitStartedAt = Date.now();
        }
        emit();
    };

    const clear = () => {
        if (state.value == null && !state.dragging && !state.pendingCommit) {
            return;
        }

        state.value = null;
        state.dragging = false;
        state.pendingCommit = false;
        state.commitStartedAt = 0;
        emit();
    };

    return {
        getDisplayState(serverVolumePercent: number) {
            const volumePercent = state.value ?? serverVolumePercent;
            if (volumePercent !== 0) lastNonZeroVolume = volumePercent;
            return {
                muted: volumePercent === 0,
                volumePercent,
            };
        },

        getToggleVolume(muted: boolean, currentVolume: number) {
            if (!muted) lastNonZeroVolume = currentVolume;
            return muted ? lastNonZeroVolume || 50 : 0;
        },

        settleServerVolume(serverVolume?: number | null) {
            if (serverVolume == null || state.value == null) return;

            const matchesPreview = Math.abs(serverVolume - state.value) <= 1;
            const timedOut =
                !state.dragging &&
                Date.now() - state.commitStartedAt > VOLUME_COMMIT_TIMEOUT_MS;
            if (matchesPreview || timedOut) clear();
        },

        preview(value: number) {
            setPreview(value, { dragging: true, pendingCommit: false });
        },

        async commit(value: number) {
            setPreview(value, { dragging: false, pendingCommit: true });
            try {
                await sendSpotifyMessage('setPlaybackVolume', value);
            } catch {
                clear();
            } finally {
                state.dragging = false;
                state.pendingCommit = false;
                sync();
            }
        },
    };
}
