import { Children, ReactNode } from 'react';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { MediaCard } from './MediaCard';
import { MediaListItem } from './MediaListItem';

interface Props {
    children?: ReactNode;
    variant?: 'card' | 'list';
    loading?: boolean;
    loadingCount?: number;
    className?: string;
}

export function MediaList({
    children,
    variant = 'card',
    loading = false,
    loadingCount = 6,
    className,
}: Props) {
    const isCard = variant === 'card';

    return (
        <Flex
            direction={isCard ? 'row' : 'column'}
            pb="1"
            gap={isCard ? '2' : '0'} // TODO: For some reason list items cant have gaps between each other because the media list + media list items break the width of the entire dom and expanding it somehow (same as todo in home bar)? Check ai-temp-3 to see if there is a restructure possible and try to diagnose the issue
            className={clsx('overflow-auto', className)}
        >
            {loading
                ? Array.from({ length: loadingCount }).map((_, index) =>
                      isCard ? (
                          <MediaCard
                              key={`media-list-loading-${index}`}
                              loading
                          />
                      ) : (
                          <div
                              key={`media-list-loading-${index}`}
                              className="w-full min-w-0"
                          >
                              <MediaListItem loading />
                          </div>
                      )
                  )
                : isCard
                  ? children
                  : Children.map(children, (child, index) => (
                        <div key={index} className="w-full min-w-0">
                            {child}
                        </div>
                    ))}
        </Flex>
    );
}
