import type { CSSProperties, ReactNode, RefObject } from 'react';
import { DotsHorizontalIcon, PlayIcon } from '@radix-ui/react-icons';
import {
    Box,
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
    TextField,
} from '@radix-ui/themes';
import { MdMusicNote } from 'react-icons/md';

import type { MediaItem, MediaActionGroup } from '../../../shared/types';
import { handleMenuTriggerKeyDown } from '../../hooks/useActions';
import { useHeroCollapse } from '../../hooks/useHeroCollapse';
import { AvatarButton } from '../AvatarButton';
import { BackgroundImage } from '../BackgroundImage';
import { Fade } from '../Fade';
import { Marquee } from '../Marquee';
import { SkeletonText } from '../SkeletonText';
import { MediaActionsMenu } from './MediaActionsMenu';

export type HeroData = {
    title: string;
    subtitle?: ReactNode;
    info?: ReactNode;
    imageUrl?: string;
    heroUrl?: string;
    duration?: string;
    item: MediaItem;
};

export type EditableHeroTitle = {
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
};

interface Props {
    hero: HeroData | null;
    loading: boolean;
    heroUrl?: string;
    scrollRef?: RefObject<HTMLElement | null>;
    collapse?: boolean;
    collapseKey?: string;
    sticky?: boolean;
    editableTitle?: EditableHeroTitle;
    mergedHeroActions: MediaActionGroup | null;
    canTogglePlayback: boolean;
    resetScroll?: boolean;
    onPlay: () => void;
}

const heroGradient =
    'linear-gradient(90deg, rgba(5,7,14,0.92) 0%, rgba(9,12,22,0.7) 55%, rgba(9,12,22,0.35) 80%, rgba(9,12,22,0) 100%)';
const heroMaskStyle: CSSProperties = {
    WebkitMaskImage:
        'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 92%, rgba(0,0,0,0.9) 94%, rgba(0,0,0,0) 100%)',
};
const HERO_TOP_PAD_MAX = 12;
const HERO_TOP_PAD_MIN = 4;
const HERO_BOTTOM_PAD_MAX = 18;
const HERO_BOTTOM_PAD_MIN = 10;
const HERO_TEXT_WIDTH_OPTIONS = {
    titleMin: 78,
    titleRange: 30,
    subtitleMin: 32,
    subtitleRange: 34,
    titleOffset: 11,
    subtitleOffset: 29,
} as const;
const HERO_SKELETON_SEEDS = {
    title: 0,
    subtitle: 5,
    info: 17,
    duration: 29,
} as const;

function HeroMenuButton({
    loading,
    actions,
    item,
}: {
    loading: boolean;
    actions: MediaActionGroup | null;
    item?: MediaItem;
}) {
    const hasActions =
        Boolean(actions) &&
        (actions?.primary.length ?? 0) + (actions?.secondary.length ?? 0) > 0;

    if (!loading && (!hasActions || !item)) return null;

    const trigger = (
        <IconButton
            variant="ghost"
            radius="full"
            size="1"
            color="gray"
            disabled={loading || !hasActions}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <DotsHorizontalIcon />
        </IconButton>
    );

    if (loading || !hasActions || !item) {
        return trigger;
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger onKeyDown={handleMenuTriggerKeyDown}>
                {trigger}
            </DropdownMenu.Trigger>
            <MediaActionsMenu actions={actions} item={item} />
        </DropdownMenu.Root>
    );
}

function HeroTitle({
    editableTitle,
    loading,
    title,
}: {
    editableTitle?: EditableHeroTitle;
    loading: boolean;
    title: string;
}) {
    if (editableTitle && !loading) {
        return (
            <TextField.Root
                value={editableTitle.value}
                disabled={editableTitle.disabled}
                aria-label="Media title"
                size="3"
                className="max-w-full font-bold"
                onChange={(event) => editableTitle.onChange(event.target.value)}
            />
        );
    }

    return (
        <SkeletonText
            loading={loading}
            seed={HERO_SKELETON_SEEDS.title}
            preset="media-row"
            variant="title"
            widthOptions={HERO_TEXT_WIDTH_OPTIONS}
        >
            <Fade enabled={!loading} grow>
                <Marquee mode="bounce" grow>
                    <Text size="5" weight="bold">
                        {loading ? '\u00A0' : title}
                    </Text>
                </Marquee>
            </Fade>
        </SkeletonText>
    );
}

