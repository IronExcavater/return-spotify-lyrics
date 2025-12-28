import { ReactNode } from 'react';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { MediaCard } from './MediaCard';
import { MediaListItem } from './MediaListItem';

interface MediaListProps {
    children?: ReactNode;
    variant?: 'card' | 'list';
    loading?: boolean;
    loadingCount?: number;
    renderLoadingItem?: (index: number) => ReactNode;
    className?: string;
}

export function MediaList({
    children,
    variant = 'card',
    loading = false,
    loadingCount = 6,
    renderLoadingItem,
    className,
}: MediaListProps) {
    const isCard = variant === 'card';
    const direction = isCard ? 'row' : 'column';

    return (
        <Flex
            direction={direction}
            gap="2"
            className={clsx(
                isCard ? 'overflow-x-auto pr-2 pb-1' : 'min-w-0',
                className
            )}
        >
            {loading
                ? Array.from({ length: loadingCount }).map((_, index) => (
                      <div key={`media-list-loading-${index}`}>
                          {renderLoadingItem ? (
                              renderLoadingItem(index)
                          ) : isCard ? (
                              <MediaCard title="Loading" loading />
                          ) : (
                              <MediaListItem title="Loading" loading />
                          )}
                      </div>
                  ))
                : children}
        </Flex>
    );
}
