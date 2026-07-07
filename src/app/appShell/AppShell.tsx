import { Suspense, type ReactNode, type RefObject } from 'react';
import { Flex } from '@radix-ui/themes';
import { Navigate, Route, Routes } from 'react-router-dom';

import { type SearchFilter } from '../../shared/types';
import { DetailViewLoadingState } from '../components/DetailViewState';
import type { HomeBarProps } from '../components/HomeBar';
import type { PlaybackBarProps } from '../components/playback/PlaybackBar';
import { ProtectedLayout } from '../components/ProtectedLayout';
import { ToastViewport } from '../components/ToastViewport';
import { SettingsProvider } from '../context/SettingsContext';
import { type BarKey } from '../hooks/useAppState';
import { lazyNamed } from './lazyNamed';
import { type AppRouteDefinition } from './routes';

const HomeBar = lazyNamed(() => import('../components/HomeBar'), 'HomeBar');
const PlaybackBar = lazyNamed(
    () => import('../components/playback/PlaybackBar'),
    'PlaybackBar'
);

type AppShellProps = {
    showBars: boolean;
    activeBar: BarKey;
    appRoutes: AppRouteDefinition[];
    profileSlot: {
        home: ReactNode;
        playback: ReactNode;
    };
    navSlot: {
        home: ReactNode;
        playback: ReactNode;
    };
    search: {
        query: string;
        filters: SearchFilter[];
        availableFilters: HomeBarProps['availableFilters'];
        onChange: (query: string) => void;
        onClear: () => void;
        onSubmit: () => void;
        onAddFilter: HomeBarProps['onAddFilter'];
        onUpdateFilter: HomeBarProps['onUpdateFilter'];
        onRemoveFilter: HomeBarProps['onRemoveFilter'];
        onClearFilters: () => void;
        inputRef: RefObject<HTMLInputElement> | undefined;
    };
    history: {
        canGoBack: boolean;
        onGoBack: () => void;
    };
    playback: {
        expanded: boolean;
        onExpandedChange: (value: boolean) => void;
        onOpenMediaRoute: PlaybackBarProps['onOpenMediaRoute'];
    };
    portals: ReactNode;
};

export function AppShell({
    showBars,
    activeBar,
    appRoutes,
    profileSlot,
    navSlot,
    search,
    history,
    playback,
    portals,
}: AppShellProps) {
    return (
        <SettingsProvider>
            <Flex direction="column" height="100%">
                {showBars && (
                    <Flex className="border-grayA-6 bg-panel-solid relative z-30 border-b-2">
                        {activeBar === 'playback' && (
                            <Suspense
                                fallback={<Flex className="h-14 w-full" />}
                            >
                                <PlaybackBar
                                    profileSlot={profileSlot.playback}
                                    navSlot={navSlot.playback}
                                    expanded={playback.expanded}
                                    onExpandedChange={playback.onExpandedChange}
                                    onOpenMediaRoute={playback.onOpenMediaRoute}
                                />
                            </Suspense>
                        )}

                        {activeBar === 'home' && (
                            <Suspense
                                fallback={<Flex className="h-14 w-full" />}
                            >
                                <HomeBar
                                    profileSlot={profileSlot.home}
                                    navSlot={navSlot.home}
                                    searchQuery={search.query}
                                    onSearchChange={search.onChange}
                                    onClearSearch={search.onClear}
                                    onSearchSubmit={search.onSubmit}
                                    canGoBack={history.canGoBack}
                                    onGoBack={history.onGoBack}
                                    filters={search.filters}
                                    availableFilters={search.availableFilters}
                                    onAddFilter={search.onAddFilter}
                                    onUpdateFilter={search.onUpdateFilter}
                                    onRemoveFilter={search.onRemoveFilter}
                                    onClearFilters={search.onClearFilters}
                                    searchInputRef={search.inputRef}
                                />
                            </Suspense>
                        )}
                    </Flex>
                )}

                <Routes>
                    {appRoutes.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <ProtectedLayout
                                    when={route.when}
                                    redirectTo={route.redirectTo}
                                >
                                    <Suspense
                                        fallback={<DetailViewLoadingState />}
                                    >
                                        {route.element}
                                    </Suspense>
                                </ProtectedLayout>
                            }
                        />
                    ))}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <ToastViewport />
                {portals}
            </Flex>
        </SettingsProvider>
    );
}
