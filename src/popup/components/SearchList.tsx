import type { CSSProperties, ReactNode, Ref } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { SearchBar } from './SearchBar';

type Props<T> = {
    items: readonly T[];
    query: string;
    onQueryChange: (value: string) => void;
    onClearQuery: () => void;
    placeholder: string;
    searchAriaLabel: string;
    clearSearchAriaLabel: string;
    inputRef?: Ref<HTMLInputElement>;
    leading?: ReactNode;
    beforeItems?: ReactNode;
    emptyState?: ReactNode;
    width?: CSSProperties['width'];
    maxListHeight?: CSSProperties['maxHeight'];
    getKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
};

type SearchListItemProps = {
    children: ReactNode;
    className?: string;
    highlight?: boolean;
    onClick?: () => void;
};

type SearchListMessageProps = {
    children: ReactNode;
    className?: string;
};

export function SearchListItem({
    children,
    className,
    highlight = true,
    onClick,
}: SearchListItemProps) {
    const itemClassName = clsx(
        'box-border w-full rounded-md p-1 px-2',
        highlight && 'transition-colors hover:bg-white/4',
        className
    );

    if (onClick) {
        return (
            <button
                type="button"
                className={clsx(
                    'flex w-full appearance-none items-center gap-1 border-0 bg-transparent text-left [font:inherit]',
                    itemClassName
                )}
                onClick={onClick}
            >
                {children}
            </button>
        );
    }

    return (
        <Flex align="center" gap="1" className={itemClassName}>
            {children}
        </Flex>
    );
}

export function SearchListMessage({
    children,
    className,
}: SearchListMessageProps) {
    return (
        <SearchListItem highlight={false}>
            <Text size="1" color="gray" className={className}>
                {children}
            </Text>
        </SearchListItem>
    );
}

export function SearchList<T>({
    items,
    query,
    onQueryChange,
    onClearQuery,
    placeholder,
    searchAriaLabel,
    clearSearchAriaLabel,
    inputRef,
    leading,
    beforeItems,
    emptyState,
    width,
    maxListHeight,
    getKey,
    renderItem,
}: Props<T>) {
    const hasItems = items.length > 0;
    const rootStyle = width ? { width } : undefined;
    const listStyle = maxListHeight ? { maxHeight: maxListHeight } : undefined;

    return (
        <Flex direction="column" py="1" gap="1" style={rootStyle}>
            <Flex align="center" gap="1" px="1">
                {leading}
                <SearchBar
                    value={query}
                    onChange={onQueryChange}
                    onClear={onClearQuery}
                    placeholder={placeholder}
                    size="1"
                    radius="full"
                    inputRef={inputRef}
                    searchAriaLabel={searchAriaLabel}
                    clearAriaLabel={clearSearchAriaLabel}
                />
            </Flex>
            <Flex
                direction="column"
                pl="1"
                className="scrollbar-gutter-stable overflow-y-auto"
                style={listStyle}
            >
                {beforeItems}
                {!hasItems && emptyState}
                {items.map((item) => (
                    <div key={getKey(item)} className="w-full">
                        {renderItem(item)}
                    </div>
                ))}
            </Flex>
        </Flex>
    );
}
