import {
    isValidElement,
    type CSSProperties,
    type ReactNode,
} from 'react';
import clsx from 'clsx';

import './skeleton.css';

type Range = readonly [number, number];
type SkeletonValue = number | string | Range;

export type SkeletonProps = {
    children: ReactNode;
    loading?: boolean;
    hash?: string | number;
    width?: SkeletonValue;
    height?: SkeletonValue;
    size?: SkeletonValue;
    radius?: SkeletonValue;
    className?: string;
    style?: CSSProperties;
};

export function hashUnit(value: string | number) {
    const text = String(value);
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4294967295;
}

function fromRange(value: SkeletonValue | undefined, hash: string | number, salt: string) {
    if (!Array.isArray(value)) return value;

    const [min, max] = value;
    return min + (max - min) * hashUnit(`${hash}:${salt}`);
}

function cssValue(value: number | string | undefined) {
    return typeof value === 'number' ? `${value}px` : value;
}

function hasText(node: ReactNode): boolean {
    if (typeof node === 'string' || typeof node === 'number') return true;
    if (Array.isArray(node)) return node.some(hasText);
    if (!isValidElement(node)) return false;
    if (typeof node.type !== 'string') return false;

    const props = node.props as { children?: ReactNode };
    return hasText(props.children);
}

function roundedClasses(node: ReactNode) {
    if (!isValidElement(node)) return undefined;
    const props = node.props as { className?: unknown };
    if (typeof props.className !== 'string') return undefined;

    return props.className
        .split(/\s+/)
        .filter((token) => token === 'rounded' || token.startsWith('rounded-'))
        .join(' ');
}

export function Skeleton({
    children,
    loading = true,
    hash = 'skeleton',
    width,
    height,
    size,
    radius,
    className,
    style,
}: SkeletonProps) {
    if (!loading) return children;

    const resolvedSize = fromRange(size, hash, 'size');
    const resolvedWidth =
        fromRange(width, hash, 'width') ??
        resolvedSize ??
        (hasText(children) ? `${Math.round(68 + hashUnit(`${hash}:text-width`) * 26)}%` : undefined);
    const resolvedHeight = fromRange(height, hash, 'height') ?? resolvedSize;
    const resolvedRadius = fromRange(radius, hash, 'radius');
    const childRadiusClasses = roundedClasses(children);

    return (
        <span
            data-skeleton="true"
            aria-busy="true"
            className={clsx('relative inline-grid min-w-0 align-middle', className)}
            style={{
                width: cssValue(resolvedWidth),
                height: cssValue(resolvedHeight),
                ...style,
            }}
        >
            <span aria-hidden="true" className="invisible contents">
                {children}
            </span>

            <span
                aria-hidden="true"
                className={clsx(
                    'skeleton-shape col-start-1 row-start-1 size-full min-h-[1em]',
                    childRadiusClasses,
                    resolvedRadius == null && !childRadiusClasses && 'rounded-control'
                )}
                style={{ borderRadius: cssValue(resolvedRadius) }}
            >
                <span data-skeleton-glint="true" className="skeleton-glint" />
            </span>
        </span>
    );
}
