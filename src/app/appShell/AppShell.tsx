import { type ReactNode, type RefObject } from 'react';
import { Flex } from '@radix-ui/themes';
import { Navigate, Route, Routes } from 'react-router-dom';

import { type SearchFilter } from '../../shared/types';
import { HomeBar } from '../components/HomeBar';
import { PlaybackBar } from '../components/playback/PlaybackBar';
import { ProtectedLayout } from '../components/ProtectedLayout';
import { ReauthDialog } from '../components/ReauthDialog';
import { ToastViewport } from '../components/ToastViewport';
import { SettingsProvider } from '../context/SettingsContext';
import { type BarKey } from '../hooks/useAppState';
import { type AppRouteDefinition } from './routes';

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
        availableFilters: Parameters<typeof HomeBar>[0]['availableFilters'];
        onChange: (query: string) => void;
        onClear: () => void;
        onSubmit: () => void;
        onAddFilter: Parameters<typeof HomeBar>[0]['onAddFilter'];
        onUpdateFilter: Parameters<typeof HomeBar>[0]['onUpdateFilter'];
        onRemoveFilter: Parameters<typeof HomeBar>[0]['onRemoveFilter'];
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
        onOpenMediaRoute: Parameters<typeof PlaybackBar>[0]['onOpenMediaRoute'];
    };
    reauth: {
        open: boolean;
        missingScopes: string[];
        onReconnect: () => void;
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
    reauth,
    portals,
}: AppShellProps) {
    return (
        <SettingsProvider>
            <Flex direction="column" height="100%">
                {showBars && (
                    <Flex className="border-grayA-6 bg-panel-solid relative z-30 border-b-2">
                        {activeBar === 'playback' && (
                            <PlaybackBar
                                profileSlot={profileSlot.playback}
                                navSlot={navSlot.playback}
                                expanded={playback.expanded}
                                onExpandedChange={playback.onExpandedChange}
                                onOpenMediaRoute={playback.onOpenMediaRoute}
                            />
                        )}

                        {activeBar === 'home' && (
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
                                    {route.element}
                                </ProtectedLayout>
                            }
                        />
                    ))}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <ReauthDialog
                    open={reauth.open}
                    reasons={reauth.open ? ['missing-scopes'] : []}
                    missingScopes={reauth.missingScopes}
                    onReconnect={reauth.onReconnect}
                />

                <ToastViewport />
                {portals}
            </Flex>
        </SettingsProvider>
    );
}
