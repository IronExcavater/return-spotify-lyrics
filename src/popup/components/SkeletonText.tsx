import type { CSSProperties, ReactNode } from 'react';
import { Flex, Skeleton, type SkeletonProps } from '@radix-ui/themes';

import { skeletonTextWidths } from '../../shared/math';

type WidthOptions = Parameters<typeof skeletonTextWidths>[3];
type Preset = 'media-card' | 'media-row';

const PRESETS: Record<Preset, { salts: number[]; options: WidthOptions }> = {
    'media-card': {
        salts: [13, 17, 23],
        options: {
            titleMin: 68,
            titleRange: 28,
            subtitleMin: 28,
            subtitleRange: 32,
            titleOffset: 11,
            subtitleOffset: 29,
        },
    },
    'media-row': {
        salts: [11, 7, 31],
        options: {
            titleMin: 68,
            titleRange: 26,
            subtitleMin: 26,
            subtitleRange: 30,
            titleOffset: 5,
            subtitleOffset: 41,
        },
    },
};

interface Props extends Omit<SkeletonProps, 'children'> {
    children: ReactNode;
    parts: Array<string | undefined>;
    seed?: number;
    preset?: Preset;
    salts?: number[];
    variant?: 'title' | 'subtitle';
    widthOptions?: WidthOptions;
    className?: string;
    style?: CSSProperties;
    fullWidth?: boolean;
}

export function SkeletonText({
    children,
    parts,
    seed = 0,
    preset = 'media-row',
    salts,
    variant = 'title',
    widthOptions,
    className,
    style,
    fullWidth = true,
    ...skeletonProps
}: Props) {
    const presetConfig = PRESETS[preset];
    const resolvedSalts = salts ?? presetConfig.salts;
    const resolvedOptions = widthOptions ?? presetConfig.options;
    const { titleWidth, subtitleWidth } = skeletonTextWidths(
        parts,
        seed,
        resolvedSalts,
        resolvedOptions
    );
    const width = variant === 'title' ? titleWidth : subtitleWidth;
    const widthStyle =
        skeletonProps.loading !== false && fullWidth
            ? { width: `${width}%`, ...style }
            : style;
    const wrapperClass = [
        fullWidth ? 'w-full' : 'inline-flex',
        'min-w-0',
        className,
    ]
        .filter(Boolean)
        .join(' ');
    const innerClass = [fullWidth ? 'w-full' : 'inline-flex', 'min-w-0']
        .filter(Boolean)
        .join(' ');

    return (
        <Skeleton {...skeletonProps} className={wrapperClass}>
            <Flex className={innerClass} style={widthStyle}>
                {children}
            </Flex>
        </Skeleton>
    );
}
