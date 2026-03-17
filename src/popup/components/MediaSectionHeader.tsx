import type { ReactNode, RefObject } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { SkeletonText } from './SkeletonText';
import { TextButton } from './TextButton';

type Props = {
    title: string;
    subtitle?: string;
    loading: boolean;
    headerLoading: boolean;
    onTitleClick?: () => void;
    headerRight?: ReactNode;
    stickyHeaderEnabled: boolean;
    headerFade: boolean;
    headerFadeBleedPx: number;
    headerFadeEdgeMask: string | null;
    headerRef: RefObject<HTMLDivElement | null>;
};

export function MediaSectionHeader({
    title,
    subtitle,
    loading,
    headerLoading,
    onTitleClick,
    headerRight,
    stickyHeaderEnabled,
    headerFade,
    headerFadeBleedPx,
    headerFadeEdgeMask,
    headerRef,
}: Props) {
    return (
        <div
            ref={headerRef}
            className={clsx(
                'relative overflow-visible',
                stickyHeaderEnabled && 'sticky z-20'
            )}
            style={
                stickyHeaderEnabled
                    ? {
                          top: 'var(--sticky-top, 0px)',
                      }
                    : undefined
            }
        >
            <div className="relative z-10 py-1">
                <Flex
                    direction="row"
                    align="baseline"
                    justify="between"
                    gap="2"
                    className="min-w-0"
                >
                    <Flex
                        direction="row"
                        align="baseline"
                        gap="2"
                        className="min-w-0"
                    >
                        <SkeletonText
                            loading={loading && headerLoading}
                            parts={[title]}
                            preset="media-row"
                            variant="title"
                            className="min-w-0"
                            fullWidth={false}
                        >
                            <Fade enabled={!loading || !headerLoading} grow>
                                <Marquee mode="bounce" grow>
                                    {onTitleClick ? (
                                        <TextButton
                                            size="3"
                                            weight="bold"
                                            onClick={onTitleClick}
                                        >
                                            {title}
                                        </TextButton>
                                    ) : (
                                        <Text size="3" weight="bold">
                                            {title}
                                        </Text>
                                    )}
                                </Marquee>
                            </Fade>
                        </SkeletonText>
                        {subtitle && (
                            <SkeletonText
                                loading={loading && headerLoading}
                                parts={[subtitle]}
                                preset="media-row"
                                variant="subtitle"
                                className="min-w-0"
                                fullWidth={false}
                            >
                                <Fade enabled={!loading || !headerLoading} grow>
                                    <Marquee mode="left" grow>
                                        <Text size="2" color="gray">
                                            {subtitle}
                                        </Text>
                                    </Marquee>
                                </Fade>
                            </SkeletonText>
                        )}
                    </Flex>
                    {headerRight && (
                        <Flex
                            align="center"
                            gap="2"
                            className="shrink-0 overflow-visible"
                        >
                            {headerRight}
                        </Flex>
                    )}
                </Flex>
            </div>
            {stickyHeaderEnabled && headerFade && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0"
                    style={{
                        top: 0,
                        left: `-${headerFadeBleedPx}px`,
                        right: `-${headerFadeBleedPx}px`,
                        height: '100%',
                    }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                'linear-gradient(to bottom, var(--color-background) 0%, var(--color-background) 68%, transparent 100%)',
                        }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.001)',
                            left: `${headerFadeBleedPx}px`,
                            right: `${headerFadeBleedPx}px`,
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            WebkitMaskImage:
                                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 100%)',
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskSize: '100% 100%',
                            WebkitMaskPosition: 'top',
                            maskImage:
                                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 100%)',
                            maskRepeat: 'no-repeat',
                            maskSize: '100% 100%',
                            maskPosition: 'top',
                        }}
                    />
                    {headerFadeEdgeMask && (
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor: 'var(--color-background)',
                                WebkitMaskImage: headerFadeEdgeMask,
                                WebkitMaskRepeat: 'no-repeat',
                                WebkitMaskSize: '100% 100%',
                                WebkitMaskPosition: 'center',
                                maskImage: headerFadeEdgeMask,
                                maskRepeat: 'no-repeat',
                                maskSize: '100% 100%',
                                maskPosition: 'center',
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
