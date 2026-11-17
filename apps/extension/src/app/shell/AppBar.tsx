import type { BarPolicy } from '../resize/types';

type AppBarProps = {
    policy: BarPolicy;
};

export default function AppBar({ policy }: AppBarProps) {
    if (policy === 'hidden') return null;

    return (
        <header className="flex h-14 shrink-0 items-center border-b px-3">
            <strong className="truncate text-sm">Return Spotify Lyrics</strong>
        </header>
    );
}
