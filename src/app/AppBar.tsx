import clsx from 'clsx';
import { NavLink, useNavigate } from 'react-router';

import { setActiveBar, useActiveBar, type AppBarMode } from '@/state/app.store';
import { Button } from '@/ui/Button';

import type { BarPolicy } from './layout/types';

type AppBarProps = {
    policy: BarPolicy;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
        'rounded-control px-2 py-1 text-sm transition-colors',
        isActive
            ? 'bg-surface-hover text-text'
            : 'text-text-muted hover:text-text'
    );

function HomeBar() {
    const navigate = useNavigate();

    return (
        <>
            <strong className="truncate text-sm">Return Spotify Lyrics</strong>
            <nav className="ml-auto flex items-center gap-1">
                <NavLink to="/home" className={navClass}>
                    Home
                </NavLink>
                <NavLink to="/settings" className={navClass}>
                    Settings
                </NavLink>
                <NavLink to="/profile" className={navClass}>
                    Profile
                </NavLink>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setActiveBar('playback');
                        void navigate('/lyrics');
                    }}
                >
                    Player
                </Button>
            </nav>
        </>
    );
}

function PlaybackBar() {
    const navigate = useNavigate();

    return (
        <>
            <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                    Nothing playing
                </div>
                <div className="truncate text-xs text-text-muted">Spotify</div>
            </div>
            <nav className="ml-auto flex items-center gap-1">
                <NavLink to="/lyrics" className={navClass}>
                    Lyrics
                </NavLink>
                <NavLink to="/queue" className={navClass}>
                    Queue
                </NavLink>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setActiveBar('home');
                        void navigate('/home');
                    }}
                >
                    Home
                </Button>
            </nav>
        </>
    );
}

function resolveBar(
    policy: BarPolicy,
    activeBar: AppBarMode
): AppBarMode | null {
    if (policy === 'hidden') return null;
    if (policy === 'home' || policy === 'playback') return policy;
    return activeBar;
}

export function AppBar({ policy }: AppBarProps) {
    const activeBar = useActiveBar();
    const bar = resolveBar(policy, activeBar);

    if (!bar) return null;

    return (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
            {bar === 'home' ? <HomeBar /> : <PlaybackBar />}
        </header>
    );
}