export function MediaHero({
    hero,
    loading,
    heroUrl,
    scrollRef,
    collapse = true,
    collapseKey,
    sticky = true,
    editableTitle,
    mergedHeroActions,
    canTogglePlayback,
    resetScroll = true,
    onPlay,
}: Props) {
    const collapseEnabled = Boolean(collapse && scrollRef);
    const { heroRef, paddingTop, paddingBottom } = useHeroCollapse({
        enabled: collapseEnabled,
        scrollRef,
        resetKey: collapseKey,
        resetScroll,
        padding: {
            topMax: HERO_TOP_PAD_MAX,
            topMin: HERO_TOP_PAD_MIN,
            bottomMax: HERO_BOTTOM_PAD_MAX,
            bottomMin: HERO_BOTTOM_PAD_MIN,
        },
    });
    const heroImageRadius = hero?.item.kind === 'artist' ? 'full' : 'small';
    const hasHeroActions =
        Boolean(mergedHeroActions) &&
        (mergedHeroActions?.primary.length ?? 0) +
            (mergedHeroActions?.secondary.length ?? 0) >
            0;
    const skeletonLabel = '\u00A0';
    const resolvedHeroTitle = hero?.title ?? '';
    const resolvedHeroSubtitle = hero?.subtitle;
    const resolvedSubtitleNode = resolvedHeroSubtitle ? (
        typeof resolvedHeroSubtitle === 'string' ||
        typeof resolvedHeroSubtitle === 'number' ? (
            <Text size="2" weight="medium" color="gray">
                {resolvedHeroSubtitle}
            </Text>
        ) : (
            resolvedHeroSubtitle
        )
    ) : loading ? (
        <Text size="2" weight="medium" color="gray">
            {skeletonLabel}
        </Text>
    ) : null;
    const resolvedHeroInfo = hero?.info ?? (loading ? skeletonLabel : null);
    const hasSubtitle = Boolean(resolvedHeroSubtitle);
    const hasInfo = Boolean(resolvedHeroInfo);
    const hasDuration = Boolean(hero?.duration);

    return (
        <BackgroundImage
            className={sticky ? 'sticky top-0 z-20 w-full' : 'w-full'}
            style={heroMaskStyle}
            ref={heroRef}
            imageUrl={heroUrl}
            gradient={heroGradient}
            zoom={1.06}
            showGradient
        >
            <Box className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-40 bg-linear-to-l to-transparent" />
            <Flex
                align="center"
                gap="2"
                pl="3"
                pr="1"
                className="relative z-10 w-full"
                style={{
                    paddingTop,
                    paddingBottom,
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
                        aria-label={resolvedHeroTitle}
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
                    className="group min-w-0"
                >
                    <HeroTitle
                        editableTitle={editableTitle}
                        loading={loading}
                        title={resolvedHeroTitle}
                    />
                    {(hasSubtitle ||
                        hasInfo ||
                        hasDuration ||
                        hasHeroActions ||
                        loading) && (
                        <Flex align="start" justify="between" gap="2">
                            <Flex
                                direction="column"
                                gap="1"
                                className="min-w-0 flex-1"
                            >
                                {(hasSubtitle || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        seed={HERO_SKELETON_SEEDS.subtitle}
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={HERO_TEXT_WIDTH_OPTIONS}
                                    >
                                        <Fade enabled={!loading} grow>
                                            <Marquee mode="left" grow>
                                                {resolvedSubtitleNode}
                                            </Marquee>
                                        </Fade>
                                    </SkeletonText>
                                )}
                                {(hasInfo || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        seed={HERO_SKELETON_SEEDS.info}
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={HERO_TEXT_WIDTH_OPTIONS}
                                    >
                                        <Fade enabled={!loading} grow>
                                            <Marquee mode="left" grow>
                                                <Text size="1" color="gray">
                                                    {resolvedHeroInfo}
                                                </Text>
                                            </Marquee>
                                        </Fade>
                                    </SkeletonText>
                                )}
                            </Flex>

                            <Flex align="end" direction="column" gap="1">
                                {(hasDuration || loading) && (
                                    <SkeletonText
                                        loading={loading}
                                        seed={HERO_SKELETON_SEEDS.duration}
                                        preset="media-row"
                                        variant="subtitle"
                                        widthOptions={HERO_TEXT_WIDTH_OPTIONS}
                                        fullWidth={false}
                                        style={
                                            loading
                                                ? { minWidth: '3.5rem' }
                                                : undefined
                                        }
                                    >
                                        <Text size="1" color="gray">
                                            {hero?.duration ?? '0m'}
                                        </Text>
                                    </SkeletonText>
                                )}
                                <HeroMenuButton
                                    loading={loading}
                                    actions={mergedHeroActions}
                                    item={hero?.item}
                                />
                            </Flex>
                        </Flex>
                    )}
                </Flex>
            </Flex>
        </BackgroundImage>
    );
}
