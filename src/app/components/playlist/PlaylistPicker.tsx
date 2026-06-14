import { type ReactNode, useEffect, useRef } from 'react';
import {
    CheckIcon,
    HeartFilledIcon,
    PlusIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
import {
    Avatar,
    Flex,
    IconButton,
    Skeleton,
    Text,
    Tooltip,
} from '@radix-ui/themes';

import type { MediaItem } from '../../../shared/types';
import {
    usePlaylistPicker,
    type PlaylistPickerRow,
} from '../../features/playlists/usePlaylistPicker';
import { Fade } from '../Fade';
import { Marquee } from '../Marquee';
import { SearchList, SearchListItem, SearchListMessage } from '../SearchList';
import { SkeletonText } from '../SkeletonText';
import { CreatePlaylistDialog } from './PlaylistDialogs';

type Props = {
    item?: MediaItem | null;
    headerStart?: ReactNode;
};

const PICKER_WIDTH = '18rem';
const PICKER_MAX_LIST_HEIGHT =
    'min(15rem, calc(var(--radix-dropdown-menu-content-available-height, 16rem) - 2.5rem))';

function PlaylistIndicator({
    active,
    loading,
    pending,
    disabled,
    onClick,
}: {
    active: boolean | null;
    loading: boolean;
    pending: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    if (loading || pending) {
        return (
            <IconButton
                size="1"
                radius="full"
                variant="soft"
                disabled
                className="h-7 w-7 shrink-0"
                aria-label="Updating playlist"
            >
                <ReloadIcon className="animate-spin" />
            </IconButton>
        );
    }

    if (active === null) {
        return (
            <IconButton
                size="1"
                radius="full"
                variant="soft"
                disabled
                className="h-7 w-7 shrink-0"
                aria-label="Checking playlist"
            >
                <PlusIcon />
            </IconButton>
        );
    }

    return (
        <IconButton
            size="1"
            radius="full"
            variant={active ? 'solid' : 'soft'}
            disabled={disabled}
            className="h-7 w-7 shrink-0"
            aria-label={active ? 'Remove from playlist' : 'Save to playlist'}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!disabled) onClick();
            }}
        >
            {active ? <CheckIcon /> : <PlusIcon />}
        </IconButton>
    );
}

function PlaylistRowItem({
    row,
    loading = false,
    onToggle,
}: {
    row: PlaylistPickerRow;
    loading?: boolean;
    onToggle?: (row: PlaylistPickerRow) => void;
}) {
    const subtitle = row.isLiked ? undefined : row.subtitle;
    return (
        <SearchListItem highlight={!loading}>
            <Skeleton loading={loading}>
                <Avatar
                    src={row.imageUrl}
                    fallback={
                        row.isLiked ? (
                            <HeartFilledIcon />
                        ) : (
                            <Text size="1" weight="bold">
                                {row.name.charAt(0).toUpperCase()}
                            </Text>
                        )
                    }
                    radius="small"
                    size="2"
                    className="shrink-0"
                />
            </Skeleton>
            <Flex
                direction="column"
                justify="center"
                className="min-w-0 flex-1"
            >
                <Fade enabled={!loading} grow>
                    <SkeletonText loading={loading} preset="media-row">
                        <Marquee mode="bounce" grow>
                            <Text
                                size="1"
                                weight="medium"
                                className="block min-w-0"
                            >
                                {row.name}
                            </Text>
                        </Marquee>
                    </SkeletonText>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading} grow>
                        <SkeletonText
                            loading={loading}
                            preset="media-row"
                            variant="subtitle"
                        >
                            <Marquee mode="left" grow>
                                <Text
                                    size="1"
                                    color="gray"
                                    className="block min-w-0"
                                >
                                    {subtitle}
                                </Text>
                            </Marquee>
                        </SkeletonText>
                    </Fade>
                )}
            </Flex>
            {loading ? (
                <Skeleton loading>
                    <div className="h-7 w-7 rounded-full" />
                </Skeleton>
            ) : (
                <PlaylistIndicator
                    active={row.contains}
                    loading={row.loading}
                    pending={row.pending}
                    disabled={row.pending || row.loading || !row.editable}
                    onClick={() => onToggle?.(row)}
                />
            )}
        </SearchListItem>
    );
}

const LOADING_ROWS: PlaylistPickerRow[] = Array.from(
    { length: 8 },
    (_, index) => ({
        id: `loading-${index}`,
        name: `Playlist ${index + 1}`,
        subtitle: 'Loading owner',
        editable: false,
        contains: null,
        loading: true,
        pending: false,
        isLiked: false,
    })
);

export function PlaylistPicker({ item, headerStart }: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const picker = usePlaylistPicker(item);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    const visibleRows = picker.showLoadingRows ? LOADING_ROWS : picker.rows;
    const leading = (
        <Flex align="center" gap="1">
            {headerStart}
            <Tooltip content="Create playlist">
                <IconButton
                    size="1"
                    radius="full"
                    variant="ghost"
                    aria-label="Create playlist"
                    onClick={() => picker.setCreateOpen(true)}
                >
                    <PlusIcon />
                </IconButton>
            </Tooltip>
        </Flex>
    );

    return (
        <>
            <SearchList
                items={visibleRows}
                query={picker.query}
                onQueryChange={picker.setQuery}
                onClearQuery={() => picker.setQuery('')}
                placeholder="Search playlists"
                searchAriaLabel="Search playlists"
                clearSearchAriaLabel="Clear playlist search"
                inputRef={inputRef}
                leading={leading}
                width={PICKER_WIDTH}
                maxListHeight={PICKER_MAX_LIST_HEIGHT}
                beforeItems={
                    picker.error ? (
                        <SearchListMessage className="wrap-break-word">
                            {picker.error}
                        </SearchListMessage>
                    ) : null
                }
                emptyState={
                    !picker.loading ? (
                        <SearchListMessage>No matches</SearchListMessage>
                    ) : null
                }
                getKey={(row) => row.id}
                renderItem={(row) => (
                    <PlaylistRowItem
                        row={row}
                        loading={picker.showLoadingRows}
                        onToggle={(nextRow) => void picker.toggleRow(nextRow)}
                    />
                )}
            />
            <CreatePlaylistDialog
                open={picker.createOpen}
                onOpenChange={picker.setCreateOpen}
                onCreated={picker.refreshAfterCreate}
            />
        </>
    );
}
