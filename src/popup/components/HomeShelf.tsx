import { ReactNode } from 'react';
import { MediaCard } from './MediaCard';

interface Props {
    children?: ReactNode;
    loading?: boolean;
    loadingCount?: number;
}

export function HomeShelf({
    children,
    loading = false,
    loadingCount = 6,
}: Props) {
    return (
        <div className="flex gap-1 overflow-x-auto pr-0 pb-0">
            {loading
                ? Array.from({ length: loadingCount }).map((_, index) => (
                      <MediaCard
                          key={`media-card-loading-${index}`}
                          title="Loading"
                          loading
                      />
                  ))
                : children}
        </div>
    );
}
