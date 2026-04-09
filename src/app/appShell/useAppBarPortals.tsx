import { useMemo } from 'react';
import { PersonIcon } from '@radix-ui/react-icons';
import type { NavigateFunction } from 'react-router-dom';

import { AvatarButton } from '../components/AvatarButton';
import { NavBar } from '../components/NavBar';
import { type BarKey } from '../hooks/useAppState';
import { type HomeRouteState, type RouteState } from '../hooks/useHistory';
import { usePortalSlot } from '../hooks/usePortalSlot';

const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];

type UseAppBarPortalsOptions = {
    activeBar: BarKey;
    setActiveBar: (bar: BarKey) => void;
    showBars: boolean;
    canShowPlaybackBar: boolean;
    pathname: string;
    navigate: NavigateFunction;
    goBack: () => { path: string; state?: RouteState } | null;
    profileImage?: string;
    lastContentPath: string;
    lastHomeState: HomeRouteState | null;
};

export function useAppBarPortals({
    activeBar,
    setActiveBar,
    showBars,
    canShowPlaybackBar,
    pathname,
    navigate,
    goBack,
    profileImage,
    lastContentPath,
    lastHomeState,
}: UseAppBarPortalsOptions) {
    const profileSlot = useMemo(
        () => (
            <AvatarButton
                avatar={{
                    fallback: <PersonIcon />,
                    radius: 'full',
                    size: '3',
                    src: profileImage,
                }}
                variant="ghost"
                size="2"
                onClick={() => {
                    if (pathname === '/profile') {
                        const previous = goBack();
                        if (previous) return;

                        navigate(lastContentPath || '/home', {
                            replace: true,
                            state:
                                lastContentPath === '/home'
                                    ? (lastHomeState ?? undefined)
                                    : undefined,
                        });
                        return;
                    }

                    navigate('/profile');
                }}
                aria-pressed={pathname === '/profile'}
                aria-selected={pathname === '/profile'}
                aria-current={pathname === '/profile' ? 'page' : undefined}
            />
        ),
        [
            goBack,
            lastContentPath,
            lastHomeState,
            navigate,
            pathname,
            profileImage,
        ]
    );

    const navSlot = useMemo(
        () => (
            <NavBar
                active={activeBar}
                canShowPlayback={canShowPlaybackBar}
                onShowHome={() => setActiveBar('home')}
                onShowPlayback={() => setActiveBar('playback')}
            />
        ),
        [activeBar, canShowPlaybackBar, setActiveBar]
    );

    const profileFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: profileSlot,
        activeKey: activeBar,
        defaultKey: 'home',
        enabled: showBars,
    });

    const navFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: navSlot,
        activeKey: activeBar,
        defaultKey: 'home',
        enabled: showBars,
    });

    return {
        profileAnchors: profileFloating.anchors,
        navAnchors: navFloating.anchors,
        portals: (
            <>
                {profileFloating.portal}
                {navFloating.portal}
            </>
        ),
    };
}
