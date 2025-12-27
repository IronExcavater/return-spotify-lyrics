import { ReactNode, useEffect, useRef } from 'react';
import { Flex } from '@radix-ui/themes';
import { MediaCard } from './MediaCard';

interface Props {
    children?: ReactNode;
    loading?: boolean;
    loadingCount?: number;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

export function MediaShelf({
    children,
    loading = false,
    loadingCount = 8,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!onLoadMore || !hasMore) return;

        const root = containerRef.current;
        const target = sentinelRef.current;
        if (!root || !target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting && !loading && !loadingMore) {
                    onLoadMore();
                }
            },
            {
                root,
                rootMargin: '128px',
                threshold: 0.2,
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, onLoadMore]);

    return (
        <Flex ref={containerRef} gap="1" className="overflow-x-auto pr-2 pb-1">
            {loading ? (
                Array.from({ length: loadingCount }).map((_, index) => (
                    <MediaCard
                        key={`media-card-loading-${index}`}
                        title="Loading"
                        loading
                    />
                ))
            ) : (
                <>
                    {children}
                    {(hasMore || loadingMore) && (
                        <div ref={sentinelRef} className="flex items-center">
                            <MediaCard title="Loading more" loading />
                        </div>
                    )}
                </>
            )}
        </Flex>
    );
}
