import { createStore, useSelector } from '@tanstack/react-store';

export type AppBarMode = 'home' | 'playback';

type AppState = {
    activeBar: AppBarMode;
    playbackExpanded: boolean;
};

const appStore = createStore<AppState>({
    activeBar: 'home',
    playbackExpanded: false,
});

export function useActiveBar(): AppBarMode {
    return useSelector(appStore, (state) => state.activeBar);
}

export function setActiveBar(activeBar: AppBarMode) {
    appStore.setState((state) =>
        state.activeBar === activeBar ? state : { ...state, activeBar }
    );
}

export function usePlaybackExpanded(): boolean {
    return useSelector(appStore, (state) => state.playbackExpanded);
}

export function setPlaybackExpanded(playbackExpanded: boolean) {
    appStore.setState((state) =>
        state.playbackExpanded === playbackExpanded
            ? state
            : { ...state, playbackExpanded }
    );
}
