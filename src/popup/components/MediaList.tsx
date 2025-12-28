import { ReactNode } from 'react';
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
    const direction = isCard ? 'row' : 'column';

    return (
        <Flex
            direction={direction}
            gap="1"
            className={clsx(isCard ? 'overflow-x-auto' : 'min-w-0', className)}
        >
            {loading
                ? Array.from({ length: loadingCount }).map((_, index) => (
                      <div key={`media-list-loading-${index}`}>
                          isCard ?<MediaCard loading /> :{' '}
                          <MediaListItem loading />
                      </div>
                  ))
                : children}
        </Flex>
    );
}
