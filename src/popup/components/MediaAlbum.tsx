import { useRef } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import type { SimplifiedAlbum, SimplifiedTrack } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import { formatDurationShort } from '../../shared/date';
import {
    albumToItem,
    albumTrackToItem,
    formatAlbumType,
} from '../../shared/media';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { useConstrainedWidth } from '../hooks/useElementWidth';
import { buildMediaActions } from '../hooks/useMediaActions';
import { AvatarButton } from './AvatarButton';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { MediaActionsMenu } from './MediaActionsMenu';
import { MediaRow } from './MediaRow';
import { SkeletonText } from './SkeletonText';
import { TextButton } from './TextButton';

export type MediaAlbumEntry = {
    album: SimplifiedAlbum;
    tracks: SimplifiedTrack[];
};

type Props = {
    entry: MediaAlbumEntry;
    trackCount: number;
    loading?: boolean;
    onAlbumClick: (album: SimplifiedAlbum) => void;
    onTrackClick: (track: SimplifiedTrack, album: SimplifiedAlbum) => void;
};

export function MediaAlbum({
    entry,
    trackCount,
    loading = false,
    onAlbumClick,
    onTrackClick,
}: Props) {
    const album = entry.album;
    const albumItem = albumToItem(album);
    const albumActions = buildMediaActions(albumItem);
    const hasAlbumActions =
        albumActions.primary.length > 0 || albumActions.secondary.length > 0;
    const tracks = entry.tracks.slice(0, trackCount);
    const isSingleTrack = tracks.length === 1;
    const albumType = formatAlbumType(album);
    const subtitle = albumType ?? '';
    const albumContextMenu = hasAlbumActions ? (
        <MediaActionsMenu actions={albumActions} />
    ) : null;

    const seed = album.id ? album.id.length : 0;
    const coverRef = useRef<HTMLDivElement>(null);
    const durationRef = useRef<HTMLSpanElement>(null);
    const titleMaxWidth = useConstrainedWidth({
        baseRef: coverRef,
        round: 1,
    });
    const subtitleMaxWidth = useConstrainedWidth({
        baseRef: coverRef,
        subtractRef: durationRef,
        gap: 8,
        round: 1,
    });

    const renderTrackRow = (track: SimplifiedTrack) => {
        const item = albumTrackToItem(track, album);
        const duration = formatDurationShort(track.duration_ms);
        const canClick = !!track.id;
        return (
            <Flex
                key={track.id ?? track.name}
                align="center"
                justify="between"
                gap="2"
                className={clsx(
                    'text-[12px]',
                    canClick &&
                        'text-gray-12 hover:text-accent-11 cursor-pointer'
                )}
                onClick={() => {
                    if (!canClick) return;
                    onTrackClick(track, album);
                }}
            >
                <SkeletonText
                    loading={loading}
                    parts={[item.title, duration]}
                    seed={seed}
                    preset="media-row"
                >
                    <span className="min-w-0 truncate">{item.title}</span>
                </SkeletonText>
                <Skeleton loading={loading}>
                    <Text size="1" color="gray" className="shrink-0">
                        {duration}
                    </Text>
                </Skeleton>
            </Flex>
        );
    };
    return (
        <Flex
            direction="column"
            gap="1"
            p={isSingleTrack ? '2' : '1'}
            className={clsx(
                'rounded-2 bg-panel-solid/5 min-w-0',
                !isSingleTrack && 'w-full'
            )}
        >
            {isSingleTrack ? (
                <Flex direction="column" gap="1" className="min-w-0">
                    <Flex
                        align="start"
                        justify="between"
                        gap="1"
                        className="min-w-0"
                    >
                        <Flex className="min-w-0" flexGrow="1">
                            <Fade enabled={!loading} grow>
                                <SkeletonText
                                    loading={loading}
                                    parts={[album.name, subtitle]}
                                    seed={seed}
                                    preset="media-row"
                                >
                                    <Marquee
                                        mode="bounce"
                                        grow
                                        maxWidth={titleMaxWidth}
                                    >
                                        <TextButton
                                            size="2"
                                            weight="medium"
                                            onClick={() => onAlbumClick(album)}
                                            className="min-w-0"
                                        >
                                            {album.name}
                                        </TextButton>
                                    </Marquee>
                                </SkeletonText>
                            </Fade>
                        </Flex>
                        {}
                    </Flex>
                    <AvatarButton
                        avatar={{
                            src: album.images?.[0]?.url,
                            fallback: <MdMusicNote />,
                            radius: 'small',
                            size: '7',
                        }}
                        aria-label={album.name}
                        hideRing
                        onClick={() => onAlbumClick(album)}
                        className="group relative"
                    >
                        <div
                            ref={coverRef}
                            className="pointer-events-none absolute inset-0"
                        />
                        {albumContextMenu && (
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger
                                    onKeyDown={handleMenuTriggerKeyDown}
                                >
                                    <IconButton
                                        variant="ghost"
                                        radius="full"
                                        size="0"
                                        color="gray"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                        className="bg-panel-solid/10! pointer-events-none m-1! ml-auto! self-start! opacity-0! backdrop-blur-[2px]! transition-opacity group-hover:pointer-events-auto group-hover:opacity-100! hover:bg-(--accent-11)/10! hover:backdrop-blur-xs! data-[state=open]:pointer-events-auto data-[state=open]:opacity-100!"
                                    >
                                        <DotsHorizontalIcon />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                {albumContextMenu}
                            </DropdownMenu.Root>
                        )}
                    </AvatarButton>
                    <Flex
                        align="center"
                        justify="between"
                        gap="2"
                        className="min-w-0"
                    >
                        {subtitle && (
                            <Flex className="min-w-0" flexGrow="1">
                                <Fade enabled={!loading} grow>
                                    <SkeletonText
                                        loading={loading}
                                        parts={[subtitle]}
                                        seed={seed}
                                        preset="media-row"
                                        variant="subtitle"
                                    >
                                        <Marquee
                                            mode="left"
                                            grow
                                            maxWidth={subtitleMaxWidth}
                                        >
                                            <Text size="1" color="gray">
                                                {subtitle}
                                            </Text>
                                        </Marquee>
                                    </SkeletonText>
                                </Fade>
                            </Flex>
                        )}
                        {tracks[0] && (
                            <Skeleton loading={loading}>
                                <Text
                                    ref={durationRef}
                                    size="1"
                                    color="gray"
                                    className="shrink-0"
                                >
                                    {formatDurationShort(tracks[0].duration_ms)}
                                </Text>
                            </Skeleton>
                        )}
                    </Flex>
                </Flex>
            ) : (
                <>
                    <MediaRow
                        title={album.name}
                        subtitle={subtitle}
                        subtitleHeight={16}
                        imageUrl={album.images?.[0]?.url}
                        onClick={() => onAlbumClick(album)}
                        contextMenu={albumContextMenu}
                        loading={loading}
                    />
                    <Flex direction="column" gap="1">
                        {tracks.map((track) => renderTrackRow(track))}
                    </Flex>
                </>
            )}
        </Flex>
    );
}
