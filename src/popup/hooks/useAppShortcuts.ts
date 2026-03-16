import { useCallback, type RefObject } from 'react';
import { useGlobalShortcut } from './useActions';
import type { BarKey } from './useAppState';

type PlaybackShortcutControls = {
    play: () => Promise<void>;
    pause: () => void | Promise<void>;
    toggleMute: () => void;
};

type UseAppShortcutsArgs = {
    showBars: boolean;
    activeBar: BarKey;
    setActiveBar: (bar: BarKey) => void;
    searchInputRef: RefObject<HTMLInputElement | null>;
    isPlaying: boolean;
    canTogglePlay: boolean;
    canSetVolume: boolean;
    playbackControls: PlaybackShortcutControls;
};

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target.closest('[contenteditable="true"]')) return true;
    const tagName = target.tagName;
    return (
        tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
    );
};

export function useAppShortcuts({
    showBars,
    activeBar,
    setActiveBar,
    searchInputRef,
    isPlaying,
    canTogglePlay,
    canSetVolume,
    playbackControls,
}: UseAppShortcutsArgs) {
    const focusSearch = useCallback(
        (event: KeyboardEvent) => {
            if (!showBars) return;
            event.preventDefault();
            if (activeBar !== 'home') {
                setActiveBar('home');
            }
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            });
        },
        [activeBar, searchInputRef, setActiveBar, showBars]
    );

    const togglePlayback = useCallback(
        (event: KeyboardEvent) => {
            if (!showBars || activeBar !== 'playback' || !canTogglePlay) return;
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            if (isPlaying) {
                void playbackControls.pause();
            } else {
                void playbackControls.play();
            }
        },
        [activeBar, canTogglePlay, isPlaying, playbackControls, showBars]
    );

    const toggleMute = useCallback(
        (event: KeyboardEvent) => {
            if (!showBars || activeBar !== 'playback' || !canSetVolume) return;
            if (isEditableTarget(event.target)) return;
            event.preventDefault();
            playbackControls.toggleMute();
        },
        [activeBar, canSetVolume, playbackControls, showBars]
    );

    useGlobalShortcut(focusSearch, {
        key: 'k',
        metaOrCtrl: true,
        enabled: showBars,
    });

    useGlobalShortcut(togglePlayback, {
        key: ' ',
        enabled: showBars,
    });

    useGlobalShortcut(toggleMute, {
        key: 'm',
        enabled: showBars,
    });
}
