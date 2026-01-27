import type { CSSProperties, ReactNode, RefObject } from 'react';
import { DotsHorizontalIcon, PlayIcon } from '@radix-ui/react-icons';
import {
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import { MdMusicNote } from 'react-icons/md';

import type { MediaItem, MediaActionGroup } from '../../shared/types';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { AvatarButton } from './AvatarButton';
import { BackgroundImage } from './BackgroundImage';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { MediaActionsMenu } from './MediaActionsMenu';
import { SkeletonText } from './SkeletonText';

export type HeroData = {
    title: string;
    subtitle?: ReactNode;
    info?: ReactNode;
    imageUrl?: string;
    heroUrl?: string;
    duration?: string;
    item: MediaItem;
};

interface Props {
    hero: HeroData | null;
    loading: boolean;
    heroUrl?: string;
    heroStickyRef: RefObject<HTMLDivElement>;
    heroTextParts: Array<string | undefined>;
    heroSubtitleNode: ReactNode;
    heroTitle: string;
    heroInfo: ReactNode;
    mergedHeroActions: MediaActionGroup | null;
    canTogglePlayback: boolean;
    onPlay: () => void;
}

const heroGradient =
    'linear-gradient(90deg, rgba(5,7,14,0.92) 0%, rgba(9,12,22,0.7) 55%, rgba(9,12,22,0.35) 80%, rgba(9,12,22,0) 100%)';
const heroMaskStyle: CSSProperties = {
    WebkitMaskImage:
        'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0.9) 94%, rgba(0,0,0,0) 100%)',
};

export function MediaHero({
    hero,
    loading,
    heroUrl,
    heroStickyRef,
    heroTextParts,
    heroSubtitleNode,
    heroTitle,
    heroInfo,
    mergedHeroActions,
    canTogglePlayback,
    onPlay,
}: Props) {
    const heroImageRadius = hero?.item.kind === 'artist' ? 'full' : 'small';
    const hasHeroActions =
        mergedHeroActions &&
        (mergedHeroActions.primary.length > 0 ||
            mergedHeroActions.secondary.length > 0);

    return (
        <BackgroundImage
            className="sticky top-0 z-10 w-full"
            style={heroMaskStyle}
            ref={heroStickyRef}
            imageUrl={heroUrl}
            gradient={heroGradient}
            zoom={1.06}
            showGradient
        >
            <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-40 bg-linear-to-l to-transparent" />
            <Flex
                align="center"
                gap="2"
                pl="3"
                pr="1"
                pb="3"
                className="relative z-20 w-full"
                style={{
                    paddingTop: '12px',
                    transform:
                        'translateY(calc(-8px * var(--hero-collapse, 0)))',
                    willChange: 'transform',
                }}
            >
                <Skeleton loading={loading}>
                    <AvatarButton
                        avatar={{
                            src: hero?.imageUrl,
                            fallback: <MdMusicNote />,
                            radius: heroImageRadius,
                            size: '6',
                        }}
                        aria-label={heroTitle}
                        className="group"
                        disabled={!canTogglePlayback}
                        onClick={onPlay}
                        overlayPointerEvents="none"
                    >
                        {hero?.imageUrl && (
                            <Flex
                                align="center"
                                justify="center"
                                className="pointer-events-none absolute inset-0"
                            >
                                <Flex
                                    className="bg-panel-solid/10 rounded-full text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                                    p="1"
                                >
                                    <PlayIcon />
                                </Flex>
                            </Flex>
                        )}
                    </AvatarButton>
                </Skeleton>

                <Flex
                    direction="column"
                    gap="1"
                    flexGrow="1"
                    className="min-w-0"
                >
                    <SkeletonText
                        loading={loading}
                        parts={loading ? ['loading'] : heroTextParts}
                        preset="media-row"
                        variant="title"
                        widthOptions={{
                            titleMin: 78,
                            titleRange: 30,
                            subtitleMin: 32,
                            subtitleRange: 34,
                            titleOffset: 11,
                            subtitleOffset: 29,
                        }}
                    >
                        <Fade enabled={!loading} grow>
                            <Marquee mode="bounce" grow>
                                <Text size="5" weight="bold">
                                    {heroTitle}
                                </Text>
                            </Marquee>
                        </Fade>
                    </SkeletonText>
                    {(hero?.subtitle ||
                        hero?.info ||
                        hero?.duration ||
                        hasHeroActions ||
                        loading) && (
                        <Flex align="start" justify="between" gap="2" mr="1">
                            <Flex
                                direction="column"
                                gap="1"
                                className="min-w-0 flex-1"
                            >
                                {(hero?.subtitle || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        parts={
                                            loading
                                                ? ['loading']
                                                : heroTextParts
                                        }
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={{
                                            titleMin: 78,
                                            titleRange: 30,
                                            subtitleMin: 32,
                                            subtitleRange: 34,
                                            titleOffset: 11,
                                            subtitleOffset: 29,
                                        }}
                                    >
                                        <Fade enabled={!loading} grow>
                                            <Marquee mode="left" grow>
                                                {heroSubtitleNode}
                                            </Marquee>
                                        </Fade>
                                    </SkeletonText>
                                )}
                                {(hero?.info || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        parts={
                                            loading
                                                ? ['loading']
                                                : heroTextParts
                                        }
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={{
                                            titleMin: 78,
                                            titleRange: 30,
                                            subtitleMin: 32,
                                            subtitleRange: 34,
                                            titleOffset: 11,
                                            subtitleOffset: 29,
                                        }}
                                    >
                                        <Fade enabled={!loading} grow>
                                            <Marquee mode="left" grow>
                                                <Text size="1" color="gray">
                                                    {heroInfo}
                                                </Text>
                                            </Marquee>
                                        </Fade>
                                    </SkeletonText>
                                )}
                            </Flex>

                            <Flex align="end" direction="column" gap="1">
                                {(hero?.duration || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        parts={
                                            loading
                                                ? ['loading']
                                                : heroTextParts
                                        }
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={{
                                            titleMin: 78,
                                            titleRange: 30,
                                            subtitleMin: 32,
                                            subtitleRange: 34,
                                            titleOffset: 11,
                                            subtitleOffset: 29,
                                        }}
                                    >
                                        <Text size="1" color="gray">
                                            {hero?.duration ?? '0m'}
                                        </Text>
                                    </SkeletonText>
                                )}
                                {hasHeroActions && (
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger
                                            disabled={loading}
                                            onKeyDown={handleMenuTriggerKeyDown}
                                        >
                                            <IconButton
                                                variant="ghost"
                                                radius="full"
                                                size="1"
                                                color="gray"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                <DotsHorizontalIcon />
                                            </IconButton>
                                        </DropdownMenu.Trigger>
                                        <MediaActionsMenu
                                            actions={mergedHeroActions}
                                        />
                                    </DropdownMenu.Root>
                                )}
                            </Flex>
                        </Flex>
                    )}
                </Flex>
            </Flex>
        </BackgroundImage>
    );
}
