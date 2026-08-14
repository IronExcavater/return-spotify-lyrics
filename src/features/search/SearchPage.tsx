import { Search } from 'lucide-react';

import { Card } from '@/ui/Card';

export function SearchPage() {
    return (
        <section className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
            <div>
                <h1 className="text-2xl font-semibold">Search</h1>
                <p className="mt-1 text-sm text-text-muted">
                    Search is scaffolded as a route only. Spotify search will be added with the
                    media feature rather than hidden inside the app shell.
                </p>
            </div>

            <Card variant="raised">
                <label className="flex h-10 items-center gap-2 rounded-control border border-border bg-app px-3 text-text-muted focus-within:border-text-muted">
                    <Search aria-hidden="true" size={16} />
                    <input
                        type="search"
                        disabled
                        placeholder="Search Spotify"
                        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
                    />
                </label>
            </Card>
        </section>
    );
}
