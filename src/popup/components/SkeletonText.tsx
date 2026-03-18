import { isValidElement, type CSSProperties, type ReactNode } from 'react';
import { Flex, Skeleton, type SkeletonProps } from '@radix-ui/themes';

type WidthOptions = {
    titleMin?: number;
    titleRange?: number;
    subtitleMin?: number;
    subtitleRange?: number;
    titleOffset?: number;
    subtitleOffset?: number;
};
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
    seed?: number;
    preset?: Preset;
    salts?: number[];
    variant?: 'title' | 'subtitle';
    widthOptions?: WidthOptions;
    className?: string;
    style?: CSSProperties;
    fullWidth?: boolean;
}

const TEXT_SIZE_TOKENS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
const randomFromSeed = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

const normalizeTextSize = (value: unknown): string | undefined => {
    if (typeof value === 'number') {
        const token = String(value);
        return TEXT_SIZE_TOKENS.has(token) ? token : undefined;
    }
    if (typeof value !== 'string') return undefined;
    const token = value.trim();
    return TEXT_SIZE_TOKENS.has(token) ? token : undefined;
};

const findTextSize = (node: ReactNode): string | undefined => {
    if (Array.isArray(node)) {
        for (const child of node) {
            const token = findTextSize(child);
            if (token) return token;
        }
        return undefined;
    }
    if (!isValidElement(node)) return undefined;
    const props = node.props as { size?: unknown; children?: ReactNode };
    const own = normalizeTextSize(props.size);
    if (own) return own;
    return findTextSize(props.children);
};

export function SkeletonText({
    children,
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
    const min =
        variant === 'title'
            ? (resolvedOptions.titleMin ?? presetConfig.options.titleMin)
            : (resolvedOptions.subtitleMin ?? presetConfig.options.subtitleMin);
    const range =
        variant === 'title'
            ? (resolvedOptions.titleRange ?? presetConfig.options.titleRange)
            : (resolvedOptions.subtitleRange ??
              presetConfig.options.subtitleRange);
    const offset =
        variant === 'title'
            ? (resolvedOptions.titleOffset ?? presetConfig.options.titleOffset)
            : (resolvedOptions.subtitleOffset ??
              presetConfig.options.subtitleOffset);
    const widthSeed =
        seed +
        offset +
        resolvedSalts.reduce((sum, salt, index) => sum + salt * (index + 1), 0);
    const width = Math.round(min + randomFromSeed(widthSeed) * range);
    const textSizeToken = findTextSize(children);
    const widthStyle =
        skeletonProps.loading !== false ? { width: `${width}%` } : undefined;
    const heightStyle =
        skeletonProps.loading !== false && textSizeToken
            ? {
                  height: `var(--line-height-${textSizeToken})`,
                  lineHeight: `var(--line-height-${textSizeToken})`,
              }
            : undefined;
    const resolvedStyle = {
        ...widthStyle,
        ...heightStyle,
        ...style,
    };
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
            <Flex className={innerClass} style={resolvedStyle}>
                {children}
            </Flex>
        </Skeleton>
    );
}
