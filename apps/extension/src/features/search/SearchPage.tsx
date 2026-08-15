import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { Avatar } from '@return-spotify-lyrics/ui/Avatar';
import { Card } from '@return-spotify-lyrics/ui/Card';
import { List, ListItem } from '@return-spotify-lyrics/ui/List';
import { Skeleton } from '@return-spotify-lyrics/ui/Skeleton';

import { asAppError } from '@/errors/AppError';

import { trackSearchQueryOptions } from './queries';

export function SearchPage() {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const search = useQuery(trackSearchQueryOptions(deferredQuery));

    return (
        <section className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
            <div>
                <h1 className="text-2xl font-semibold">Search</h1>
                <p className="mt-1 text-sm text-text-muted">
                    A minimal Spotify track search to exercise the integration
                    boundary.
                </p>
            </div>
            <Card variant="raised">
                <label className="flex h-10 items-center gap-2 rounded-control border border-border bg-app px-3 text-text-muted focus-within:border-text-muted">
                    <Search aria-hidden="true" size={16} />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search Spotify"
                        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                    />
                </label>
            </Card>
            {search.error && (
                <p className="text-sm text-danger">
                    {asAppError(search.error).message}
                </p>
            )}
            {deferredQuery.trim() && (
                <List>
                    {(search.isPending
                        ? Array.from({ length: 4 }, (_, index) => index)
                        : (search.data ?? [])
                    ).map((track) => {
                        const loading = typeof track === 'number';
                        const key = loading ? `loading-${track}` : track.id;
                        const image = loading
                            ? null
                            : track.album.images[0]?.url;
                        const title = loading ? 'Loading track' : track.name;
                        const subtitle = loading
                            ? 'Loading artist'
                            : track.artists
                                  .map((artist) => artist.name)
                                  .join(', ');
                        return (
                            <ListItem
                                key={key}
                                className="flex items-center gap-3 p-2"
                            >
                                <Skeleton
                                    loading={loading}
                                    hash={`${key}:art`}
                                    size={40}
                                    radius={6}
                                >
                                    <Avatar
                                        src={image}
                                        fallback="♪"
                                        size="md"
                                        radius="md"
                                    />
                                </Skeleton>
                                <div className="min-w-0 flex-1">
                                    <Skeleton
                                        loading={loading}
                                        hash={`${key}:title`}
                                    >
                                        <div className="truncate text-sm font-medium">
                                            {title}
                                        </div>
                                    </Skeleton>
                                    <Skeleton
                                        loading={loading}
                                        hash={`${key}:artist`}
                                    >
                                        <div className="truncate text-xs text-text-muted">
                                            {subtitle}
                                        </div>
                                    </Skeleton>
                                </div>
                            </ListItem>
                        );
                    })}
                </List>
            )}
        </section>
    );
}
